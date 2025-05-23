import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get the event ID from the query parameters
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const activeOnly = searchParams.get('activeOnly') === 'true';
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID parameter is required' },
        { status: 400 }
      );
    }
    
    // Check if the user is authenticated as an admin using the cookie
    const cookieStore = cookies();
    const adminSessionCookie = cookieStore.get('admin_session');
    const username = adminSessionCookie?.value;

    if (!username) {
      console.log('[Admin Invited Count API] No admin_session cookie found.');
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
      console.error('[Admin Invited Count API] Admin validation failed:', adminError?.message || 'User not found');
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }
    
    // First, get the Supabase event ID from the event code/ID
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('code', eventId)
      .single();
      
    if (eventError || !event) {
      console.error('[Admin Invited Count API] Event not found:', eventId);
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    
    if (activeOnly) {
      // Count only active guests who have access to RSVP for this event
      // Use a join to filter by active status
      const query = supabaseAdmin
        .from('guest_event_access')
        .select('guest_id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('can_rsvp', true)
        .filter('guest_id.guests.is_active', 'eq', true);
        
      const { count, error: countError } = await query;
      
      if (countError) {
        console.error('[Admin Invited Count API] Error counting active invited guests:', countError);
        
        // Fallback to using two queries if the join approach fails
        const { data: accessData, error: accessError } = await supabaseAdmin
          .from('guest_event_access')
          .select('guest_id')
          .eq('event_id', event.id)
          .eq('can_rsvp', true);
          
        if (accessError) {
          console.error('[Admin Invited Count API] Fallback query error:', accessError);
          return NextResponse.json(
            { error: 'Failed to count invited guests' },
            { status: 500 }
          );
        }
        
        // Get the active guests from the guests table
        if (accessData && accessData.length > 0) {
          const guestIds = accessData.map(access => access.guest_id);
          
          const { data: activeGuests, error: activeError } = await supabaseAdmin
            .from('guests')
            .select('id')
            .in('id', guestIds)
            .eq('is_active', true);
            
          if (activeError) {
            console.error('[Admin Invited Count API] Error filtering active guests:', activeError);
            return NextResponse.json(
              { error: 'Failed to count active invited guests' },
              { status: 500 }
            );
          }
          
          console.log(`[Admin Invited Count API] Found ${activeGuests?.length || 0} active guests invited to event: ${eventId}`);
          return NextResponse.json({ count: activeGuests?.length || 0 });
        }
        
        return NextResponse.json({ count: 0 });
      }
      
      console.log(`[Admin Invited Count API] Found ${count} active guests invited to event: ${eventId}`);
      return NextResponse.json({ count: count || 0 });
    } else {
      // Count all guests who have access to RSVP for this event (including inactive)
      const { count, error: countError } = await supabaseAdmin
        .from('guest_event_access')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('can_rsvp', true);
        
      if (countError) {
        console.error('[Admin Invited Count API] Error counting invited guests:', countError);
        return NextResponse.json(
          { error: 'Failed to count invited guests' },
          { status: 500 }
        );
      }
      
      console.log(`[Admin Invited Count API] Found ${count} guests invited to event: ${eventId}`);
      return NextResponse.json({ count: count || 0 });
    }
  } catch (error) {
    console.error('[Admin Invited Count API] Error fetching invited count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 