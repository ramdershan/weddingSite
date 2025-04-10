import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_USERS } from '@/lib/data';
import { getRSVPSummaryFromSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check if the user is authenticated as an admin
    const cookieStore = cookies();
    const token = cookieStore.get('adminToken')?.value;
    
    if (!token || !ADMIN_USERS.some(user => user.username === token)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch the RSVP summary directly from Supabase
    const summary = await getRSVPSummaryFromSupabase();
    return NextResponse.json({ summary });
    
  } catch (error) {
    console.error('Error fetching RSVP summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RSVP summary' },
      { status: 500 }
    );
  }
}