"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

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
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        // Get header height
        const header = document.querySelector('header');
        const headerHeight = header ? header.offsetHeight : 0;
        
        // Calculate position with offset
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 20;
        
        // Scroll
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        
        // Update URL without page refresh
        history.pushState(null, '', '#' + targetId);
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
    >
      {children}
    </Link>
  );
} 