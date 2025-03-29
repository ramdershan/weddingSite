import { NextRequest, NextResponse } from 'next/server';
import { getGuestList } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const guestList = getGuestList();
    const guests = Object.values(guestList);
    
    return NextResponse.json({ guests });
  } catch (error) {
    console.error('Error fetching guest list:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}