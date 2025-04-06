import fs from 'fs';
import path from 'path';
import { GuestList, Guest, EventResponse, AdminUser } from './types';

// Path to our CSV files
const CSV_PATH = path.join(process.cwd(), 'data', 'guests.csv');
const GUEST_LIST_PATH = path.join(process.cwd(), 'data', 'guest-list.json');
const ADMIN_USERS_PATH = path.join(process.cwd(), 'data', 'admin-users.json');

// Event-specific CSV paths
const EVENT_CSV_PATHS = {
  engagement: path.join(process.cwd(), 'data', 'engagement-guests.csv'),
  wedding: path.join(process.cwd(), 'data', 'wedding-guests.csv'),
  reception: path.join(process.cwd(), 'data', 'reception-guests.csv'),
};

// Approved guests list
export const APPROVED_GUESTS = [
  "John Smith",
  "Jane Doe",
  "Michael Johnson",
  "Emily Williams",
  "Robert Brown",
  "Sarah Davis",
  "David Miller",
  "Jennifer Wilson",
  "Christopher Moore",
  "Jessica Taylor"
];

// Admin users
export const ADMIN_USERS: AdminUser[] = [
  { username: "Ram Dershan", password: "12345" },
  { username: "Yukti Zode", password: "12345" }
];

// Ensure data directory exists
export const ensureDataDirectory = () => {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Initialize guest list JSON if it doesn't exist
  if (!fs.existsSync(GUEST_LIST_PATH)) {
    const initialGuestList: GuestList = {};
    APPROVED_GUESTS.forEach(name => {
      initialGuestList[name] = {
        fullName: name,
        responded: false,
        eventResponses: {}
      };
    });
    fs.writeFileSync(GUEST_LIST_PATH, JSON.stringify(initialGuestList, null, 2));
  }
  
  // Initialize admin users JSON if it doesn't exist
  if (!fs.existsSync(ADMIN_USERS_PATH)) {
    fs.writeFileSync(ADMIN_USERS_PATH, JSON.stringify(ADMIN_USERS, null, 2));
  }
  
  // Initialize main CSV with headers if it doesn't exist
  if (!fs.existsSync(CSV_PATH)) {
    const headers = 'Full Name,Response,Dietary Restrictions,Plus Ones,Adults,Children,Responded At,Updated At\n';
    fs.writeFileSync(CSV_PATH, headers);
  }
  
  // Initialize event-specific CSVs with headers if they don't exist
  Object.values(EVENT_CSV_PATHS).forEach(csvPath => {
    if (!fs.existsSync(csvPath)) {
      const headers = 'Full Name,Event,Response,Dietary Restrictions,Plus Ones,Adults,Children,Responded At,Updated At\n';
      fs.writeFileSync(csvPath, headers);
    }
  });
};

