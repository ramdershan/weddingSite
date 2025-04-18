"use client"

import { useEffect, useState } from 'react';
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
  
  // Set a minimum loading time of 2.5 seconds
  useEffect(() => {
    // Start the minimum loading timer
    const timer = setTimeout(() => {
      setMinimumLoadingComplete(true);
    }, 2500);
    
    // Clean up the timer if component unmounts
    return () => clearTimeout(timer);
  }, []);
  
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
        
        setEventDetails({
          title: event.title,
          date: event.date,
          time: `${event.time_start}${event.time_end ? ' - ' + event.time_end : ''}`,
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
            
            setChildEvents(sortedChildEvents);
            
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
            toast({
              title: "Access Denied",
              description: "You are not authorized to RSVP for this event.",
              variant: "destructive",
            });
            router.push('/');
            return;
          }
        }
        
        setEventDetails({
          title: data.event.title,
          date: data.event.date,
          time: `${data.event.time_start}${data.event.time_end ? ' - ' + data.event.time_end : ''}`,
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
              console.error("Error during API child events sort:", err, "Event A:", a, "Event B:", b);
              return 0; // Prevent crash
            }
          });
          
          setChildEvents(sortedChildEvents);
          
          // Initialize selected state based on previous responses if guest exists
          if (guest) {
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
      
      // Only show login modal after minimum loading time has passed
      // And only if we need to show it (no guest and needsLoginModal is true)
      if (!guest && needsLoginModal) {
        // Slight delay to ensure smooth transition from loading screen to modal
        setTimeout(() => {
          setShowLoginModal(true);
        }, 100);
      }
    }
  }, [minimumLoadingComplete, dataLoadingComplete, guest, needsLoginModal]);
  
  useEffect(() => {
    // Check if RSVP deadline has passed
    if (eventId === 'engagement') {
      setDeadlinePassed(isEngagementRsvpDeadlinePassed());
    } else {
      setDeadlinePassed(isRsvpDeadlinePassed());
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
  }, [eventId, eventDetails, guest, searchParams, dataLoadingComplete]);
  
  const fetchGuestData = async () => {
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
        
        initialDietary = guest.dietaryRestrictions || eventResponse.dietaryRestrictions || '';
        
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
  };
  
  // Auto-login function using name from URL
  const autoLoginWithName = async (name: string) => {
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
  };
  
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
        toast({
          title: "Access Denied",
          description: "You are not authorized to RSVP for this event.",
          variant: "destructive",
        });
        router.push('/');
        return;
      }
    }
    
    // Double-check deadline hasn't passed
    if ((eventId === 'engagement' && isEngagementRsvpDeadlinePassed()) || 
        (eventId !== 'engagement' && isRsvpDeadlinePassed())) {
      toast({
        title: "RSVP Closed",
        description: `The RSVP period for the ${eventDetails.title} has ended. Please contact the hosts directly.`,
        variant: "destructive",
      });
      setDeadlinePassed(true);
      return;
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
            description: errorData.error || "You are not authorized to RSVP for this event.",
            variant: "destructive",
          });
          
          // If it's a permission issue, redirect to home
          if (errorData.error === "You do not have permission to RSVP for this event") {
            setTimeout(() => router.push('/'), 2000);
          }
          return;
        } else if (apiResponse.status === 404) {
          // Event not found
          toast({
            title: "Event Not Found",
            description: "This event does not exist or has been removed.",
            variant: "destructive",
          });
          setTimeout(() => router.push('/'), 2000);
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
      <main className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-4 pt-24">
        <div className="max-w-md w-full mx-auto">
          <Card className="p-6 shadow-lg">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
              <h2 className="text-xl font-semibold">RSVP Period Has Ended</h2>
              <p className="text-muted-foreground">
                {eventId === 'engagement' 
                  ? "The deadline for Engagement RSVPs was September 1, 2025." 
                  : "The deadline for RSVPs was January 1, 2026."} 
                If you need to update your response, please contact the hosts directly.
              </p>
              <Button 
                onClick={() => router.push('/')}
                className="mt-4"
              >
                Return to Home
              </Button>
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
                <Calendar className="h-4 w-4 mr-2 text-primary" />
                <span>{eventDetails.date}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-primary" />
                <span>{eventDetails.time}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-primary" />
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
                  className="mt-2"
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
                    className="mt-2"
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
                      <RadioGroupItem value="Yes" id="yes" />
                      <Label htmlFor="yes" className="cursor-pointer">Yes, I'll be there</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="No" id="no" />
                      <Label htmlFor="no" className="cursor-pointer">No, I can't make it</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Maybe" id="maybe" />
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
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            disabled={response !== "Yes" && response !== "Maybe"}
                          />
                          <Label 
                            htmlFor={`child-event-${childEvent.id}`}
                            className="cursor-pointer text-sm flex items-center justify-between w-full"
                          >
                            <span>{childEvent.title}</span>
                            <span className="text-xs text-muted-foreground flex items-center">
                              {childEvent.date}, {childEvent.time_start}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="plusOne">Will you bring guests?</Label>
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
                          className="mt-1"
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
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Children under 12 years old
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-sm text-muted-foreground">
                    Please let us know if you'll be bringing guests.
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
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {dietaryRestrictions.length}/150 characters
                  </p>
                </div>

                <div className="flex flex-col space-y-2">
                  <Button 
                    type="submit" 
                    className="w-full" 
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
          {eventId === 'engagement' 
            ? "Please RSVP by September 1, 2025" 
            : "Please RSVP by January 1, 2026"}
        </p>
      </div>
      
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => {
          setShowLoginModal(false);
          // Also reset the needs login modal flag
          setNeedsLoginModal(false);
          if (!guest) {
            router.push('/');
          }
        }} 
      />
    </main>
  );
}
