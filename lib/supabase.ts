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

export async function getEventByCode(eventCode: string): Promise<SupabaseEvent | null> {
  console.log(`[Supabase] Fetching event with code: ${eventCode}`);
  try {
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('code', eventCode)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching event by code:', error);
      return null;
    }

    console.log(`[Supabase] Found event: ${data?.name || 'Not found'}`);
    return data;
  } catch (error) {
    console.error('Error in getEventByCode:', error);
    return null;
  }
}

// Get guest RSVP responses from Supabase
export async function getGuestResponses(guestId: string): Promise<Record<string, any> | null> {
  console.log(`[Supabase] Fetching RSVP responses for guest ID: ${guestId}`);
  try {
    // Fetch guest RSVP responses from the rsvps table
    const { data, error } = await supabaseAdmin
      .from('rsvps')
      .select('*')
      .eq('guest_id', guestId);

    if (error) {
      console.error('Error fetching guest responses:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log(`[Supabase] No RSVP responses found for guest ID: ${guestId}`);
      return null;
    }

    // Format the responses as a record of event code -> response details
    const formattedResponses: Record<string, any> = {};
    
    // Get all events to map from event_id to event_code
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('id, code');
      
    if (eventsError) {
      console.error('Error fetching events for response mapping:', eventsError);
      return null;
    }
    
    // Create a map of event IDs to codes
    const eventMap = new Map();
    if (events) {
      events.forEach(event => eventMap.set(event.id, event.code));
    }
    
    // Format each response with the event code as the key
    data.forEach(response => {
      const eventCode = eventMap.get(response.event_id);
      if (eventCode) {
        formattedResponses[eventCode] = {
          response: response.response,
          dietaryRestrictions: response.dietary_restrictions || '',
          plusOne: response.has_plus_ones || false,
          plusOneCount: Number(response.plus_one_count) || 0,
          adultCount: Number(response.adult_count) || 0,
          childrenCount: Number(response.children_count) || 0,
          respondedAt: response.responded_at,
          updatedAt: response.updated_at
        };
      }
    });

    console.log(`[Supabase] Found ${Object.keys(formattedResponses).length} RSVP responses for guest ID: ${guestId}`);
    return formattedResponses;
  } catch (error) {
    console.error('Error in getGuestResponses:', error);
    return null;
  }
}

// Update a guest's RSVP response in Supabase
export async function updateGuestResponse(
  guestId: string,
  eventCode: string,
  responseData: {
    response: "Yes" | "No" | "Maybe";
    dietaryRestrictions?: string;
    plusOne?: boolean;
    plusOneCount?: number;
    adultCount?: number;
    childrenCount?: number;
  }
): Promise<boolean> {
  console.log(`[Supabase] Updating RSVP response for guest ID: ${guestId}, event: ${eventCode}`);
  try {
    // First get the event ID from code
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, parent_event_id')
      .eq('code', eventCode)
      .single();

    if (eventError || !event) {
      console.error('Error finding event by code:', eventError);
      return false;
    }

    // Use the response directly (Yes/No/Maybe)
    const dbResponse = responseData.response;
    const now = new Date().toISOString();
    
    // Determine if has_plus_ones should be true based on counts
    // If both adult and children counts are 0, set has_plus_ones to false regardless of input
    const adultCount = responseData.adultCount || 0;
    const childrenCount = responseData.childrenCount || 0;
    const hasPlusOnes = (adultCount > 0 || childrenCount > 0) ? !!responseData.plusOne : false;
    
    // Calculate the total plus one count
    // If has_plus_ones is false, ensure the count is always 0
    const plusOneCount = hasPlusOnes ? String(responseData.plusOneCount || 0) : "0";

    // Use upsert operation for the current event
    const { error: upsertError } = await supabaseAdmin
      .from('rsvps')
      .upsert({
        guest_id: guestId,
        event_id: event.id,
        response: dbResponse,
        dietary_restrictions: responseData.dietaryRestrictions || '',
        has_plus_ones: hasPlusOnes,
        plus_one_count: plusOneCount,
        adult_count: String(hasPlusOnes ? adultCount : 0),
        children_count: String(hasPlusOnes ? childrenCount : 0),
        responded_at: now,
        updated_at: now
      }, {
        // The conflict constraint is on guest_id and event_id
        onConflict: 'guest_id,event_id'
      });

    if (upsertError) {
      console.error('Error upserting guest response:', upsertError);
      return false;
    }

    // Check if this is a parent event (no parent_event_id) and the response is "No"
    // If so, we need to automatically decline all child events
    if (!event.parent_event_id && dbResponse === "No") {
      // Find all child events that belong to this parent
      const { data: childEvents, error: childError } = await supabaseAdmin
        .from('events')
        .select('id, code')
        .eq('parent_event_id', event.id);
      
      if (childError) {
        console.error('Error finding child events:', childError);
        // Continue since the main event was updated successfully
      } else if (childEvents && childEvents.length > 0) {
        console.log(`[Supabase] Found ${childEvents.length} child events to auto-decline`);
        
        // Create an array of upsert operations for all child events
        const childRsvps = childEvents.map(childEvent => ({
          guest_id: guestId,
          event_id: childEvent.id,
          response: "No", // Auto-decline
          dietary_restrictions: '', // Clear any dietary restrictions
          has_plus_ones: false, // No plus ones for declined events
          plus_one_count: "0", 
          adult_count: "0",
          children_count: "0",
          responded_at: now,
          updated_at: now
        }));
        
        // Batch upsert all child event RSVPs
        const { error: childUpsertError } = await supabaseAdmin
          .from('rsvps')
          .upsert(childRsvps, {
            onConflict: 'guest_id,event_id'
          });
          
        if (childUpsertError) {
          console.error('Error auto-declining child events:', childUpsertError);
          // Continue since the main event was updated successfully
        } else {
          console.log(`[Supabase] Successfully auto-declined ${childEvents.length} child events`);
        }
      }
    }
    
    // If this is a child event and response is "Yes" or "Maybe", ensure parent is not "No"
    if (event.parent_event_id && (dbResponse === "Yes" || dbResponse === "Maybe")) {
      // Check parent event response
      const { data: parentRsvp, error: parentRsvpError } = await supabaseAdmin
        .from('rsvps')
        .select('response')
        .eq('guest_id', guestId)
        .eq('event_id', event.parent_event_id)
        .single();
        
      if (!parentRsvpError && parentRsvp && parentRsvp.response === "No") {
        console.log(`[Supabase] Parent event is declined but trying to accept child event. Updating parent.`);
        
        // Update parent event to "Maybe" since a child event is being accepted
        const { error: parentUpdateError } = await supabaseAdmin
          .from('rsvps')
          .upsert({
            guest_id: guestId,
            event_id: event.parent_event_id,
            response: "Maybe", // Set to Maybe as a minimum
            dietary_restrictions: responseData.dietaryRestrictions || '',
            has_plus_ones: hasPlusOnes,
            plus_one_count: plusOneCount,
            adult_count: String(hasPlusOnes ? adultCount : 0),
            children_count: String(hasPlusOnes ? childrenCount : 0),
            responded_at: now,
            updated_at: now
          }, {
            onConflict: 'guest_id,event_id'
          });
          
        if (parentUpdateError) {
          console.error('Error updating parent event response:', parentUpdateError);
          // Continue since the child event was updated successfully
        } else {
          console.log(`[Supabase] Successfully updated parent event to "Maybe"`);
        }
      }
    }

    console.log(`[Supabase] Successfully updated response for guest ID: ${guestId}, event: ${eventCode}`);
    return true;
  } catch (error) {
    console.error('Error in updateGuestResponse:', error);
    return false;
  }
}

// Get RSVP summary data directly from Supabase
export async function getRSVPSummaryFromSupabase(): Promise<{
  events: {
    [eventId: string]: {
      yes: number;
      no: number;
      maybe: number;
      totalAttending: number;
      plusOnes: number;
      adultGuests: number;
      childrenGuests: number;
    }
  },
  totalGuests: number;
  totalResponded: number;
  totalAttending: number;
  totalPlusOnes: number;
}> {
  try {
    console.log(`[Supabase] Fetching RSVP summary data`);
    
    // Get all events
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('id, code, name, parent_event_id')
      .eq('is_active', true);
      
    if (eventsError) {
      console.error('Error fetching events for summary:', eventsError);
      throw eventsError;
    }
    
    // Get all RSVPs
    const { data: rsvps, error: rsvpsError } = await supabaseAdmin
      .from('rsvps')
      .select('*');
      
    if (rsvpsError) {
      console.error('Error fetching RSVPs for summary:', rsvpsError);
      throw rsvpsError;
    }
    
    // Get total guest count
    const { data: guests, error: guestsError } = await supabaseAdmin
      .from('guests')
      .select('id')
      .eq('is_active', true);
      
    if (guestsError) {
      console.error('Error fetching guests for summary:', guestsError);
      throw guestsError;
    }
    
    // Initialize summary data
    const summary = {
      events: {} as Record<string, any>,
      totalGuests: guests?.length || 0,
      totalResponded: 0,
      totalAttending: 0,
      totalPlusOnes: 0
    };
    
    // Create a map of event IDs to event codes for easy lookup
    const eventMap = new Map();
    events?.forEach(event => {
      eventMap.set(event.id, event.code);
      
      // Initialize event summary data
      summary.events[event.code] = {
        yes: 0,
        no: 0,
        maybe: 0,
        totalAttending: 0,
        plusOnes: 0,
        adultGuests: 0,
        childrenGuests: 0
      };
    });
    
    // Track unique guests who have responded
    const respondedGuestIds = new Set<string>();
    
    // Process RSVPs
    rsvps?.forEach(rsvp => {
      const eventCode = eventMap.get(rsvp.event_id);
      if (!eventCode || !summary.events[eventCode]) return;
      
      // Add guest to responded set
      respondedGuestIds.add(rsvp.guest_id);
      
      // Count responses by type
      if (rsvp.response === 'Yes') {
        summary.events[eventCode].yes++;
        
        // Count attending guests and plus ones
        const adults = parseInt(rsvp.adult_count) || 0;
        const children = parseInt(rsvp.children_count) || 0;
        const totalPlusOnes = adults + children;
        
        summary.events[eventCode].totalAttending++;
        summary.events[eventCode].plusOnes += totalPlusOnes;
        summary.events[eventCode].adultGuests += adults;
        summary.events[eventCode].childrenGuests += children;
        
        // Add to totals for engagement, wedding, and reception (parent events)
        if (['engagement', 'wedding', 'reception'].includes(eventCode)) {
          summary.totalAttending++;
          summary.totalPlusOnes += totalPlusOnes;
        }
      } else if (rsvp.response === 'No') {
        summary.events[eventCode].no++;
      } else if (rsvp.response === 'Maybe') {
        summary.events[eventCode].maybe++;
      }
    });
    
    // Set total responded guests
    summary.totalResponded = respondedGuestIds.size;
    
    return summary;
  } catch (error) {
    console.error('Error in getRSVPSummaryFromSupabase:', error);
    throw error;
  }
}

// Get all guests with their RSVP responses from Supabase
export async function getGuestsWithResponsesFromSupabase(): Promise<any[]> {
  try {
    console.log(`[Supabase] Fetching all guests with RSVP responses`);
    
    // Get all guests
    const { data: guests, error: guestsError } = await supabaseAdmin
      .from('guests')
      .select('*')
      .eq('is_active', true)
      .order('full_name');
      
    if (guestsError) {
      console.error('Error fetching guests with responses:', guestsError);
      throw guestsError;
    }
    
    // Get all RSVPs
    const { data: rsvps, error: rsvpsError } = await supabaseAdmin
      .from('rsvps')
      .select('*');
      
    if (rsvpsError) {
      console.error('Error fetching RSVPs for guests:', rsvpsError);
      throw rsvpsError;
    }
    
    // Get all events to map from event_id to event_code
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('id, code, name, parent_event_id');
      
    if (eventsError) {
      console.error('Error fetching events for guest mapping:', eventsError);
      throw eventsError;
    }
    
    // Create a map of event IDs to events for easy lookup
    const eventMap = new Map();
    events?.forEach(event => {
      eventMap.set(event.id, {
        code: event.code,
        name: event.name,
        parentEventId: event.parent_event_id
      });
    });
    
    // Group RSVPs by guest ID
    const rsvpsByGuest = rsvps?.reduce((acc, rsvp) => {
      if (!acc[rsvp.guest_id]) {
        acc[rsvp.guest_id] = [];
      }
      acc[rsvp.guest_id].push(rsvp);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Format guests with their responses
    const formattedGuests = guests?.map(guest => {
      const guestRsvps = rsvpsByGuest[guest.id] || [];
      
      // Format event responses
      const eventResponses: Record<string, any> = {};
      let dietaryRestrictionsText = '';
      
      guestRsvps.forEach(rsvp => {
        const event = eventMap.get(rsvp.event_id);
        if (!event) return;
        
        // Add event response
        eventResponses[event.code] = {
          response: rsvp.response,
          dietaryRestrictions: rsvp.dietary_restrictions || '',
          plusOne: rsvp.has_plus_ones,
          plusOneCount: parseInt(rsvp.plus_one_count) || 0,
          adultCount: parseInt(rsvp.adult_count) || 0,
          childrenCount: parseInt(rsvp.children_count) || 0,
          respondedAt: rsvp.responded_at,
          updatedAt: rsvp.updated_at
        };
        
        // Add dietary restrictions to the main text
        if (rsvp.dietary_restrictions && rsvp.dietary_restrictions.trim()) {
          dietaryRestrictionsText += `${event.name}: ${rsvp.dietary_restrictions}\n`;
        }
      });
      
      // Format the guest with responses
      return {
        id: guest.id,
        fullName: guest.full_name,
        isActive: guest.is_active,
        responded: Object.keys(eventResponses).length > 0,
        dietaryRestrictions: dietaryRestrictionsText.trim(),
        eventResponses,
        createdAt: guest.created_at,
        updatedAt: guest.updated_at
      };
    }) || [];
    
    return formattedGuests;
  } catch (error) {
    console.error('Error in getGuestsWithResponsesFromSupabase:', error);
    throw error;
  }
} 