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
  id?: string;
  fullName: string;
  isActive?: boolean;
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
  createdAt?: string;
};

export type GuestList = Record<string, Guest>;

export type AdminUser = {
  username: string;
  password: string;
};

export type EventSummaryStats = {
  yes: number;
  no: number;
  maybe: number;
  totalAttending: number;
  plusOnes: number;
  adultsAttending?: number;
  childrenAttending?: number;
};

export type RSVPSummary = {
  responded: number;
  notResponded: number;
  invitedGuests: number;
  adultGuests: number;
  childrenGuests: number;
  events: Record<string, EventSummaryStats>;
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
  raw_date: string;
  raw_time_start: string;
  date: string;
  time_start: string;
  time_end: string;
  location: string;
  maps_link?: string;
  description: string;
  rsvpDeadline?: Date | null;
  isParent: boolean;
  parentEventId: string | null;
  canRsvp: boolean;
  icon?: React.ReactNode;
  hasResponded?: boolean;
  disabled?: boolean;
  deadlineMessage?: string;
};