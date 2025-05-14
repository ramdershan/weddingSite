import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f4d6c1] flex flex-col items-center justify-center p-4 pt-24">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-windsong tracking-tight mb-2">Yukti & Ram</h1>
          <div className="mt-4 h-px bg-border w-1/2 mx-auto" />
        </div>
        
        <Card className="p-6 shadow-lg bg-[#f6f2e7]">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-semibold">Page Not Found</h2>
            <p className="text-muted-foreground">
              The page you are looking for doesn't exist or has been moved.
            </p>
            <Button 
              asChild
              className="mt-4 bg-[#741914] hover:bg-[#641510] text-white shadow-md hover:shadow-lg transition-all"
            >
              <Link href="/">
                Return Home
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}