import { NextRequest, NextResponse } from 'next/server';
import { validateGuestSession, updateGuestResponse } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Check for event code/id and response
    if (!data.eventCode && !data.eventId || !data.response) {
      console.error('Missing required fields:', { 
        hasEventCode: !!(data.eventCode || data.eventId), 
        hasResponse: !!data.response 
      });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Use eventCode or fallback to eventId for backwards compatibility
    const eventCode = data.eventCode || data.eventId;

    // Get token from cookie first, then fallback to request body
    let sessionToken = request.cookies.get('guest_session')?.value;
    if (!sessionToken && data.token) {
      sessionToken = data.token;
    }

    if (!sessionToken) {
      console.error('No session token provided in cookie or request body');
      return NextResponse.json(
        { error: 'No session token provided' },
        { status: 401 }
      );
    }

    // Validate session token
    const guest = await validateGuestSession(sessionToken);
    if (!guest) {
      console.error('Invalid session token');
      return NextResponse.json(
        { error: 'Invalid session token' },
        { status: 401 }
      );
    }

    // No need to verify access here as updateGuestResponse will handle that
    
    // Update guest's RSVP response using Supabase
    const success = await updateGuestResponse(
      guest.id,
      eventCode,
      {
        response: data.response,
        dietaryRestrictions: data.dietaryRestrictions || '',
        plusOne: !!data.plusOne,
        plusOneCount: data.plusOneCount || 0,
        adultCount: data.adultCount || 1, // Default to 1 if not provided
        childrenCount: data.childrenCount || 0
      }
    );

    if (!success) {
      console.error('Failed to update RSVP response');
      return NextResponse.json(
        { error: 'Failed to update RSVP response' },
        { status: 500 }
      );
    }

    // Log successful RSVP
    console.log(`RSVP success - Guest: ${guest.full_name} (${guest.id}), Event: ${eventCode}, Response: ${data.response}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'RSVP updated successfully' 
    });
  } catch (error) {
    console.error('Error processing RSVP:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}