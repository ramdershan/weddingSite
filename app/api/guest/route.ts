import { NextRequest, NextResponse } from 'next/server';
import { getGuestByName, createGuestSession } from '@/lib/supabase';
import { getGuest } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fullName = searchParams.get('name');
    const eventId = searchParams.get('eventId');
    
    if (!fullName) {
      return NextResponse.json(
        { error: 'Name parameter is required' },
        { status: 400 }
      );
    }
    
    // Check if guest exists in Supabase
    const supabaseGuest = await getGuestByName(fullName);
    
    if (!supabaseGuest || !supabaseGuest.is_active) {
      return NextResponse.json(
        { error: 'Guest not found in approved list' },
        { status: 403 }
      );
    }
    
    // Get guest data from local storage if it exists
    const guest = getGuest(fullName);
    
    // Create a new session for the guest
    const session = await createGuestSession(supabaseGuest.id);
    
    // Prepare response with session token for client-side storage
    const response = NextResponse.json({ 
      guest: guest || {
        fullName: supabaseGuest.full_name,
        responded: false
      },
      sessionToken: session?.session_token
    });
    
    // Optional: Set a session cookie
    if (session?.session_token) {
      response.cookies.set('guest_session', session.session_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/'
      });
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching guest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}