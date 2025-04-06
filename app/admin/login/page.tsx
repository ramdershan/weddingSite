"use client"

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Lock, User, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Check for redirectTo parameter
  const redirectTo = searchParams.get('redirectTo') || '/admin';
  
  // Check for error parameter in URL (from middleware redirects)
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
    
    // If we were redirected from logout, show confirmation
    const loggedOut = searchParams.get('logged_out');
    if (loggedOut === 'true') {
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
    }
  }, [searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      setError("Too many failed attempts. Please try again later.");
      return;
    }
    
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[Admin Login] Attempting login with username:', username);
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include', // Important to include cookies
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('[Admin Login] Login successful, redirecting to:', redirectTo);
        toast({
          title: "Login Successful",
          description: `Welcome to the admin dashboard${username ? ', ' + username : ''}`,
        });
        
        // Reset login attempts on successful login
        setLoginAttempts(0);
        router.push(redirectTo);
      } else {
        console.error('[Admin Login] Login failed:', data.error);
        setLoginAttempts(prev => prev + 1);
        
        // Show appropriate error based on status code
        if (response.status === 401) {
          setError("Invalid credentials. Please check your username and password.");
        } else if (response.status === 429) {
          setError("Too many login attempts. Please try again later.");
          setIsLocked(true);
        } else {
          setError(data.error || "Login failed. Please check your credentials.");
        }
        
        // Lock the form after 3 failed attempts
        if (loginAttempts >= 2) { // This will be the 3rd attempt
          setIsLocked(true);
          setError("Too many failed attempts. Please try again later.");
          
          // Unlock after 2 minutes
          setTimeout(() => {
            setIsLocked(false);
            setLoginAttempts(0);
          }, 120000);
        }
      }
    } catch (error) {
      console.error('[Admin Login] Error during login:', error);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
            <CardDescription>
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {isLocked ? (
              <Alert variant="destructive" className="mb-4 bg-amber-50 text-amber-800 border-amber-200">
                <AlertTriangle className="h-5 w-5" />
                <AlertDescription className="ml-2">
                  <div className="font-semibold mb-1">Account temporarily locked</div>
                  <p>Too many failed login attempts. Please try again in 2 minutes.</p>
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      placeholder="Enter your username"
                      className="pl-10"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isLoading || isLocked}
                      autoComplete="username"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading || isLocked}
                      autoComplete="current-password"
                    />
                  </div>
                </div>
                
                {error && (
                  <Alert variant="destructive" className="bg-red-50 text-red-800 border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="ml-2">{error}</AlertDescription>
                  </Alert>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || isLocked}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Wedding Admin Dashboard
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}