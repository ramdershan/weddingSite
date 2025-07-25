"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Guest, EventData, InvitedEvent } from '@/lib/types';
import { validateGuestSession, deleteGuestSession } from '@/lib/supabase';
import { createLogoutOverlay } from '@/components/logout-overlay';
import { useRouter } from 'next/navigation';

export interface GuestContextType {
  guest: Guest | null;
  isLoading: boolean;
  events: EventData[];
  timelineEvents: EventData[];
  setGuest: (guest: Guest, events?: EventData[]) => void;
  clearGuest: () => void;
  validateSession: () => Promise<void>;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const GuestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [guest, setGuestState] = useState<Guest | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<EventData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load guest from localStorage on initial render and validate session
  useEffect(() => {
    const loadGuestData = async () => {
      try {
        // Fetch timeline events immediately (not guest-specific)
        const timelineResponse = await fetch('/api/events');
        if (timelineResponse.ok) {
          const timelineData = await timelineResponse.json();
          if (timelineData.events) {
            setTimelineEvents(timelineData.events);
            localStorage.setItem('wedding_timeline_events', JSON.stringify(timelineData.events));
          }
        }

        // Try to get session token from localStorage
        const storedToken = localStorage.getItem('wedding_guest_session');
        if (storedToken) {
          setSessionToken(storedToken);
          
          // First check if we have guest data in localStorage
          const storedGuest = localStorage.getItem('wedding_guest');
          let loadedGuest = null;
          
          if (storedGuest) {
            try {
              loadedGuest = JSON.parse(storedGuest);
              // Ensure invitedEvents is present
              if (!loadedGuest.invitedEvents) {
                loadedGuest.invitedEvents = ['engagement', 'wedding', 'reception'];
              }
              // Set guest state immediately for faster UI response
              setGuestState(loadedGuest);
            } catch (error) {
              console.error('Error parsing stored guest:', error);
              // Will be handled by the server validation below
            }
          }
          
          // Check for stored events
          const storedEvents = localStorage.getItem('wedding_guest_events');
          if (storedEvents) {
            try {
              const parsedEvents = JSON.parse(storedEvents);
              setEvents(parsedEvents);
            } catch (error) {
              console.error('Error parsing stored events:', error);
            }
          }

          // Check for stored timeline events
          const storedTimelineEvents = localStorage.getItem('wedding_timeline_events');
          if (storedTimelineEvents) {
            try {
              const parsedTimelineEvents = JSON.parse(storedTimelineEvents);
              setTimelineEvents(parsedTimelineEvents);
            } catch (error) {
              console.error('Error parsing stored timeline events:', error);
            }
          }
          
          // Validate session with server and update if needed
          const isValidSession = await validateSessionWithAPI(storedToken, loadedGuest);
          if (!isValidSession) {
            // Session is invalid, clear everything
            setGuestState(null);
            setEvents([]);
          }
        } else {
          // No stored session, still load timeline events but don't try to validate
          const storedTimelineEvents = localStorage.getItem('wedding_timeline_events');
          if (storedTimelineEvents) {
            try {
              const parsedTimelineEvents = JSON.parse(storedTimelineEvents);
              setTimelineEvents(parsedTimelineEvents);
            } catch (error) {
              console.error('Error parsing stored timeline events:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error loading guest data:', error);
      } finally {
        setIsLoaded(true);
        setIsLoading(false);
      }
    };

    loadGuestData();
  }, []);

  // Helper function to validate session with the API
  const validateSessionWithAPI = async (token: string, existingGuest: Guest | null) => {
    try {
      const response = await fetch('/api/auth/validate-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionToken: token }),
      });
      
      const data = await response.json();
      
      if (data.success && data.guest) {
        // If we don't have a guest in localStorage or the validation gave different data,
        // update with server data
        if (!existingGuest || existingGuest.fullName !== data.guest.fullName) {
          const serverGuest = {
            fullName: data.guest.fullName,
            responded: existingGuest?.responded || false,
            invitedEvents: data.guest.invitedEvents || ['engagement', 'wedding', 'reception'],
            // Copy any other properties from loadedGuest if you want to preserve them
            ...(existingGuest || {}),
          };
          setGuestState(serverGuest);
          localStorage.setItem('wedding_guest', JSON.stringify(serverGuest));
        }
        
        // Update events if they're included in the response
        if (data.events) {
          setEvents(data.events);
          localStorage.setItem('wedding_guest_events', JSON.stringify(data.events));
        }
        
        return true;
      } else {
        // Session is invalid according to server
        console.log('Session validation failed:', data.error);
        localStorage.removeItem('wedding_guest');
        localStorage.removeItem('wedding_guest_session');
        localStorage.removeItem('wedding_guest_events');
        setSessionToken(null);
        setGuestState(null);
        setEvents([]);
        return false;
      }
    } catch (error) {
      console.error('Error validating session with API:', error);
      // Don't clear guest data on network errors
      return false;
    }
  };

  // Save guest to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      if (guest) {
        localStorage.setItem('wedding_guest', JSON.stringify(guest));
      } else {
        localStorage.removeItem('wedding_guest');
      }
    }
  }, [guest, isLoaded]);

  // Save session token to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded && sessionToken) {
      localStorage.setItem('wedding_guest_session', sessionToken);
    }
  }, [sessionToken, isLoaded]);

  const setGuest = useCallback((newGuest: Guest, newEvents: EventData[] = []) => {
    // Ensure invitedEvents is present and properly typed
    const invitedEvents = newGuest.invitedEvents || 
      // Convert string array to InvitedEvent[]
      ['engagement', 'wedding', 'reception'].map(code => ({
        id: code,
        code: code,
        name: code.charAt(0).toUpperCase() + code.slice(1)
      }));

    const guestWithDefaults = {
      ...newGuest,
      invitedEvents
    };
    
    console.log('Setting guest:', guestWithDefaults);
    if (guestWithDefaults.invitedEvents) {
      console.log(`Guest invited events: ${guestWithDefaults.invitedEvents.map((e: string | InvitedEvent) => typeof e === 'string' ? e : e.code).join(', ')}`);
    }
    
    setGuestState(guestWithDefaults);
    
    // Update events if provided
    if (newEvents.length > 0) {
      console.log(`Setting ${newEvents.length} events in context`);
      newEvents.forEach(event => {
        console.log(`Event in context: ${event.id} - parent: ${event.isParent}, parentId: ${event.parentEventId || 'none'}`);
      });
      setEvents(newEvents);
      
      // Save events to localStorage for persistence
      try {
        localStorage.setItem('wedding_guest_events', JSON.stringify(newEvents));
      } catch (error) {
        console.error('Error saving events to localStorage:', error);
      }
    }
    
    // Save to local storage
    try {
      localStorage.setItem('wedding_guest', JSON.stringify(guestWithDefaults));
    } catch (error) {
      console.error('Error saving guest to localStorage:', error);
    }
  }, []);

  const setGuestEvents = useCallback((newEvents: EventData[]) => {
    console.log(`Setting ${newEvents.length} events in context`);
    newEvents.forEach(event => {
      console.log(`Event in context: ${event.id} - parent: ${event.isParent}, parentId: ${event.parentEventId || 'none'}`);
    });
    setEvents(newEvents);
    
    // Save events to localStorage for persistence
    try {
      localStorage.setItem('wedding_guest_events', JSON.stringify(newEvents));
    } catch (error) {
      console.error('Error saving events to localStorage:', error);
    }
  }, []);

  const clearGuest = useCallback(async () => {
    console.log('[Guest Context] Clearing guest session...');
    
    // Get current pathname to check if we're on an RSVP page
    const isOnRsvpPage = typeof window !== 'undefined' && window.location.pathname.includes('/rsvp');
    console.log(`[Guest Context] Logout initiated on path: ${typeof window !== 'undefined' ? window.location.pathname : 'unknown'}`);
    
    // Create and show overlay for logout animation - now showing on all pages including RSVP
    let overlay: HTMLDivElement | null = null;
    if (typeof document !== 'undefined') {
      overlay = createLogoutOverlay();
    }
    
    // Store the token before clearing localStorage
    const tokenToDelete = sessionToken;
    
    // Immediately clear localStorage to ensure clean state
    localStorage.removeItem('wedding_guest');
    localStorage.removeItem('wedding_guest_session');
    localStorage.removeItem('wedding_guest_events');
    
    // Set a timestamp to indicate recent logout
    localStorage.setItem('wedding_logout_timestamp', Date.now().toString());
    
    // Clear state after localStorage is cleared
    setGuestState(null);
    setEvents([]);
    setSessionToken(null);
    
    // If we have a session token, delete the session from server
    if (tokenToDelete) {
      try {
        // Use deleteGuestSession directly to ensure session is removed from DB
        const deleteSuccessful = await deleteGuestSession(tokenToDelete);
        console.log(`[Guest Context] Session deletion from database ${deleteSuccessful ? 'successful' : 'failed'}`);
        
        // Also call the logout API to clear the cookie
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionToken: tokenToDelete }),
        });
      } catch (error) {
        console.error('[Guest Context] Error during logout process:', error);
      }
    }
    
    // Use the same timing for all pages to ensure the overlay animation is visible
    setTimeout(() => {
      if (overlay) {
        overlay.classList.add('fade-out');
        
        // Wait for fade-out animation then remove overlay
        setTimeout(() => {
          overlay?.remove();
          
          // Redirect to guest login
          window.location.href = "/guest-login";
        }, 500);
      } else {
        // Redirect immediately if no overlay
        window.location.href = "/guest-login";
      }
    }, 1000);
  }, [sessionToken]);

  const validateSession = useCallback(async () => {
    console.log('Validating session...');
    setIsLoading(true);
    
    try {
      // Get session token from local storage
      const storedToken = localStorage.getItem('wedding_guest_session');
      if (!storedToken) {
        console.log('No session token found');
        setIsLoading(false);
        return;
      }
      
      setSessionToken(storedToken);
      
      // Call validate-session API
      const response = await fetch('/api/auth/validate-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionToken: storedToken }),
      });
      
      if (!response.ok) {
        console.log('Invalid session response:', response.status);
        clearGuest();
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('Session validation response:', data);
      
      if (!data.success) {
        console.log('Session validation failed');
        clearGuest();
        setIsLoading(false);
        return;
      }
      
      // Update the guest in state and local storage
      const validatedInvitedEvents = data.guest.invitedEvents || 
        ['engagement', 'wedding', 'reception'].map(code => ({
          id: code,
          code: code,
          name: code.charAt(0).toUpperCase() + code.slice(1)
        }));

      const validatedGuest = {
        ...data.guest,
        invitedEvents: validatedInvitedEvents
      };
      
      console.log('Setting validated guest:', validatedGuest);
      if (validatedGuest.invitedEvents) {
        console.log(`Validated guest invited events: ${validatedGuest.invitedEvents.map((e: string | InvitedEvent) => typeof e === 'string' ? e : e.code).join(', ')}`);
      }
      
      setGuestState(validatedGuest);
      
      // Save to local storage
      try {
        localStorage.setItem('wedding_guest', JSON.stringify(validatedGuest));
      } catch (error) {
        console.error('Error saving validated guest to localStorage:', error);
      }
      
      // Update events if provided
      if (data.events && data.events.length > 0) {
        console.log(`Setting ${data.events.length} validated events in context`);
        data.events.forEach((event: EventData) => {
          console.log(`Validated event in context: ${event.id} - parent: ${event.isParent}, parentId: ${event.parentEventId || 'none'}`);
        });
        setEvents(data.events);
        
        // Save events to localStorage for persistence
        try {
          localStorage.setItem('wedding_guest_events', JSON.stringify(data.events));
        } catch (error) {
          console.error('Error saving validated events to localStorage:', error);
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error validating session:', error);
      clearGuest();
      setIsLoading(false);
    }
  }, [clearGuest]);

  return (
    <GuestContext.Provider value={{ guest, events, timelineEvents, setGuest, clearGuest, isLoading, validateSession }}>
      {children}
    </GuestContext.Provider>
  );
};

export function useGuestContext() {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error('useGuestContext must be used within a GuestProvider');
  }
  return context;
}