import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminCredentials } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    
    console.log('[Admin Login API] Processing login attempt for username:', username);
    
    if (!username || !password) {
      console.log('[Admin Login API] Missing username or password');
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    // Find the valid admin user with case-insensitive check to get the correct casing
    const isValid = verifyAdminCredentials(username, password);
    
    if (!isValid) {
      console.log('[Admin Login API] Invalid credentials for username:', username);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    console.log('[Admin Login API] Login successful for username:', username);
    
    // Set a cookie to maintain session
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_session', username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('[Admin Login API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}