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
  responded: boolean;
  response?: "Yes" | "No" | "Maybe";
  dietaryRestrictions?: string;
  plusOne?: boolean;
  plusOneCount?: number;
  adultCount?: number;
  childrenCount?: number;
  respondedAt?: string;
  updatedAt?: string;
  eventResponses?: Record<string, EventResponse>;
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