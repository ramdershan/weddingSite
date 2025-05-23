import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getGuestsWithResponsesFromSupabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { Guest } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get event parameter
    const { searchParams } = new URL(request.url);
    const event = searchParams.get('event');
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // Default to true if not specified
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event parameter is required' },
        { status: 400 }
      );
    }
    
    // Check if the user is authenticated as an admin using the cookie
    const cookieStore = cookies();
    const adminSessionCookie = cookieStore.get('admin_session');
    const username = adminSessionCookie?.value;

    if (!username) {
      console.log('[Admin Download API] No admin_session cookie found.');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Validate the username against the admin_users table
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('username', username)
      .maybeSingle();
      
    if (adminError || !adminData) {
      console.error('[Admin Download API] Admin validation failed:', adminError?.message || 'User not found');
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }
    
    // Get all guests with their responses from Supabase
    const guests = await getGuestsWithResponsesFromSupabase();
    
    // Check if we got guests data
    if (!guests || guests.length === 0) {
      return NextResponse.json(
        { error: 'No data available' },
        { status: 404 }
      );
    }
    
    // Filter guests based on event and active status
    let filteredGuests = guests;
    
    // Apply active filter if requested
    if (activeOnly) {
      filteredGuests = filteredGuests.filter(guest => guest.isActive);
    }
    
    // Filter by event if not 'all'
    if (event !== 'all') {
      if (event === 'wedding-group') {
        // Wedding group includes wedding, sangeet, haldi, mehndi
        filteredGuests = filteredGuests.filter(guest => 
          guest.eventResponses?.wedding || 
          guest.eventResponses?.sangeet || 
          guest.eventResponses?.haldi || 
          guest.eventResponses?.mehndi
        );
      } else {
        // Filter to specific event
        filteredGuests = filteredGuests.filter(guest => guest.eventResponses?.[event]);
      }
    }
    
    // Generate CSV content
    let csvContent = 'Full Name,Is Active,';
    
    if (event === 'all') {
      // All guests CSV includes general info
      csvContent += 'Dietary Restrictions,Status,Events Invited To,Events Attending\n';
      
      filteredGuests.forEach(guest => {
        const invitedEvents = guest.invitedEvents ? 
          guest.invitedEvents.map((e: any) => e.code || e.name).join('; ') : '';
        
        // Type guard to ensure we have proper response objects
        const attendingEvents = guest.eventResponses ?
          Object.entries(guest.eventResponses)
            .filter(([_, eventResp]) => {
              if (eventResp && typeof eventResp === 'object' && 'response' in eventResp) {
                return eventResp.response === 'Yes' || eventResp.response === 'Maybe';
              }
              return false;
            })
            .map(([code, _]) => code)
            .join('; ') : '';
        
        const status = Object.keys(guest.eventResponses || {}).length > 0 ? 'Responded' : 'Pending';
        
        csvContent += `"${guest.fullName}",${guest.isActive},"${guest.dietaryRestrictions || ''}","${status}","${invitedEvents}","${attendingEvents}"\n`;
      });
    } else {
      // Event-specific CSV includes response details for that event
      csvContent += 'Response,Dietary Restrictions,Adults,Children,Plus Ones,Updated At\n';
      
      filteredGuests.forEach(guest => {
        let eventResponse;
        let dietaryRestrictions = guest.dietaryRestrictions || '';
        
        if (event === 'wedding-group') {
          // For wedding group, prioritize wedding response, then others
          eventResponse = guest.eventResponses?.wedding || 
            guest.eventResponses?.sangeet || 
            guest.eventResponses?.haldi || 
            guest.eventResponses?.mehndi;
        } else {
          eventResponse = guest.eventResponses?.[event];
        }
        
        // Ensure the eventResponse has the expected shape
        if (eventResponse && typeof eventResponse === 'object' && 'response' in eventResponse) {
          const response = eventResponse.response || 'No Response';
          const adults = eventResponse.adultCount || 0;
          const children = eventResponse.childrenCount || 0;
          const plusOnes = adults + children;
          const updatedAt = eventResponse.updatedAt ? new Date(eventResponse.updatedAt).toLocaleDateString() : '';
          
          csvContent += `"${guest.fullName}",${guest.isActive},"${response}","${dietaryRestrictions}",${adults},${children},${plusOnes},"${updatedAt}"\n`;
        }
      });
    }
    
    // Return CSV file
    const response = new NextResponse(csvContent);
    response.headers.set('Content-Type', 'text/csv');
    response.headers.set('Content-Disposition', `attachment; filename=${event}-rsvps-${new Date().toISOString().split('T')[0]}.csv`);
    
    return response;
  } catch (error) {
    console.error('[Admin Download API] Error downloading CSV:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}