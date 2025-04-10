import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const eventId = params.eventId;
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    // Query for the event by code
    const { data: event, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('code', eventId)
      .single();
    
    if (error || !event) {
      console.error('Error fetching event:', error);
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    
    // Format the event data for the frontend
    const formattedEvent = {
      id: event.code,
      title: event.name,
      date: formatDate(event.date),
      time_start: formatTime(event.time_start),
      time_end: formatTime(event.time_end),
      location: event.location,
      maps_link: event.maps_link || `https://maps.google.com/maps?q=${encodeURIComponent(event.location)}`,
      description: event.description,
      rsvpDeadline: event.rsvp_deadline ? new Date(event.rsvp_deadline) : null,
    };
    
    return NextResponse.json({ event: formattedEvent });
  } catch (error) {
    console.error('Error in event API:', error);
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