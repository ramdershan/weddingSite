// Simple token validation for middleware in Edge Runtime
// This avoids using the full supabase client which has Node.js dependencies
import { createClient } from '@supabase/supabase-js'; // Import Supabase client

// Initialize Supabase client with service role key for admin operations
// Ensure these environment variables are set in your .env file
// IMPORTANT: Use Service Role Key cautiously in Edge functions.
// Ensure this function ONLY performs read checks based on the token.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
 * Validates an admin session token (username) directly against the admin_users table.
 * Suitable for Edge Runtime.
 * IMPORTANT: This function CANNOT use Node.js APIs beyond Supabase client.
 * 
 * @param username The username from the admin_session cookie.
 * @returns True if a user with this username exists in admin_users, false otherwise.
 */
export async function validateAdminSessionEdge(username: string): Promise<boolean> {
  if (!username) {
    console.log('[Edge Validation] No admin username provided');
    return false;
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[Edge Validation] Missing Supabase URL or Service Role Key in environment variables for admin check.');
    return false;
  }

  try {
    console.log(`[Edge Validation] Validating admin username: ${username}`);

    // Create Supabase client for this specific check
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check if a user with this username exists in the admin_users table
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('id') // Select a minimal column, we only care about existence
      .eq('username', username)
      .maybeSingle(); // Efficiently check for existence

    if (error) {
      console.error('[Edge Validation] Error querying admin_users table:', error.message);
      return false;
    }

    // If data is not null, the user exists
    const isAdmin = data !== null;
    console.log(`[Edge Validation] Admin user ${username} exists check result: ${isAdmin}`);
    return isAdmin;

  } catch (error) {
    console.error('[Edge Validation] Error during admin validation Supabase query:', error);
    return false;
  }
} 