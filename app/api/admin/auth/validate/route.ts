import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_USERS } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Extract the token from the request body
    const { adminToken } = await request.json();
    
    if (!adminToken) {
      console.log('[Admin Validate] No admin token provided');
      return NextResponse.json({ 
        success: false, 
        error: 'No token provided' 
      });
    }
    
    // In a real-world app, you would validate this token against a database
    // Here we're checking if it matches our admin cookie format
    // and if the username is in our list of admin users
    
    // Check if the admin token is valid and belongs to either Yukti or Ram
    console.log(`[Admin Validate] Checking if '${adminToken}' is an admin username`);
    const isAdmin = ADMIN_USERS.some(user => 
      user.username.toLowerCase() === adminToken.toLowerCase()
    );
    
    console.log(`[Admin Validate] Admin validation result for token: ${isAdmin ? 'success' : 'failed'}`);
    
    if (!isAdmin) {
      return NextResponse.json({ 
        success: false, 
        isAdmin: false,
        error: 'Invalid admin credentials'
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      isAdmin: true
    });
    
  } catch (error) {
    console.error('[Admin Validate] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 