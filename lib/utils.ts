import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isRsvpDeadlinePassed(): boolean {
  const deadline = new Date('2026-01-01T00:00:00');
  const now = new Date();
  return now >= deadline;
}

export function isEngagementRsvpDeadlinePassed(): boolean {
  const deadline = new Date('2025-09-01T00:00:00');
  const now = new Date();
  return now >= deadline;
}

// Check if RSVP is open based on the event's open date
export function isRsvpOpen(openDate: string | Date | null | undefined): boolean {
  if (!openDate) return true; // If no open date is set, assume RSVPs are open
  const openDateObj = new Date(openDate);
  const now = new Date();
  return now >= openDateObj;
}

// Format date for display
export function formatOpenDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

export function getWeddingDate(): Date {
  // Use a date that is definitely in the future
  const weddingDate = new Date('2026-01-24T13:00:00'); // 1:00 PM on January 24th, 2026
  return weddingDate;
}

// Add this function to handle navigation to sections on the home page
export function navigateToHomeSection(sectionId: string): void {
  // First check if we're on the homepage
  const isHomepage = window.location.pathname === '/' || window.location.pathname === '';
  
  if (!isHomepage) {
    // If on another page, navigate to homepage with hash
    window.location.href = `/#${sectionId}`;
    return;
  }
  
  // If we're on the homepage, prevent the default hash behavior from causing a scroll
  // by updating the URL without triggering a scroll event
  const scrollPosition = window.pageYOffset;
  history.pushState(null, '', `/#${sectionId}`);
  window.scrollTo(window.pageXOffset, scrollPosition);
  
  // Then perform our controlled smooth scroll
  scrollToSection(sectionId);
}

// Helper function to do the actual scrolling
export function scrollToSection(sectionId: string): void {
  const element = document.getElementById(sectionId);
  if (element) {
    // Get header height for proper offset
    const header = document.querySelector('header');
    const headerHeight = header ? header.offsetHeight : 0;
    
    // Calculate position with offset
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 20;
    
    // Perform smooth scroll
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
}