import { NextRequest, NextResponse } from 'next/server';
import { validateGuestSession } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken, useCookie } = body;
    
    // If useCookie flag is true, try to get session token from cookie
    let tokenToValidate = sessionToken;
    if (useCookie || !tokenToValidate) {
      const cookieToken = request.cookies.get('guest_session')?.value;
      if (cookieToken) {
        tokenToValidate = cookieToken;
      }
    }
    
    if (!tokenToValidate) {
      return NextResponse.json(
        { success: false, error: 'No session token provided' },
        { status: 400 }
      );
    }
    
    // Validate the session token
    const guest = await validateGuestSession(tokenToValidate);
    
    if (!guest) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }
    
    // Return guest data from Supabase and the token if retrieved from cookie
    return NextResponse.json({
      success: true,
      guest: {
        fullName: guest.full_name,
        // Add any other fields you want to send back
      },
      // Return the token if it was retrieved from cookie so it can be saved to localStorage
      ...(useCookie ? { sessionToken: tokenToValidate } : {})
    });
  } catch (error) {
    console.error('Error validating session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 