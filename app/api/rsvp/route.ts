import { NextRequest, NextResponse } from 'next/server';
import { updateGuestEventResponse } from '@/lib/data';
import { validateGuestSession, supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { fullName, eventId, response, dietaryRestrictions, plusOne, plusOneCount, adultCount, childrenCount } = await request.json();
    
    if (!fullName || !response) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Check session token from cookie or request body
    const sessionToken = request.cookies.get('guest_session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Validate the session token
    const supabaseGuest = await validateGuestSession(sessionToken);
    
    if (!supabaseGuest) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 403 }
      );
    }
    
    // Verify that the guest name in the request matches the authenticated guest
    if (supabaseGuest.full_name.toLowerCase() !== fullName.toLowerCase()) {
      return NextResponse.json(
        { error: 'Unauthorized to submit RSVP for this guest' },
        { status: 403 }
      );
    }
    
    // Verify the guest has access to RSVP for this event
    // First get the event ID from the code
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('code', eventId)
      .single();
    
    if (eventError || !event) {
      console.error('Error finding event by code:', eventError);
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    
    // Now check if the guest has RSVP access to this event
    const { data: access, error: accessError } = await supabaseAdmin
      .from('guest_event_access')
      .select('*')
      .eq('guest_id', supabaseGuest.id)
      .eq('event_id', event.id)
      .eq('can_rsvp', true)
      .single();
    
    if (accessError || !access) {
      console.error('Guest does not have RSVP access to this event:', accessError);
      return NextResponse.json(
        { error: 'You do not have permission to RSVP for this event' },
        { status: 403 }
      );
    }
    
    const success = updateGuestEventResponse(
      fullName,
      eventId || 'general',
      response,
      dietaryRestrictions || '',
      !!plusOne,
      plusOneCount || 1,
      adultCount || 0,
      childrenCount || 0
    );
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update guest response' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing RSVP:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}