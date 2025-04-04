import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
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