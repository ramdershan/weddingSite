// Simple token validation for middleware in Edge Runtime
// This avoids using the full supabase client which has Node.js dependencies

/**
 * Validates a guest session token using a direct fetch call suitable for Edge Runtime.
 * IMPORTANT: This function CANNOT use Node.js APIs.
 * 
 * @param token The guest session token to validate.
 * @returns True if the session is valid, false otherwise.
 */
export async function validateSessionTokenEdge(token: string): Promise<boolean> {
  if (!token) {
    console.log('[Edge Validation] No token provided');
    return false;
  }

  try {
    // Get the request URL from the environment or use a default for local development
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const endpoint = `${baseUrl}/api/auth/validate-session`;

    console.log(`[Edge Validation] Validating token (first 10 chars): ${token.substring(0, 10)}...`);
    console.log(`[Edge Validation] Sending request to: ${endpoint}`);
    
    // Use fetch with absolute URL
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionToken: token }),
    });

    console.log(`[Edge Validation] API response status: ${response.status}`);

    if (!response.ok) {
      // Handle non-2xx responses
      console.error(`[Edge Validation] Validation request failed with status: ${response.status}`);
      
      try {
        // Try to get more detailed error info from response
        const errorData = await response.json();
        console.error('[Edge Validation] Error details:', errorData);
      } catch (e) {
        // Ignore error parsing failure
      }
      
      return false;
    }

    const data = await response.json();
    console.log(`[Edge Validation] API response success: ${data?.success}`);

    return data?.success === true;

  } catch (error) {
    console.error('[Edge Validation] Error during validation fetch:', error);
    return false;
  }
}

/**
 * Validates an admin session token using a direct fetch call suitable for Edge Runtime.
 * This specifically checks for admin permissions (Yukti or Ram).
 * IMPORTANT: This function CANNOT use Node.js APIs.
 * 
 * @param token The admin session token to validate.
 * @returns True if the admin session is valid, false otherwise.
 */
export async function validateAdminSessionEdge(token: string): Promise<boolean> {
  if (!token) {
    console.log('[Edge Validation] No admin token provided');
    return false;
  }

  try {
    // Get the request URL from the environment or use a default for local development
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const endpoint = `${baseUrl}/api/admin/auth/validate`;

    console.log(`[Edge Validation] Validating admin token (first 10 chars): ${token.substring(0, 10)}...`);
    console.log(`[Edge Validation] Sending request to: ${endpoint}`);
    
    // Use fetch with absolute URL
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ adminToken: token }),
    });

    console.log(`[Edge Validation] Admin API response status: ${response.status}`);

    if (!response.ok) {
      // Handle non-2xx responses
      console.error(`[Edge Validation] Admin validation request failed with status: ${response.status}`);
      return false;
    }

    const data = await response.json();
    console.log(`[Edge Validation] Admin API response success: ${data?.success}, isAdmin: ${data?.isAdmin}`);

    // For admin validation, we need both success=true AND isAdmin=true
    return data?.success === true && data?.isAdmin === true;

  } catch (error) {
    console.error('[Edge Validation] Error during admin validation fetch:', error);
    return false;
  }
} 