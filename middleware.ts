import { NextRequest, NextResponse } from 'next/server';
import { validateSessionTokenEdge, validateAdminSessionEdge } from '@/lib/edge-validation';

// Define public paths that do not require authentication
const PUBLIC_PATHS = [
  '/guest-login',          // The login page itself
  '/api/guest',            // API route for checking guest name and creating session
  '/api/auth/',            // Allow other potential guest auth API routes (like validation)
  '/admin/login',          // Admin login page
  '/api/admin/auth',       // Admin authentication API (still needs to be public)
  '/api/admin/login',      // Admin login API endpoint (still needs to be public)
  '/api/admin/logout',     // Admin logout API endpoint (still needs to be public)
  '/api/admin/auth/validate', // Admin validation endpoint (still needs to be public)
  // Static assets and Next.js internals
  '/favicon.ico',
  '/images/',
  '/fonts/',
  '/js/',                  // JavaScript files
  '/_next/',
];

// Admin paths pattern (used to identify admin routes AND admin API routes)
const ADMIN_PATH_PATTERN = /^\/(admin|api\/admin)(?:\/|$)/;

// Helper function to check if a path is public
function isPublicPath(pathname: string): boolean {
  // Special check for API admin routes that MUST be public
  if (pathname === '/api/admin/login' || pathname === '/api/admin/logout' || pathname === '/api/admin/auth' || pathname === '/api/admin/auth/validate') {
    return true;
  }
  
  // Check for exact match or if path starts with a public directory path
  return PUBLIC_PATHS.some(publicPath => 
    pathname === publicPath || (publicPath.endsWith('/') && pathname.startsWith(publicPath))
  );
}

// Helper function to check if a path is an admin path (UI or API)
function isAdminPath(pathname: string): boolean {
  return ADMIN_PATH_PATTERN.test(pathname);
}

// Helper function to validate admin session
async function validateAdminSession(request: NextRequest): Promise<boolean> {
  const adminSessionCookie = request.cookies.get('admin_session');
  
  if (!adminSessionCookie?.value) {
    return false;
  }
  
  try {
    // Use our dedicated admin validation function
    return await validateAdminSessionEdge(adminSessionCookie.value);
  } catch (error) {
    console.error('[Middleware] Error validating admin session:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = new URL(request.url);
  const requestHeaders = new Headers(request.headers); 
  
  // Set x-pathname header for layout checks 
  requestHeaders.set('x-pathname', pathname);
  
  // Fix for potential spaces in URL path
  if (pathname.includes('%20')) {
    const cleanPath = pathname.replace(/%20/g, '') + search;
    console.log(`[Middleware] Fixing space: Redirecting to ${cleanPath}`);
    return NextResponse.redirect(new URL(cleanPath, request.url));
  }

  // DEBUGGING: Log all middleware checks
  console.log(`[Middleware] Checking path: ${pathname}`);
  
  // Check if the current path is public FIRST
  if (isPublicPath(pathname)) {
    console.log(`[Middleware] Allowing public path: ${pathname}`);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // --- Check if path is an admin path (UI or API) ---
  if (isAdminPath(pathname)) {
    console.log(`[Middleware] Admin authentication required for: ${pathname}`);
    
    // Validate admin session
    const isValidAdminSession = await validateAdminSession(request);
    
    if (!isValidAdminSession) {
      console.log(`[Middleware] Admin access denied for ${pathname}, redirecting to /admin/login`);
      const loginUrl = new URL('/admin/login', request.url);
      // Preserve the original path as redirectTo query parameter
      loginUrl.searchParams.set('redirectTo', pathname + search);
      return NextResponse.redirect(loginUrl);
    }
    
    console.log(`[Middleware] Admin access granted for ${pathname}`);
    
    // Allow the request to proceed for admin paths
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // --- Path requires guest authentication --- 
  // This block should only be reached if it's NOT public and NOT admin
  console.log(`[Middleware] Guest authentication required for: ${pathname}`);

  // Check for the session cookie
  const sessionCookie = request.cookies.get('guest_session');
  let isValidSession = false;

  if (sessionCookie?.value) {
    console.log(`[Middleware] Found session cookie, validating for: ${pathname}`);
    try {
      // Validate the session token using the edge-compatible function
      isValidSession = await validateSessionTokenEdge(sessionCookie.value);
      console.log(`[Middleware] Session validation result for ${pathname}: ${isValidSession}`);
    } catch (error) {
      console.error('[Middleware] Error validating session token:', error);
      isValidSession = false;
    }
  } else {
    console.log(`[Middleware] No session cookie found for ${pathname}`);
  }

  // If session is NOT valid, redirect to login
  if (!isValidSession) {
    console.log(`[Middleware] Access denied for ${pathname}, redirecting to /guest-login`);
    const loginUrl = new URL('/guest-login', request.url);
    // Preserve the original path as redirectTo query parameter
    loginUrl.searchParams.set('redirectTo', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // --- Session is valid --- 
  console.log(`[Middleware] Access granted for ${pathname}`);
  
  // Allow the request to proceed
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Refresh the cookie expiration ONLY if the cookie exists 
  if (sessionCookie?.value) {
    response.cookies.set({
      name: 'guest_session',
      value: sessionCookie.value,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: '/',
      sameSite: 'lax',
    });
    console.log(`[Middleware] Refreshed cookie expiration for ${pathname}`);
  }
  
  return response;
}

// Define which paths the middleware should run on
export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - images/, fonts/, js/ (static assets)
    '/((?!_next/static|_next/image|favicon.ico|images/|fonts/|js/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css)$).*)',
  ],
};