// Get all guest responses
export const getGuestList = (): GuestList => {
  ensureDataDirectory();
  try {
    const data = fs.readFileSync(GUEST_LIST_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading guest list:', error);
    return {};
  }
};

// Get a specific guest by name
export const getGuest = (fullName: string): Guest | null => {
  const guestList = getGuestList();
  
  // Case-insensitive search
  const normalizedName = fullName.trim();
  const matchingGuest = Object.values(guestList).find(
    guest => guest.fullName.toLowerCase() === normalizedName.toLowerCase()
  );
  
  return matchingGuest || null;
};

// Update guest response for a specific event and update CSV
export const updateGuestEventResponse = (
  fullName: string,
  eventId: string,
  response: "Yes" | "No" | "Maybe",
  dietaryRestrictions: string,
  plusOne: boolean,
  plusOneCount: number = 1,
  adultCount: number = 0,
  childrenCount: number = 0
): boolean => {
  ensureDataDirectory();
  
  const guestList = getGuestList();
  
  // Case-insensitive search for the guest
  const normalizedName = fullName.trim();
  const matchingGuestKey = Object.keys(guestList).find(
    name => name.toLowerCase() === normalizedName.toLowerCase()
  );
  
  if (!matchingGuestKey) {
    return false;
  }
  
  const now = new Date().toISOString();
  
  // Initialize eventResponses if it doesn't exist
  if (!guestList[matchingGuestKey].eventResponses) {
    guestList[matchingGuestKey].eventResponses = {};
  }
  
  // Check if this is a new response for this event
  const isNewEventResponse = !guestList[matchingGuestKey].eventResponses?.[eventId];
  
  // Create or update the event response
  const eventResponse: EventResponse = {
    response,
    dietaryRestrictions,
    plusOne,
    plusOneCount: plusOne ? (adultCount + childrenCount) : 0,
    adultCount: plusOne ? adultCount : 0,
    childrenCount: plusOne ? childrenCount : 0,
    respondedAt: isNewEventResponse ? now : guestList[matchingGuestKey].eventResponses?.[eventId]?.respondedAt || now,
    updatedAt: now
  };
  
  // Update guest in our JSON data
  guestList[matchingGuestKey] = {
    ...guestList[matchingGuestKey],
    responded: true,
    eventResponses: {
      ...guestList[matchingGuestKey].eventResponses,
      [eventId]: eventResponse
    }
  };
  
  // Save updated guest list
  fs.writeFileSync(GUEST_LIST_PATH, JSON.stringify(guestList, null, 2));
  
  // Update main CSV file
  updateCSV(guestList);
  
  // Update event-specific CSV file
  updateEventCSV(eventId, guestList);
  
  return true;
};

// Legacy method for backward compatibility
export const updateGuestResponse = (
  fullName: string,
  response: "Yes" | "No" | "Maybe",
  dietaryRestrictions: string,
  plusOne: boolean,
  plusOneCount: number = 1,
  adultCount: number = 0,
  childrenCount: number = 0
): boolean => {
  ensureDataDirectory();
  
  const guestList = getGuestList();
  
  // Case-insensitive search for the guest
  const normalizedName = fullName.trim();
  const matchingGuestKey = Object.keys(guestList).find(
    name => name.toLowerCase() === normalizedName.toLowerCase()
  );
  
  if (!matchingGuestKey) {
    return false;
  }
  
  const now = new Date().toISOString();
  const isNewResponse = !guestList[matchingGuestKey].responded;
  
  // Update guest in our JSON data
  guestList[matchingGuestKey] = {
    ...guestList[matchingGuestKey],
    responded: true,
    response,
    dietaryRestrictions,
    plusOne,
    plusOneCount: plusOne ? (adultCount + childrenCount) : 0,
    adultCount: plusOne ? adultCount : 0,
    childrenCount: plusOne ? childrenCount : 0,
    respondedAt: isNewResponse ? now : guestList[matchingGuestKey].respondedAt,
    updatedAt: now
  };
  
  // Save updated guest list
  fs.writeFileSync(GUEST_LIST_PATH, JSON.stringify(guestList, null, 2));
  
  // Update CSV file
  updateCSV(guestList);
  
  return true;
};

// Update the main CSV file with all guest data
const updateCSV = (guestList: GuestList) => {
  let csvContent = 'Full Name,Response,Dietary Restrictions,Plus Ones,Adults,Children,Responded At,Updated At\n';
  
  Object.values(guestList)
    .filter(guest => guest.responded)
    .forEach(guest => {
      const plusOnesValue = guest.plusOne 
        ? ((guest.adultCount !== undefined && guest.childrenCount !== undefined) 
            ? (guest.adultCount + guest.childrenCount).toString() 
            : guest.plusOneCount ? guest.plusOneCount.toString() : '1') 
        : '0';
      
      const adultsValue = guest.adultCount !== undefined ? guest.adultCount.toString() : '0';
      const childrenValue = guest.childrenCount !== undefined ? guest.childrenCount.toString() : '0';
      
      const row = [
        guest.fullName,
        guest.response || '',
        guest.dietaryRestrictions || '',
        plusOnesValue,
        adultsValue,
        childrenValue,
        guest.respondedAt || '',
        guest.updatedAt || ''
      ].map(value => `"${value}"`).join(',');
      
      csvContent += row + '\n';
    });
  
  fs.writeFileSync(CSV_PATH, csvContent);
};

// Update event-specific CSV file
const updateEventCSV = (eventId: string, guestList: GuestList) => {
  const csvPath = EVENT_CSV_PATHS[eventId as keyof typeof EVENT_CSV_PATHS];
  
  if (!csvPath) {
    console.error(`No CSV path defined for event: ${eventId}`);
    return;
  }
  
  let csvContent = 'Full Name,Event,Response,Dietary Restrictions,Plus Ones,Adults,Children,Responded At,Updated At\n';
  
  Object.values(guestList)
    .filter(guest => guest.eventResponses && guest.eventResponses[eventId])
    .forEach(guest => {
      const eventResponse = guest.eventResponses![eventId];
      const plusOnesValue = eventResponse.plusOne 
        ? ((eventResponse.adultCount !== undefined && eventResponse.childrenCount !== undefined) 
            ? (eventResponse.adultCount + eventResponse.childrenCount).toString() 
            : eventResponse.plusOneCount ? eventResponse.plusOneCount.toString() : '1') 
        : '0';
      
      const adultsValue = eventResponse.adultCount !== undefined ? eventResponse.adultCount.toString() : '0';
      const childrenValue = eventResponse.childrenCount !== undefined ? eventResponse.childrenCount.toString() : '0';
      
      const row = [
        guest.fullName,
        eventId,
        eventResponse.response || '',
        eventResponse.dietaryRestrictions || '',
        plusOnesValue,
        adultsValue,
        childrenValue,
        eventResponse.respondedAt || '',
        eventResponse.updatedAt || ''
      ].map(value => `"${value}"`).join(',');
      
      csvContent += row + '\n';
    });
  
  fs.writeFileSync(csvPath, csvContent);
};

// Verify if a guest is approved
export const isApprovedGuest = (fullName: string): boolean => {
  if (!fullName) return false;
  
  const normalizedName = fullName.trim();
  return APPROVED_GUESTS.some(
    name => name.toLowerCase() === normalizedName.toLowerCase()
  );
};

// Verify admin credentials
export const verifyAdminCredentials = (username: string, password: string): boolean => {
  console.log('[Admin Auth] Verifying credentials for username:', username);
  return ADMIN_USERS.some(
    user => user.username.toLowerCase() === username.toLowerCase() && user.password === password
  );
};

// Get event-specific CSV content
export const getEventCSVContent = (eventId: string): string => {
  const csvPath = EVENT_CSV_PATHS[eventId as keyof typeof EVENT_CSV_PATHS];
  
  if (!csvPath || !fs.existsSync(csvPath)) {
    return '';
  }
  
  return fs.readFileSync(csvPath, 'utf8');
};

// Get all RSVPs summary
export const getRSVPSummary = () => {
  const guestList = getGuestList();
  const events = ['engagement', 'wedding', 'reception'];
  
  const summary = {
    totalGuests: APPROVED_GUESTS.length,
    responded: 0,
    notResponded: 0,
    eventStats: {} as Record<string, {
      yes: number;
      no: number;
      maybe: number;
      totalAttending: number;
      plusOnes: number;
    }>
  };
  
  // Initialize event stats
  events.forEach(event => {
    summary.eventStats[event] = {
      yes: 0,
      no: 0,
      maybe: 0,
      totalAttending: 0,
      plusOnes: 0
    };
  });
  
  // Count responses
  Object.values(guestList).forEach(guest => {
    let hasResponded = false;
    
    // Check each event response
    if (guest.eventResponses) {
      events.forEach(event => {
        const response = guest.eventResponses?.[event];
        if (response) {
          hasResponded = true;
          
          // Update event stats
          if (response.response === 'Yes') {
            summary.eventStats[event].yes++;
            summary.eventStats[event].totalAttending++;
            
            // Add plus ones
            if (response.plusOne) {
              const plusOneCount = (response.adultCount !== undefined && response.childrenCount !== undefined) 
                ? (response.adultCount + response.childrenCount) 
                : (response.plusOneCount || 1);
                
              summary.eventStats[event].plusOnes += plusOneCount;
              summary.eventStats[event].totalAttending += plusOneCount;
            }
          } else if (response.response === 'No') {
            summary.eventStats[event].no++;
          } else if (response.response === 'Maybe') {
            summary.eventStats[event].maybe++;
            summary.eventStats[event].totalAttending++; // Count maybes as attending for planning
          }
        }
      });
    }
    
    // Update overall response counts
    if (hasResponded) {
      summary.responded++;
    } else {
      summary.notResponded++;
    }
  });
  
  return summary;
};