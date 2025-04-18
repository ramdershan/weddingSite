import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // Import Supabase client

// Initialize Supabase client with service role key for admin operations
// Ensure these environment variables are set in your .env file
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check for admin_session cookie
    const adminSessionCookie = request.cookies.get('admin_session');
    const username = adminSessionCookie?.value;

    if (!username) {
      console.log('[Admin Auth API] No admin_session cookie found.');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Admin Auth API] Validating username from cookie:', username);

    // Query the admin_users table to check if the user exists
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('id') // Select minimal column
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('[Admin Auth API] Error querying admin_users:', error.message);
      // Don't expose detailed errors, return generic unauthorized
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const isAdmin = data !== null;

    if (!isAdmin) {
      console.log('[Admin Auth API] User not found in admin_users:', username);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Admin Auth API] Admin authentication successful for:', username);
    return NextResponse.json({ authenticated: true });

  } catch (error) {
    console.error('[Admin Auth API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}