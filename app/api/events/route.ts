import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  
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

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  
  try {
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

// GET /api/events - Get all events for timeline display
export async function GET(request: NextRequest) {
  try {
    console.log('[API Events] Fetching all events for timeline');
    
    // Fetch all active events, ordered by date and then start time
    const { data: eventsData, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('is_active', true)
      .order('date', { ascending: true })
      .order('time_start', { ascending: true });

    if (eventsError) {
      console.error('Error fetching all events:', eventsError);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    console.log(`[API Events] Fetched ${eventsData?.length || 0} events`);

    // Format events for the frontend
    const formattedEvents = (eventsData || []).map(event => {
      // Check for parent-child relationship
      const isParent = event.parent_event_id === null;
      
      // Create a map of event IDs to their codes for parent reference
      const eventCodeMap = new Map();
      eventsData.forEach(e => eventCodeMap.set(e.id, e.code));
      
      return {
        // Keep original values for sorting
        raw_date: event.date, 
        raw_time_start: event.time_start,
        // Formatted values for display
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
        canRsvp: false // Timeline events don't need RSVP access flag
      };
    });

    console.log(`[API Events] Returning ${formattedEvents.length} formatted events`);
    console.log(`[API Events] Event codes: ${formattedEvents.map(e => e.id).join(', ')}`);

    return NextResponse.json({ 
      events: formattedEvents 
    });

  } catch (error) {
    console.error('Error in /api/events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 