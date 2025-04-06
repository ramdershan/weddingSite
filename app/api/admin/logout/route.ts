import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[Admin Logout] Processing admin logout request');
    const response = NextResponse.json({ success: true });
    
    // Clear both cookie versions for backward compatibility
    response.cookies.delete('admin_auth');
    response.cookies.delete('admin_session');
    
    console.log('[Admin Logout] Successfully cleared admin cookies');
    
    return response;
  } catch (error) {
    console.error('[Admin Logout] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}