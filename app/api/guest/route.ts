import { NextRequest, NextResponse } from 'next/server';
import { getGuest, isApprovedGuest } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fullName = searchParams.get('name');
    const eventId = searchParams.get('eventId');
    
    if (!fullName) {
      return NextResponse.json(
        { error: 'Name parameter is required' },
        { status: 400 }
      );
    }
    
    if (!isApprovedGuest(fullName)) {
      return NextResponse.json(
        { error: 'Guest not found in approved list' },
        { status: 403 }
      );
    }
    
    const guest = getGuest(fullName);
    
    if (!guest) {
      return NextResponse.json(
        { error: 'Guest not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ guest });
  } catch (error) {
    console.error('Error fetching guest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}