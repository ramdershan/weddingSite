"use client"

import { useGuestContext } from '@/context/guest-context';
import { NavLink } from '@/components/nav-link';
import { useMemo } from 'react';

export function ConditionalNavbar() {
  const { guest, events } = useGuestContext();

  // Check if guest should see RSVP section at all
  const shouldShowRsvpLink = useMemo(() => {
    // Always show for non-logged-in users
    if (!guest) return true;
    
    // Check if guest only has engagement access
    const hasOnlyEngagementAccess = guest && events && events.length > 0 && 
      events.filter(event => event.canRsvp).every(event => event.id === 'engagement');
    
    // Hide RSVP link if guest only has engagement access
    return !hasOnlyEngagementAccess;
  }, [guest, events]);

  return (
    <nav className="hidden md:flex items-center space-x-8">
      <NavLink href="/#our-story">Our Story</NavLink>
      <NavLink href="/#timeline">Details</NavLink>
      {shouldShowRsvpLink && <NavLink href="/#rsvp">RSVP</NavLink>}
      <NavLink href="/#photos">Gallery</NavLink>
    </nav>
  );
} 