import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_USERS } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminAuth = request.cookies.get('admin_auth');
    
    if (!adminAuth || !adminAuth.value) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify the username exists in admin users
    const isAdmin = ADMIN_USERS.some(user => user.username === adminAuth.value);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}