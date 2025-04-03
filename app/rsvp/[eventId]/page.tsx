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
import { isRsvpDeadlinePassed, isEngagementRsvpDeadlinePassed } from '@/lib/utils';
import { useGuestContext } from '@/context/guest-context';
import { LoginModal } from '@/components/login-modal';
import { LoadingScreen } from '@/components/loading-screen';

// Event details mapping
const EVENT_DETAILS = {
  engagement: {
    title: "Engagement Ceremony",
    date: "September 27, 2025",
    time: "5:30 PM - Late",
    location: "ACCA Banquet Hall, Edmonton, AB"
  },
  wedding: {
    title: "Wedding Ceremony",
    date: "January 24, 2026",
    time: "1:00 PM - 3:00 PM",
    location: "Willow Creek Gardens, Main Hall"
  },
  reception: {
    title: "Reception",
    date: "January 24, 2026",
    time: "6:00 PM - 11:00 PM",
    location: "Willow Creek Gardens, Grand Pavilion"
  }
};

export default function EventRSVPPage({ params }: { params: { eventId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const eventId = params.eventId;
  const { guest, setGuest } = useGuestContext();
  
  // Get event details or redirect if invalid event
  const eventDetails = EVENT_DETAILS[eventId as keyof typeof EVENT_DETAILS];
  
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
  
  useEffect(() => {
    // Check if RSVP deadline has passed
    if (eventId === 'engagement') {
      setDeadlinePassed(isEngagementRsvpDeadlinePassed());
    } else {
      setDeadlinePassed(isRsvpDeadlinePassed());
    }
    
    // Redirect if invalid event ID
    if (!eventDetails) {
      router.push('/');
      return;
    }
    
    // Check for name in URL parameters
    const nameFromUrl = searchParams.get('name');
    
    // If guest is already logged in, proceed without showing modal
    if (guest) {
      // If URL name matches the logged in guest, we can pre-fill the form immediately
      // This improves perceived performance while we wait for the async data
      if (nameFromUrl && nameFromUrl.toLowerCase() === guest.fullName.toLowerCase()) {
        setIsLoading(false);
      }
      fetchGuestData();
      return;
    }
    
    // If name is in URL and no guest is logged in, try to auto-login
    if (nameFromUrl) {
      autoLoginWithName(nameFromUrl);
    } else {
      // No guest and no name in URL, just stop loading (don't show modal)
      setIsLoading(false);
    }
  }, [eventId, eventDetails, guest, searchParams]);
  
  const fetchGuestData = async () => {
    if (!guest) return;
    
    try {
      // If guest is already present, we can assume they're valid
      // and immediately start showing the form while we fetch data in the background
      if (!isLoading) {
        // Form is already showing, just fetch data in background
      } else {
        setIsLoading(true);
      }
      
      // Pre-fill form if guest has already responded to this event
      if (guest.responded && guest.eventResponses && guest.eventResponses[eventId]) {
        const eventResponse = guest.eventResponses[eventId];
        setResponse(eventResponse.response || "Yes");
        setDietaryRestrictions(eventResponse.dietaryRestrictions || '');
        setPlusOne(eventResponse.plusOne || false);
        
        // Set adult and children counts from the response
        if (eventResponse.adultCount !== undefined) {
          setAdultCount(eventResponse.adultCount);
        }
        if (eventResponse.childrenCount !== undefined) {
          setChildrenCount(eventResponse.childrenCount);
        }
        
        // For backward compatibility
        if (eventResponse.plusOneCount && eventResponse.adultCount === undefined) {
          setAdultCount(eventResponse.plusOneCount);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load your information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
        // Auto-login failed, just stop loading
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error auto-logging in with name from URL:", error);
      setIsLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guest) {
      setShowLoginModal(true);
      return;
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
      const apiResponse = await fetch('/api/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: guest.fullName,
          eventId,
          response,
          dietaryRestrictions,
          plusOne,
          plusOneCount: adultCount + childrenCount,
          adultCount,
          childrenCount
        }),
      });
      
      if (!apiResponse.ok) {
        throw new Error('Failed to submit RSVP');
      }
      
      setSubmitted(true);
      toast({
        title: "RSVP Submitted",
        description: `Thank you for your response to the ${eventDetails.title}!`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit your RSVP. Please try again.",
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
          <h1 className="text-3xl font-bold tracking-tight mb-2">Yukti & Ram</h1>
          <p className="text-muted-foreground">We're excited to celebrate with you!</p>
          <div className="mt-4 h-px bg-border w-1/2 mx-auto" />
        </div>
        
        <Card className="p-6 shadow-lg bg-[#f6f2e7]">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">{eventDetails.title} RSVP</h2>
              {guest && <p className="text-muted-foreground mt-1">Hello, {guest.fullName}</p>}
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
                <span>{eventDetails.location}</span>
              </div>
            </div>
            
            {!guest ? (
              <div className="text-center space-y-4">
                <h3 className="text-lg font-medium">Please Sign In</h3>
                <p>You need to sign in to RSVP for this event.</p>
                <Button 
                  onClick={() => setShowLoginModal(true)}
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
                    onClick={() => router.push('/')}
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
                    onValueChange={(value) => setResponse(value as "Yes" | "No" | "Maybe")}
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
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="plusOne">Will you bring guests?</Label>
                    <Switch 
                      id="plusOne" 
                      checked={plusOne}
                      onCheckedChange={setPlusOne}
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
                          onChange={(e) => setAdultCount(parseInt(e.target.value) || 0)}
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
                          onChange={(e) => setChildrenCount(parseInt(e.target.value) || 0)}
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
                    onChange={(e) => setDietaryRestrictions(e.target.value)}
                    disabled={response === "No"}
                  />
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
                      "Submit RSVP"
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => router.push('/')}
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
        }} 
      />
    </main>
  );
}