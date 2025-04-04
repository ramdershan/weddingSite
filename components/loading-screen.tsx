"use client"

import { Heart, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

const LOADING_MESSAGES = [
  "Arranging flowers for your arrival...",
  "Warming up the dance floor...",
  "Saving a seat just for you...",
  "Folding origami love birds...",
  "Finding the perfect playlist...",
  "Creating a magical evening...",
  "Writing your name on the guest list...",
  "Polishing the silverware..."
];

export function LoadingScreen() {
  const [message, setMessage] = useState(LOADING_MESSAGES[0]);
  
  // Cycle through messages every few seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-background to-background/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4">
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-background via-background to-transparent z-10"></div>
      
      {/* Decorative elements */}
      <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2 opacity-20">
        <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
          strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" 
          className="text-primary rotate-12">
          <path d="M12 3a3 3 0 1 0 0 6 3 3 0 1 0 0-6z"></path>
          <path d="M19 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z"></path>
          <path d="M5 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z"></path>
          <path d="M12 15a3 3 0 1 0 0 6 3 3 0 1 0 0-6z"></path>
          <path d="M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z"></path>
        </svg>
      </div>
      <div className="absolute bottom-1/4 right-1/4 transform translate-x-1/2 translate-y-1/2 opacity-20">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
          strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" 
          className="text-primary -rotate-12">
          <path d="M12 3a3 3 0 1 0 0 6 3 3 0 1 0 0-6z"></path>
          <path d="M19 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z"></path>
          <path d="M5 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z"></path>
          <path d="M12 15a3 3 0 1 0 0 6 3 3 0 1 0 0-6z"></path>
          <path d="M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z"></path>
        </svg>
      </div>
      
      <div className="text-center space-y-12 max-w-md mx-auto relative z-20">
        {/* Logo with decorative elements */}
        <div className="relative opacity-0 animate-fadeIn">
          <Sparkles className="absolute -left-10 -top-6 h-5 w-5 text-amber-400 opacity-75 animate-pulse" />
          <div className="font-windsong text-5xl md:text-6xl text-primary relative">
            Yukti & Ram
            <Heart className="absolute -right-8 top-0 h-5 w-5 text-rose-500 animate-pulse" fill="currentColor" />
          </div>
          <Sparkles className="absolute -right-8 -bottom-4 h-4 w-4 text-amber-400 opacity-75 animate-pulse animation-delay-500" />
        </div>
        
        {/* Loading animation */}
        <div className="relative h-16 w-16 mx-auto opacity-0 animate-fadeIn animation-delay-300">
          <div className="absolute inset-0 rounded-full border-t-4 border-primary animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-2 border-dashed border-primary/50 animate-spinSlow"></div>
          <div className="absolute inset-4 flex items-center justify-center">
            <Heart className="h-5 w-5 text-rose-500 animate-pulse" fill="currentColor" />
          </div>
        </div>
        
        {/* Message */}
        <div className="transition-all duration-500 ease-in-out space-y-3">
          <p className="text-xl md:text-2xl text-primary font-cormorant opacity-0 animate-fadeInUp animation-delay-500 mb-2">
            {message}
          </p>
          <p className="text-sm text-muted-foreground/70 opacity-0 animate-fadeIn animation-delay-700">
            Just a moment while we prepare everything for you
          </p>
          <div className="opacity-0 animate-fadeIn animation-delay-1000 pt-2">
            <span className="inline-block w-2 h-2 bg-primary rounded-full mr-1 animate-pulse"></span>
            <span className="inline-block w-2 h-2 bg-primary rounded-full mr-1 animate-pulse animation-delay-300"></span>
            <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse animation-delay-500"></span>
          </div>
        </div>
      </div>
    </div>
  );
} 