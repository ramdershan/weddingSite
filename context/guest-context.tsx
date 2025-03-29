"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Guest } from '@/lib/types';

type GuestContextType = {
  guest: Guest | null;
  setGuest: (guest: Guest | null) => void;
  clearGuest: () => void;
};

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [guest, setGuestState] = useState<Guest | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load guest from localStorage on initial render
  useEffect(() => {
    const storedGuest = localStorage.getItem('wedding_guest');
    if (storedGuest) {
      try {
        setGuestState(JSON.parse(storedGuest));
      } catch (error) {
        console.error('Error parsing stored guest:', error);
        localStorage.removeItem('wedding_guest');
      }
    }
    setIsLoaded(true);
  }, []);

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

  const setGuest = (newGuest: Guest | null) => {
    setGuestState(newGuest);
  };

  const clearGuest = () => {
    setGuestState(null);
  };

  return (
    <GuestContext.Provider value={{ guest, setGuest, clearGuest }}>
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