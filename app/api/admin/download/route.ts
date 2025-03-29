import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_USERS, getEventCSVContent } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const adminAuth = request.cookies.get('admin_auth');
    
    if (!adminAuth || !adminAuth.value) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify the username exists in admin users
    const isAdmin = ADMIN_USERS.some(user => user.username === adminAuth.value);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get event parameter
    const { searchParams } = new URL(request.url);
    const event = searchParams.get('event');
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event parameter is required' },
        { status: 400 }
      );
    }
    
    // Get CSV content for the specified event
    const csvContent = getEventCSVContent(event);
    
    if (!csvContent) {
      return NextResponse.json(
        { error: 'No data available for this event' },
        { status: 404 }
      );
    }
    
    // Return CSV file
    const response = new NextResponse(csvContent);
    response.headers.set('Content-Type', 'text/csv');
    response.headers.set('Content-Disposition', `attachment; filename=${event}-rsvps-${new Date().toISOString().split('T')[0]}.csv`);
    
    return response;
  } catch (error) {
    console.error('Error downloading CSV:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}