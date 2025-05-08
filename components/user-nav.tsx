"use client"

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGuestContext } from "@/context/guest-context";
import { LogOut, User } from "lucide-react";
import { useState, useEffect } from "react";
import { LoginModal } from "./login-modal";
import { usePathname, useRouter } from "next/navigation";

export function UserNav() {
  const { guest, clearGuest } = useGuestContext();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  // Check if we're on an RSVP page
  const isOnRsvpPage = pathname?.includes('/rsvp');

  if (!guest) {
    return (
      <>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowLoginModal(true)}
          className="relative h-8 rounded-full px-2"
        >
          <User className="h-4 w-4 mr-2" />
          <span>Sign In</span>
        </Button>
        
        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => setShowLoginModal(false)} 
        />
      </>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 rounded-full px-2">
            <User className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{guest.fullName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{guest.fullName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                Valued Guest
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => {
              // Close the dropdown first
              setOpen(false);
              
              // Log the logout attempt with the current pathname
              console.log('[UserNav] Invoking clearGuest from UserNav on path:', pathname);
              
              // Use the same logout process for all pages, allowing the logout overlay to be shown
              clearGuest();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </div>
  );
}