"use client"

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useGuestContext } from '@/context/guest-context';

export function LoginModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setGuest } = useGuestContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/guest?name=${encodeURIComponent(fullName)}`);
      
      if (response.ok) {
        const data = await response.json();
        setGuest(data.guest, data.sessionToken);
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || "Your name was not found on the guest list");
      }
    } catch (error) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Welcome to Our Wedding</DialogTitle>
          <DialogDescription className="text-center">
            Please enter your name as it appears on your invitation
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
              autoComplete="name"
            />
          </div>
          
          {error && (
            <Alert variant="destructive" className="bg-red-50 text-red-800 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}