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
  invited_events?: string[]; // Array of event IDs the guest is invited to
};

export type GuestData = {
  full_name: string;
  is_active: boolean;
  invited_events?: string[];
};

// Event-related types
export type SupabaseEvent = {
  id: string;
  code: string;
  name: string;
  parent_event_id: string | null;
  category: string;
  date: string;
  time_start: string;
  time_end: string;
  location: string;
  maps_link?: string;
  description: string;
  rsvp_deadline: string;
  is_active: boolean;
  max_plus_ones: string;
  created_at: string;
  updated_at: string;
};

export type EventAccess = {
  id: string;
  guest_id: string;
  event_id: string;
  can_rsvp: boolean;
  created_at: string;
};

// Function to get events a guest has access to
export async function getGuestEvents(guestId: string): Promise<{events: SupabaseEvent[], access: EventAccess[]}> {
  console.log(`[Supabase] Fetching events for guest ID: ${guestId}`);
  try {
    // First approach: Get only the events with RSVP access
    // Get the event IDs that the guest can RSVP to
    const { data: accessData, error: accessError } = await supabaseAdmin
      .from('guest_event_access')
      .select('*')
      .eq('guest_id', guestId)
      .eq('can_rsvp', true);  // Only include events where the guest can RSVP

    if (accessError) {
      console.error('Error fetching guest event access:', accessError);
      return { events: [], access: [] };
    }

    console.log(`[Supabase] Found ${accessData?.length || 0} event access records for guest with RSVP permissions`);
    
    if (!accessData || accessData.length === 0) {
      return { events: [], access: [] };
    }

    // Get only the events with RSVP access
    const eventIds = accessData.map(access => access.event_id);
    
    // Fetch the events
    const { data: eventsData, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('*')
      .in('id', eventIds)
      .eq('is_active', true);

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return { events: [], access: accessData };
    }
    
    console.log(`[Supabase] Fetched ${eventsData?.length || 0} events with RSVP access for guest`);
    
    if (!eventsData || eventsData.length === 0) {
      return { events: [], access: accessData };
    }
    
    console.log(`[Supabase] Event IDs: ${eventsData.map(e => e.id).join(', ')}`);
    console.log(`[Supabase] Event Codes: ${eventsData.map(e => e.code).join(', ')}`);
    
    return { 
      events: eventsData, 
      access: accessData 
    };
  } catch (error) {
    console.error('Error in getGuestEvents:', error);
    return { events: [], access: [] };
  }
}

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

    console.log(`[Supabase] Found guest with ID: ${data?.id}`);
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

    // Then get the guest with their invited events
    const { data: guestData, error: guestError } = await supabaseAdmin
      .from('guests')
      .select('*')
      .eq('id', sessionData.guest_id)
      .eq('is_active', true)
      .single();

    if (guestError) {
      return null;
    }

    // Default to all events if invited_events is not specified
    if (!guestData.invited_events) {
      console.log(`Guest ${guestData.full_name} has no specific event invitations, defaulting to all events`);
      guestData.invited_events = ['engagement', 'wedding', 'reception'];
    } else {
      console.log(`Guest ${guestData.full_name} is invited to: ${guestData.invited_events.join(', ')}`);
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