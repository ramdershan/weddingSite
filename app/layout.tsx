import './globals.css';
import type { Metadata } from 'next';
import { Inter, Cormorant_Garamond } from 'next/font/google';
import { ThemeProvider } from '@/components/ui/theme-provider';
import Link from 'next/link';
import { getWeddingDate } from '@/lib/utils';
import { GuestProvider } from '@/context/guest-context';
import { UserNav } from '@/components/user-nav';
import { NavLink } from '@/components/nav-link';
import Script from 'next/script';
import { headers } from 'next/headers';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Yukti & Ram - Wedding Celebration',
  description: 'Join us for our special day on January 24, 2026',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get the current pathname from headers
  const headersList = headers();
  const pathname = headersList.get('x-pathname') || '';
  const isGuestLoginPage = pathname.includes('/guest-login');
  const isAdminPage = pathname.includes('/admin');
  const shouldHideHeader = isGuestLoginPage || isAdminPage;

  // Log the current pathname for debugging
  console.log(`[Layout] Current pathname: ${pathname}`);

  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${cormorant.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=WindSong:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <GuestProvider>
            {/* Hide header on guest login page and admin pages */}
            {!shouldHideHeader && (
              <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/40">
                <div className="container mx-auto px-4">
                  <div className="flex items-center justify-between h-16">
                    <NavLink href="/#home" className="font-windsong text-2xl">
                      Yukti & Ram
                    </NavLink>
                    
                    <nav className="hidden md:flex items-center space-x-8">
                      <NavLink href="/#our-story">Our Story</NavLink>
                      <NavLink href="/#timeline">Details</NavLink>
                      <NavLink href="/#rsvp">RSVP</NavLink>
                      <NavLink href="/#photos">Gallery</NavLink>
                    </nav>
                    
                    <UserNav />
                  </div>
                </div>
              </header>
            )}
            
            {children}
          </GuestProvider>
        </ThemeProvider>
        
        {/* Add the script for smooth scrolling */}
        <Script src="/js/scroll-to-section.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}