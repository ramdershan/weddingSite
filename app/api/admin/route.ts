import { NextRequest, NextResponse } from 'next/server';
import { getGuestList } from '@/lib/data';
import { getAllGuests } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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
  } catch (error) {
    console.error('Error fetching guest list:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}