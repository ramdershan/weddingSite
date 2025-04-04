import { NextRequest, NextResponse } from 'next/server';

// Simple approved guests list for middleware
const APPROVED_GUESTS = [
  "John Smith",
  "Jane Doe",
  "Michael Johnson",
  "Emily Williams",
  "Robert Brown",
  "Sarah Davis",
  "David Miller",
  "Jennifer Wilson",
  "Christopher Moore",
  "Jessica Taylor"
];

// Case-insensitive check for approved guest
function isApprovedGuest(fullName: string): boolean {
  if (!fullName) return false;
  
  const normalizedName = fullName.trim().toLowerCase();
  return APPROVED_GUESTS.some(
    name => name.toLowerCase() === normalizedName
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url);
  
  // Fix for spaces in URL path
  if (pathname.includes('%20')) {
    const cleanPath = pathname.replace(/%20/g, '');
    return NextResponse.redirect(new URL(cleanPath, request.url));
  }
  
  // Handle cookie expiration on client-side navigations
  // This helps ensure that the session cookie is present when needed
  if (pathname.includes('/rsvp/') || pathname === '/') {
    const response = NextResponse.next();
    
    // Check if session cookie exists and copy it from request to response
    // This refreshes the cookie expiration on each navigation
    const sessionCookie = request.cookies.get('guest_session');
    if (sessionCookie) {
      // Copy the cookie to keep it fresh
      response.cookies.set({
        name: 'guest_session',
        value: sessionCookie.value,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
        path: '/',
      });
    }
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
};