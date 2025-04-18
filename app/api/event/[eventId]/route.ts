import { NextRequest, NextResponse } from 'next/server';
import { getEventByCode } from '@/lib/supabase';
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

    // Format the event data for the frontend
    const formattedEvent = formatEventData(event);

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
          // Format child events
          childEvents = childEventData.map(childEvent => formatEventData(childEvent));
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