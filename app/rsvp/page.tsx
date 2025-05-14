"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { isRsvpDeadlinePassed, isRsvpOpen, formatOpenDate } from '@/lib/utils';
import { useGuestContext } from '@/context/guest-context';
import { LoginModal } from '@/components/login-modal';

export default function RSVPPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { guest, events } = useGuestContext();
  
  const [response, setResponse] = useState<"Yes" | "No" | "Maybe">("Yes");
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string>('');
  const [plusOne, setPlusOne] = useState<boolean>(false);
  const [adultCount, setAdultCount] = useState<number>(0);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [deadlinePassed, setDeadlinePassed] = useState<boolean>(false);
  const [rsvpNotOpen, setRsvpNotOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  
  // Helper function to check if sign-out is in progress
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
  
  // Helper function to get the formatted RSVP deadline date from events
  const getRsvpDeadlineText = () => {
    if (!events || events.length === 0) {
      return "Please RSVP by January 1, 2026"; // Default fallback
    }

    // Find the main wedding event which typically has the deadline
    const weddingEvent = events.find((e: any) => e.id === 'wedding' && e.rsvpDeadline);
    // If no wedding event, take the first event with a deadline
    const eventWithDeadline = weddingEvent || events.find((e: any) => e.rsvpDeadline);

    if (eventWithDeadline?.rsvpDeadline) {
      const deadlineDate = new Date(eventWithDeadline.rsvpDeadline);
      // Format the date
      return `Please RSVP by ${deadlineDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })}`;
    }

    return "Please RSVP by January 1, 2026"; // Default fallback
  };
  
  useEffect(() => {
    // Check if RSVP deadline has passed
    setDeadlinePassed(isRsvpDeadlinePassed());
    
    // Check if sign-out is in progress by looking for the logout overlay
    const isSigningOut = typeof document !== 'undefined' && 
      !!document.querySelector('[data-logout-overlay="true"]');
    
    // If no guest is logged in and not signing out, show login modal
    if (!guest && !isSigningOut) {
      setShowLoginModal(true);
      return;
    }
    
    // Check if RSVP is open yet by looking at the first event's rsvpOpenDate
    if (events && events.length > 0) {
      // Find the main wedding event which typically has the open date
      const weddingEvent = events.find((e: any) => e.id === 'wedding' && e.rsvpOpenDate);
      // If no wedding event, take the first event with an open date
      const eventWithOpenDate = weddingEvent || events.find((e: any) => e.rsvpOpenDate);
      
      if (eventWithOpenDate?.rsvpOpenDate) {
        setRsvpNotOpen(!isRsvpOpen(eventWithOpenDate.rsvpOpenDate));
      }
    }
    
    fetchGuestData();
  }, [guest, events]);
  
  const fetchGuestData = async () => {
    if (!guest) return;
    
    try {
      // Pre-fill form if guest has already responded
      if (guest.responded) {
        setResponse((guest.response as "Yes" | "No" | "Maybe") || "Yes");
        setDietaryRestrictions(guest.dietaryRestrictions || '');
        setPlusOne(guest.plusOne || false);
        
        // Set adult and children counts from the response
        if (guest.adultCount !== undefined) {
          setAdultCount(guest.adultCount);
        }
        if (guest.childrenCount !== undefined) {
          setChildrenCount(guest.childrenCount);
        }
        
        // For backward compatibility
        if (guest.plusOneCount && guest.adultCount === undefined) {
          setAdultCount(guest.plusOneCount);
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guest) {
      setShowLoginModal(true);
      return;
    }
    
    // Double-check deadline hasn't passed
    if (isRsvpDeadlinePassed()) {
      toast({
        title: "RSVP Closed",
        description: "The RSVP period has ended. Please contact the hosts directly.",
        variant: "destructive",
      });
      setDeadlinePassed(true);
      return;
    }
    
    // Double-check RSVP is open yet
    if (rsvpNotOpen) {
      // Find an event with an open date to show in the toast
      let openDateText = "RSVPs are not open yet.";
      if (events && events.length > 0) {
        const eventWithOpenDate = events.find((e: any) => e.rsvpOpenDate);
        if (eventWithOpenDate?.rsvpOpenDate) {
          openDateText = `RSVPs will open on ${formatOpenDate(eventWithOpenDate.rsvpOpenDate)}.`;
        }
      }
      
      toast({
        title: "RSVP Not Open Yet",
        description: openDateText,
        variant: "default",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const rsvpResponse = await fetch('/api/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: guest.fullName,
          response,
          dietaryRestrictions,
          plusOne,
          plusOneCount: adultCount + childrenCount,
          adultCount,
          childrenCount
        }),
      });
      
      if (!rsvpResponse.ok) {
        throw new Error('Failed to submit RSVP');
      }
      
      setSubmitted(true);
      toast({
        title: "RSVP Submitted",
        description: "Thank you for your response!",
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
  
  // Add a proper handler for the login modal close
  const handleLoginModalClose = () => {
    setShowLoginModal(false);
    // If still no guest after closing modal, redirect to home
    if (!guest) {
      // Use window.location for hard redirect
      window.location.href = '/';
    }
  };
  
  if (isLoading && guest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (deadlinePassed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-lg w-full mx-auto p-8 text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold mb-4">RSVP Period Has Ended</h1>
          <p className="mb-6 text-muted-foreground">
            The deadline for RSVPs was January 1, 2026. If you need to make changes to your RSVP, please contact the hosts directly.
          </p>
          <Button 
            onClick={() => window.location.href = '/#rsvp'}
            variant="default"
          >
            Return to Homepage
          </Button>
        </Card>
      </div>
    );
  }
  
  if (rsvpNotOpen) {
    // Get the open date text from the first event with an open date
    let openDateText = "RSVPs are not open yet.";
    if (events && events.length > 0) {
      const eventWithOpenDate = events.find((e: any) => e.rsvpOpenDate);
      if (eventWithOpenDate?.rsvpOpenDate) {
        openDateText = `RSVPs will open on ${formatOpenDate(eventWithOpenDate.rsvpOpenDate)}.`;
      }
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-lg w-full mx-auto p-8 text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold mb-4">RSVP Not Open Yet</h1>
          <p className="mb-6 text-muted-foreground">
            {openDateText} Please check back later.
          </p>
          <Button 
            onClick={() => window.location.href = '/#rsvp'}
            variant="default"
          >
            Return to Homepage
          </Button>
        </Card>
      </div>
    );
  }
  
  if (submitted) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <h1 className="text-2xl font-bold">Thank You!</h1>
            <p className="text-muted-foreground">
              Your RSVP has been submitted successfully. We look forward to celebrating with you!
            </p>
            <Button onClick={() => router.push('/')} variant="secondary">
              Return to Home
            </Button>
          </div>
        </Card>
        
        <LoginModal 
          isOpen={showLoginModal && !isSigningOut()} 
          onClose={handleLoginModalClose} 
        />
      </main>
    );
  }
  
  return (
    <main className="min-h-screen pt-24 bg-gradient-to-b from-background to-muted">
      <div className="container max-w-md mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">RSVP</h1>
        
        <Card className="p-6">
          {guest ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label>Will you be attending?</Label>
                <RadioGroup value={response} onValueChange={(value) => setResponse(value as "Yes" | "No" | "Maybe")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Yes" id="r1" className="text-[#741914] border-[#741914] focus:ring-[#741914]" />
                    <Label htmlFor="r1">Yes, I'll be there</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="No" id="r2" className="text-[#741914] border-[#741914] focus:ring-[#741914]" />
                    <Label htmlFor="r2">No, I can't make it</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Maybe" id="r3" className="text-[#741914] border-[#741914] focus:ring-[#741914]" />
                    <Label htmlFor="r3">Maybe, I'm not sure yet</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {response !== "No" && (
                <div className="space-y-3">
                  <Label htmlFor="dietaryRestrictions">
                    Dietary Restrictions or Preferences
                  </Label>
                  <Textarea
                    id="dietaryRestrictions"
                    placeholder="Please let us know of any dietary restrictions..."
                    value={dietaryRestrictions}
                    onChange={(e) => setDietaryRestrictions(e.target.value)}
                    className="focus-visible:ring-[#741914]"
                  />
                </div>
              )}
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="plusOne">Will you bring family & guests?</Label>
                  <Switch 
                    id="plusOne" 
                    checked={plusOne}
                    onCheckedChange={(checked) => {
                      setPlusOne(checked);
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
                        onChange={(e) => setAdultCount(parseInt(e.target.value) || 0)}
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
                        onChange={(e) => setChildrenCount(parseInt(e.target.value) || 0)}
                        className="mt-1 focus-visible:ring-[#741914]"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Children under 12 years old
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
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
                ) : "Submit RSVP"}
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 space-y-3">
              <p className="text-center text-muted-foreground">
                Please sign in to submit your RSVP
              </p>
              <Button 
                onClick={() => setShowLoginModal(true)}
                className="bg-[#741914] hover:bg-[#641510] text-white shadow-md hover:shadow-lg transition-all"
              >
                Sign In
              </Button>
            </div>
          )}
        </Card>
        
        <p className="text-center text-muted-foreground text-sm mt-8">
          {getRsvpDeadlineText()}
        </p>
      </div>
      
      <LoginModal 
        isOpen={showLoginModal && !isSigningOut()} 
        onClose={handleLoginModalClose} 
      />
    </main>
  );
}