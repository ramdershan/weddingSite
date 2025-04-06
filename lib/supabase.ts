// Load environment variables from .env file when used in non-NextJS context
import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_API_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or API key');
  console.error('NEXT_PUBLIC_SUPABASE_URL is', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'not set');
  console.error('NEXT_PUBLIC_SUPABASE_API_KEY is', process.env.NEXT_PUBLIC_SUPABASE_API_KEY ? 'set' : 'not set');
}

// Regular client with anon key - for client-side usage
export const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client with service role key - for server-side operations like seeding data
// This bypasses RLS policies
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase; // Fallback to regular client if service key not available

// Guest-related functions
export type SupabaseGuest = {
  id: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type GuestData = {
  full_name: string;
  is_active: boolean;
};

export async function getGuestByName(name: string): Promise<SupabaseGuest | null> {
  try {
    // Use case insensitive comparison with ilike
    const { data, error } = await supabaseAdmin
      .from('guests')
      .select('*')
      .ilike('full_name', name)
      .single();

    if (error) {
      console.error('Error fetching guest:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getGuestByName:', error);
    return null;
  }
}

export async function checkGuestExists(name: string): Promise<boolean> {
  const guest = await getGuestByName(name);
  return guest !== null;
}

export async function getAllGuests(): Promise<SupabaseGuest[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('guests')
      .select('*')
      .order('full_name');

    if (error) {
      console.error('Error fetching all guests:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllGuests:', error);
    return [];
  }
}

export async function createGuest(guestData: GuestData): Promise<SupabaseGuest | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('guests')
      .insert([guestData])
      .select()
      .single();

    if (error) {
      console.error('Error creating guest:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createGuest:', error);
    return null;
  }
}

export async function updateGuest(id: string, guestData: Partial<GuestData>): Promise<SupabaseGuest | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('guests')
      .update(guestData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating guest:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updateGuest:', error);
    return null;
  }
}

export async function deleteGuest(id: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('guests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting guest:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteGuest:', error);
    return false;
  }
}

// Guest session management
export type GuestSession = {
  id: string;
  guest_id: string;
  session_token: string;
  created_at: string;
  expires_at: string;
}

export async function createGuestSession(guestId: string): Promise<GuestSession | null> {
  try {
    // Generate a random session token
    const sessionToken = Math.random().toString(36).substring(2, 15) + 
                         Math.random().toString(36).substring(2, 15);

    // Set expiration to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data, error } = await supabaseAdmin
      .from('guest_sessions')
      .insert([{
        guest_id: guestId,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating guest session:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createGuestSession:', error);
    return null;
  }
}

export async function validateGuestSession(sessionToken: string): Promise<SupabaseGuest | null> {
  try {
    // First get the session
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('guest_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString()) // Check if not expired
      .single();

    if (sessionError || !sessionData) {
      return null;
    }

    // Then get the guest
    const { data: guestData, error: guestError } = await supabaseAdmin
      .from('guests')
      .select('*')
      .eq('id', sessionData.guest_id)
      .eq('is_active', true)
      .single();

    if (guestError) {
      return null;
    }

    return guestData;
  } catch (error) {
    console.error('Error in validateGuestSession:', error);
    return null;
  }
}

export async function deleteGuestSession(sessionToken: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('guest_sessions')
      .delete()
      .eq('session_token', sessionToken);

    if (error) {
      console.error('Error deleting guest session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteGuestSession:', error);
    return false;
  }
} 