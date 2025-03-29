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
  
  // Admin route protection is now handled by the admin page itself
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/%20admin/:path*']
};