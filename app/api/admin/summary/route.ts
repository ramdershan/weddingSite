import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getRSVPSummaryFromSupabase, supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check if the user is authenticated as an admin using the correct cookie
    const cookieStore = cookies();
    const adminSessionCookie = cookieStore.get('admin_session');
    const username = adminSessionCookie?.value;

    if (!username) {
      console.log('[Admin Summary API] No admin_session cookie found.');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('[Admin Summary API] Validating username from cookie:', username);

    // Validate the username against the admin_users table
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('username', username)
      .maybeSingle();
      
    if (adminError || !adminData) {
        console.error('[Admin Summary API] Admin validation failed:', adminError?.message || 'User not found');
        return NextResponse.json(
          { error: 'Unauthorized' }, 
          { status: 401 }
        );
    }
    
    console.log('[Admin Summary API] Admin validation successful. Fetching summary...');
    
    // Fetch the RSVP summary directly from Supabase
    // Assuming getRSVPSummaryFromSupabase uses appropriate permissions (e.g., service role key)
    const summary = await getRSVPSummaryFromSupabase();
    
    if (!summary) {
      console.error('[Admin Summary API] getRSVPSummaryFromSupabase returned null or undefined');
       return NextResponse.json(
        { error: 'Failed to fetch RSVP summary data' },
        { status: 500 }
      );
    }
    
    console.log('[Admin Summary API] Summary fetched successfully.');
    return NextResponse.json({ summary });
    
  } catch (error) {
    console.error('[Admin Summary API] Error fetching RSVP summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RSVP summary' },
      { status: 500 }
    );
  }
}