import { NextRequest, NextResponse } from 'next/server';
import { deleteGuestSession } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get the session token from the request body
    const body = await request.json();
    const { sessionToken } = body;
    
    // Try to get the session token from cookie if not in body
    let tokenToDelete = sessionToken;
    if (!tokenToDelete) {
      tokenToDelete = request.cookies.get('guest_session')?.value;
    }
    
    // Delete the session from the database if we have a token
    if (tokenToDelete) {
      await deleteGuestSession(tokenToDelete);
      console.log('[API] Guest session deleted:', tokenToDelete.substring(0, 8) + '...');
    } else {
      console.log('[API] No session token provided for deletion');
    }
    
    // Create a response that clears the guest_session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
    
    // Clear the cookie by setting it to expire immediately
    response.cookies.set('guest_session', '', {
      httpOnly: true,
      expires: new Date(0), // Set to epoch time to expire immediately
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 