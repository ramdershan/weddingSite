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
import { isRsvpDeadlinePassed } from '@/lib/utils';
import { useGuestContext } from '@/context/guest-context';
import { LoginModal } from '@/components/login-modal';

export default function RSVPPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { guest } = useGuestContext();
  
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
    setDeadlinePassed(isRsvpDeadlinePassed());
    
    // If no guest is logged in, show login modal
    if (!guest) {
      setShowLoginModal(true);
      return;
    }
    
    fetchGuestData();
  }, [guest]);
  
  const fetchGuestData = async () => {
    if (!guest) return;
    
    try {
      // Pre-fill form if guest has already responded
      if (guest.responded) {
        setResponse(guest.response || "Yes");
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
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/rsvp', {
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
      
      if (!response.ok) {
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
  
  if (isLoading && guest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (deadlinePassed) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-
    )
  }
}