// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

import { supabaseAdmin, createGuest, getAllGuests, updateGuest, SupabaseGuest, setGuestEventAccess } from '../lib/supabase';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

// Define GuestData type for CSV processing, including optional phone_number
// This aligns with the idea that SupabaseGuest from lib/supabase would be the full DB representation
// and GuestData is what we prepare for insert/update.
interface GuestFromCSV {
  name: string;
  phoneNumber?: string; // Optional phone number from CSV
  rsvpEventCodes?: string; // Comma-separated event codes, e.g., "wedding,reception"
}

// Helper function to sanitize and validate phone number
const sanitizeAndValidatePhoneNumber = (phone: string | undefined | null): string | null => {
  if (!phone) return null;
  const sanitized = phone.replace(/[\s()+\-]*/g, '');
  if (/^\d{10}$/.test(sanitized)) {
    return sanitized;
  }
  console.warn(`[Seed] Invalid phone number format after sanitization: ${phone} -> ${sanitized}`);
  return null;
};

// Log environment variable availability (without exposing secrets)
console.log('Environment check:');
console.log('NEXT_PUBLIC_SUPABASE_URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_API_KEY available:', !!process.env.NEXT_PUBLIC_SUPABASE_API_KEY);

// This script will:
// 1. Add any approved guests from the APPROVED_GUESTS array to Supabase
// 2. Read guests from a CSV file if provided
// 3. Ensure all guests in Supabase are active and properly set up
// 4. Deactivate any guests in Supabase that are not in the current list

// Function to read guests from CSV if a file is provided
async function readGuestsFromCSV(filePath: string): Promise<GuestFromCSV[]> {
  return new Promise((resolve, reject) => {
    const results: GuestFromCSV[] = [];

    if (!fs.existsSync(filePath)) {
      console.log(`CSV file not found at ${filePath}, skipping CSV read.`);
      return resolve([]);
    }

    fs.createReadStream(filePath)
      .pipe(csv())
      // Expect columns like 'name', 'phoneNumber' (or 'phone_number'), 'rsvpEventCodes' (or 'event_access')
      .on('data', (data: { name?: string; phoneNumber?: string; phone_number?: string; rsvpEventCodes?: string; event_access?: string; }) => {
        if (data.name) {
          results.push({
            name: data.name.trim(),
            phoneNumber: data.phoneNumber || data.phone_number,
            rsvpEventCodes: data.rsvpEventCodes || data.event_access // Allow for different CSV column names for event access
          });
        }
      })
      .on('end', () => {
        console.log(`[Seed] Successfully read ${results.length} rows from CSV: ${filePath}`);
        resolve(results);
      })
      .on('error', (error: Error) => {
        console.error(`[Seed] Error reading CSV file ${filePath}:`, error);
        reject(error);
      });
  });
}

async function getEventCodeToIdMap(): Promise<Map<string, string>> {
  const { data: events, error } = await supabaseAdmin.from('events').select('code, id').eq('is_active', true);
  if (error) {
    console.error('[Seed] Error fetching event codes:', error);
    throw new Error('Could not fetch events for mapping.');
  }
  const map = new Map<string, string>();
  events?.forEach(event => map.set(event.code, event.id));
  console.log(`[Seed] Fetched ${map.size} active events for code-to-ID mapping.`);
  return map;
}

