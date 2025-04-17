import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_USERS } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check for admin_session cookie first (new format)
    let adminAuth = request.cookies.get('admin_session');
    
    // Fall back to admin_auth cookie (old format) if needed
    if (!adminAuth || !adminAuth.value) {
      adminAuth = request.cookies.get('admin_auth');
    }
    
    if (!adminAuth || !adminAuth.value) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify the username exists in admin users
    console.log('[Admin Auth] Checking if user is admin:', adminAuth.value);
    const isAdmin = ADMIN_USERS.some(user => 
      user.username.toLowerCase() === adminAuth?.value?.toLowerCase()
    );
    
    if (!isAdmin) {
      console.log('[Admin Auth] User is not an admin:', adminAuth.value);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('[Admin Auth] Admin authentication successful for:', adminAuth.value);
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}