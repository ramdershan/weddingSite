"use client"

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, MapPin, Heart, Camera, PartyPopper, Diamond } from 'lucide-react';
import { PhotoGallerySection } from '@/components/photo-gallery-section';
import { CountdownTimer } from '@/components/countdown-timer';
import { getWeddingDate, isRsvpDeadlinePassed, isEngagementRsvpDeadlinePassed, navigateToHomeSection, scrollToSection } from '@/lib/utils';
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
  showLocation = true
}: { 
  title: string; 
  date: string; 
  time: string; 
  location: string; 
  icon: React.ReactNode;
  eventId: string;
  disabled?: boolean;
  deadlineMessage?: string;
  guest?: any;
  onLoginClick?: () => void;
  onRsvpClick?: (eventId: string) => void;
  showLocation?: boolean;
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
                <Calendar className="h-4 w-4 mr-2" />
                <span>{date}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>{time}</span>
              </div>
              {showLocation ? (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{location}</span>
                </div>
              ) : (
                <div className="flex items-center text-blue-600">
                  <MapPin className="h-4 w-4 mr-2" />
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
                  variant="outline" 
                  size="sm" 
                  className="w-full shadow-sm hover:shadow-md transition-all"
                    onClick={() => onRsvpClick?.(eventId)}
                >
                      RSVP for this event
                </Button>
                )
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full shadow-sm hover:shadow-md transition-all"
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
  const weddingDate = getWeddingDate();
  const { guest, isLoading } = useGuestContext();
  
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
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <main className="min-h-screen">
      <section className="relative h-screen flex items-center justify-center overflow-hidden" id="home">
        <div className="absolute inset-0 bg-black/20 z-10" />
        <div 
          className="absolute inset-0 bg-cover md:bg-cover lg:bg-[length:110%_auto] xl:bg-[length:90%_auto] bg-center"
          style={{ 
            backgroundImage: "url('/picture2.jpg')",
            backgroundPosition: "center 60%"
          }}
        />
        
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-windsong font-medium text-white mb-4">
            Yukti & Ram
          </h1>
          
          {guest ? (
            <p className="text-xl md:text-2xl text-white/90 mb-2 font-light">
              Dear {guest.fullName}, you're invited to our wedding celebration!
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
            <p className="text-muted-foreground">Join us for our special day</p>
          </div>
          
          <CountdownTimer 
            targetDate={weddingDate} 
            className="max-w-3xl mx-auto" 
          />
        </div>
      </section>

      <section className="py-20 bg-[#f4d6c1]" id="our-story">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-windsong mb-2">Our Story</h2>
            <div className="h-px w-20 bg-primary/50 mx-auto"></div>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <img 
                  src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=987&q=80"
                  alt="Couple"
                  className="rounded-lg border border-white/10"
                  style={{
                    boxShadow: '0 0 30px rgba(0, 0, 0, 0.4)'
                  }}
                />
              </div>
              <div className="space-y-6">
                <h3 className="text-2xl font-serif">How We Met</h3>
                <p className="text-muted-foreground">
                  Our journey began in the vibrant city of Kelowna, where a chance encounter in class turned into a beautiful friendship. What started as a simple conversation over assignments blossomed into something truly special.
                </p>
                <p className="text-muted-foreground">
                  Through shared laughter, countless late-night conversations, and lots of FaceTime, we've grown together and discovered that we're truly better as a team.
                </p>
                <p className="text-muted-foreground">
                  Now, we're ready to begin our next chapter together, and we couldn't be more excited to share this moment with our loved ones.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#f6f2e7]" id="timeline">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-windsong mb-2">Event Timeline</h2>
            <div className="h-px w-20 bg-primary/50 mx-auto"></div>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="space-y-10 md:space-y-12">
                <div className="relative">
                  <div className="md:grid md:grid-cols-2 md:gap-8 items-center">
                    <div className="md:text-right md:pr-8 mb-3 md:mb-0 relative">
                      <div className="hidden md:block absolute right-[-8px] top-0 w-4 h-4 rounded-full bg-[#741914]"></div>
                      <div className="absolute left-3 top-1.5 w-4 h-4 rounded-full bg-[#741914] transform -translate-x-1/2 md:hidden"></div>
                      <h3 className="text-xl font-serif mb-1 pl-10 md:pl-0">Engagement Ceremony</h3>
                      <p className="text-muted-foreground text-sm md:text-base pl-10 md:pl-0">September 27, 2025</p>
                    </div>
                    <div className="pl-10 md:mt-0 md:pl-8">
                      <p className="text-muted-foreground text-sm md:text-base">
                        Join us for our traditional engagement ceremony at ACCA Banquet Hall. 
                        Get ready for an evening full of laughter, performances, and of course, dance!
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="md:grid md:grid-cols-2 md:gap-8 items-center">
                    <div className="md:text-right md:pr-8 mb-3 md:mb-0 relative">
                      <div className="hidden md:block absolute right-[-8px] top-0 w-4 h-4 rounded-full bg-[#741914]"></div>
                      <div className="absolute left-3 top-1.5 w-4 h-4 rounded-full bg-[#741914] transform -translate-x-1/2 md:hidden"></div>
                      <h3 className="text-xl font-serif mb-1 pl-10 md:pl-0">Mehndi</h3>
                      <p className="text-muted-foreground text-sm md:text-base pl-10 md:pl-0">January 22, 2026</p>
                    </div>
                    <div className="pl-10 md:mt-0 md:pl-8">
                      <p className="text-muted-foreground text-sm md:text-base">
                        Experience the beautiful tradition of Mehndi as intricate designs adorn the bride and guests.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="md:grid md:grid-cols-2 md:gap-8 items-center">
                    <div className="md:text-right md:pr-8 mb-3 md:mb-0 relative">
                      <div className="hidden md:block absolute right-[-8px] top-0 w-4 h-4 rounded-full bg-[#741914]"></div>
                      <div className="absolute left-3 top-1.5 w-4 h-4 rounded-full bg-[#741914] transform -translate-x-1/2 md:hidden"></div>
                      <h3 className="text-xl font-serif mb-1 pl-10 md:pl-0">Haldi</h3>
                      <p className="text-muted-foreground text-sm md:text-base pl-10 md:pl-0">January 23, 2026</p>
                    </div>
                    <div className="pl-10 md:mt-0 md:pl-8">
                      <p className="text-muted-foreground text-sm md:text-base">
                        Join us for the auspicious Haldi ceremony where turmeric paste is applied to bless the couple. 
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="md:grid md:grid-cols-2 md:gap-8 items-center">
                    <div className="md:text-right md:pr-8 mb-3 md:mb-0 relative">
                      <div className="hidden md:block absolute right-[-8px] top-0 w-4 h-4 rounded-full bg-[#741914]"></div>
                      <div className="absolute left-3 top-1.5 w-4 h-4 rounded-full bg-[#741914] transform -translate-x-1/2 md:hidden"></div>
                      <h3 className="text-xl font-serif mb-1 pl-10 md:pl-0">Sangeet</h3>
                      <p className="text-muted-foreground text-sm md:text-base pl-10 md:pl-0">January 23, 2026</p>
                    </div>
                    <div className="pl-10 md:mt-0 md:pl-8">
                      <p className="text-muted-foreground text-sm md:text-base">
                        Celebrate with us during an evening filled with music, dance, and festivities.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="md:grid md:grid-cols-2 md:gap-8 items-center">
                    <div className="md:text-right md:pr-8 mb-3 md:mb-0 relative">
                      <div className="hidden md:block absolute right-[-8px] top-0 w-4 h-4 rounded-full bg-[#741914]"></div>
                      <div className="absolute left-3 top-1.5 w-4 h-4 rounded-full bg-[#741914] transform -translate-x-1/2 md:hidden"></div>
                      <h3 className="text-xl font-serif mb-1 pl-10 md:pl-0">Wedding Ceremony</h3>
                      <p className="text-muted-foreground text-sm md:text-base pl-10 md:pl-0">January 24, 2026</p>
                    </div>
                    <div className="pl-10 md:mt-0 md:pl-8">
                      <p className="text-muted-foreground text-sm md:text-base">
                        Witness our beautiful wedding ceremony and come give us your blessings. 
                        The ceremony will be a blend of our cultures...
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="md:grid md:grid-cols-2 md:gap-8 items-center">
                    <div className="md:text-right md:pr-8 mb-3 md:mb-0 relative">
                      <div className="hidden md:block absolute right-[-8px] top-0 w-4 h-4 rounded-full bg-[#741914]"></div>
                      <div className="absolute left-3 top-1.5 w-4 h-4 rounded-full bg-[#741914] transform -translate-x-1/2 md:hidden"></div>
                      <h3 className="text-xl font-serif mb-1 pl-10 md:pl-0">Reception</h3>
                      <p className="text-muted-foreground text-sm md:text-base pl-10 md:pl-0">January 28, 2026</p>
                    </div>
                    <div className="pl-10 md:mt-0 md:pl-8">
                      <p className="text-muted-foreground text-sm md:text-base">
                        Celebrate with us at our evening reception in the Grand Pavilion. 
                        Enjoy dinner, dancing, and making memories together.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#f4d6c1]" id="rsvp">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-windsong mb-2">RSVP Here</h2>
            <div className="h-px w-20 bg-primary/50 mx-auto"></div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {!engagementDeadlinePassed && (
              <EventCard 
                title="Engagement Ceremony" 
                date="September 27, 2025" 
                time="5:30 PM - Late" 
                location="ACCA Banquet Hall, Edmonton, AB"
                icon={<RingIcon className="h-5 w-5 text-primary" />}
                eventId="engagement"
                disabled={engagementDeadlinePassed || deadlinePassed || !guest}
                deadlineMessage={engagementDeadlinePassed && !deadlinePassed ? "RSVP Closed for Engagement" : ""}
                guest={guest}
                onLoginClick={() => setShowLoginModal(true)}
                onRsvpClick={handleRsvpClick}
                showLocation={!!guest}
              />
            )}
            
            <EventCard 
              title="Wedding Ceremony" 
              date="January 24, 2026" 
              time="1:00 PM - 3:00 PM" 
              location="Willow Creek Gardens, Main Hall"
              icon={<Heart className="h-6 w-6 text-primary text-rose-500" />}
              eventId="wedding"
              disabled={deadlinePassed || !guest}
              guest={guest}
              onLoginClick={() => setShowLoginModal(true)}
              onRsvpClick={handleRsvpClick}
              showLocation={!!guest}
            />
            
            <EventCard 
              title="Reception" 
              date="January 28, 2026" 
              time="6:00 PM - 11:00 PM" 
              location="Willow Creek Gardens, Grand Pavilion"
              icon={<PartyPopper className="h-6 w-6 text-amber-500" />}
              eventId="reception"
              disabled={deadlinePassed || !guest}
              guest={guest}
              onLoginClick={() => setShowLoginModal(true)}
              onRsvpClick={handleRsvpClick}
              showLocation={!!guest}
            />
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

      <PhotoGallerySection />

      <footer className="py-8 bg-white text-center">
        <div className="container mx-auto px-4 bg-white">
          <h3 className="text-2xl font-windsong mb-2">Yukti & Ram</h3>
          <p className="text-muted-foreground mb-6">January 24, 2026</p>
          
          {/* <div className="flex justify-center space-x-4 mb-6">
            <a href="#" className="text-muted-foreground hover:text-primary">
              <span className="sr-only">Instagram</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-instagram"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary">
              <span className="sr-only">Facebook</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-facebook"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
          </div> */}
          
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