// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

import { supabase, createGuest, getAllGuests, updateGuest, GuestData } from '../lib/supabase';
import { APPROVED_GUESTS } from '../lib/data';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

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
async function readGuestsFromCSV(filePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const results: string[] = [];

    if (!fs.existsSync(filePath)) {
      console.log(`CSV file not found at ${filePath}, skipping`);
      return resolve([]);
    }

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: { name?: string }) => {
        if (data.name) {
          results.push(data.name.trim());
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error: Error) => {
        reject(error);
      });
  });
}

async function main() {
  console.log('Starting guest seeding script...');

  // Gather all guest names
  let allGuestNames: string[] = [];

  // 1. Add from APPROVED_GUESTS constant
  if (APPROVED_GUESTS && APPROVED_GUESTS.length > 0) {
    console.log(`Found ${APPROVED_GUESTS.length} guests in APPROVED_GUESTS array`);
    allGuestNames = [...allGuestNames, ...APPROVED_GUESTS];
  }

  // 2. Add from CSV if provided
  try {
    const csvPath = process.argv[2] || path.join(process.cwd(), 'data', 'guests.csv');
    const csvGuests = await readGuestsFromCSV(csvPath);
    if (csvGuests.length > 0) {
      console.log(`Found ${csvGuests.length} guests in CSV file`);
      allGuestNames = [...allGuestNames, ...csvGuests];
    }
  } catch (error) {
    console.error('Error reading CSV file:', error);
  }

  // Remove duplicates
  allGuestNames = Array.from(new Set(allGuestNames));
  console.log(`Total unique guests to process: ${allGuestNames.length}`);

  // Get existing guests from Supabase for comparison
  const existingGuests = await getAllGuests();
  const existingGuestNames = existingGuests.map(g => g.full_name.toLowerCase());

  console.log(`Found ${existingGuests.length} existing guests in Supabase`);

  // Process each guest
  let added = 0;
  let updated = 0;
  let unchanged = 0;
  let deactivated = 0;

  for (const guestName of allGuestNames) {
    if (!guestName) continue;
    
    const normalizedName = guestName.trim();
    const existingGuest = existingGuests.find(
      g => g.full_name.toLowerCase() === normalizedName.toLowerCase()
    );

    if (!existingGuest) {
      // Add new guest
      const newGuest: GuestData = {
        full_name: normalizedName,
        is_active: true
      };

      const result = await createGuest(newGuest);
      if (result) {
        added++;
        console.log(`Added guest: ${normalizedName}`);
      } else {
        console.error(`Failed to add guest: ${normalizedName}`);
      }
    } else if (!existingGuest.is_active) {
      // Reactivate guest if needed
      const result = await updateGuest(existingGuest.id, { is_active: true });
      if (result) {
        updated++;
        console.log(`Reactivated guest: ${normalizedName}`);
      } else {
        console.error(`Failed to reactivate guest: ${normalizedName}`);
      }
    } else {
      unchanged++;
    }
  }

  // Deactivate guests that are not in our list
  for (const existingGuest of existingGuests) {
    const inCurrentList = allGuestNames.some(
      name => name.toLowerCase() === existingGuest.full_name.toLowerCase()
    );
    
    if (!inCurrentList && existingGuest.is_active) {
      const result = await updateGuest(existingGuest.id, { is_active: false });
      if (result) {
        deactivated++;
        console.log(`Deactivated guest: ${existingGuest.full_name}`);
      } else {
        console.error(`Failed to deactivate guest: ${existingGuest.full_name}`);
      }
    }
  }

  console.log('Guest seeding complete:');
  console.log(`- Added: ${added} guests`);
  console.log(`- Updated: ${updated} guests`);
  console.log(`- Unchanged: ${unchanged} guests`);
  console.log(`- Deactivated: ${deactivated} guests`);
  console.log(`- Total active guests in system: ${added + updated + unchanged}`);
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