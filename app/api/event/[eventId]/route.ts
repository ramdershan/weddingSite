import { NextRequest, NextResponse } from 'next/server';
import { getEventByCode, validateGuestSession, checkGuestEventAccess } from '@/lib/supabase';
import { EventData } from '@/lib/types';
import { supabaseAdmin } from '@/lib/supabase';

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

// Helper function to format event data for API response
function formatEventData(event: any): EventData {
  return {
    id: event.code,
    title: event.name,
    description: event.description || '',
    date: formatDate(event.date),
    raw_date: event.date,
    time_start: formatTime(event.time_start),
    raw_time_start: event.time_start,
    time_end: formatTime(event.time_end),
    location: event.location,
    maps_link: event.maps_link || `https://maps.google.com/maps?q=${encodeURIComponent(event.location)}`,
    isParent: event.parent_event_id === null,
    parentEventId: event.parent_event_id,
    canRsvp: true, // Default to true for public endpoint
    rsvpDeadline: event.rsvp_deadline ? new Date(event.rsvp_deadline) : null,
    disabled: false
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Since our endpoints use event code as the ID, we treat eventId as the code
    const event = await getEventByCode(eventId);

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check user access if there's a session token
    // Get token from cookie first, then fallback to request parameter
    let sessionToken = request.cookies.get('guest_session')?.value;
    if (!sessionToken) {
      // Check in search params
      const searchParams = request.nextUrl.searchParams;
      sessionToken = searchParams.get('token') || undefined;
    }

    let hasAccess = true; // Default to true for public endpoints

    if (sessionToken) {
      // Validate the session token
      const guest = await validateGuestSession(sessionToken);
      if (guest) {
        // Check if this guest has access to this event
        hasAccess = await checkGuestEventAccess(guest.id, eventId);
        
        // If the guest doesn't have access, return a 403 Forbidden
        if (!hasAccess) {
          console.log(`[API] Guest ${guest.full_name} (${guest.id}) attempted to access event ${eventId} without permission`);
          return NextResponse.json(
            { error: 'You do not have permission to access this event' },
            { status: 403 }
          );
        }
      } else {
        // Invalid session token
        console.log(`[API] Invalid session token used to access event ${eventId}`);
        return NextResponse.json(
          { error: 'Invalid session token' },
          { status: 401 }
        );
      }
    }

    // Format the event data for the frontend
    const formattedEvent = formatEventData(event);
    formattedEvent.canRsvp = hasAccess; // Update canRsvp based on access check

    // If this is a parent event, fetch its child events
    let childEvents: EventData[] = [];
    if (formattedEvent.isParent) {
      try {
        // Fetch child events from Supabase
        const { data: childEventData, error: childEventError } = await supabaseAdmin
          .from('events')
          .select('*')
          .eq('parent_event_id', event.id)
          .eq('is_active', true);

        if (childEventError) {
          console.error('Error fetching child events:', childEventError);
        } else if (childEventData && childEventData.length > 0) {
          // If we have a guest session, check access for each child event
          if (sessionToken) {
            const guest = await validateGuestSession(sessionToken);
            if (guest) {
              // Process each child event
              for (const childEvent of childEventData) {
                const childHasAccess = await checkGuestEventAccess(guest.id, childEvent.code);
                const formattedChildEvent = formatEventData(childEvent);
                formattedChildEvent.canRsvp = childHasAccess;
                childEvents.push(formattedChildEvent);
              }
            } else {
              // No valid guest, format events with default access
              childEvents = childEventData.map(childEvent => formatEventData(childEvent));
            }
          } else {
            // No session token, format events with default access
            childEvents = childEventData.map(childEvent => formatEventData(childEvent));
          }
        }
      } catch (childError) {
        console.error('Error fetching child events:', childError);
      }
    }

    return NextResponse.json({ 
      event: formattedEvent,
      childEvents: childEvents
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 