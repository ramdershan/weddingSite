"use client"

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Guest } from '@/lib/types';
import { Loader2, CheckCircle, Calendar, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { isRsvpDeadlinePassed, isEngagementRsvpDeadlinePassed, navigateToHomeSection } from '@/lib/utils';
import { useGuestContext } from '@/context/guest-context';
import { LoginModal } from '@/components/login-modal';
import { LoadingScreen } from '@/components/loading-screen';

export default function EventRSVPPage({ params }: { params: { eventId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const eventId = params.eventId;
  const { guest, setGuest, events } = useGuestContext();
  
  // State for event details from API
  const [eventDetails, setEventDetails] = useState<any>(null);
  // Add state for child events
  const [childEvents, setChildEvents] = useState<any[]>([]);
  const [selectedChildEvents, setSelectedChildEvents] = useState<Record<string, boolean>>({});
  
  const [response, setResponse] = useState<"Yes" | "No" | "Maybe">("Yes");
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string>('');
  const [plusOne, setPlusOne] = useState<boolean>(false);
  const [adultCount, setAdultCount] = useState<number>(0);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [deadlinePassed, setDeadlinePassed] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [needsLoginModal, setNeedsLoginModal] = useState<boolean>(false);
  const [minimumLoadingComplete, setMinimumLoadingComplete] = useState<boolean>(false);
  const [dataLoadingComplete, setDataLoadingComplete] = useState<boolean>(false);
  
  // State for tracking if guest has already responded
  const [hasResponded, setHasResponded] = useState<boolean>(false);
  
  // Save the dietary value when switching to "No" and restore it when switching back
  const [savedDietaryValue, setSavedDietaryValue] = useState<string>('');
  
  // Add new state flags
  const [responseManuallyEdited, setResponseManuallyEdited] = useState<boolean>(false);
  const [dietaryManuallyEdited, setDietaryManuallyEdited] = useState<boolean>(false);
  const [plusOneManuallyEdited, setPlusOneManuallyEdited] = useState<boolean>(false);
  const [childEventsManuallyEdited, setChildEventsManuallyEdited] = useState<boolean>(false);
  
  // Define the exact order we want for events by their IDs - same as the timeline order
  const eventOrder: {[key: string]: number} = {
    'engagement': 1,
    'mehndi': 2, 
    'haldi': 3,
    'sangeet': 4,
    'wedding': 5,
    'ceremony': 6, // Including both possible IDs for the wedding ceremony
    'reception': 7
  };
  
  // Used to prevent repeated toast notifications
  const [hasShownDeadlineToast, setHasShownDeadlineToast] = useState<boolean>(false);
  // Count down from 15 to 0
  const [redirectCountdown, setRedirectCountdown] = useState<number>(15);
  
  // Helper function to check if sign-out is in progress - defined early so it can be used in useEffect
  const isSigningOut = () => {
    // Check for the logout overlay element
    const hasLogoutOverlay = typeof document !== 'undefined' && 
      !!document.querySelector('[data-logout-overlay="true"]');
    
    // Also check if guest data was recently cleared (within last 3 seconds)
    const logoutTimestamp = typeof localStorage !== 'undefined' ? 
      localStorage.getItem('wedding_logout_timestamp') : null;
    
    if (logoutTimestamp) {
      const logoutTime = parseInt(logoutTimestamp, 10);
      const currentTime = Date.now();
      const isRecentLogout = (currentTime - logoutTime) < 3000; // 3 seconds
      return isRecentLogout;
    }
    
    return hasLogoutOverlay;
  };
  
  // Helper function to check if the deadline has passed for this specific event
  const checkEventDeadline = (eventObj: any) => {
    if (!eventObj) return false;
    
    // First check if event has a specific deadline in the database
    if (eventObj.rsvpDeadline) {
      return new Date() > new Date(eventObj.rsvpDeadline);
    }
    
    // Fallback to the general deadline checks
    return eventId === 'engagement' 
      ? isEngagementRsvpDeadlinePassed() 
      : isRsvpDeadlinePassed();
  };

  // Helper function to get the formatted deadline text
  const getDeadlineText = () => {
    const event = events.find((e: any) => e.id === eventId);
    
    if (event?.rsvpDeadline) {
      const deadlineDate = new Date(event.rsvpDeadline);
      return `Please RSVP by ${deadlineDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })}`;
    }
    
    // Fallback text based on event type
    return eventId === 'engagement' 
      ? "Please RSVP by September 1, 2025" 
      : "Please RSVP by January 1, 2026";
  };
  
  // Helper function to get the formatted deadline date string for the past deadline message
  const getPastDeadlineText = () => {
    const event = events.find((e: any) => e.id === eventId);
    
    if (event?.rsvpDeadline) {
      const deadlineDate = new Date(event.rsvpDeadline);
      return `The deadline for ${event.title} RSVPs was ${deadlineDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })}.`;
    }
    
    // Fallback text based on event type
    return eventId === 'engagement' 
      ? "The deadline for Engagement RSVPs was September 1, 2025." 
      : "The deadline for RSVPs was January 1, 2026.";
  };
  
  // Helper function to show toast with countdown and handle redirect
  const showDeadlineToastWithCountdown = useCallback(() => {
    // Mark that we've shown the toast to prevent showing it again
    setHasShownDeadlineToast(true);
    
    // Show initial toast
    toast({
      title: "RSVP Deadline Passed",
      description: `Sorry, ${getPastDeadlineText().toLowerCase()} You will be redirected to the home page in 15 seconds.`,
      duration: 15000, // 15 seconds
      variant: "destructive"
    });
    
    // Start countdown from 15
    setRedirectCountdown(15);
    
    // Set up interval to update toast every second
    const countdownInterval = setInterval(() => {
      setRedirectCountdown(prevCount => {
        // If we hit 0, clear interval and redirect
        if (prevCount <= 1) {
          clearInterval(countdownInterval);
          window.location.href = '/#rsvp';
          return 0;
        }
        
        // Update toast with new countdown
        const newCount = prevCount - 1;
        toast({
          title: "RSVP Deadline Passed",
          description: `Sorry, ${getPastDeadlineText().toLowerCase()} You will be redirected to the home page in ${newCount} seconds.`,
          duration: 2000, // Enough time to read before next update
          variant: "destructive"
        });
        
        return newCount;
      });
    }, 1000);
    
    // Clean up interval if component unmounts
    return () => clearInterval(countdownInterval);
  }, [toast, getPastDeadlineText, setHasShownDeadlineToast, setRedirectCountdown]);
  
  // Define fetchGuestData and autoLoginWithName functions before they're used in useEffect
  const fetchGuestData = useCallback(async () => {
    if (!guest) return;
    
    try {
      let initialDietary = guest.dietaryRestrictions || '';
      const eventResponse = guest.eventResponses?.[eventId];
      
      if (eventResponse) {
        setHasResponded(true);
        
        // Apply flags before setting state
        if (!responseManuallyEdited) {
          setResponse(eventResponse.response || "Yes");
        }
        if (!plusOneManuallyEdited) {
          const initialPlusOne = eventResponse.plusOne || false;
          setPlusOne(initialPlusOne);
          // Only set counts if plusOne is initially true AND not manually edited
          if (initialPlusOne) { 
             setAdultCount(eventResponse.adultCount ?? (eventResponse.plusOneCount || 0));
             setChildrenCount(eventResponse.childrenCount ?? 0);
          }
        }
        
        // Remove fallback: Use guest's dietary restrictions only
        initialDietary = guest.dietaryRestrictions || '';
        
        // Check for child event responses if this is a parent event
        // Only initialize child events if they haven't been manually edited
        if (childEvents.length > 0 && !childEventsManuallyEdited) {
          const updatedSelectedEvents: Record<string, boolean> = {};
          childEvents.forEach(childEvent => {
            const childResponse = guest.eventResponses?.[childEvent.id];
            updatedSelectedEvents[childEvent.id] = childResponse?.response === "Yes";
          });
          setSelectedChildEvents(updatedSelectedEvents);
        }
      } 
      
      if (!dietaryManuallyEdited) {
        setDietaryRestrictions(initialDietary);
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load your previous RSVP information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDataLoadingComplete(true);
    }
  }, [
    guest, 
    eventId, 
    childEvents, 
    childEventsManuallyEdited, 
    dietaryManuallyEdited, 
    plusOneManuallyEdited, 
    responseManuallyEdited, 
    toast,
    setHasResponded,
    setResponse,
    setPlusOne,
    setAdultCount,
    setChildrenCount,
    setSelectedChildEvents,
    setDietaryRestrictions,
    setDataLoadingComplete
  ]);
  
  // Auto-login function using name from URL
  const autoLoginWithName = useCallback(async (name: string) => {
    try {
      const response = await fetch(`/api/guest?name=${encodeURIComponent(name)}`);
      
      if (response.ok) {
        const data = await response.json();
        setGuest(data.guest);
        // Guest is now set, useEffect will call fetchGuestData
      } else {
        // Auto-login failed, show login modal
        setNeedsLoginModal(true);
        setDataLoadingComplete(true); // No further data loading needed
      }
    } catch (error) {
      console.error("Error auto-logging in with name from URL:", error);
      setNeedsLoginModal(true);
      setDataLoadingComplete(true); // No further data loading needed
    }
  }, [setGuest, setNeedsLoginModal, setDataLoadingComplete]);
  
  // Set a minimum loading time for better user experience
  useEffect(() => {
    // Start the minimum loading timer
    const timer = setTimeout(() => {
      setMinimumLoadingComplete(true);
    }, 1000);
    
    // Clean up the timer if component unmounts
    return () => clearTimeout(timer);
  }, []);
  
  // Immediately redirect non-logged in users (except when auto-login is possible)
  useEffect(() => {
    // Skip this check if signing out is in progress
    if (isSigningOut()) return;
    
    const nameFromUrl = searchParams.get('name');
    if (!nameFromUrl && !guest) {
      console.log('[RSVP] Redirecting non-logged in user from event page');
      window.location.href = '/#rsvp';
    }
  }, [guest, searchParams, isSigningOut]);
  
  // Load event details from GuestContext events
  useEffect(() => {
    if (events && events.length > 0) {
      const event = events.find(e => e.id === eventId);
      if (event) {
        // Check if guest can RSVP to this event
        if (guest && !event.canRsvp) {
          // Guest does not have RSVP access to this event
          toast({
            title: "Access Denied",
            description: "You are not authorized to RSVP for this event.",
            variant: "destructive",
          });
          router.push('/');
          return;
        }
        
        // Determine which timezone to display based on event ID
        const timezone = event.id === 'engagement' ? 'MST' : 'IST';
        
        setEventDetails({
          title: event.title,
          date: event.date,
          time: (
            <span className="inline-flex items-center">
              {event.time_start}{event.time_end ? ` - ${event.time_end}` : ''}
              <span className="mx-1 text-muted-foreground/60 inline-block">·</span>
              <span className="text-muted-foreground/80 inline-block">
                {timezone}
              </span>
            </span>
          ),
          location: event.location,
          maps_link: event.maps_link,
          isParent: event.isParent
        });
        
        // If this is a parent event, find child events that the guest can RSVP to
        if (event.isParent) {
          const availableChildEvents = events.filter(e => 
            e.parentEventId === eventId && 
            e.canRsvp
          );
          
          if (availableChildEvents.length > 0) {
            // Sort child events in the same order as the timeline
            const sortedChildEvents = [...availableChildEvents].sort((a, b) => {
              try {
                // Get position in the predefined order
                const orderA = eventOrder[a.id] || 999; // Default to high number if not in order map
                const orderB = eventOrder[b.id] || 999;
                
                // First sort by our predefined order
                if (orderA !== orderB) {
                  return orderA - orderB;
                }
                
                // If same type of event (unlikely), fallback to date/time sort
                const dateAStr = a.raw_date || '1970-01-01';
                const dateBStr = b.raw_date || '1970-01-01';
                
                const [yearA, monthA, dayA] = dateAStr.split('-').map(Number);
                const [yearB, monthB, dayB] = dateBStr.split('-').map(Number);
                
                // Compare Year
                if (yearA !== yearB) return yearA - yearB;
                // Compare Month
                if (monthA !== monthB) return monthA - monthB;
                // Compare Day
                if (dayA !== dayB) return dayA - dayB;
                
                // Only if same day, compare time
                const timeAStr = a.raw_time_start || '00:00:00';
                const timeBStr = b.raw_time_start || '00:00:00';
                
                const [hourA, minuteA] = timeAStr.split(':').map(Number);
                const [hourB, minuteB] = timeBStr.split(':').map(Number);
                
                // Compare Hour
                if (hourA !== hourB) return hourA - hourB;
                // Compare Minute
                return minuteA - minuteB;
              } catch (err) {
                console.error("Error during child events sort (Manual Order):", err, "Event A:", a, "Event B:", b);
                return 0; // Prevent crash
              }
            });
            
            // Add timezone to each child event
            const childEventsWithTimezone = sortedChildEvents.map(childEvent => {
              const timezone = childEvent.id === 'engagement' ? 'MST' : 'IST';
              return {
                ...childEvent,
                time_start: (
                  <span className="inline-flex items-center">
                    {childEvent.time_start}
                    <span className="mx-1 text-muted-foreground/60 inline-block">·</span>
                    <span className="text-muted-foreground/80 inline-block">
                      {timezone}
                    </span>
                  </span>
                )
              };
            });
            
            setChildEvents(childEventsWithTimezone);
            
            // Initialize selected state based on previous responses
            const initialSelectedState: Record<string, boolean> = {};
            sortedChildEvents.forEach(childEvent => {
              // Default to true if guest has already RSVP'd yes to this event
              const hasResponded = guest?.eventResponses?.[childEvent.id]?.response === "Yes";
              initialSelectedState[childEvent.id] = hasResponded;
            });
            
            // Only set the child events if they haven't been manually edited
            if (!childEventsManuallyEdited) {
              setSelectedChildEvents(initialSelectedState);
            }
          }
        }
        
        setDataLoadingComplete(true);
      } else {
        // Event not found in context, try to fetch it
        fetchEventDetails();
      }
    } else {
      // No events in context, try to fetch specific event
      fetchEventDetails();
    }
  }, [eventId, events, guest, router, toast, eventOrder]);
  
  // Reset the manually edited flags whenever the guest changes
  useEffect(() => {
    if (guest) {
      // Reset the flags when a new guest is loaded
      setDietaryManuallyEdited(false);
      setResponseManuallyEdited(false);
      setPlusOneManuallyEdited(false);
      setChildEventsManuallyEdited(false);
    }
  }, [guest?.id]); // Only trigger when the guest ID changes
  
  // Save the dietary value when switching to "No" and restore it when switching back
  useEffect(() => {
    if (response === "No") {
      setSavedDietaryValue(dietaryRestrictions);
    } else if (savedDietaryValue && (response === "Yes" || response === "Maybe")) {
      setDietaryRestrictions(savedDietaryValue);
    }
  }, [response]);
  
  // Check guest authorization for this event as soon as possible
  useEffect(() => {
    // Skip if no guest or events data yet
    if (!guest || !events || events.length === 0) return;

    // Check if the guest has access to this event
    const eventInGuestList = events.find(e => e.id === eventId);
    
    // If event not in guest's list or can't RSVP, redirect immediately
    if (!eventInGuestList || !eventInGuestList.canRsvp) {
      console.log(`[RSVP] Guest ${guest.fullName} attempted to access unauthorized event: ${eventId}`);
      
      // Show toast notification
      toast({
        title: "Access Denied",
        description: "You are not authorized to access this event.",
        variant: "destructive",
      });
      
      // Redirect to home page RSVP section immediately
      window.location.href = '/#rsvp';
    }
  }, [guest, events, eventId, toast]);
  
  // Fetch event details from API
  const fetchEventDetails = async () => {
    try {
      const response = await fetch(`/api/event/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        
        // If we have a guest but no events data yet, we need to check authorization
        if (guest && events.length > 0) {
          // Try to find this event in the guest's events
          const eventInGuestList = events.find(e => e.id === eventId);
          if (!eventInGuestList || !eventInGuestList.canRsvp) {
            console.log(`[RSVP] Guest ${guest.fullName} attempted to access unauthorized event: ${eventId}`);
            
            // Show toast notification
            toast({
              title: "Access Denied",
              description: "You are not authorized to access this event.",
              variant: "destructive",
            });
            
            // Redirect to home page RSVP section immediately
            window.location.href = '/#rsvp';
            return;
          }
        }
        
        // Determine which timezone to display based on event ID
        const timezone = data.event.id === 'engagement' ? 'MST' : 'IST';
        
        setEventDetails({
          title: data.event.title,
          date: data.event.date,
          time: (
            <span className="inline-flex items-center">
              {data.event.time_start}{data.event.time_end ? ` - ${data.event.time_end}` : ''}
              <span className="mx-1 text-muted-foreground/60 inline-block">·</span>
              <span className="text-muted-foreground/80 inline-block">
                {timezone}
              </span>
            </span>
          ),
          location: data.event.location,
          maps_link: data.event.maps_link,
          isParent: data.event.isParent
        });
        
        // If there are child events in the API response, process them
        if (data.event.isParent && data.childEvents && data.childEvents.length > 0) {
          // Sort child events in the same order as the timeline
          const sortedChildEvents = [...data.childEvents].sort((a, b) => {
            try {
              // Get position in the predefined order
              const orderA = eventOrder[a.id] || 999; // Default to high number if not in order map
              const orderB = eventOrder[b.id] || 999;
              
              // First sort by our predefined order
              if (orderA !== orderB) {
                return orderA - orderB;
              }
              
              // If same type of event (unlikely), fallback to date/time sort
              const dateAStr = a.raw_date || '1970-01-01';
              const dateBStr = b.raw_date || '1970-01-01';
              
              const [yearA, monthA, dayA] = dateAStr.split('-').map(Number);
              const [yearB, monthB, dayB] = dateBStr.split('-').map(Number);
              
              // Compare Year
              if (yearA !== yearB) return yearA - yearB;
              // Compare Month
              if (monthA !== monthB) return monthA - monthB;
              // Compare Day
              if (dayA !== dayB) return dayA - dayB;
              
              // Only if same day, compare time
              const timeAStr = a.raw_time_start || '00:00:00';
              const timeBStr = b.raw_time_start || '00:00:00';
              
              const [hourA, minuteA] = timeAStr.split(':').map(Number);
              const [hourB, minuteB] = timeBStr.split(':').map(Number);
              
              // Compare Hour
              if (hourA !== hourB) return hourA - hourB;
              // Compare Minute
              return minuteA - minuteB;
            } catch (err) {
              console.error("Error during child events sort (API):", err, "Event A:", a, "Event B:", b);
              return 0; // Prevent crash
            }
          });
          
          // Add timezone to each child event
          const childEventsWithTimezone = sortedChildEvents.map(childEvent => {
            const timezone = childEvent.id === 'engagement' ? 'MST' : 'IST';
            return {
              ...childEvent,
              time_start: (
                <span className="inline-flex items-center">
                  {childEvent.time_start}
                  <span className="mx-1 text-muted-foreground/60 inline-block">·</span>
                  <span className="text-muted-foreground/80 inline-block">
                    {timezone}
                  </span>
                </span>
              )
            };
          });
          
          setChildEvents(childEventsWithTimezone);
          
          // Initialize selected state for child events
          const initialSelectedState: Record<string, boolean> = {};
          sortedChildEvents.forEach(childEvent => {
            // If the guest already responded, use that response
            if (guest && guest.eventResponses && childEvent.id in guest.eventResponses) {
              initialSelectedState[childEvent.id] = 
                guest.eventResponses[childEvent.id].response === "Yes";
            } else {
              // Default to false otherwise
              initialSelectedState[childEvent.id] = false;
            }
          });
          
          if (!childEventsManuallyEdited) {
            setSelectedChildEvents(initialSelectedState);
          }
        }
      } else {
        // API error, redirect to home
        toast({
          title: "Event Not Found",
          description: "The requested event could not be found.",
          variant: "destructive",
        });
        router.push('/');
      }
    } catch (error) {
      console.error("Error fetching event details:", error);
      toast({
        title: "Error",
        description: "Failed to load event details. Please try again.",
        variant: "destructive",
      });
      router.push('/');
    } finally {
      setDataLoadingComplete(true);
    }
  };
  
  // Only stop loading when both minimum time has passed and data is ready
  useEffect(() => {
    if (minimumLoadingComplete && dataLoadingComplete) {
      setIsLoading(false);
      
      // Check if sign-out is in progress using our defined function
      const userIsSigningOut = isSigningOut();
      
      // Only show login modal after minimum loading time has passed
      // And only if we need to show it (no guest and needsLoginModal is true)
      // And not when signing out
      if (!guest && needsLoginModal && !userIsSigningOut) {
        // Slight delay to ensure smooth transition from loading screen to modal
        setTimeout(() => {
          setShowLoginModal(true);
        }, 100);
      }
    }
  }, [minimumLoadingComplete, dataLoadingComplete, guest, needsLoginModal]);
  
  useEffect(() => {
    // Check if RSVP deadline has passed
    const currentEvent = events.find((e: any) => e.id === eventId);
    const deadlineHasPassed = checkEventDeadline(currentEvent);
    setDeadlinePassed(deadlineHasPassed);
    
    // If deadline has passed, show toast and redirect to home page RSVP section
    if (deadlineHasPassed && !hasShownDeadlineToast) {
      showDeadlineToastWithCountdown();
    }
    
    // Redirect if invalid event ID (will be handled by fetchEventDetails)
    if (!eventDetails && dataLoadingComplete) {
      return;
    }
    
    // Check for name in URL parameters
    const nameFromUrl = searchParams.get('name');
    
    // If guest is already logged in, proceed without showing modal
    if (guest) {
      // Even if we have the guest data, we still want to show loading for the minimum time
      fetchGuestData();
      return;
    }
    
    // If name is in URL and no guest is logged in, try to auto-login
    if (nameFromUrl) {
      autoLoginWithName(nameFromUrl);
    } else {
      // No guest and no name in URL, flag that we need to show login modal
      // But don't actually show it yet - we'll wait for minimum loading time
      setNeedsLoginModal(true);
      setDataLoadingComplete(true); // No data to load in this case
    }
  }, [eventId, eventDetails, guest, searchParams, dataLoadingComplete, events, toast, hasShownDeadlineToast]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guest) {
      setNeedsLoginModal(true);
      return;
    }
    
    // Double-check that this guest can RSVP to this event
    if (events && events.length > 0) {
      const eventInGuestList = events.find(e => e.id === eventId);
      if (!eventInGuestList || !eventInGuestList.canRsvp) {
        console.log(`[RSVP] Guest ${guest.fullName} attempted to submit RSVP for unauthorized event: ${eventId}`);
        
        toast({
          title: "Access Denied",
          description: "You are not authorized to access this event.",
          variant: "destructive",
        });
        
        // Redirect to home page RSVP section immediately
        window.location.href = '/#rsvp';
        return;
      }
    
      // Double-check deadline hasn't passed using our more accurate function
      if (checkEventDeadline(eventInGuestList)) {
      setDeadlinePassed(true);
        showDeadlineToastWithCountdown();
      return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      // First, submit the parent event RSVP
      const apiResponse = await fetch('/api/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: localStorage.getItem('guestToken'),
          eventCode: eventId,
          response,
          dietaryRestrictions,
          plusOne,
          plusOneCount: adultCount + childrenCount,
          adultCount,
          childrenCount
        }),
      });
      
      if (!apiResponse.ok) {
        // Get the error message from the response
        const errorData = await apiResponse.json();
        
        // Handle different error types
        if (apiResponse.status === 403) {
          // Authorization error
          toast({
            title: "Access Denied",
            description: errorData.error || "You are not authorized to access this event.",
            variant: "destructive",
          });
          
          // If it's a permission issue, redirect to home RSVP section
          if (errorData.error === "You do not have permission to RSVP for this event" || 
              errorData.error === "You are not invited to this event") {
            window.location.href = '/#rsvp';
          }
          return;
        } else if (apiResponse.status === 404) {
          // Event not found
          toast({
            title: "Event Not Found",
            description: "This event does not exist or has been removed.",
            variant: "destructive",
          });
          window.location.href = '/#rsvp';
          return;
        }
        
        throw new Error(errorData.error || 'Failed to submit RSVP');
      }
      
      // Next, submit RSVPs for each selected child event
      if (childEvents.length > 0 && response === "Yes") {
        const childEventPromises = Object.entries(selectedChildEvents).map(([childEventId, isSelected]) => {
          // Only submit for selected events
          if (isSelected) {
            return fetch('/api/rsvp', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                token: localStorage.getItem('guestToken'),
                eventCode: childEventId,
                response: "Yes",
                dietaryRestrictions,
                plusOne,
                plusOneCount: adultCount + childrenCount,
                adultCount,
                childrenCount
              }),
            });
          }
          // For unselected events, set response to "No"
          return fetch('/api/rsvp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: localStorage.getItem('guestToken'),
              eventCode: childEventId,
              response: "No",
              dietaryRestrictions: "",
              plusOne: false,
              plusOneCount: 0,
              adultCount: 0,
              childrenCount: 0
            }),
          });
        });
        
        // Wait for all child event RSVPs to complete
        await Promise.all(childEventPromises);
      }
      
      setSubmitted(true);
      toast({
        title: "RSVP Submitted",
        description: `Thank you for your response to the ${eventDetails.title}!`,
      });
    } catch (error) {
      console.error("RSVP submission error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit your RSVP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!eventDetails) {
    return null; // Will redirect in useEffect
  }
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (deadlinePassed) {
    return (
      <main className="min-h-screen bg-[#f4d6c1] flex flex-col items-center justify-center p-4 pt-24">
        <div className="max-w-md w-full mx-auto">
          <Card className="p-6 shadow-lg bg-[#f6f2e7]">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
              <h2 className="text-xl font-semibold">RSVP Period Has Ended</h2>
              <p className="text-muted-foreground">
                {getPastDeadlineText()} If you need to update your response, please contact the hosts directly. You will be redirected to the home page in 10 seconds.
              </p>
            </div>
          </Card>
        </div>
      </main>
    );
  }
  
  return (
    <main className="min-h-screen bg-[#f4d6c1] from-background to-muted flex flex-col items-center justify-center p-4 pt-24">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-windsong tracking-tight mb-2">Yukti & Ram</h1>
          <p className="text-gray-700">We're excited to celebrate with you!</p>
          <div className="mt-4 h-px bg-border w-1/2 mx-auto" />
        </div>
        
        <Card className="p-6 shadow-lg bg-[#f6f2e7]">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">{eventDetails.title} RSVP</h2>
              {guest && <p className="text-gray-700 mt-1">Hello, {guest.fullName}</p>}
            </div>
            
            <div className="bg-muted/50 p-4 rounded-md space-y-2 text-sm">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-[#741914]" />
                <span>{eventDetails.date}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-[#741914]" />
                <span>{eventDetails.time}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-[#741914]" />
                <a 
                  href={eventDetails.maps_link || `https://maps.google.com/maps?q=${encodeURIComponent(eventDetails.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-blue-600"
                >
                  {eventDetails.location}
                </a>
              </div>
            </div>
            
            {!guest ? (
              <div className="text-center space-y-4">
                <h3 className="text-lg font-medium">Please Sign In</h3>
                <p>You need to sign in to RSVP for this event.</p>
                <Button 
                  onClick={() => setNeedsLoginModal(true)}
                  className="mt-2 bg-[#741914] hover:bg-[#641510] text-white shadow-md hover:shadow-lg transition-all"
                >
                  Sign In
                </Button>
              </div>
            ) : submitted ? (
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="text-lg font-medium">Thank You!</h3>
                <p>Your RSVP for the {eventDetails.title} has been submitted successfully.</p>
                <p className="text-sm text-muted-foreground">
                  You can return to this page to update your response if needed.
                </p>
                <div className="flex flex-col space-y-2">
                  <Button 
                    onClick={() => setSubmitted(false)}
                    variant="outline"
                    className="mt-2 hover:bg-[#741914] hover:text-white border-[#741914] text-[#741914] shadow-sm hover:shadow-lg transition-all"
                  >
                    Edit Response
                  </Button>
                  <Button 
                    onClick={() => navigateToHomeSection('rsvp')}
                    variant="ghost"
                    className="mt-2"
                  >
                    Return to Home
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label>Will you be attending the {eventDetails.title}?</Label>
                  <RadioGroup 
                    value={response} 
                    onValueChange={(value) => {
                      setResponse(value as "Yes" | "No" | "Maybe");
                      setResponseManuallyEdited(true);
                    }}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Yes" id="yes" className="text-[#741914] border-[#741914] focus:ring-[#741914]" />
                      <Label htmlFor="yes" className="cursor-pointer">Yes, I'll be there</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="No" id="no" className="text-[#741914] border-[#741914] focus:ring-[#741914]" />
                      <Label htmlFor="no" className="cursor-pointer">No, I can't make it</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Maybe" id="maybe" className="text-[#741914] border-[#741914] focus:ring-[#741914]" />
                      <Label htmlFor="maybe" className="cursor-pointer">Maybe, I'm not sure yet</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {childEvents.length > 0 && response !== "No" && (
                  <div className="mt-4 mb-1">
                    <p className="text-sm text-muted-foreground mb-2">
                      This event includes related activities at this location. Please select which you also plan to attend:
                    </p>
                    <div className="space-y-1 pl-1">
                      {childEvents.map((childEvent) => (
                        <div 
                          key={childEvent.id} 
                          className="flex items-center space-x-2 py-1.5"
                        >
                          <input
                            type="checkbox"
                            id={`child-event-${childEvent.id}`}
                            checked={selectedChildEvents[childEvent.id] || false}
                            onChange={(e) => {
                              setSelectedChildEvents({
                                ...selectedChildEvents,
                                [childEvent.id]: e.target.checked
                              });
                              setChildEventsManuallyEdited(true);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-[#741914] focus:ring-[#741914] accent-[#741914]"
                            disabled={response !== "Yes" && response !== "Maybe"}
                          />
                          <Label 
                            htmlFor={`child-event-${childEvent.id}`}
                            className="cursor-pointer text-sm flex items-center justify-between w-full"
                          >
                            <span>{childEvent.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {childEvent.date} - {childEvent.time_start}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="plusOne">Will you bring family & guests?</Label>
                    <Switch 
                      id="plusOne" 
                      checked={plusOne}
                      onCheckedChange={(checked) => {
                        setPlusOne(checked);
                        setPlusOneManuallyEdited(true);
                        if (!checked) {
                          setAdultCount(0);
                          setChildrenCount(0);
                        }
                      }}
                      disabled={response === "No"}
                      className="data-[state=checked]:bg-[#741914]"
                    />
                  </div>
                  
                  {plusOne && response !== "No" && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <Label htmlFor="adultCount">Number of adult guests</Label>
                        <Input
                          id="adultCount"
                          type="number"
                          min="0"
                          max="5"
                          value={adultCount}
                          onChange={(e) => {
                            setAdultCount(parseInt(e.target.value) || 0);
                            setPlusOneManuallyEdited(true);
                          }}
                          className="mt-1 focus-visible:ring-[#741914]"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Not including yourself
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="childrenCount">Number of children</Label>
                        <Input
                          id="childrenCount"
                          type="number"
                          min="0"
                          max="5"
                          value={childrenCount}
                          onChange={(e) => {
                             setChildrenCount(parseInt(e.target.value) || 0);
                             setPlusOneManuallyEdited(true);
                           }}
                          className="mt-1 focus-visible:ring-[#741914]"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Children under 12 years old
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-sm text-muted-foreground">
                    Please add additional guests, not including yourself, in this section
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="dietary">Dietary Restrictions</Label>
                  <Textarea
                    id="dietary"
                    placeholder="Please let us know if you have any dietary restrictions or allergies"
                    value={dietaryRestrictions}
                    onChange={(e) => {
                      if (e.target.value.length <= 150) {
                        setDietaryRestrictions(e.target.value);
                        setDietaryManuallyEdited(true);
                      }
                    }}
                    disabled={response === "No"}
                    maxLength={150}
                    className="focus-visible:ring-[#741914]"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {dietaryRestrictions.length}/150 characters
                  </p>
                </div>

                <div className="flex flex-col space-y-2">
                  <Button 
                    type="submit" 
                    className="w-full bg-[#741914] hover:bg-[#641510] text-white shadow-md hover:shadow-lg transition-all"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      hasResponded ? "Update RSVP" : "Submit RSVP"
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => navigateToHomeSection('rsvp')}
                  >
                    Return to Home
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>
        
        <p className="text-center text-muted-foreground text-sm mt-8">
          {getDeadlineText()}
        </p>
      </div>
      
      <LoginModal 
        isOpen={showLoginModal && !isSigningOut()} 
        onClose={() => {
          setShowLoginModal(false);
          // Also reset the needs login modal flag
          setNeedsLoginModal(false);
          if (!guest) {
            // Force a hard redirect to the home page for a clean state
            window.location.href = '/';
          }
        }} 
      />
    </main>
  );
}
