import { NextRequest, NextResponse } from 'next/server';
import { getGuestList } from '@/lib/data';
import { getAllGuests, getGuestsWithResponsesFromSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get guests with their RSVP responses directly from Supabase
    const guestsWithResponses = await getGuestsWithResponsesFromSupabase();
    
    return NextResponse.json({ guests: guestsWithResponses });
  } catch (error) {
    console.error('Error fetching guest list from Supabase:', error);
    
    // Fallback to the legacy local storage approach if Supabase fails
    try {
      // Get guests from local storage for RSVP details
      const localGuestList = getGuestList();
      
      // Get guests from Supabase for authentication details
      const supabaseGuests = await getAllGuests();
      
      // Merge the data, prioritizing local storage for RSVP details
      // but ensuring all Supabase guests are included
      const mergedGuestData = supabaseGuests.map(supabaseGuest => {
        const localGuest = localGuestList[supabaseGuest.full_name.toLowerCase()];
        
        if (localGuest) {
          // Return the local guest data which has RSVP details
          return localGuest;
        } else {
          // This guest exists in Supabase but hasn't RSVP'd yet
          return {
            fullName: supabaseGuest.full_name,
            responded: false,
            isActive: supabaseGuest.is_active
          };
        }
      });
      
      return NextResponse.json({ guests: mergedGuestData });
    } catch (fallbackError) {
      console.error('Fallback method also failed:', fallbackError);
      return NextResponse.json(
        { error: 'Failed to fetch guest data' },
        { status: 500 }
      );
    }
  }
}