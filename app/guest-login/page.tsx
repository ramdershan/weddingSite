"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { LoadingScreen } from '@/components/loading-screen';
import { useGuestContext } from '@/context/guest-context';

export default function GuestLogin() {
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { guest, isLoading: isContextLoading } = useGuestContext();
  
  // Always redirect to the home page
  const targetPath = '/';
  
  // Check if user is already logged in
  useEffect(() => {
    if (guest && !isContextLoading) {
      console.log("[Login Page] User already logged in, redirecting to home page");
      window.location.href = targetPath;
    }
  }, [guest, isContextLoading]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }
    
    console.log("[Login Page] Form submitted, attempting login with name:", fullName.trim());
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("[Login Page] Making API call to /api/guest");
      const response = await fetch(`/api/guest?name=${encodeURIComponent(fullName.trim())}`, {
        method: 'GET',
        headers: {
          'Case-Insensitive': 'true',
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log("[Login Page] API response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("[Login Page] API call successful. Guest name from response:", 
          data.guest ? data.guest.fullName : 'NO GUEST DATA'); 
        
        if (!data.guest || !data.sessionToken) {
          console.error("[Login Page] API response missing guest or sessionToken!");
          setError("Login failed due to incomplete server response.");
          setIsLoading(false);
          return;
        }
        
        console.log("[Login Page] Login successful, saving guest data to localStorage");
        
        // Save guest data to localStorage
        localStorage.setItem('wedding_guest', JSON.stringify(data.guest));
        localStorage.setItem('wedding_guest_session', data.sessionToken);
        
        // Show loading screen
        setIsRedirecting(true);
        
        // Use hard location redirect rather than Next.js router to ensure a clean page load
        console.log("[Login Page] Redirecting to home page via window.location");
        window.location.href = targetPath;
      } else {
        const data = await response.json();
        console.error("[Login Page] Login API call failed:", data.error);
        setError(data.error || "Your name was not found on the guest list");
        setIsLoading(false);
      }
    } catch (error) {
      console.error('[Login Page] Login fetch error:', error);
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  // Show loading screen if redirecting
  if (isRedirecting) {
    return <LoadingScreen />;
  }
  
  return (
    <main className="min-h-screen bg-[#f6f2e7] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-windsong font-medium mb-4 text-[#1e293b]"> 
            Yukti & Ram
          </h1>
          <p className="text-muted-foreground">We're delighted to share the next stage of our journey with you!</p>
        </div>
        
        <Card className="p-6 shadow-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Your Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your name as it appears on your invitation"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full"
                autoComplete="name"
                disabled={isLoading}
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="submit" 
              variant="outline"
              className="w-full shadow-sm hover:shadow-md transition-all hover:bg-[#741914] hover:text-white" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Card>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            If you're having trouble signing in, please contact the couple.
          </p>
        </div>
      </div>
    </main>
  );
} 