"use client"

import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';

export function PhotoGallerySection() {
  const handleGalleryClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    alert('Photo gallery coming soon!');
  };

  return (
    <section className="py-20 sky-gradient" id="photos">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-windsong mb-2">Photo Gallery</h2>
          <div className="h-px w-20 bg-primary/50 mx-auto"></div>
        </div>
        
        <div className="text-center max-w-2xl mx-auto">
          <Button 
            variant="outline" 
            size="lg"
            className="rounded-full px-8 mb-4"
            asChild
          >
            <a href="#" onClick={handleGalleryClick}>
              <Camera className="mr-2 h-5 w-5" /> View Photo Gallery
            </a>
          </Button>
          <p className="text-muted-foreground">Coming Soon...</p>
        </div>
      </div>
    </section>
  );
}