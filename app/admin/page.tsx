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
import { RSVPSummary, Guest } from '@/lib/types';

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [summary, setSummary] = useState<RSVPSummary | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<{[key: string]: number}>({});
  const [activeTab, setActiveTab] = useState('events');
  const [activeEventTab, setActiveEventTab] = useState('engagement');
  const [activeCsvTab, setActiveCsvTab] = useState('all');

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
      const guestsResponse = await fetch('/api/admin');
      if (guestsResponse.ok) {
        const guestsData = await guestsResponse.json();
        setGuests(guestsData.guests);
        
        // Process dietary restrictions
        const restrictions: {[key: string]: number} = {};
        guestsData.guests.forEach((guest: Guest) => {
          // Check main dietary restrictions
          if (guest.dietaryRestrictions && guest.dietaryRestrictions.trim()) {
            const restriction = guest.dietaryRestrictions.trim();
            restrictions[restriction] = (restrictions[restriction] || 0) + 1;
          }
          
          // Check event-specific dietary restrictions
          if (guest.eventResponses) {
            Object.values(guest.eventResponses).forEach(response => {
              if (response.dietaryRestrictions && response.dietaryRestrictions.trim()) {
                const restriction = response.dietaryRestrictions.trim();
                restrictions[restriction] = (restrictions[restriction] || 0) + 1;
              }
            });
          }
        });
        
        setDietaryRestrictions(restrictions);
      } else {
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
      const response = await fetch(`/api/admin/download?event=${eventId}`);
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
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard 
                title="Total Guests" 
                value={summary?.totalGuests || 0} 
                icon={<Users className="h-5 w-5" />}
                description="Invited guests"
              />
              <StatCard 
                title="Responded" 
                value={summary?.responded || 0} 
                icon={<CheckCircle className="h-5 w-5 text-green-500" />}
                description={`${((summary?.responded || 0) / (summary?.totalGuests || 1) * 100).toFixed(0)}% response rate`}
              />
              <StatCard 
                title="Pending" 
                value={summary?.notResponded || 0} 
                icon={<HelpCircle className="h-5 w-5 text-amber-500" />}
                description="Awaiting response"
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
                  className={`px-6 py-3 font-medium text-lg flex items-center ${activeTab === 'csv' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setActiveTab('csv')}
                >
                  <FileText className="mr-2 h-5 w-5" />
                  CSV Data
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

                {activeEventTab === 'engagement' && (
                  <EventTab 
                    eventId="engagement"
                    eventName="Engagement Ceremony"
                    stats={summary?.eventStats.engagement}
                    onDownload={() => handleDownloadCSV('engagement')}
                  />
                )}
                
                {activeEventTab === 'wedding' && (
                  <EventTab 
                    eventId="wedding"
                    eventName="Wedding Ceremony"
                    stats={summary?.eventStats.wedding}
                    onDownload={() => handleDownloadCSV('wedding')}
                  />
                )}
                
                {activeEventTab === 'reception' && (
                  <EventTab 
                    eventId="reception"
                    eventName="Reception"
                    stats={summary?.eventStats.reception}
                    onDownload={() => handleDownloadCSV('reception')}
                  />
                )}
              </div>
            )}
            
            {activeTab === 'dietary' && (
              <Card>
                <CardHeader>
                  <CardTitle>Dietary Restrictions</CardTitle>
                  <CardDescription>Summary of all dietary restrictions mentioned by guests</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(dietaryRestrictions).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(dietaryRestrictions).map(([restriction, count], index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                          <div className="flex-1">
                            <p className="font-medium">{restriction}</p>
                          </div>
                          <Badge variant="outline">{count} guest{count !== 1 ? 's' : ''}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No dietary restrictions have been specified by guests.</p>
                  )}
                </CardContent>
              </Card>
            )}
            
            {activeTab === 'csv' && (
              <div className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-4 mb-6">
                  <div className="flex space-x-2">
                    <Button 
                      variant={activeCsvTab === 'all' ? 'default' : 'outline'} 
                      onClick={() => setActiveCsvTab('all')}
                      className="flex-1"
                    >
                      All Guests
                    </Button>
                    <Button 
                      variant={activeCsvTab === 'engagement-csv' ? 'default' : 'outline'} 
                      onClick={() => setActiveCsvTab('engagement-csv')}
                      className="flex-1"
                    >
                      Engagement
                    </Button>
                    <Button 
                      variant={activeCsvTab === 'wedding-csv' ? 'default' : 'outline'} 
                      onClick={() => setActiveCsvTab('wedding-csv')}
                      className="flex-1"
                    >
                      Wedding
                    </Button>
                    <Button 
                      variant={activeCsvTab === 'reception-csv' ? 'default' : 'outline'} 
                      onClick={() => setActiveCsvTab('reception-csv')}
                      className="flex-1"
                    >
                      Reception
                    </Button>
                  </div>
                </div>

                {activeCsvTab === 'all' && (
                  <CSVDataTable 
                    guests={guests} 
                    title="All Guests" 
                    description="Complete guest list with response status"
                    onDownload={() => {}} 
                    showEventColumn={false}
                  />
                )}
                
                {activeCsvTab === 'engagement-csv' && (
                  <CSVDataTable 
                    guests={filterGuestsByEvent(guests, 'engagement')} 
                    title="Engagement Ceremony Guests" 
                    description="Guests who responded to the Engagement Ceremony"
                    onDownload={() => handleDownloadCSV('engagement')} 
                    showEventColumn={false}
                    eventId="engagement"
                  />
                )}
                
                {activeCsvTab === 'wedding-csv' && (
                  <CSVDataTable 
                    guests={filterGuestsByEvent(guests, 'wedding')} 
                    title="Wedding Ceremony Guests" 
                    description="Guests who responded to the Wedding Ceremony"
                    onDownload={() => handleDownloadCSV('wedding')} 
                    showEventColumn={false}
                    eventId="wedding"
                  />
                )}
                
                {activeCsvTab === 'reception-csv' && (
                  <CSVDataTable 
                    guests={filterGuestsByEvent(guests, 'reception')} 
                    title="Reception Guests" 
                    description="Guests who responded to the Reception"
                    onDownload={() => handleDownloadCSV('reception')} 
                    showEventColumn={false}
                    eventId="reception"
                  />
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Helper function to filter guests by event
function filterGuestsByEvent(guests: Guest[], eventId: string): Guest[] {
  return guests.filter(guest => 
    guest.eventResponses && guest.eventResponses[eventId]
  );
}

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
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">{title}</h3>
          <div className="bg-primary/10 p-2 rounded-full">
            {icon}
          </div>
        </div>
        <div className="text-3xl font-bold mb-1">{value}</div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function EventTab({ 
  eventId, 
  eventName, 
  stats, 
  onDownload 
}: { 
  eventId: string; 
  eventName: string; 
  stats?: { 
    yes: number; 
    no: number; 
    maybe: number; 
    totalAttending: number; 
    plusOnes: number; 
  };
  onDownload: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{eventName}</h2>
        <Button onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download CSV
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Badge className="mb-2 bg-green-100 text-green-800 hover:bg-green-100">Yes</Badge>
              <div className="text-3xl font-bold text-green-600">{stats?.yes || 0}</div>
              <p className="text-sm text-muted-foreground">Confirmed</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Badge className="mb-2 bg-red-100 text-red-800 hover:bg-red-100">No</Badge>
              <div className="text-3xl font-bold text-red-600">{stats?.no || 0}</div>
              <p className="text-sm text-muted-foreground">Declined</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Badge className="mb-2 bg-amber-100 text-amber-800 hover:bg-amber-100">Maybe</Badge>
              <div className="text-3xl font-bold text-amber-600">{stats?.maybe || 0}</div>
              <p className="text-sm text-muted-foreground">Tentative</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Badge className="mb-2 bg-blue-100 text-blue-800 hover:bg-blue-100">Total</Badge>
              <div className="text-3xl font-bold text-blue-600">{stats?.totalAttending || 0}</div>
              <p className="text-sm text-muted-foreground">Expected Attendees</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Attendance Details</CardTitle>
          <CardDescription>Detailed breakdown of attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Primary Guests:</span>
              <span className="font-semibold">{(stats?.yes || 0) + (stats?.maybe || 0)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Plus Ones:</span>
              <span className="font-semibold">{stats?.plusOnes || 0}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Expected:</span>
              <span className="font-semibold">{stats?.totalAttending || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CSVDataTable({ 
  guests, 
  title, 
  description,
  onDownload,
  showEventColumn = true,
  eventId = ''
}: { 
  guests: Guest[]; 
  title: string;
  description: string;
  onDownload: () => void;
  showEventColumn?: boolean;
  eventId?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {onDownload && (
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                {showEventColumn && <TableHead>Event</TableHead>}
                <TableHead>Response</TableHead>
                <TableHead>Dietary Restrictions</TableHead>
                <TableHead>Plus Ones</TableHead>
                <TableHead>Responded At</TableHead>
                <TableHead>Updated At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.length > 0 ? (
                guests.map((guest, index) => {
                  // For event-specific views, get the event response
                  const eventResponse = eventId && guest.eventResponses ? 
                    guest.eventResponses[eventId] : null;
                  
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{guest.fullName}</TableCell>
                      {showEventColumn && <TableCell>{eventId || 'All'}</TableCell>}
                      <TableCell>
                        <Badge 
                          className={
                            (eventResponse?.response === 'Yes' || guest.response === 'Yes') ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                            (eventResponse?.response === 'No' || guest.response === 'No') ? 'bg-red-100 text-red-800 hover:bg-red-100' :
                            (eventResponse?.response === 'Maybe' || guest.response === 'Maybe') ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' :
                            'bg-gray-100 text-gray-800 hover:bg-gray-100'
                          }
                        >
                          {eventResponse?.response || guest.response || 'No Response'}
                        </Badge>
                      </TableCell>
                      <TableCell>{eventResponse?.dietaryRestrictions || guest.dietaryRestrictions || 'None'}</TableCell>
                      <TableCell>
                        {(eventResponse?.plusOne || guest.plusOne) ? 
                          `Yes (${eventResponse?.plusOneCount || guest.plusOneCount || 1})` : 
                          'No'}
                      </TableCell>
                      <TableCell>{formatDate(eventResponse?.respondedAt || guest.respondedAt)}</TableCell>
                      <TableCell>{formatDate(eventResponse?.updatedAt || guest.updatedAt)}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={showEventColumn ? 7 : 6} className="text-center py-4 text-muted-foreground">
                    No data available
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

// Helper function to format dates
function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Invalid Date';
  }
}