import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminCredentials } from '@/lib/data';
import { supabaseAdmin } from '@/lib/supabase';

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
    
    // Query the admin_users table
    const { data: adminUser, error: userError } = await supabaseAdmin
      .from('admin_users')
      .select('id, password, username') // Select username to get correct casing
      .eq('username', username) // Case-sensitive check might be desirable here depending on DB collation
      .single();

    if (userError || !adminUser) {
      console.log('[Admin Login API] Invalid credentials for username:', username);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // *** SECURITY WARNING: PLAIN TEXT PASSWORD COMPARISON ***
    // This is highly insecure as your database stores passwords in plain text.
    // You MUST implement secure password hashing (e.g., using bcrypt) both when
    // storing the password and comparing it here.
    // *** CHANGE: Compare against 'password' column ***
    const isValidPassword = password === adminUser.password; 
    // *** END SECURITY WARNING ***

    if (!isValidPassword) {
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