"use client";

import { useState, useEffect } from 'react';
import { getWeddingDate } from '@/lib/utils';
import { Heart, Home } from 'lucide-react';
import confetti, { Options } from 'canvas-confetti';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CountdownPage() {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const weddingDate = getWeddingDate();
  
  useEffect(() => {
    const target = new Date(weddingDate);
    
    const interval = setInterval(() => {
      const now = new Date();
      const difference = target.getTime() - now.getTime();
      
      if (difference <= 0) {
        setIsCompleted(true);
        clearInterval(interval);
        
        // Start confetti animation
        triggerCelebration();
        
        setDays(0);
        setHours(0);
        setMinutes(0);
        setSeconds(0);
      } else {
        const d = Math.floor(difference / (1000 * 60 * 60 * 24));
        setDays(d);
        
        const h = Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        setHours(h);
        
        const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        setMinutes(m);
        
        const s = Math.floor((difference % (1000 * 60)) / 1000);
        setSeconds(s);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [weddingDate]);
  
  const triggerCelebration = () => {
    // Create multiple canvas confetti animations for a fireworks effect
    const duration = 15 * 1000;
    const animationEnd = Date.now() + duration;
    let skew = 1;

    function randomInRange(min: number, max: number): number {
      return Math.random() * (max - min) + min;
    }

    // Function to create fireworks
    function fireworks() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return;
      
      // Random position
      const position = {
        x: randomInRange(0.2, 0.8),
        y: randomInRange(0.2, 0.8)
      };
      
      // Explosion
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: position,
          colors: ['#FFD700', '#FFA500', '#FF8C00', '#FF4500', '#FF0000', '#ff69b4', '#ff1493'],
          disableForReducedMotion: true
        });
      }, randomInRange(0, 100));
    }

    // Hearts and confetti rain
    function frame() {
      const timeLeft = animationEnd - Date.now();
      const ticks = Math.max(200, 500 * (timeLeft / duration));
      skew = Math.max(0.8, skew - 0.001);

      // Gold/yellow confetti from top
      confetti({
        particleCount: 2,
        startVelocity: 30,
        ticks: ticks,
        origin: {
          x: Math.random(),
          y: 0
        },
        colors: ['#FFD700', '#FFA500', '#FF8C00', '#FF4500'],
        gravity: randomInRange(0.4, 0.6),
        scalar: randomInRange(0.8, 1.4),
        drift: randomInRange(-0.4, 0.4)
      });
      
      // Pink confetti from sides
      confetti({
        particleCount: 2,
        startVelocity: 20,
        ticks: ticks,
        origin: {
          x: Math.random() < 0.5 ? 0 : 1,
          y: Math.random()
        },
        colors: ['#ff0000', '#ffc0cb', '#ffb6c1', '#ff69b4', '#ff1493'],
        shapes: ['circle'] as Options['shapes'],
        gravity: randomInRange(0.2, 0.5),
        scalar: randomInRange(0.8, 1.2),
        drift: randomInRange(-0.4, 0.4)
      });
      
      if (timeLeft > 0) {
        requestAnimationFrame(frame);
      }
    }

    // Start confetti frames
    frame();
    
    // Add fireworks every 700ms
    const fireworksInterval = setInterval(() => {
      fireworks();
    }, 700);
    
    // Clear the interval after duration
    setTimeout(() => clearInterval(fireworksInterval), duration);
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-rose-100 to-pink-50 overflow-hidden">
      {isCompleted ? (
        <div className="text-center px-4 z-10">
          <h1 className="text-5xl md:text-7xl font-windsong font-medium text-rose-600 mb-8 animate-bounce">
            Congratulations
          </h1>
          <h2 className="text-4xl md:text-6xl font-windsong text-rose-500 mb-12">
            Yukti & Ram
          </h2>
          <div className="animate-pulse">
            <div className="flex justify-center mb-8">
              <Heart className="h-16 w-16 text-rose-500 fill-rose-500" />
            </div>
            <p className="text-2xl md:text-3xl text-rose-700 font-light">
              Wishing you a lifetime of love and happiness!
            </p>
          </div>
          
        </div>
      ) : (
        <div className="text-center px-4">
          <h1 className="text-4xl md:text-6xl font-windsong font-medium text-rose-600 mb-8">
            Yukti & Ram
          </h1>
          <p className="text-xl md:text-2xl text-rose-500 mb-12 font-light">
            Countdown to our special day
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            <div className="w-24 md:w-36 h-24 md:h-36 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg flex flex-col items-center justify-center">
              <span className="text-3xl md:text-5xl font-bold text-rose-600">{days}</span>
              <span className="text-rose-400 text-sm md:text-base mt-1">Days</span>
            </div>
            
            <div className="w-24 md:w-36 h-24 md:h-36 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg flex flex-col items-center justify-center">
              <span className="text-3xl md:text-5xl font-bold text-rose-600">{hours}</span>
              <span className="text-rose-400 text-sm md:text-base mt-1">Hours</span>
            </div>
            
            <div className="w-24 md:w-36 h-24 md:h-36 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg flex flex-col items-center justify-center">
              <span className="text-3xl md:text-5xl font-bold text-rose-600">{minutes}</span>
              <span className="text-rose-400 text-sm md:text-base mt-1">Minutes</span>
            </div>
            
            <div className="w-24 md:w-36 h-24 md:h-36 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg flex flex-col items-center justify-center">
              <span className="text-3xl md:text-5xl font-bold text-rose-600">{seconds}</span>
              <span className="text-rose-400 text-sm md:text-base mt-1">Seconds</span>
            </div>
          </div>
          
          <p className="mt-12 text-rose-500 font-light font-serif italic">
            January 24, 2026 • Mangli Lake Farm
          </p>
        
          
          {/* Add a debug button to test the celebration effect - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <Button 
              className="mt-4 bg-rose-500 hover:bg-rose-600 text-white" 
              onClick={() => {
                setIsCompleted(true);
                triggerCelebration();
              }}
            >
              Test End of Timer
            </Button>
          )}
        </div>
      )}
      
      {/* Floating hearts background animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div 
            key={i}
            className="absolute text-pink-300 opacity-70"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
              transform: `scale(${0.5 + Math.random() * 1.5}) rotate(${Math.random() * 360}deg)`,
            }}
          >
            <Heart className="w-8 h-8 fill-pink-200" />
          </div>
        ))}
      </div>
      
      <style jsx global>{`
        @keyframes float {
          0% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
          100% {
            transform: translateY(-40px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
} 