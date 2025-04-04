"use client";

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { navigateToHomeSection, scrollToSection } from '@/lib/utils';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function NavLink({ href, children, className = "" }: NavLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Only run on the client
    if (!isMounted) return;
    
    e.preventDefault();
    
    // Handle anchor links
    if (href.includes('#')) {
      const targetId = href.split('#')[1];
      
      if (pathname === '/' || pathname === '') {
        // If already on homepage, use our smooth scroll utility
        if (targetId) {
          // Prevent default hash behavior by updating URL without a scroll event
          const scrollPosition = window.pageYOffset;
          history.pushState(null, '', `/#${targetId}`);
          window.scrollTo(window.pageXOffset, scrollPosition);
          
          // Then smoothly scroll to the section
          scrollToSection(targetId);
        }
      } else {
        // If on a different page, navigate to homepage with the section hash
        router.push(`/${href.includes('#') ? href : ''}`);
      }
    } else {
      // Normal navigation for non-anchor links
      router.push(href);
    }
  };
  
  // Determine if we should add default text styles or not
  // We want to preserve font-windsong and other explicit classes from parent
  const hasCustomFont = className.includes('font-');
  const baseClasses = hasCustomFont ? '' : 'text-muted-foreground hover:text-foreground';
  
  return (
    <Link 
      href={href} 
      onClick={handleClick}
      className={`transition-colors ${baseClasses} ${className}`}
      scroll={false}
      data-react-link="true"
    >
      {children}
    </Link>
  );
} 