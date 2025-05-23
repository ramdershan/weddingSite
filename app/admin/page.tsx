"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Download, 
  RefreshCw, 
  Users, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Diamond, 
  Heart, 
  PartyPopper,
  LogOut,
  Loader2,
  FileText,
  UtensilsCrossed,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RSVPSummary, Guest, EventSummaryStats } from '@/lib/types';

type DietaryInfo = {
  guestName: string;
  restriction: string;
};

// Map event IDs to display names (adjust keys/values as needed)
const EVENT_DISPLAY_NAMES: Record<string, string> = {
  engagement: "Engagement Ceremony",
  wedding: "Wedding Ceremony",
  sangeet: "Sangeet",
  haldi: "Haldi",
  mehndi: "Mehndi",
  reception: "Reception",
};

// *** NEW COMPONENT: SubEventStats ***
function SubEventStats({
  eventName,
  eventId,
  stats
}: {
  eventName: string;
  eventId: string;
  stats?: EventSummaryStats;
}) {
  const [invitedCount, setInvitedCount] = useState<number>(0);
  
  // Fetch total invited guests for this sub-event
  useEffect(() => {
    const fetchInvitedCount = async () => {
      try {
        const response = await fetch(`/api/admin/invited-count?eventId=${eventId}&activeOnly=true`);
        if (response.ok) {
          const data = await response.json();
          setInvitedCount(data.count || 0);
        }
      } catch (error) {
        console.error(`Error fetching invited count for ${eventId}:`, error);
      }
    };
    
    if (eventId) {
      fetchInvitedCount();
    }
  }, [eventId]);

  return (
    <Card>
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-lg font-medium">{eventName}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-green-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1.5"/> Yes</span>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{stats?.yes || 0}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-red-600 flex items-center"><XCircle className="w-4 h-4 mr-1.5"/> No</span>
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{stats?.no || 0}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-amber-600 flex items-center"><HelpCircle className="w-4 h-4 mr-1.5"/> Maybe</span>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{stats?.maybe || 0}</Badge>
        </div>
        <div className="flex items-center justify-between">
           <span className="text-blue-600 flex items-center"><Users className="w-4 h-4 mr-1.5"/> Attending</span>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{stats?.totalAttending || 0}</Badge>
        </div>
        <div className="flex items-center justify-between col-span-2 pt-1">
          <span className="text-muted-foreground flex items-center text-xs"><Users className="w-3 h-3 mr-1.5"/> Invited Guests</span>
          <Badge variant="secondary" className="text-xs">{invitedCount}</Badge>
        </div>
         <div className="flex items-center justify-between col-span-2 pt-1">
           <span className="text-muted-foreground flex items-center text-xs"><Users className="w-3 h-3 mr-1.5"/> Plus Ones Included</span>
          <Badge variant="secondary" className="text-xs">{stats?.plusOnes || 0}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
// *** END NEW COMPONENT ***

// Helper to determine overall status
function getOverallGuestStatus(guest: Guest): string {
  if (guest.eventResponses && Object.keys(guest.eventResponses).length > 0) {
    // Check if any response is Yes, No, or Maybe
    const hasResponded = Object.values(guest.eventResponses).some(r => r?.response && ['Yes', 'No', 'Maybe'].includes(r.response));
    if (hasResponded) return 'Responded';
  }
  // Check legacy response field if needed (optional)
  // if (guest.responded && guest.response && ['Yes', 'No', 'Maybe'].includes(guest.response)) {
  //  return 'Responded';
  // }
  return 'Pending';
}

// Refactor CSVDataTable to GuestDataTable
function GuestDataTable({ 
  guests, 
  title, 
  description,
  onDownload,
  dataType, // 'all' or 'event'
  eventId = '' // Only relevant for dataType='event'
}: { 
  guests: Guest[]; 
  title: string;
  description: string;
  onDownload: () => void;
  dataType: 'all' | 'event';
  eventId?: string;
}) {
  const isAllGuestsView = dataType === 'all';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {/* Pass correct identifier to download handler */}
        <Button variant="outline" size="sm" onClick={onDownload}> 
          <Download className="mr-2 h-4 w-4" />
          Download CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                {isAllGuestsView ? (
                  <>
                    <TableHead>Overall Status</TableHead>
                    <TableHead>Invited To</TableHead>
                    <TableHead>Events Attending</TableHead>
                    <TableHead>Dietary Restrictions</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>Response</TableHead>
                    <TableHead>Dietary</TableHead>
                    <TableHead>Adults</TableHead>
                    <TableHead>Children</TableHead>
                    <TableHead>Updated At</TableHead>
                  </>
                )}
                <TableHead>Is Active</TableHead> {/* Added Is Active column */} 
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.length > 0 ? (
                guests.map((guest, index) => {
                  const eventResponse = !isAllGuestsView && eventId && guest.eventResponses ? 
                    guest.eventResponses[eventId] : null;
                  
                  const overallStatus = isAllGuestsView ? getOverallGuestStatus(guest) : '';

                  // Get events this guest is attending or maybe attending
                  const attendingEvents = isAllGuestsView && guest.eventResponses ? 
                    Object.entries(guest.eventResponses)
                      .filter(([_, response]) => response?.response === 'Yes' || response?.response === 'Maybe')
                      .map(([eventId, _]) => EVENT_DISPLAY_NAMES[eventId] || eventId)
                    : [];
                  
                  // Get events this guest is invited to
                  const invitedEvents = isAllGuestsView && guest.invitedEvents ? 
                    guest.invitedEvents.map((event: any) => EVENT_DISPLAY_NAMES[event.code] || event.name)
                    : [];

                  return (
                    <TableRow key={guest.fullName + index}> {/* Use a more stable key if guest object has unique ID */}
                      <TableCell className="font-medium">{guest.fullName}</TableCell>
                      {isAllGuestsView ? (
                        <>
                          <TableCell>
                            <Badge 
                              variant={overallStatus === 'Responded' ? 'secondary' : 'outline'}
                              className={overallStatus === 'Pending' ? 'text-amber-600 border-amber-300 bg-amber-50' : ''}
                            >
                              {overallStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {invitedEvents.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {invitedEvents.map(event => (
                                  <Badge key={event} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                    {event}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">None</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {attendingEvents.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {attendingEvents.map(event => (
                                  <Badge key={event} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    {event}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">None</span>
                            )}
                          </TableCell>
                          <TableCell>{guest.dietaryRestrictions?.trim() || '-'}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>
                            <Badge 
                              className={
                                eventResponse?.response === 'Yes' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                                eventResponse?.response === 'No' ? 'bg-red-100 text-red-800 hover:bg-red-100' :
                                eventResponse?.response === 'Maybe' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' :
                                'bg-gray-100 text-gray-800 hover:bg-gray-100'
                              }
                            >
                              {eventResponse?.response || 'No Response'}
                            </Badge>
                          </TableCell>
                          <TableCell>{guest.dietaryRestrictions?.trim() || '-'}</TableCell>
                          <TableCell className="text-center">{eventResponse?.adultCount ?? '-'}</TableCell>
                          <TableCell className="text-center">{eventResponse?.childrenCount ?? '-'}</TableCell>
                          <TableCell>{formatDate(eventResponse?.updatedAt)}</TableCell>
                        </>
                      )}
                      <TableCell>
                        <Badge variant={guest.isActive ? "default" : "destructive"}>
                          {guest.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={isAllGuestsView ? 4 : 7} className="text-center py-4 text-muted-foreground">
                    No guest data available for this view.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [summary, setSummary] = useState<RSVPSummary | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<Record<string, DietaryInfo[]>>({});
  const [activeTab, setActiveTab] = useState('events');
  const [activeEventTab, setActiveEventTab] = useState('engagement');
  const [activeCsvTab, setActiveCsvTab] = useState('all');
  const [showInactiveGuests, setShowInactiveGuests] = useState(false); // Default to hiding inactive guests

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/auth');
        if (!response.ok) {
          router.push('/admin/login');
        } else {
          setAuthenticated(true);
          fetchData();
        }
      } catch (error) {
        router.push('/admin/login');
      }
    };

    checkAuth();
  }, [router]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch summary data
      const summaryResponse = await fetch('/api/admin/summary');
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData.summary);
      } else {
        toast({
          title: "Error",
          description: "Failed to load RSVP summary data",
          variant: "destructive",
        });
      }

      // Fetch guest list data
      console.log('[Admin Page] Fetching guest list data...');
      const guestsResponse = await fetch('/api/admin');
      if (guestsResponse.ok) {
        const guestsData = await guestsResponse.json();
        console.log('[Admin Page] Raw guest data received from API:', guestsData);
        
        const fetchedGuests: Guest[] = guestsData.guests || [];
        console.log('[Admin Page] Processed guest list (for Guest Data tab):', fetchedGuests);
        setGuests(fetchedGuests);
        
        // Process dietary restrictions - Group by event
        console.log('[Admin Page] Processing dietary restrictions...');
        const eventRestrictionsMap: Record<string, DietaryInfo[]> = {};

        // Only include active guests when processing dietary restrictions
        fetchedGuests
          .filter(guest => guest.isActive)
          .forEach((guest: Guest) => {
            // Add guest-level dietary restrictions to all events the guest is responding to
            if (guest.dietaryRestrictions && guest.dietaryRestrictions.trim()) {
              // Check which events this guest has responded to
              if (guest.eventResponses) {
                Object.keys(guest.eventResponses).forEach(eventId => {
                  const response = guest.eventResponses?.[eventId];
                  // Only add dietary restriction to events the guest is attending
                  if (response?.response === "Yes" || response?.response === "Maybe") {
                    if (!eventRestrictionsMap[eventId]) {
                      eventRestrictionsMap[eventId] = [];
                    }
                    
                    const restrictionText = guest.dietaryRestrictions?.trim() || '';
                    
                    // Avoid duplicate entries
                    if (!eventRestrictionsMap[eventId].some(item => 
                      item.guestName === guest.fullName && item.restriction === restrictionText
                    )) {
                      eventRestrictionsMap[eventId].push({
                        guestName: guest.fullName,
                        restriction: restrictionText
                      });
                    }
                  }
                });
              }
            }
          });
        
        console.log('[Admin Page] Processed dietary restrictions map (for Dietary tab):', eventRestrictionsMap);
        setDietaryRestrictions(eventRestrictionsMap);
      } else {
        console.error('[Admin Page] Failed to load guest list data, status:', guestsResponse.status);
        toast({
          title: "Error",
          description: "Failed to load guest list data",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    toast({
      title: "Data Refreshed",
      description: "RSVP data has been updated",
    });
  };

  const handleDownloadCSV = async (eventId: string) => {
    try {
      const response = await fetch(`/api/admin/download?event=${eventId}&activeOnly=${!showInactiveGuests}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `${eventId}-rsvps-${date}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        toast({
          title: "Error",
          description: "Failed to download CSV file",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download CSV file",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      console.log('[Admin] Initiating admin logout process');
      const response = await fetch('/api/admin/logout', { 
        method: 'POST',
        credentials: 'include' // Ensure cookies are included
      });
      
      if (response.ok) {
        console.log('[Admin] Logout API call successful, redirecting...');
        toast({
          title: "Logged Out",
          description: "You have been logged out successfully",
        });
        
        // Force a hard redirect to the login page to ensure cookies are cleared from browser
        setTimeout(() => {
          window.location.href = '/admin/login?logged_out=true'; // Use location.href instead of router to force full page reload
        }, 500);
      } else {
        console.error('[Admin] Logout failed:', await response.text());
        toast({
          title: "Logout Failed",
          description: "There was a problem logging you out. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[Admin] Logout error:', error);
      toast({
        title: "Logout Error",
        description: "There was a problem logging you out. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pt-16">
      <header className="bg-background border-b sticky top-16 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Your Wedding Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Data
                </>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Overview Cards - Use top-level summary data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard 
                title="Total Guests Invited" 
                value={summary?.invitedGuests || 0}
                icon={<Users className="h-5 w-5" />}
                description="Total unique individuals invited"
              />
              <StatCard 
                title="Overall Responded" 
                value={summary?.responded || 0} 
                icon={<CheckCircle className="h-5 w-5 text-green-500" />}
                description={`${((summary?.responded || 0) / (summary?.invitedGuests || 1) * 100).toFixed(0)}% response rate`}
              />
              <StatCard 
                title="Overall Pending" 
                value={summary?.notResponded || 0} 
                icon={<HelpCircle className="h-5 w-5 text-amber-500" />}
                description="Awaiting response from guests"
              />
            </div>

            {/* Main Navigation Tabs */}
            <div className="mb-8">
              <div className="flex border-b border-border">
                <button
                  className={`px-6 py-3 font-medium text-lg flex items-center ${activeTab === 'events' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setActiveTab('events')}
                >
                  <Calendar className="mr-2 h-5 w-5" />
                  Events
                </button>
                <button
                  className={`px-6 py-3 font-medium text-lg flex items-center ${activeTab === 'dietary' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setActiveTab('dietary')}
                >
                  <UtensilsCrossed className="mr-2 h-5 w-5" />
                  Dietary Restrictions
                </button>
                <button
                  className={`px-6 py-3 font-medium text-lg flex items-center ${activeTab === 'guest-data' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setActiveTab('guest-data')}
                >
                  <FileText className="mr-2 h-5 w-5" />
                  Guest Data
                </button>
              </div>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'events' && (
              <div className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-4 mb-6">
                  <div className="flex space-x-2">
                    <Button 
                      variant={activeEventTab === 'engagement' ? 'default' : 'outline'} 
                      onClick={() => setActiveEventTab('engagement')}
                      className="flex-1"
                    >
                      <Diamond className="mr-2 h-4 w-4" />
                      Engagement
                    </Button>
                    <Button 
                      variant={activeEventTab === 'wedding' ? 'default' : 'outline'} 
                      onClick={() => setActiveEventTab('wedding')}
                      className="flex-1"
                    >
                      <Heart className="mr-2 h-4 w-4" />
                      Wedding
                    </Button>
                    <Button 
                      variant={activeEventTab === 'reception' ? 'default' : 'outline'} 
                      onClick={() => setActiveEventTab('reception')}
                      className="flex-1"
                    >
                      <PartyPopper className="mr-2 h-4 w-4" />
                      Reception
                    </Button>
                  </div>
                </div>

                {/* Engagement Tab Content */}
                {activeEventTab === 'engagement' && (
                  <EventTab 
                    eventId="engagement"
                    eventName="Engagement Ceremony"
                    stats={summary?.events.engagement}
                    onDownload={() => handleDownloadCSV('engagement')}
                  />
                )}
                
                {/* --- Wedding Tab Content - Main EventTab + SubEventStats grid --- */}
                {activeEventTab === 'wedding' && (
                  <div className="space-y-8">
                    {/* Main Download Button */}
                    <div className="flex items-center justify-between">
                       <h2 className="text-2xl font-bold">Wedding Events RSVP Summary</h2>
                       <Button onClick={() => handleDownloadCSV('wedding-group')}>
                         <Download className="mr-2 h-4 w-4" />
                         Download Wedding Group CSV
                       </Button>
                    </div>
                    
                    {/* Main Wedding Ceremony EventTab */}
                  <EventTab 
                    eventId="wedding"
                    eventName="Wedding Ceremony"
                       stats={summary?.events.wedding}
                       onDownload={() => handleDownloadCSV('wedding')} // Can still download specific
                    />
                    
                    <Separator />
                    
                    {/* Sub Events Title */}
                     <h3 className="text-xl font-semibold pt-4">Associated Events</h3>
                     
                     {/* Grid for Sub Events */}
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <SubEventStats eventName="Sangeet" eventId="sangeet" stats={summary?.events.sangeet} />
                        <SubEventStats eventName="Haldi" eventId="haldi" stats={summary?.events.haldi} />
                        <SubEventStats eventName="Mehndi" eventId="mehndi" stats={summary?.events.mehndi} />
                        {/* Add more sub-events if needed */}
                      </div>
                   </div>
                )}
                {/* --- End Wedding Tab Content --- */}
                
                {/* Reception Tab Content */}
                {activeEventTab === 'reception' && (
                  <EventTab 
                    eventId="reception"
                    eventName="Reception"
                    stats={summary?.events.reception}
                    onDownload={() => handleDownloadCSV('reception')}
                  />
                )}
              </div>
            )}
            
            {activeTab === 'dietary' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-4">Dietary Restrictions</h2>
                
                <Tabs defaultValue="by-event" className="w-full">
                  <TabsList>
                    <TabsTrigger value="by-event">By Event</TabsTrigger>
                    <TabsTrigger value="by-guest">By Guest</TabsTrigger>
                  </TabsList>
                  
                  {/* View dietary restrictions by event */}
                  <TabsContent value="by-event">
                    {Object.keys(dietaryRestrictions).length > 0 ? (
                      Object.entries(dietaryRestrictions)
                        .sort(([eventA], [eventB]) => {
                          // Define order only once
                          const order = ['engagement', 'wedding', 'haldi', 'sangeet', 'mehndi', 'reception'];
                          return order.indexOf(eventA) - order.indexOf(eventB);
                        })
                        .map(([eventId, restrictionsList]) => (
                          <Card key={eventId} className="mb-4">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-xl">{EVENT_DISPLAY_NAMES[eventId] || eventId}</CardTitle>
                              <CardDescription>
                                {restrictionsList.length} {restrictionsList.length === 1 ? 'guest' : 'guests'} with dietary requirements
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              {restrictionsList.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {restrictionsList
                                    .sort((a, b) => a.guestName.localeCompare(b.guestName))
                                    .map((item, index) => (
                                      <Card key={`${eventId}-${index}`} className="border-l-4 border-l-blue-500">
                                        <CardContent className="p-4">
                                          <p className="font-medium">{item.guestName}</p>
                                          <p className="text-muted-foreground text-sm mt-1">{item.restriction}</p>
                                        </CardContent>
                                      </Card>
                                    ))}
                                </div>
                              ) : (
                                <p className="text-muted-foreground py-2">No dietary restrictions for this event</p>
                              )}
                            </CardContent>
                          </Card>
                        ))
                    ) : (
                      <p className="text-muted-foreground py-4">No dietary information available</p>
                    )}
                  </TabsContent>
                  
                  {/* View dietary restrictions by guest */}
                  <TabsContent value="by-guest">
              <Card>
                <CardHeader>
                        <CardTitle>Guest Dietary Requirements</CardTitle>
                        <CardDescription>All guests with registered dietary restrictions</CardDescription>
                </CardHeader>
                <CardContent>
                        {(() => {
                          // Create a map of guests to their dietary restrictions
                          const guestRestrictions = new Map<string, { restriction: string, events: string[] }>();
                          
                          // Populate the map from the event-based restrictions
                          Object.entries(dietaryRestrictions).forEach(([eventId, restrictionsList]) => {
                            restrictionsList.forEach(item => {
                              if (!guestRestrictions.has(item.guestName)) {
                                guestRestrictions.set(item.guestName, { 
                                  restriction: item.restriction, 
                                  events: [eventId] 
                                });
                              } else {
                                const current = guestRestrictions.get(item.guestName);
                                if (current && !current.events.includes(eventId)) {
                                  current.events.push(eventId);
                                }
                              }
                            });
                          });
                          
                          // If no restrictions are found
                          if (guestRestrictions.size === 0) {
                            return <p className="text-muted-foreground py-2">No guests have provided dietary restrictions</p>;
                          }
                          
                          // Convert map to array for sorting and display
                          const guestList = Array.from(guestRestrictions.entries())
                            .sort(([nameA], [nameB]) => nameA.localeCompare(nameB));
                          
                          return (
                    <div className="space-y-4">
                              {guestList.map(([name, data], index) => (
                                <Card key={`guest-${index}`} className="border-l-4 border-l-purple-500">
                                  <CardContent className="p-4">
                                    <div className="flex flex-col">
                                      <p className="font-medium text-lg">{name}</p>
                                      <p className="text-muted-foreground mb-2">{data.restriction}</p>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        {data.events.sort((a, b) => {
                                          const order = ['engagement', 'wedding', 'haldi', 'sangeet', 'mehndi', 'reception'];
                                          return order.indexOf(a) - order.indexOf(b);
                                        }).map(eventId => (
                                          <Badge key={eventId} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                            {EVENT_DISPLAY_NAMES[eventId] || eventId}
                                          </Badge>
                                        ))}
                          </div>
                        </div>
                                  </CardContent>
                                </Card>
                      ))}
                    </div>
                          );
                        })()}
                </CardContent>
              </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
            
            {activeTab === 'guest-data' && (
              <div className="space-y-6">
                {/* Add toggle for showing/hiding inactive guests */}
                <div className="flex justify-end mb-4">
                  <div className="flex items-center space-x-2">
                    <label htmlFor="show-inactive" className="text-sm font-medium">
                      {showInactiveGuests ? "Showing inactive guests" : "Hiding inactive guests"}
                    </label>
                    <Button
                      id="show-inactive"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowInactiveGuests(!showInactiveGuests)}
                      className="flex items-center space-x-1 h-8"
                    >
                      {showInactiveGuests ? "Hide Inactive" : "Show Inactive"}
                    </Button>
                  </div>
                </div>
                
                {/* Tabs for different CSV views */}
                <Tabs defaultValue="all" className="w-full">
                  <TabsList>
                    <TabsTrigger value="all" onClick={() => setActiveCsvTab('all')}>All Guests</TabsTrigger>
                    <TabsTrigger value="engagement" onClick={() => setActiveCsvTab('engagement')}>Engagement</TabsTrigger>
                    <TabsTrigger value="wedding" onClick={() => setActiveCsvTab('wedding')}>Wedding</TabsTrigger>
                    <TabsTrigger value="sangeet" onClick={() => setActiveCsvTab('sangeet')}>Sangeet</TabsTrigger>
                    <TabsTrigger value="haldi" onClick={() => setActiveCsvTab('haldi')}>Haldi</TabsTrigger>
                    <TabsTrigger value="mehndi" onClick={() => setActiveCsvTab('mehndi')}>Mehndi</TabsTrigger>
                    <TabsTrigger value="reception" onClick={() => setActiveCsvTab('reception')}>Reception</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all">
                    <GuestDataTable 
                      guests={guests.filter(guest => showInactiveGuests || guest.isActive)} 
                      title="All Guests" 
                      description={`${guests.filter(guest => showInactiveGuests || guest.isActive).length} guests in total`}
                      onDownload={() => handleDownloadCSV('all')}
                      dataType="all"
                    />
                  </TabsContent>
                  
                  <TabsContent value="engagement">
                    <GuestDataTable 
                      guests={guests.filter(guest => (showInactiveGuests || guest.isActive) && guest.eventResponses?.engagement)} 
                      title="Engagement Ceremony Guests" 
                      description={`Guests with Engagement Ceremony responses`}
                      onDownload={() => handleDownloadCSV('engagement')} 
                      dataType="event"
                      eventId="engagement"
                    />
                  </TabsContent>
                  
                  <TabsContent value="wedding">
                    <GuestDataTable 
                      guests={guests.filter(guest => (showInactiveGuests || guest.isActive) && guest.eventResponses?.wedding)} 
                      title="Wedding Ceremony Guests" 
                      description={`Guests with Wedding Ceremony responses`}
                      onDownload={() => handleDownloadCSV('wedding')} 
                      dataType="event"
                      eventId="wedding"
                    />
                  </TabsContent>
                  
                  <TabsContent value="sangeet">
                    <GuestDataTable 
                      guests={guests.filter(guest => (showInactiveGuests || guest.isActive) && guest.eventResponses?.sangeet)} 
                      title="Sangeet Guests"
                      description={`Guests with Sangeet responses`}
                      onDownload={() => handleDownloadCSV('sangeet')}
                      dataType="event"
                      eventId="sangeet"
                    />
                  </TabsContent>
                  
                  <TabsContent value="haldi">
                    <GuestDataTable 
                      guests={guests.filter(guest => (showInactiveGuests || guest.isActive) && guest.eventResponses?.haldi)} 
                      title="Haldi Guests"
                      description={`Guests with Haldi responses`}
                      onDownload={() => handleDownloadCSV('haldi')}
                      dataType="event"
                      eventId="haldi"
                    />
                  </TabsContent>
                  
                  <TabsContent value="mehndi">
                    <GuestDataTable 
                      guests={guests.filter(guest => (showInactiveGuests || guest.isActive) && guest.eventResponses?.mehndi)} 
                      title="Mehndi Guests"
                      description={`Guests with Mehndi responses`}
                      onDownload={() => handleDownloadCSV('mehndi')}
                      dataType="event"
                      eventId="mehndi"
                    />
                  </TabsContent>
                  
                  <TabsContent value="reception">
                    <GuestDataTable 
                      guests={guests.filter(guest => (showInactiveGuests || guest.isActive) && guest.eventResponses?.reception)} 
                      title="Reception Guests" 
                      description={`Guests with Reception responses`}
                      onDownload={() => handleDownloadCSV('reception')} 
                      dataType="event"
                      eventId="reception"
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Helper function to format date strings
function formatDate(dateString?: string) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Event Tab Component
function EventTab({ 
  eventId, 
  eventName, 
  stats, 
  onDownload 
}: { 
  eventId: string; 
  eventName: string; 
  stats?: EventSummaryStats;
  onDownload: () => void;
}) {
  const [totalInvited, setTotalInvited] = useState<number>(0);
  
  // Fetch total invited guests for this event
  useEffect(() => {
    const fetchInvitedCount = async () => {
      try {
        const response = await fetch(`/api/admin/invited-count?eventId=${eventId}&activeOnly=true`);
        if (response.ok) {
          const data = await response.json();
          setTotalInvited(data.count || 0);
        }
      } catch (error) {
        console.error('Error fetching invited count:', error);
      }
    };
    
    fetchInvitedCount();
  }, [eventId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{eventName} RSVP Summary</h2>
        <Button onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download CSV
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              <div className="flex items-center text-green-600">
                <CheckCircle className="mr-2 h-5 w-5" />
                Attending
            </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.yes || 0}</div>
            <p className="text-sm text-muted-foreground">Confirmed guests</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              <div className="flex items-center text-amber-600">
                <HelpCircle className="mr-2 h-5 w-5" />
                Maybe
            </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.maybe || 0}</div>
            <p className="text-sm text-muted-foreground">Tentative guests</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              <div className="flex items-center text-red-600">
                <XCircle className="mr-2 h-5 w-5" />
                Not Attending
            </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.no || 0}</div>
            <p className="text-sm text-muted-foreground">Declined guests</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              <div className="flex items-center text-blue-600">
                <Users className="mr-2 h-5 w-5" />
                Total Invited
            </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalInvited}</div>
            <p className="text-sm text-muted-foreground">Guests who can RSVP</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Attendance Summary card remains the same */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Summary</CardTitle>
          <CardDescription>Expected attendance including plus ones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Primary Guests</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{stats?.yes || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Plus Ones</span>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{stats?.plusOnes || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Attending</span>
              <Badge className="text-md">{stats?.totalAttending || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Adults</span>
              <span>{stats?.adultsAttending || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Children</span>
              <span>{stats?.childrenAttending || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Response Rate</span>
              <span>{totalInvited ? Math.round(((stats?.yes || 0) + (stats?.no || 0) + (stats?.maybe || 0)) / totalInvited * 100) : 0}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// StatCard Component
function StatCard({ 
  title, 
  value, 
  icon, 
  description 
}: { 
  title: string;
  value: number; 
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}