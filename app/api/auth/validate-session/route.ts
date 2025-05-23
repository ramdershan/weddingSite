import { NextRequest, NextResponse } from 'next/server';
import { validateGuestSession, getGuestEvents, getGuestResponses } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken, useCookie } = body;
    
    // If useCookie flag is true, try to get session token from cookie
    let tokenToValidate = sessionToken;
    if (useCookie || !tokenToValidate) {
      const cookieToken = request.cookies.get('guest_session')?.value;
      if (cookieToken) {
        tokenToValidate = cookieToken;
      }
    }
    
    if (!tokenToValidate) {
      return NextResponse.json(
        { success: false, error: 'No session token provided' },
        { status: 400 }
      );
    }
    
    // Validate the session token
    const guest = await validateGuestSession(tokenToValidate);
    
    if (!guest) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }
    
    console.log(`[API] Session validated for guest: ${guest.full_name} (ID: ${guest.id})`);
    
    // Get events the guest has access to
    const { events, access } = await getGuestEvents(guest.id);
    
    // Get guest responses from Supabase
    const guestResponses = await getGuestResponses(guest.id);
    
    // Format events for front-end
    const formattedEvents = events.map(event => {
      // Check for parent-child relationship
      const isParent = event.parent_event_id === null;
      console.log(`Event ${event.code} (${event.name}): parent_event_id=${event.parent_event_id}, isParent=${isParent}`);
      
      // Create a map of event IDs to their codes for parent reference
      const eventCodeMap = new Map();
      events.forEach(e => eventCodeMap.set(e.id, e.code));
      
      return {
        id: event.code,
        title: event.name,
        date: formatDate(event.date),
        time_start: formatTime(event.time_start),
        time_end: formatTime(event.time_end),
        location: event.location,
        maps_link: event.maps_link || `https://maps.google.com/maps?q=${encodeURIComponent(event.location)}`,
        description: event.description,
        rsvpDeadline: event.rsvp_deadline ? new Date(event.rsvp_deadline) : null,
        rsvpOpenDate: event.rsvp_open_date ? new Date(event.rsvp_open_date) : null,
        isParent: isParent,
        parentEventId: event.parent_event_id ? eventCodeMap.get(event.parent_event_id) : null,
        canRsvp: access.find(a => a.event_id === event.id)?.can_rsvp ?? false
      };
    });
    
    // Get event codes that guest is invited to
    const invitedEventCodes = formattedEvents.map(event => event.id);
    
    // Get the event IDs that the guest can RSVP to
    const rsvpEventCodes = formattedEvents
      .filter(event => event.canRsvp)
      .map(event => event.id);
    
    console.log(`[API] Returning ${formattedEvents.length} events to client`);
    console.log(`[API] Event summary: ${formattedEvents.map(e => 
      `${e.id} (parent: ${e.isParent}, parent_id: ${e.parentEventId || 'none'}, can_rsvp: ${e.canRsvp})`
    ).join(', ')}`);
    console.log(`[API] Events with RSVP access: ${rsvpEventCodes.join(', ')}`);
    
    // Log RSVP responses if available
    if (guestResponses && Object.keys(guestResponses).length > 0) {
      console.log(`[API Validate] Guest ${guest.full_name} has responded to events:`, 
        Object.keys(guestResponses).map(eventId => {
          const response = guestResponses[eventId]?.response;
          return `${eventId} (${response})`;
        }).join(', ')
      );
    } else {
      console.log(`[API Validate] Guest ${guest.full_name} has not responded to any events yet`);
    }
    
    // Return guest data from Supabase and the token if retrieved from cookie
    return NextResponse.json({
      success: true,
      guest: {
        fullName: guest.full_name,
        invitedEvents: invitedEventCodes.length > 0 ? invitedEventCodes : ['engagement', 'wedding', 'reception'],
        responded: guestResponses !== null,
        // Add event responses data if available
        ...(guestResponses ? { eventResponses: guestResponses } : {})
      },
      events: formattedEvents,
      // Return the token if it was retrieved from cookie so it can be saved to localStorage
      ...(useCookie ? { sessionToken: tokenToValidate } : {})
    });
  } catch (error) {
    console.error('Error validating session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to format dates to "Jan 24, 2026" format
function formatDate(dateStr: string): string {
  try {
    // Parse date string directly without timezone conversion
    // Format: 2026-01-24
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // Create a date using UTC methods to avoid timezone issues
    const date = new Date();
    date.setUTCFullYear(year);
    date.setUTCMonth(month - 1); // Months are 0-indexed
    date.setUTCDate(day);
    
    // Format the date using UTC to avoid timezone adjustments
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC' // Ensure UTC interpretation
    });
    
    return formatter.format(date);
  } catch (e) {
    console.error('Error formatting date:', e, dateStr);
    return dateStr; // Return original if parsing fails
  }
}

// Helper function to format time strings to "3 PM" format
function formatTime(timeStr: string): string {
  try {
    if (!timeStr) return "";
    
    // Parse time string (assuming format like "13:30:00")
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // Check if time is past 10:30 PM (22:30)
    if (hours >= 22 && minutes >= 30 || hours >= 23) {
      return "Late";
    }
    
    // Convert to AM/PM format
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    
    // Only add minutes if they're not zero
    return minutes === 0 
      ? `${displayHours} ${period}`
      : `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch (e) {
    return timeStr; // Return original if parsing fails
  }
} 