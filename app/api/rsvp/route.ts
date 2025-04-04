import { NextRequest, NextResponse } from 'next/server';
import { updateGuestEventResponse } from '@/lib/data';
import { validateGuestSession } from '@/lib/supabase';

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