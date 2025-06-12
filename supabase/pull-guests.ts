// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

import { supabaseAdmin } from '../lib/supabase';
import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';

type Guest = {
  id: string;
  full_name: string;
  phone_number: string;
};

type Event = {
  id: string;
  code: string;
};

type GuestEventAccess = {
  guest_id: string;
  event_id: string;
};

async function fetchAllData() {
  console.log('[Pull] Fetching all required data from Supabase...');

  const guestsPromise = supabaseAdmin.from('guests').select('id, full_name, phone_number').eq('is_active', true);
  const eventsPromise = supabaseAdmin.from('events').select('id, code');
  const accessPromise = supabaseAdmin.from('guest_event_access').select('guest_id, event_id');

  const [
    { data: guests, error: guestsError },
    { data: events, error: eventsError },
    { data: access, error: accessError },
  ] = await Promise.all([guestsPromise, eventsPromise, accessPromise]);

  if (guestsError) throw new Error(`Error fetching guests: ${guestsError.message}`);
  if (eventsError) throw new Error(`Error fetching events: ${eventsError.message}`);
  if (accessError) throw new Error(`Error fetching event access: ${accessError.message}`);
  
  console.log(`[Pull] Fetched ${guests?.length} guests, ${events?.length} events, and ${access?.length} access records.`);

  return { guests: guests || [], events: events || [], access: access || [] };
}

async function main() {
  console.log('[Pull] Starting script to pull guests from Supabase and update local CSV...');

  try {
    const { guests, events, access } = await fetchAllData();

    if (!guests.length) {
      console.warn('[Pull] No active guests found in Supabase. The CSV will be empty.');
      // You might want to handle this case, e.g., by not writing the file at all.
    }

    // Create a map of eventId -> eventCode for quick lookups
    const eventMap = new Map<string, string>();
    events.forEach(event => eventMap.set(event.id, event.code));
    console.log(`[Pull] Created map for ${eventMap.size} events.`);

    // Create a map of guestId -> list of event codes
    const guestEventCodeMap = new Map<string, string[]>();
    access.forEach(acc => {
      const eventCode = eventMap.get(acc.event_id);
      if (eventCode) {
        const codes = guestEventCodeMap.get(acc.guest_id) || [];
        codes.push(eventCode);
        guestEventCodeMap.set(acc.guest_id, codes);
      }
    });
     console.log(`[Pull] Mapped event access for ${guestEventCodeMap.size} guests.`);

    // Prepare data for CSV
    const csvData = guests.map(guest => {
      const eventCodes = guestEventCodeMap.get(guest.id) || [];
      return {
        name: guest.full_name.replace(/(\r\n|\n|\r)/gm, " ").trim(),
        phoneNumber: guest.phone_number || '',
        rsvpEventCodes: eventCodes.join(','),
      };
    });

    const csvPath = path.join(process.cwd(), 'data', 'guests.csv');
    const csvWriter = createObjectCsvWriter({
      path: csvPath,
      header: [
        { id: 'name', title: 'name' },
        { id: 'phoneNumber', title: 'phoneNumber' },
        { id: 'rsvpEventCodes', title: 'rsvpEventCodes' },
      ],
    });

    await csvWriter.writeRecords(csvData);
    console.log(`[Pull] Successfully updated CSV file at: ${csvPath}`);
    console.log(`[Pull] Wrote ${csvData.length} guest records to the file.`);

  } catch (error) {
    console.error('[Pull] An error occurred during the script execution:', error);
    process.exit(1);
  }
}

main(); 