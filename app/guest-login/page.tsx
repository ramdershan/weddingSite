"use client"

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { LoadingScreen } from '@/components/loading-screen';
import { useGuestContext } from '@/context/guest-context';
import { LoginForm } from '@/components/login-form';

export default function GuestLogin() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { guest, isLoading: isContextLoading } = useGuestContext();
  
  const targetPath = '/';
  
  useEffect(() => {
    if (guest && !isContextLoading) {
      console.log("[Login Page] User already logged in, redirecting to home page");
      window.location.href = targetPath;
    }
  }, [guest, isContextLoading]);
  
  if (isContextLoading || isRedirecting) {
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
          <LoginForm />
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