async function main() {
  console.log('[Seed] Starting guest seeding script...');
  const eventCodeMap = await getEventCodeToIdMap();

  // Initialize guestsToProcess as an empty array instead of using APPROVED_GUESTS
  let guestsToProcess: GuestFromCSV[] = [];

  // Only add from CSV
  try {
    const csvPath = process.argv[2] || path.join(process.cwd(), 'data', 'guests.csv');
    const csvGuests = await readGuestsFromCSV(csvPath);
    if (csvGuests.length > 0) {
      console.log(`[Seed] Found ${csvGuests.length} guests from CSV file.`);
      guestsToProcess = csvGuests;
    } else {
      console.warn('[Seed] No guests found in CSV file. No guests will be processed.');
    }
  } catch (error) {
    // Error already logged in readGuestsFromCSV
    console.error('[Seed] Failed to process CSV file, no guests will be processed.');
  }

  console.log(`[Seed] Total guests to process: ${guestsToProcess.length}`);

  const existingDbGuests = await getAllGuests(); // Fetches SupabaseGuest[]
  console.log(`[Seed] Found ${existingDbGuests.length} existing guests in Supabase.`);

  let added = 0;
  let updated = 0;
  let unchanged = 0;
  let deactivated = 0;
  let skipped = 0;
  let eventAccessUpdates = 0;
  let onlyEventAccessUpdated = 0; // New counter for guests with only event access changes

  for (const guestFromSource of guestsToProcess) {
    if (!guestFromSource.name) {
      console.warn('[Seed] Skipping entry with no name.', guestFromSource);
      skipped++;
      continue;
    }
    
    const normalizedName = guestFromSource.name.trim();
    const sanitizedPhoneNumber = sanitizeAndValidatePhoneNumber(guestFromSource.phoneNumber);

    const existingGuestInDb = existingDbGuests.find(
      g => g.full_name.toLowerCase() === normalizedName.toLowerCase()
    );

    let guestIdForAccessManagement: string | undefined;
    let guestJustCreated = false;
    let guestDetailsUpdated = false; // Track if guest details were updated

    // Prepare guest data for DB operation, including phone_number if valid
    const guestDataPayload: Partial<SupabaseGuest> = {
      full_name: normalizedName,
      is_active: true,
      // Only add phone_number to payload if it's valid and present
      ...(sanitizedPhoneNumber && { phone_number: sanitizedPhoneNumber }),
    };

    if (!existingGuestInDb) {
      // Add new guest
      if (!sanitizedPhoneNumber) {
        console.error(`[Seed] Skipping NEW guest '${normalizedName}' due to missing or invalid phone number from source. Phone (raw): '${guestFromSource.phoneNumber}'.`);
        skipped++;
        continue; // Cannot create new guest without valid phone for NOT NULL constraint
      }
      // Ensure phone_number is in the payload for new guest
      (guestDataPayload as Partial<SupabaseGuest & { phone_number?: string }>).phone_number = sanitizedPhoneNumber;

      try {
        const result = await createGuest(guestDataPayload as Omit<SupabaseGuest, 'id' | 'created_at' | 'updated_at' | 'phone_number'> & { phone_number: string });
        if (result) {
          added++;
          guestDetailsUpdated = true;
          guestIdForAccessManagement = result.id;
          guestJustCreated = true;
          console.log(`[Seed] Added guest: ${normalizedName} with phone: ${sanitizedPhoneNumber}`);
        } else {
          console.error(`[Seed] Failed to add guest (API returned null/false): ${normalizedName}`);
          skipped++;
        }
      } catch (dbError: any) {
        console.error(`[Seed] DB Error adding guest '${normalizedName}' (phone: ${sanitizedPhoneNumber}):`, dbError.message);
        skipped++;
      }
    } else {
      // Existing guest: update if necessary (reactivate or update phone)
      let needsUpdate = false;
      const updatePayload: Partial<SupabaseGuest> = { is_active: true };

      if (!existingGuestInDb.is_active) {
        needsUpdate = true;
        console.log(`[Seed] Guest '${normalizedName}' will be reactivated.`);
      }

      if (sanitizedPhoneNumber && (existingGuestInDb as SupabaseGuest & { phone_number?: string }).phone_number !== sanitizedPhoneNumber) {
        (updatePayload as Partial<SupabaseGuest & { phone_number?: string }>).phone_number = sanitizedPhoneNumber;
        needsUpdate = true;
        console.log(`[Seed] Guest '${normalizedName}' phone will be updated to ${sanitizedPhoneNumber} from ${(existingGuestInDb as SupabaseGuest & { phone_number?: string }).phone_number || 'N/A'}.`);
      } else if (guestFromSource.phoneNumber && !sanitizedPhoneNumber) {
        // Phone was provided in CSV but was invalid
        console.warn(`[Seed] Guest '${normalizedName}': Invalid phone '${guestFromSource.phoneNumber}' in source. Existing phone '${(existingGuestInDb as SupabaseGuest & { phone_number?: string }).phone_number || 'N/A'}' will be kept.`);
      }

      if (needsUpdate) {
        try {
          const result = await updateGuest(existingGuestInDb.id, updatePayload);
          if (result) {
            updated++;
            guestDetailsUpdated = true;
            guestIdForAccessManagement = existingGuestInDb.id;
            console.log(`[Seed] Updated guest: ${normalizedName}`);
          } else {
            console.error(`[Seed] Failed to update guest (API returned null/false): ${normalizedName}`);
            // Not necessarily skipped if only phone update failed but was active
          }
        } catch (dbError: any) {
          console.error(`[Seed] DB Error updating guest '${normalizedName}':`, dbError.message);
          // Not necessarily skipped if only phone update failed but was active
        }
      } else {
        // Guest details didn't change, but we'll still process event access
        guestIdForAccessManagement = existingGuestInDb.id;
      }
    }

    // Manage Guest Event Access
    if (guestIdForAccessManagement) {
      let eventIdsToSet: string[] = [];
      let eventAccessChanged = false;
      
      // Get current event access for this guest to determine if it changed
      const { data: currentAccess, error: accessFetchError } = await supabaseAdmin
        .from('guest_event_access')
        .select('event_id')
        .eq('guest_id', guestIdForAccessManagement);
      
      if (accessFetchError) {
        console.error(`[Seed] Error fetching current event access for guest '${normalizedName}':`, accessFetchError.message);
      }
      
      const currentEventIds = (currentAccess || []).map(access => access.event_id);
      
      if (typeof guestFromSource.rsvpEventCodes === 'string') { // Check if string, even empty
        // Remove surrounding quotes and then split by comma
        const cleanedCodes = guestFromSource.rsvpEventCodes.replace(/^["'](.*)["']$/, '$1');
        const eventCodesFromCSV = cleanedCodes.split(',').map(code => code.trim()).filter(Boolean);
        if (eventCodesFromCSV.length > 0) {
          for (const code of eventCodesFromCSV) {
            const eventId = eventCodeMap.get(code);
            if (eventId) {
              eventIdsToSet.push(eventId);
            } else {
              console.warn(`[Seed] Guest '${normalizedName}': Unknown event code '${code}' in rsvpEventCodes. Will be ignored.`);
            }
          }
        }
      } else if (guestJustCreated) {
         console.log(`[Seed] New guest '${normalizedName}' has no rsvpEventCodes specified in source. No event access will be granted.`);
      }
      
      // Check if event access needs to be updated by comparing arrays
      // Sort both arrays to ensure consistent comparison
      const sortedCurrentIds = [...currentEventIds].sort();
      const sortedNewIds = [...eventIdsToSet].sort();
      
      // Check if arrays have different length or different content
      eventAccessChanged = sortedCurrentIds.length !== sortedNewIds.length ||
        sortedCurrentIds.some((id, index) => id !== sortedNewIds[index]);
      
      // Only call setGuestEventAccess if needed
      if (guestFromSource.rsvpEventCodes !== undefined || existingGuestInDb) {
        try {
          const { error: accessError } = await setGuestEventAccess(guestIdForAccessManagement, eventIdsToSet);
          if (!accessError) {
            if (eventAccessChanged) {
              eventAccessUpdates++;
              // If this guest had ONLY event access changes, count them separately
              if (!guestDetailsUpdated && !guestJustCreated) {
                onlyEventAccessUpdated++;
              }
              console.log(`[Seed] Updated event access for guest '${normalizedName}'. IDs set: [${eventIdsToSet.join(', ') || 'NONE'}]`);
            } else {
              console.log(`[Seed] Event access unchanged for guest '${normalizedName}'. IDs: [${eventIdsToSet.join(', ') || 'NONE'}]`);
            }
          } else {
            console.error(`[Seed] FAILED to set event access for guest '${normalizedName}':`, accessError.message || accessError);
          }
        } catch (catchedAccessError: any) {
          console.error(`[Seed] CRITICAL ERROR setting event access for guest '${normalizedName}':`, catchedAccessError.message);
        }
      }
      
      // Only increment unchanged if both guest details AND event access were unchanged
      if (!guestDetailsUpdated && !eventAccessChanged && !guestJustCreated) {
        unchanged++;
      }
    }
  }

  // Deactivate guests not in the current consolidated list
  const currentSourceGuestNamesLower = guestsToProcess.map(g => g.name.trim().toLowerCase());
  for (const dbGuest of existingDbGuests) {
    if (!currentSourceGuestNamesLower.includes(dbGuest.full_name.toLowerCase()) && dbGuest.is_active) {
      try {
        const result = await updateGuest(dbGuest.id, { is_active: false });
        if (result) {
          deactivated++;
          console.log(`[Seed] Deactivated guest: ${dbGuest.full_name}`);
          
          // No need to manually update RSVPs validity - this is now handled by the view
        } else {
          console.error(`[Seed] Failed to deactivate guest (API returned null/false): ${dbGuest.full_name}`);
        }
      } catch (dbError: any) {
        console.error(`[Seed] DB Error deactivating guest '${dbGuest.full_name}':`, dbError.message);
      }
    }
  }

  console.log('[Seed] Guest seeding complete:');
  console.log(`- Added: ${added}`);
  console.log(`- Updated (reactivated or phone change): ${updated}`);
  console.log(`- Event access updates: ${eventAccessUpdates}`);
  console.log(`- Only event access updated (no other changes): ${onlyEventAccessUpdated}`);
  console.log(`- Skipped (e.g., new guest invalid phone, DB error): ${skipped}`);
  console.log(`- Unchanged (already active, matching phone & event access): ${unchanged}`);
  console.log(`- Deactivated: ${deactivated}`);
}

// Check if this file is being run directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('Seed script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error in seed script:', error);
      process.exit(1);
    });
} 