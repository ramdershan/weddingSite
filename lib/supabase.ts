// Load environment variables from .env file when used in non-NextJS context
import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
// Import the missing type
import type { RSVPSummary, EventSummaryStats } from './types';

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
  dietary_restrictions?: string; // Add optional dietary restrictions field
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
    
    // Fetch the events, ordered by date and then start time
    const { data: eventsData, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('*')
      .in('id', eventIds)
      .eq('is_active', true)
      .order('date', { ascending: true })
      .order('time_start', { ascending: true });

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

    // Handle specific Supabase client errors (e.g., 'PGRST116' is no rows found)
    if (error) {
      // If the error indicates the guest was simply not found, return null quietly.
      // You might need to adjust the error code check based on Supabase specifics.
      if (error.code === 'PGRST116') {
        console.log(`[Supabase] Guest not found: ${name}`);
        return null;
      }
      // For other Supabase client errors, log it but still consider it an internal failure.
      console.error('Supabase client error fetching guest:', error);
      throw new Error(`Supabase client error: ${error.message}`); // Re-throw other client errors
    }

    // If data is explicitly null but no error, it means guest not found by ilike
    if (data === null) {
        console.log(`[Supabase] Guest not found (no match for ilike): ${name}`);
        return null;
    }

    console.log(`[Supabase] Found guest with ID: ${data.id}`);
    return data;
  } catch (error) {
    // Catch network errors or other unexpected issues during the fetch
    console.error('Caught error in getGuestByName:', error);
    // Re-throw the error so the calling function (API route) handles it as a 500
    throw error;
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
    
    // --- NEW: Update the main guest record --- 
    const { error: guestUpdateError } = await supabaseAdmin
      .from('guests')
      .update({ dietary_restrictions: responseData.dietaryRestrictions || '' })
      .eq('id', guestId);
      
    if (guestUpdateError) {
       console.error('[Supabase] Error updating guest dietary restrictions:', guestUpdateError);
       // Log the error but don't fail the entire operation, as the RSVP itself succeeded.
    } else {
        console.log(`[Supabase] Successfully updated main dietary restrictions for guest ID: ${guestId}`);
    }
    // --- END NEW --- 

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

// Update the return type definition for clarity and alignment with types.ts
export async function getRSVPSummaryFromSupabase(): Promise<RSVPSummary> {
  try {
    console.log(`[Supabase] Fetching RSVP summary data`);
    
    // Get all active events
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
      .select('*'); // Select needed fields: guest_id, event_id, response, adult_count, children_count
      
    if (rsvpsError) {
      console.error('Error fetching RSVPs for summary:', rsvpsError);
      throw rsvpsError;
    }
    
    // Get total active guest count
    const { count: totalInvitedGuests, error: guestsError } = await supabaseAdmin
      .from('guests')
      .select('id', { count: 'exact', head: true }) // Use count for efficiency
      .eq('is_active', true);
      
    if (guestsError) {
      console.error('Error fetching guests count for summary:', guestsError);
      throw guestsError;
    }
    
    // Initialize summary data structure according to RSVPSummary type
    const summary: RSVPSummary = {
      invitedGuests: totalInvitedGuests || 0,
      responded: 0, // Will be calculated later
      notResponded: 0, // Will be calculated later
      adultGuests: 0, // Initialize overall counts
      childrenGuests: 0,
      events: {} // Initialize events object
      // REMOVED: totalGuests (use invitedGuests), totalAttending, totalPlusOnes from top level
    };
    
    // Create a map of event IDs to event codes for easy lookup
    const eventMap = new Map<string, string>();
    events?.forEach(event => {
      eventMap.set(event.id, event.code);
      
      // Initialize event summary data for each active event
      summary.events[event.code] = {
        yes: 0,
        no: 0,
        maybe: 0,
        totalAttending: 0,
        plusOnes: 0,
        adultsAttending: 0, 
        childrenAttending: 0 
      };
    });
    
    // Track unique guests who have responded AT LEAST ONCE
    const respondedGuestIds = new Set<string>();
    
    // Process RSVPs
    rsvps?.forEach(rsvp => {
      const eventCode = eventMap.get(rsvp.event_id);
      // Only process if the event exists in our active events map
      if (!eventCode || !summary.events[eventCode]) return; 
      
      // Add guest to responded set (counts guest if they responded to ANY event)
      respondedGuestIds.add(rsvp.guest_id);
      
      const eventSummary = summary.events[eventCode];
      
      // Count responses by type
      if (rsvp.response === 'Yes') {
        eventSummary.yes++;
        
        // Calculate attending counts for this specific event
        const adults = parseInt(rsvp.adult_count || '0') || 0;
        const children = parseInt(rsvp.children_count || '0') || 0;
        const plusOnesForEvent = adults + children; // Plus ones for THIS rsvp
        const primaryGuestAttending = 1; // The guest themselves
        
        eventSummary.adultsAttending = (eventSummary.adultsAttending || 0) + adults;
        eventSummary.childrenAttending = (eventSummary.childrenAttending || 0) + children;
        eventSummary.plusOnes = (eventSummary.plusOnes || 0) + plusOnesForEvent;
        eventSummary.totalAttending = (eventSummary.totalAttending || 0) + primaryGuestAttending + plusOnesForEvent;
        
        // Accumulate overall adult/child counts IF this is the first 'Yes' for this guest to avoid double counting?
        // -- Let's simplify: calculate overall adult/children totals separately after this loop --

      } else if (rsvp.response === 'No') {
        eventSummary.no++;
      } else if (rsvp.response === 'Maybe') {
        // Treat Maybe like Yes for counting potential attendees?
        // For now, just count maybe separately.
         eventSummary.maybe++;
         // Optionally count maybe attendees like Yes - uncomment if needed
         /*
         const adults = parseInt(rsvp.adult_count || '0') || 0;
         const children = parseInt(rsvp.children_count || '0') || 0;
         const plusOnesForEvent = adults + children;
         const primaryGuestAttending = 1;
         eventSummary.adultsAttending = (eventSummary.adultsAttending || 0) + adults;
         eventSummary.childrenAttending = (eventSummary.childrenAttending || 0) + children;
         eventSummary.plusOnes = (eventSummary.plusOnes || 0) + plusOnesForEvent;
         eventSummary.totalAttending = (eventSummary.totalAttending || 0) + primaryGuestAttending + plusOnesForEvent;
         */
      }
    });
    
    // Calculate overall adult/children counts by summing from PER-GUEST MAX attending count
    // This prevents double counting if a guest says Yes to multiple events
    const guestAttendanceCounts: Record<string, { adults: number, children: number }> = {};
    rsvps?.forEach(rsvp => {
       if (rsvp.response === 'Yes') { // Only count definite Yes
           const adults = parseInt(rsvp.adult_count || '0') || 0;
           const children = parseInt(rsvp.children_count || '0') || 0;
           if (!guestAttendanceCounts[rsvp.guest_id]) {
               guestAttendanceCounts[rsvp.guest_id] = { adults: 0, children: 0 };
           }
           // Store the MAX counts per guest across all their 'Yes' responses
           guestAttendanceCounts[rsvp.guest_id].adults = Math.max(guestAttendanceCounts[rsvp.guest_id].adults, adults);
           guestAttendanceCounts[rsvp.guest_id].children = Math.max(guestAttendanceCounts[rsvp.guest_id].children, children);
       }
    });
    
    Object.values(guestAttendanceCounts).forEach(counts => {
        summary.adultGuests += counts.adults;
        summary.childrenGuests += counts.children;
    });

    // Set final calculated overall response counts
    summary.responded = respondedGuestIds.size;
    summary.notResponded = summary.invitedGuests - summary.responded;
    
    console.log('[Supabase] RSVP Summary Calculation Complete');
    return summary;
  } catch (error) {
    console.error('[Supabase] Error in getRSVPSummaryFromSupabase:', error);
    // Re-throw or return a default structure?
    // Returning a default structure to avoid breaking the API route
     return {
      invitedGuests: 0,
      responded: 0,
      notResponded: 0,
      adultGuests: 0,
      childrenGuests: 0,
      events: {}
    };
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
      
      guestRsvps.forEach((rsvp: any) => {
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
      });
      
      // Format the guest with responses - use the guest's dietary_restrictions directly from the guests table
      return {
        id: guest.id,
        fullName: guest.full_name,
        isActive: guest.is_active,
        responded: Object.keys(eventResponses).length > 0,
        dietaryRestrictions: guest.dietary_restrictions || '',
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