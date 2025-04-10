export type EventResponse = {
  response: "Yes" | "No" | "Maybe";
  dietaryRestrictions?: string;
  plusOne?: boolean;
  plusOneCount?: number;
  adultCount?: number;
  childrenCount?: number;
  respondedAt?: string;
  updatedAt?: string;
};

export type Guest = {
  fullName: string;
  responded?: boolean;
  response?: string;
  dietaryRestrictions?: string;
  plusOne?: boolean;
  plusOneCount?: number;
  adultCount?: number;
  childrenCount?: number;
  respondedAt?: string;
  updatedAt?: string;
  eventResponses?: Record<string, any>;
  invitedEvents?: string[];
};

export type GuestList = Record<string, Guest>;

export type AdminUser = {
  username: string;
  password: string;
};

export type RSVPSummary = {
  totalGuests: number;
  responded: number;
  notResponded: number;
  eventStats: Record<string, {
    yes: number;
    no: number;
    maybe: number;
    totalAttending: number;
    plusOnes: number;
  }>;
};

export type SupabaseEvent = {
  id: string;
  code: string;
  name: string;
  parent_event_id: string | null;
  category: string;
  date: string;
  time_start: string;
  time_end: string;
  location: string;
  maps_link?: string;
  description: string;
  rsvp_deadline: string;
  is_active: boolean;
  max_plus_ones: string;
  created_at: string;
  updated_at: string;
};

export type EventData = {
  id: string;
  title: string;
  date: string;
  time_start: string;
  time_end: string;
  location: string;
  maps_link?: string;
  description?: string;
  rsvpDeadline?: Date | null;
  isParent: boolean;
  parentEventId?: string | null;
  canRsvp: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
  deadlineMessage?: string;
};