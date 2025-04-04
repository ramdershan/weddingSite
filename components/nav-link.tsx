"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { navigateToHomeSection } from '@/lib/utils';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function NavLink({ href, children, className = "" }: NavLinkProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Only run on the client
    if (!isMounted) return;
    
    // Only handle anchor links on the homepage
    if (href.includes('#') && (window.location.pathname === '/' || window.location.pathname === '')) {
      e.preventDefault();
      
      const targetId = href.split('#')[1];
      if (targetId) {
        // Use our utility function instead of manual scrolling
        navigateToHomeSection(targetId);
      }
    } else {
      // Normal navigation for non-anchor links
      router.push(href);
    }
  };
  
  return (
    <Link 
      href={href} 
      onClick={handleClick}
      className={`text-muted-foreground hover:text-foreground transition-colors ${className}`}
      scroll={false}
      data-react-link="true"
    >
      {children}
    </Link>
  );
} 