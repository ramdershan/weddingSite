"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, MapPin, Heart, Camera, PartyPopper, Diamond } from 'lucide-react';
import { PhotoGallerySection } from '@/components/photo-gallery-section';
import { CountdownTimer } from '@/components/countdown-timer';
import { getWeddingDate, getEngagementDate, isRsvpDeadlinePassed, isEngagementRsvpDeadlinePassed, navigateToHomeSection, scrollToSection, isRsvpOpen, formatOpenDate } from '@/lib/utils';
import { LoginModal } from '@/components/login-modal';
import { useGuestContext } from '@/context/guest-context';
import { RingIcon } from '@/components/icons/ring-icon';
import { LoadingScreen } from '@/components/loading-screen';

// Define EventCard component outside of Home
function EventCard({ 
  title, 
  date, 
  time, 
  location, 
  icon,
  eventId,
  disabled = false,
  deadlineMessage = "",
  guest,
  onLoginClick,
  onRsvpClick,
  showLocation = true,
  maps_link,
  hasResponded = false
}: { 
  title: string; 
  date: string; 
  time: string | React.ReactNode; 
  location: string; 
  icon: React.ReactNode;
  eventId: string;
  disabled?: boolean;
  deadlineMessage?: string;
  guest?: any;
  onLoginClick?: () => void;
  onRsvpClick?: (eventId: string) => void;
  showLocation?: boolean;
  maps_link?: string;
  hasResponded?: boolean;
}) {
  return (
    <Card className={`overflow-hidden shadow-md transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl ${disabled ? 'opacity-70' : ''}`}>
      <CardContent className="p-6 relative z-10">
        <div className="flex items-start">
          <div className="mr-4 mt-1">
            {icon}
          </div>
          <div>
            <h3 className="font-medium text-lg mb-2">{title}</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-[#741914]" />
                <span>{date}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-[#741914]" />
                <span>{time}</span>
              </div>
              {showLocation ? (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-[#741914]" />
                  <a 
                    href={maps_link || `https://maps.google.com/maps?q=${encodeURIComponent(location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-blue-600"
                  >
                    {location}
                  </a>
                </div>
              ) : (
                <div className="flex items-center text-blue-600">
                  <MapPin className="h-4 w-4 mr-2 text-[#741914]" />
                  <span>Sign in to view location</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4">
              {guest ? (
                disabled ? (
                  <div className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm text-center w-full opacity-50">
                    {deadlineMessage || "RSVP Closed"}
                  </div>
                ) : (
                <Button 
                  variant={hasResponded ? "outline" : "default"}
                  size="sm" 
                  className={hasResponded 
                    ? "w-full shadow-sm hover:shadow-md transition-all hover:bg-[#741914] hover:text-white"
                    : "w-full bg-[#741914] hover:bg-[#641510] text-white shadow-md hover:shadow-lg transition-all"
                  }
                  onClick={() => onRsvpClick?.(eventId)}
                >
                  {hasResponded ? "Edit RSVP" : "RSVP for this event"}
                </Button>
                )
              ) : (
                <Button 
                  variant="default"
                  size="sm" 
                  className="w-full bg-[#741914] hover:bg-[#641510] text-white shadow-md hover:shadow-lg transition-all"
                  onClick={onLoginClick}
                >
                  Sign in to RSVP
                </Button>
              )}
            </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [engagementDeadlinePassed, setEngagementDeadlinePassed] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const weddingDate = new Date('2026-01-24T11:00:00'); // Default until loaded
  const engagementDate = new Date('2025-09-27T17:30:00'); // Default until loaded
  const { guest, isLoading, events, timelineEvents } = useGuestContext();
  
  // Handle URL hash navigation after page is loaded
  useEffect(() => {
    // Only run this effect after loading screen is gone and page is ready
    if (!isLoading && !pageReady) {
      setPageReady(true);
      
      // Check if there's a hash in the URL
      if (typeof window !== 'undefined') {
        const hash = window.location.hash;
        if (hash) {
          // Get the target section ID
          const targetId = hash.replace('#', '');
          if (targetId) {
            // Use scrollToSection directly instead of navigateToHomeSection
            // to avoid updating the hash again, which would cause a double-scroll
            setTimeout(() => {
              scrollToSection(targetId);
            }, 100);
          }
        }
      }
    }
  }, [isLoading, pageReady]);
  
  useEffect(() => {
    setDeadlinePassed(isRsvpDeadlinePassed());
    setEngagementDeadlinePassed(isEngagementRsvpDeadlinePassed());
    
    const interval = setInterval(() => {
      setDeadlinePassed(isRsvpDeadlinePassed());
      setEngagementDeadlinePassed(isEngagementRsvpDeadlinePassed());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []); // Empty dependency array means this runs once on mount
  
  // Handle RSVP navigation
  const handleRsvpClick = useCallback((eventId: string) => {
    if (!guest) {
      setShowLoginModal(true);
      return;
    }
    
    // Force navigation with window.location instead of router
    // Add guest name as a query parameter
    window.location.href = `/rsvp/${eventId}?name=${encodeURIComponent(guest.fullName)}`;
  }, [guest]);
  
  // Function to get event icon based on event ID or category
  const getEventIcon = (eventId: string) => {
    switch (eventId) {
      case 'engagement':
        return <RingIcon className="h-5 w-5 text-primary" />;
      case 'wedding':
        return <Heart className="h-6 w-6 text-primary text-rose-500" />;
      case 'reception':
        return <PartyPopper className="h-6 w-6 text-amber-500" />;
      case 'sangeet':
        return <Heart className="h-6 w-6 text-blue-500" />;
      case 'haldi':
        return <Heart className="h-6 w-6 text-yellow-500" />;
      case 'mehndi':
        return <Heart className="h-6 w-6 text-green-500" />;
      default:
        return <Diamond className="h-6 w-6 text-primary" />;
    }
  };
  
  // For the timeline section - all events the guest can see
  const timelineEventsList = useMemo(() => {
    // Always show all events in timeline regardless of guest invitation
    if (timelineEvents && timelineEvents.length > 0) {
      console.log("Using timeline events from context:", timelineEvents);
      // Sort events by date
      return [...timelineEvents].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      }).map(event => {
        // Add timezone indicator based on event ID
        const timezone = event.id === 'engagement' ? 'MST' : 'IST';
        return {
          ...event,
          time_display: (
            <span>
              {event.time_start}{event.time_end ? ` - ${event.time_end}` : ''}
              <span className="mx-1 text-muted-foreground/60">·</span>
              <span className="text-muted-foreground/80 text-sm">
                {timezone}
              </span>
            </span>
          )
        };
      });
    }
    
    // Default to empty array if no events
    return [];
  }, [timelineEvents]); // Use timelineEvents instead of events
  
  // For the RSVP section - only parent events with RSVP access
  // Hide RSVP section for guests who only have engagement access
  const eventCards = useMemo(() => {
    // Check if guest only has engagement access
    const hasOnlyEngagementAccess = guest && events && events.length > 0 && 
      events.filter(event => event.canRsvp).every(event => event.id === 'engagement');
    
    // If guest only has engagement access, return empty array to hide RSVP section
    if (hasOnlyEngagementAccess) {
      console.log("Guest only has engagement access, hiding RSVP section");
      return [];
    }
    
    // If we have events from the database, use those
    if (events && events.length > 0) {
      console.log("Using events from DB for cards:", events);
      // Filter to parent events and events that can be RSVP'd to
      return events
        .filter(event => event.isParent && event.canRsvp)
        .map(event => {
          // Check if RSVP deadline has passed
          const deadlineHasPassed = event.rsvpDeadline ? new Date() > new Date(event.rsvpDeadline) : false;
          
          // Check if RSVP is open yet
          const rsvpIsOpen = isRsvpOpen(event.rsvpOpenDate);
          
          // Set appropriate message based on RSVP status
          let deadlineMessage = "";
          let isDisabled = false;
          
          if (deadlineHasPassed) {
            deadlineMessage = "RSVP Deadline Passed";
            isDisabled = true;
          } else if (!rsvpIsOpen) {
            deadlineMessage = `RSVP opens ${formatOpenDate(event.rsvpOpenDate)}`;
            isDisabled = true;
          }
          
          // Check if guest has already responded to this event
          const hasResponded = guest?.eventResponses && guest.eventResponses[event.id] ? true : false;
          
          // Add timezone indicator based on event ID
          const timezone = event.id === 'engagement' ? 'MST' : 'IST';
          
          return {
            ...event,
            icon: getEventIcon(event.id),
            disabled: isDisabled,
            deadlineMessage,
            hasResponded,
            time_display: (
              <span>
                {event.time_start}{event.time_end ? ` - ${event.time_end}` : ''}
                <span className="mx-1 text-muted-foreground/60">·</span>
                <span className="text-muted-foreground/80 text-sm">
                  {timezone}
                </span>
              </span>
            )
          };
        });
    }
    
    // No events from the database, return empty array
    console.log("No events found from database for RSVP cards");
    return [];
  }, [events, guest?.eventResponses]);
  
  // Check if guest should see RSVP section at all
  const shouldShowRsvpSection = useMemo(() => {
    // Always show for non-logged-in users (to display public events)
    if (!guest) return true;
    
    // Check if guest only has engagement access
    const hasOnlyEngagementAccess = guest && events && events.length > 0 && 
      events.filter(event => event.canRsvp).every(event => event.id === 'engagement');
    
    // Hide RSVP section if guest only has engagement access
    return !hasOnlyEngagementAccess;
  }, [guest, events]);
  
  // For showing events to non-logged-in users (public view)
  const publicEvents = useMemo(() => {
    if (events && events.length > 0) {
      // For non-logged-in users, only show parent events
      return events
        .filter(event => event.isParent)
        .map(event => {
          // Check if RSVP deadline has passed
          const deadlineHasPassed = event.rsvpDeadline ? new Date() > new Date(event.rsvpDeadline) : false;
          
          // Check if RSVP is open yet
          const rsvpIsOpen = isRsvpOpen(event.rsvpOpenDate);
          
          // Set appropriate message based on RSVP status
          let deadlineMessage = "";
          let isDisabled = false;
          
          if (deadlineHasPassed) {
            deadlineMessage = "RSVP Deadline Passed";
            isDisabled = true;
          } else if (!rsvpIsOpen) {
            deadlineMessage = `RSVP opens ${formatOpenDate(event.rsvpOpenDate)}`;
            isDisabled = true;
          }
          
          // Add timezone indicator based on event ID
          const timezone = event.id === 'engagement' ? 'MST' : 'IST';
          
          return {
            ...event,
            icon: getEventIcon(event.id),
            disabled: isDisabled,
            deadlineMessage,
            time_display: (
              <span>
                {event.time_start}{event.time_end ? ` - ${event.time_end}` : ''}
                <span className="mx-1 text-muted-foreground/60">·</span>
                <span className="text-muted-foreground/80 text-sm">
                  {timezone}
                </span>
              </span>
            ),
            hasResponded: false // Non-logged in users can't have responded
          };
        });
    }
    // Default to empty array
    return [];
  }, [events]);
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <main className="min-h-screen relative overflow-x-hidden">
      <section className="relative h-screen flex justify-center overflow-hidden" id="home">
        <div className="absolute inset-0 bg-black/20 z-10" />
        <div 
          className="absolute inset-0 bg-cover bg-center bg-bottom bg-no-repeat [@media(min-width:2588px)]:bg-[center_50%]"
          style={{ 
            backgroundImage: "url('/yr_hero.jpg')",
            backgroundSize: "cover",
            height: "100%",
            width: "100%"
          }}
        />
        
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto pt-48 [@media(min-width:2588px)]:pt-56">
          <h1 className="text-5xl md:text-7xl font-windsong font-medium text-white mb-4">
            Yukti & Ram
          </h1>
          
          {guest ? (
            <p className="text-xl md:text-2xl text-white/90 mb-2 font-light">
              Dear {guest.fullName}, welcome to our wedding page!
            </p>
          ) : null}
          
          <p className="text-xl md:text-2xl text-white/90 mb-8 font-light tracking-wide">
            January 24, 2026 • Mangli Lake Farm
          </p>
        </div>
      </section>

      <section className="py-16 relative overflow-hidden" id="intro">
        <div className="absolute inset-0 opacity-75 z-0 bg-[url('/smallest.jpg')] bg-cover sm:bg-contain md:bg-cover lg:bg-cover bg-top sm:bg-top md:bg-top lg:bg-top xl:bg-top bg-no-repeat" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-windsong mb-2">Celebrating Our Love</h2>
            <p className="text-muted-foreground">Countdown to our special day</p>
          </div>
          
          <CountdownTimer 
            targetDate={weddingDate} 
            className="max-w-3xl mx-auto" 
          />
        </div>
      </section>

      <section className="py-20 bg-[#f4d6c1] relative" id="our-story">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-windsong mb-2">Our Story</h2>
            <div className="h-px w-20 bg-primary/50 mx-auto"></div>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="relative">
                <img 
                  src="yr_ourstory.jpeg"
                  alt="Couple"
                  className="rounded-lg"
                  style={{
                    boxShadow: '0 0 30px rgba(0, 0, 0, 0.4)'
                  }}
                />
                <div className="absolute bottom-[-7%] left-[-25%] sm:bottom-[-6%] sm:left-[-25%] md:bottom-[-8%] md:left-[-30%] z-10 transform -rotate-12 pointer-events-none w-[45%] sm:w-[40%] md:w-[50%] h-auto">
                  <Image 
                    src="/flower1.png" 
                    alt="" 
                    width={300} 
                    height={300}
                    className="w-full h-full object-contain" 
                  />
                </div>
              </div>
              <div className="space-y-6">
                <h3 className="text-2xl font-serif">How We Met</h3>
                <p className="text-muted-foreground font-public-sans">
                  Our journey began in the vibrant city of Kelowna, where a chance encounter in class turned into a beautiful friendship. What started as a simple conversation over assignments blossomed into something truly special.
                </p>
                <p className="text-muted-foreground font-public-sans">
                  Through shared laughter, countless late-night conversations, and lots of FaceTime, we've grown together and discovered that we're truly better as a team.
                </p>
                <p className="text-muted-foreground font-public-sans">
                  Now, we are ready to begin our next chapter together, and we are thrilled to share this moment with our loved ones.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#f6f2e7] relative" id="timeline">
        {/* <div className="hidden md:block absolute top-4 xl:top-[50%] right-[5%] xl:right-0 2xl:right-[8%] z-30 transform -rotate-12 pointer-events-none">
          <Image 
            src="leaf1.png" 
            alt="" 
            width={110} 
            height={120} 
            className="xl:w-[170px] xl:h-[180px]" 
          />
        </div> */}

        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-windsong mb-2">Event Timeline</h2>
            <div className="h-px w-20 bg-primary/50 mx-auto"></div>
          </div>
          
          <div className="max-w-4xl mx-auto">
            {timelineEventsList.length > 0 ? (
              <div className="relative">
                <div className="space-y-10 md:space-y-12">
                  {timelineEventsList.map((event, index) => (
                    <div className="relative" key={event.id}>
                      <div className="md:grid md:grid-cols-2 md:gap-8 items-center">
                        <div className="md:text-right md:pr-8 mb-3 md:mb-0 relative">
                          <div className="hidden md:block absolute right-[-8px] top-0 w-4 h-4 rounded-full bg-[#741914]"></div>
                          <div className="absolute left-3 top-1.5 w-4 h-4 rounded-full bg-[#741914] transform -translate-x-1/2 md:hidden"></div>
                          <h3 className="text-xl font-serif mb-1 pl-10 md:pl-0">{event.title}</h3>
                          <p className="text-muted-foreground text-sm md:text-base pl-10 md:pl-0">{event.date}</p>
                        </div>
                        <div className="pl-10 md:mt-0 md:pl-8">
                          <p className="text-muted-foreground text-sm md:text-base">
                            {event.description || `Join us for the ${event.title} at ${event.location}.`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center p-6 bg-muted rounded-lg">
                <p>Event timeline coming soon.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {shouldShowRsvpSection && (
        <section className="py-20 bg-[#f4d6c1] relative" id="rsvp">
          {/* <div className="hidden md:block absolute top-4 left-[20%] xl:left-[25%] z-30 transform -rotate-5 pointer-events-none">
            <Image src="/flower2.png" alt="" width={105} height={105} />
          </div> */}

          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-windsong mb-2">RSVP Here</h2>
              <div className="h-px w-20 bg-primary/50 mx-auto"></div>
            </div>
            
            {/* Flexible layout that properly centers all card configurations */}
            <div className={`grid gap-8 mx-auto place-items-center ${
              // If we only have 1 card, display in single column
              (guest && eventCards.length === 1) || (!guest && publicEvents.length === 1) 
                ? 'grid-cols-1 max-w-md' 
                // If we have exactly 2 cards, use a 2-column grid with centered container
                : (guest && eventCards.length === 2) || (!guest && publicEvents.length === 2)
                  ? 'grid-cols-1 md:grid-cols-2 max-w-2xl' 
                  // Otherwise use responsive grid that can fit up to 3 cards
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-5xl'
            }`}>
              {guest ? (
                eventCards.length > 0 ? (
                  eventCards.map(event => (
                    <EventCard 
                      key={event.id}
                      title={event.title} 
                      date={event.date} 
                      time={event.time_display}
                      location={event.location}
                      icon={event.icon}
                      eventId={event.id}
                      disabled={event.disabled}
                      deadlineMessage={event.deadlineMessage}
                      guest={guest}
                      onLoginClick={() => setShowLoginModal(true)}
                      onRsvpClick={handleRsvpClick}
                      showLocation={!!guest}
                      maps_link={event.maps_link}
                      hasResponded={event.hasResponded}
                    />
                  ))
                ) : (
                  <div className="text-center p-6 bg-muted rounded-lg col-span-full">
                    <p>No events available for RSVP at this time.</p>
                  </div>
                )
              ) : (
                // For non-logged in users, show a preview of public events
                publicEvents.length > 0 ? (
                  publicEvents.map(event => (
                    <EventCard 
                      key={event.id}
                      title={event.title} 
                      date={event.date} 
                      time={event.time_display}
                      location={event.location}
                      icon={event.icon}
                      eventId={event.id}
                      disabled={event.disabled}
                      deadlineMessage={event.deadlineMessage}
                      guest={null}
                      onLoginClick={() => setShowLoginModal(true)}
                      onRsvpClick={handleRsvpClick}
                      showLocation={false}
                      maps_link={event.maps_link}
                      hasResponded={event.hasResponded}
                    />
                  ))
                ) : (
                  <div className="text-center p-6 bg-muted rounded-lg col-span-full">
                    <p>Sign in to see available events.</p>
                  </div>
                )
              )}
            </div>
            
            {deadlinePassed && (
              <div className="mt-12 text-center">
                <div className="inline-block bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md">
                  <p className="font-medium">RSVP period has ended</p>
                  <p className="text-sm mt-1">The deadline for RSVPs was January 1, 2026</p>
                </div>
              </div>
            )}
            
            {!guest && !deadlinePassed && (
              <div className="mt-12 text-center">
                <div className="inline-block bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
                  <p className="font-medium">Please sign in to RSVP</p>
                  <p className="text-sm mt-1">Enter your name as it appears on your invitation</p>
                  <Button 
                    variant="outline" 
                    className="mt-3 bg-white"
                    onClick={() => setShowLoginModal(true)}
                  >
                    Sign In
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <PhotoGallerySection />

      <footer className="py-8 bg-white text-center">
        <div className="container mx-auto px-4 bg-white">
          <h3 className="text-2xl font-windsong mb-2">Yukti & Ram</h3>
          <p className="text-muted-foreground mb-6">
            January 24, 2026
          </p>

          
          <p className="text-sm text-muted-foreground">
            Made with <Heart className="inline-block h-3 w-3 text-red-500" /> for our special day
          </p>
        </div>
      </footer>
      
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </main>
  );
}