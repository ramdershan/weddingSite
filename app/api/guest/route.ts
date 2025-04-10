import { NextRequest, NextResponse } from 'next/server';
import { getGuestByName, createGuestSession, getGuestEvents } from '@/lib/supabase';
import { getGuest } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fullName = searchParams.get('name');
    const eventId = searchParams.get('eventId');
    
    if (!fullName) {
      return NextResponse.json(
        { error: 'Name parameter is required' },
        { status: 400 }
      );
    }
    
    // Check if guest exists in Supabase
    const supabaseGuest = await getGuestByName(fullName);
    
    if (!supabaseGuest || !supabaseGuest.is_active) {
      return NextResponse.json(
        { error: 'Guest not found in approved list' },
        { status: 403 }
      );
    }
    
    console.log(`[API] Guest login successful: ${supabaseGuest.full_name} (ID: ${supabaseGuest.id})`);
    
    // Get guest events from Supabase
    const { events, access } = await getGuestEvents(supabaseGuest.id);
    
    // Get guest data from local storage if it exists
    const guest = getGuest(fullName);
    
    // Create a new session for the guest
    const session = await createGuestSession(supabaseGuest.id);
    
    // Map events to a format the front-end expects
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
        isParent: isParent,
        parentEventId: event.parent_event_id ? eventCodeMap.get(event.parent_event_id) : null,
        canRsvp: access.find(a => a.event_id === event.id)?.can_rsvp ?? false
      };
    });
    
    // Get the event IDs that the guest can access
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
    
    // Prepare response with session token for client-side storage
    const response = NextResponse.json({ 
      guest: guest || {
        fullName: supabaseGuest.full_name,
        responded: false,
        invitedEvents: invitedEventCodes || ['engagement', 'wedding', 'reception']
      },
      events: formattedEvents,
      sessionToken: session?.session_token
    });
    
    // Optional: Set a session cookie
    if (session?.session_token) {
      response.cookies.set('guest_session', session.session_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/'
      });
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching guest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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