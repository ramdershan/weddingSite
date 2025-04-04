"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Guest } from '@/lib/types';
import { validateGuestSession, deleteGuestSession } from '@/lib/supabase';
import { createLogoutOverlay } from '@/components/logout-overlay';

type GuestContextType = {
  guest: Guest | null;
  setGuest: (guest: Guest | null, sessionToken?: string) => void;
  clearGuest: () => void;
  isLoading: boolean;
};

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [guest, setGuestState] = useState<Guest | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load guest from localStorage on initial render and validate session
  useEffect(() => {
    const loadGuestData = async () => {
      try {
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
              // Set guest state immediately for faster UI response
              setGuestState(loadedGuest);
            } catch (error) {
              console.error('Error parsing stored guest:', error);
              // Will be handled by the server validation below
            }
          }
          
          // Even if we have local data, validate the session with API to ensure it's still valid
          await validateSessionWithAPI(storedToken, loadedGuest);
        } else {
          // If no token in localStorage, try validating session cookie directly
          // This covers the case where localStorage was cleared but HTTP cookie is still valid
          try {
            const response = await fetch('/api/auth/validate-session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ useCookie: true }),
            });
            
            const data = await response.json();
            
            if (data.success && data.guest && data.sessionToken) {
              // We have a valid session from cookie, restore local storage
              const cookieGuest = {
                fullName: data.guest.fullName,
                responded: false,
                // Add other default properties as needed
              };
              
              setGuestState(cookieGuest);
              localStorage.setItem('wedding_guest', JSON.stringify(cookieGuest));
              localStorage.setItem('wedding_guest_session', data.sessionToken);
              setSessionToken(data.sessionToken);
            } else {
              // No valid session in cookie either, clear everything
              localStorage.removeItem('wedding_guest');
              localStorage.removeItem('wedding_guest_session');
              setGuestState(null);
            }
          } catch (error) {
            console.error('Error checking cookie session:', error);
            // Clear guest state on error
            setGuestState(null);
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
            // Copy any other properties from loadedGuest if you want to preserve them
            ...(existingGuest || {}),
          };
          setGuestState(serverGuest);
          localStorage.setItem('wedding_guest', JSON.stringify(serverGuest));
        }
        return true;
      } else {
        // Session is invalid according to server
        console.log('Session validation failed:', data.error);
        localStorage.removeItem('wedding_guest');
        localStorage.removeItem('wedding_guest_session');
        setSessionToken(null);
        setGuestState(null);
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

  const setGuest = (newGuest: Guest | null, newSessionToken?: string) => {
    setGuestState(newGuest);
    if (newSessionToken) {
      setSessionToken(newSessionToken);
    }
  };

  const clearGuest = async () => {
    setGuestState(null);
    
    // Create and show overlay for logout animation
    let overlay: HTMLElement | null = null;
    if (typeof window !== 'undefined') {
      overlay = createLogoutOverlay();
    }
    
    // If we have a session token, delete the session on the server
    if (sessionToken) {
      try {
        await deleteGuestSession(sessionToken);
        
        // Also make API call to clear cookie
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
      } catch (error) {
        console.error('Error deleting guest session:', error);
      }
      
      // Remove from local storage
      localStorage.removeItem('wedding_guest_session');
      setSessionToken(null);
    }
    
    // Remove guest data from local storage
    localStorage.removeItem('wedding_guest');
    
    // Delay redirect to allow animation to be visible for a pleasant amount of time
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        // Clean up the overlay element if it exists to prevent memory leaks
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        window.location.href = '/';
      }, 1500); // Increased to 1.5 seconds to ensure message is seen
    }
  };

  return (
    <GuestContext.Provider value={{ guest, setGuest, clearGuest, isLoading }}>
      {children}
    </GuestContext.Provider>
  );
}

export function useGuestContext() {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error('useGuestContext must be used within a GuestProvider');
  }
  return context;
}