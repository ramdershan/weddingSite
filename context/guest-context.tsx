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
    console.log('[Guest Context] setGuest called:', newGuest ? { name: newGuest.fullName } : 'null');
    console.log('[Guest Context] Token provided:', newSessionToken ? `${newSessionToken.substring(0, 10)}...` : 'none');
    
    setGuestState(newGuest);
    if (newSessionToken) {
      console.log('[Guest Context] Setting sessionToken state');
      setSessionToken(newSessionToken);
    } else {
      console.log('[Guest Context] No new sessionToken provided');
    }
    
    // Indicate we're no longer loading
    if (isLoading) {
      console.log('[Guest Context] Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const clearGuest = async () => {
    console.log('[Guest Context] Clearing guest session...');
    
    // Create and show overlay for logout animation
    let overlay: HTMLElement | null = null;
    if (typeof window !== 'undefined') {
      overlay = createLogoutOverlay();
    }
    
    // Immediately clear localStorage to ensure clean state
    localStorage.removeItem('wedding_guest');
    localStorage.removeItem('wedding_guest_session');
    
    // Clear state after localStorage is cleared
    setGuestState(null);
    
    // If we have a session token, delete the session from server
    if (sessionToken) {
      try {
        // First clear session from Supabase
        await deleteGuestSession(sessionToken);
        console.log('[Guest Context] Deleted guest session from database');
        
        // Then make API call to clear cookie
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (response.ok) {
          console.log('[Guest Context] Successfully cleared session cookies');
        } else {
          console.error('[Guest Context] Failed to clear session cookies:', await response.text());
        }
      } catch (error) {
        console.error('[Guest Context] Error during logout process:', error);
      }
      
      setSessionToken(null);
    }
    
    // Delay redirect to allow animation to be visible for a pleasant amount of time
    setTimeout(() => {
      // Clean up the overlay element if it exists to prevent memory leaks
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      
      console.log('[Guest Context] Redirecting to guest-login page after logout');
      
      // Force a hard, synchronous page reload to guest-login
      // This approach prevents any client-side interception
      if (typeof window !== 'undefined') {
        // Replace the current history entry rather than adding a new one
        window.location.replace('/guest-login');
        
        // If for some reason the above didn't trigger immediate navigation,
        // force reload the page which will then be redirected by middleware
        setTimeout(() => {
          console.log('[Guest Context] Forcing page reload as backup');
          window.location.reload();
        }, 300);
      }
    }, 1500);
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