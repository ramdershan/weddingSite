"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Helper function to sanitize and validate phone number
const sanitizeAndValidatePhoneNumber = (phone: string): string | null => {
  console.log("[Login Form] Original phone input:", phone);
  // Remove whitespace and common special characters: (), -, +
  const sanitized = phone.replace(/[\s()+\-]*/g, '');
  console.log("[Login Form] Sanitized phone number:", sanitized);
  
  // Check if it's exactly 10 digits and contains no letters
  const isValid = /^\d{10}$/.test(sanitized);
  console.log("[Login Form] Is phone number valid (10 digits)?:", isValid);
  
  if (isValid) {
    return sanitized;
  }
  return null; // Invalid format
};

export function LoginForm() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const sanitizedPhone = sanitizeAndValidatePhoneNumber(phoneNumber);

    if (!sanitizedPhone) {
      setError("Please enter a valid 10-digit phone number (e.g., 1234567890). Do not include country code.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/guest?phone=${encodeURIComponent(sanitizedPhone)}`);
      const data = await response.json(); // Parse JSON response here

      console.log("[Login Form] API Response Data:", data); // Log the full response data
      
      if (response.ok && data.guest && data.sessionToken) { // Check for guest and sessionToken in data
        console.log("[Login Form] Login successful, saving guest data and session token to localStorage.");
        localStorage.setItem('wedding_guest', JSON.stringify(data.guest));
        localStorage.setItem('wedding_guest_session', data.sessionToken);
        
        // Revert to hard redirect to ensure context reloads, similar to old behavior
        // Note: don't reset isLoading state, keep the spinner shown during redirect
        window.location.href = '/'; // Redirect to homepage, or desired target
      } else {
        setError(data.error || "Login failed. Please check your phone number or try again.");
        setIsLoading(false); // Only reset loading state on error
      }
    } catch (error) {
      setError("Something went wrong. Please try again.");
      setIsLoading(false); // Only reset loading state on error
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phoneNumber">Phone Number</Label>
        <Input
          id="phoneNumber"
          type="tel"
          placeholder="Enter your 10-digit phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          disabled={isLoading}
          className="focus-visible:ring-[#741914]"
        />
      </div>
      
      {error && (
        <Alert variant="destructive" className="bg-red-50 text-red-800 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}
      
      <Button 
        type="submit" 
        className='bg-[#741914] hover:bg-[#641510] text-white shadow-md hover:shadow-lg transition-all w-full'
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Logging in...
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </form>
  );
}