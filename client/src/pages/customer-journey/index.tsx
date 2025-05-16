import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ChevronLeft, Activity, Phone, Calendar, DollarSign, Info, Mail, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { useDateRange } from '@/hooks/use-date-range';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import VisualJourneyTimeline from '@/components/customer-journey/VisualJourneyTimeline';
import { JourneyAnalytics } from '@/components/customer-journey/JourneyAnalytics';

// Define interfaces for data types
interface TimelineEvent {
  id: number;
  type: 'meeting' | 'activity' | 'deal' | 'form' | 'note';
  subtype?: string;
  title: string;
  description?: string;
  timestamp: Date;
  source: string;
  sourceId?: string;
  data: any;
  userId?: number;
  userName?: string;
  score?: number;
}

interface AssignedUser {
  userId: number;
  name: string;
  email: string;
  role: string;
  assignmentType: string;
  totalInteractions: number;
}

interface CustomerJourney {
  contactId: number;
  contact: any;
  firstTouch: Date | null;
  lastTouch: Date | null;
  totalTouchpoints: number;
  timelineEvents: TimelineEvent[];
  sources: {[key: string]: number};
  assignedUsers: AssignedUser[];
  deals: any[];
  callMetrics: {
    solutionCallsBooked: number;
    solutionCallsSits: number;
    solutionCallShowRate: number;
    triageCallsBooked: number;
    triageCallsSits: number;
    triageShowRate: number;
    totalDials: number;
    speedToLead: number | null;
    pickUpRate: number;
    callsToClose: number;
    totalCalls: number;
    callsPerStage: {[stage: string]: number};
    directBookingRate: number;
    cancelRate: number;
    outboundTriagesSet: number;
    leadResponseTime: number | null;
  };
  salesMetrics: {
    closedWon: number;
    costPerClosedWon: number | null;
    closerSlotUtilization: number | null;
    solutionCallCloseRate: number;
    salesCycleDays: number | null;
    profitPerSolutionCall: number | null;
    costPerSolutionCall: number | null;
    cashPerSolutionCallBooked: number | null;
    revenuePerSolutionCallBooked: number | null;
    costPerSolutionCallSit: number | null;
    earningPerCall2Sit: number | null;
    cashEfficiencyPC2: number | null;
    profitEfficiencyPC2: number | null;
  };
  adminMetrics: {
    completedAdmin: number;
    missingAdmins: number;
    adminMissingPercentage: number;
    adminAssignments: {
      userId: number;
      userName: string;
      count: number;
      completed: number;
      missing: number;
      missingPercentage: number;
    }[];
  };
  leadMetrics: {
    newLeads: number;
    leadsDisqualified: number;
    totalCallOneShowRate: number;
  };
  journeyMetrics: {
    averageResponseTime: number | null;
    engagementScore: number;
    lastActivityGap: number | null;
    stageTransitions: {
      fromStage: string;
      toStage: string;
      daysInStage: number;
      timestamp: Date;
    }[];
    conversionRate: number | null;
    leadStatus: string;
    journeyLength: number | null;
  };
}

// The CustomerJourneyPage component displays a comprehensive view of a contact's journey
const CustomerJourneyPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const dateRange = useDateRange();
  const [contactId, setContactId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('timeline');

  // Get contact ID from URL
  useEffect(() => {
    // Try to get contactId from query parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const contactIdParam = urlParams.get('contactId');
    
    if (contactIdParam && !isNaN(parseInt(contactIdParam, 10))) {
      console.log('Found contactId in URL query params:', contactIdParam);
      setContactId(parseInt(contactIdParam, 10));
      return;
    }
    
    // If not in query params, try to extract from the path
    const pathParts = window.location.pathname.split('/');
    const lastPathPart = pathParts[pathParts.length - 1];
    
    if (lastPathPart && !isNaN(parseInt(lastPathPart, 10))) {
      console.log('Found contactId in URL path:', lastPathPart);
      setContactId(parseInt(lastPathPart, 10));
      return;
    }
    
    console.log('No contactId found in URL');
  }, []);

  // Fetch customer journey data
  const { data: journeyData, isLoading, error } = useQuery({
    queryKey: ['/api/customer-journey', contactId, dateRange.dateRange],
    queryFn: async () => {
      if (!contactId) return null;
      
      const queryParams = new URLSearchParams();
      if (dateRange.dateRange) {
        queryParams.append('dateRange', dateRange.dateRange);
      }
      
      try {
        // First try to get the data from the API
        const response = await fetch(`/api/customer-journey/${contactId}?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error('API request failed');
        }
        
        return response.json() as Promise<CustomerJourney>;
      } catch (error) {
        console.error("Error loading customer journey data:", error);
        
        // If loading from API fails, try to get the contact data directly
        // so we can at least show something and not a blank error screen
        const contactResponse = await fetch(`/api/contacts/${contactId}`);
        
        if (!contactResponse.ok) {
          console.error('Failed to fetch contact data:', contactResponse.status, contactResponse.statusText);
          throw new Error('Failed to load contact data');
        }
        
        const contact = await contactResponse.json();
        console.log('Successfully loaded contact details:', contact);
        
        // Return basic customer journey data with just the contact info
        // This ensures we at least show contact details
        return {
          contactId: contactId,
          contact: contact,
          firstTouch: null,
          lastTouch: null,
          totalTouchpoints: 0,
          timelineEvents: [],
          sources: {},
          assignedUsers: [],
          deals: [],
          callMetrics: {
            solutionCallsBooked: 0,
            solutionCallsSits: 0,
            solutionCallShowRate: 0,
            triageCallsBooked: 0,
            triageCallsSits: 0,
            triageShowRate: 0,
            totalDials: 0,
            speedToLead: null,
            pickUpRate: 0,
            callsToClose: 0,
            totalCalls: 0,
            callsPerStage: {},
            directBookingRate: 0,
            cancelRate: 0,
            outboundTriagesSet: 0,
            leadResponseTime: null
          },
          salesMetrics: {
            closedWon: 0,
            costPerClosedWon: null,
            closerSlotUtilization: null,
            solutionCallCloseRate: 0,
            salesCycleDays: null,
            profitPerSolutionCall: null,
            costPerSolutionCall: null,
            cashPerSolutionCallBooked: null,
            revenuePerSolutionCallBooked: null,
            costPerSolutionCallSit: null,
            earningPerCall2Sit: null,
            cashEfficiencyPC2: null,
            profitEfficiencyPC2: null
          },
          adminMetrics: {
            completedAdmin: 0,
            missingAdmins: 0,
            adminMissingPercentage: 0,
            adminAssignments: []
          },
          leadMetrics: {
            newLeads: 0,
            leadsDisqualified: 0,
            totalCallOneShowRate: 0
          },
          journeyMetrics: {
            averageResponseTime: null,
            engagementScore: 0,
            lastActivityGap: null,
            stageTransitions: [],
            conversionRate: null,
            leadStatus: contact.status || 'unknown',
            journeyLength: null
          }
        };
      }
    },
    enabled: contactId !== null,
  });

  // Format date for display
  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  };

  // Format currency value
  const formatCurrency = (value: string | null) => {
    if (!value) return '$0';
    const numericValue = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericValue);
  };

  // Format time duration for display
  const formatDuration = (minutes: number | null) => {
    if (minutes === null) return 'N/A';
    
    if (minutes < 60) {
      return `${Math.round(minutes)} minutes`;
    } else if (minutes < 1440) { // Less than a day
      return `${Math.round(minutes / 60)} hours`;
    } else {
      return `${Math.round(minutes / 1440)} days`;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col">
        <div className="flex items-center gap-4 sticky top-0 bg-background z-10 py-2 px-6 border-b">
          <Button variant="outline" size="sm" onClick={() => setLocation('/contacts')}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Button>
          <h1 className="text-3xl font-bold">Customer Journey</h1>
        </div>
        <div className="flex-1 overflow-y-auto container mx-auto py-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-8 w-2/3" />
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle>Journey Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !journeyData) {
    return (
      <div className="h-screen flex flex-col">
        <div className="flex items-center gap-4 sticky top-0 bg-background z-10 py-2 px-6 border-b">
          <Button variant="outline" size="sm" onClick={() => setLocation('/contacts')}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Button>
          <h1 className="text-3xl font-bold">Customer Journey</h1>
        </div>
        <div className="flex-1 overflow-y-auto container mx-auto py-6 space-y-8">
          <Card className="w-full max-w-lg mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Error Loading Journey Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                There was a problem loading the customer journey data. This may be due to:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-6">
                <li>The contact ID is invalid</li>
                <li>The contact no longer exists</li>
                <li>A temporary server issue</li>
              </ul>
              <Button 
                variant="default" 
                onClick={() => setLocation('/contacts')}
                className="w-full"
              >
                Return to Contacts
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const contactSource = journeyData.contact.source || 'Unknown';
  const contactStatus = journeyData.contact.status || 'Unknown';
  
  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-4 sticky top-0 bg-background z-10 py-2 px-6 border-b">
        <Button variant="outline" size="sm" onClick={() => setLocation('/contacts')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Contacts
        </Button>
        <h1 className="text-3xl font-bold">Customer Journey</h1>
      </div>
      <div className="flex-1 overflow-y-auto container mx-auto py-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle>Contact Details</CardTitle>
                <Badge variant={contactStatus === 'Active' ? 'success' : contactStatus === 'Inactive' ? 'destructive' : 'secondary'}>
                  {contactStatus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="font-semibold text-lg">{journeyData.contact.name}</div>
                  <div className="text-muted-foreground">{journeyData.contact.email}</div>
                  {journeyData.contact.phone && (
                    <div className="text-muted-foreground">{journeyData.contact.phone}</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h4 className="text-sm font-semibold">Source</h4>
                    <div className="text-sm">{contactSource}</div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">First Touch</h4>
                    <div className="text-sm">{journeyData.firstTouch ? formatDate(new Date(journeyData.firstTouch)) : 'Unknown'}</div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold mb-2">Attribution Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Touchpoints:</span>
                      <span className="font-medium">{journeyData.totalTouchpoints}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Sources:</span>
                      <span className="font-medium">{Object.keys(journeyData.sources).join(', ') || 'None'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Last Touch:</span>
                      <span className="font-medium">{journeyData.lastTouch ? formatDate(new Date(journeyData.lastTouch)) : 'None'}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold mb-2">Deals</h4>
                  {journeyData.deals.length > 0 ? (
                    <div className="space-y-2">
                      {journeyData.deals.map((deal) => (
                        <div key={deal.id} className="text-sm p-2 border rounded-md">
                          <div className="font-medium">{deal.title}</div>
                          <div className="flex justify-between mt-1">
                            <span className="text-muted-foreground">Value:</span>
                            <span>{formatCurrency(deal.value)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant={
                              deal.status === 'won' ? 'success' : 
                              deal.status === 'lost' ? 'destructive' : 
                              'secondary'
                            } className="text-xs">
                              {deal.statusLabel || deal.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No deals found</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
                <TabsTrigger value="attribution">Attribution</TabsTrigger>
              </TabsList>
              <TabsContent value="timeline" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Journey Timeline</CardTitle>
                    <CardDescription>
                      Visualizing all touchpoints and interactions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-[600px] overflow-y-auto pr-2">
                    <VisualJourneyTimeline events={journeyData.timelineEvents} />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="metrics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                    <CardDescription>
                      Key performance indicators for this customer
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                      <Card className="bg-muted/20">
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{journeyData.callMetrics.solutionCallsBooked}</div>
                          <p className="text-xs text-muted-foreground">Solution Calls Booked</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/20">
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{journeyData.callMetrics.solutionCallsSits}</div>
                          <p className="text-xs text-muted-foreground">Solution Calls Attended</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/20">
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{Math.round(journeyData.callMetrics.solutionCallShowRate * 100)}%</div>
                          <p className="text-xs text-muted-foreground">Show Rate</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/20">
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{formatDuration(journeyData.callMetrics.speedToLead)}</div>
                          <p className="text-xs text-muted-foreground">Speed to Lead</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Call Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm">Total Dials</span>
                                <span className="text-sm">{journeyData.callMetrics.totalDials}</span>
                              </div>
                              <Progress value={Math.min(journeyData.callMetrics.totalDials * 10, 100)} className="h-2" />
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm">Pick-up Rate</span>
                                <span className="text-sm">{Math.round(journeyData.callMetrics.pickUpRate * 100)}%</span>
                              </div>
                              <Progress value={journeyData.callMetrics.pickUpRate * 100} className="h-2" />
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm">Direct Booking Rate</span>
                                <span className="text-sm">{Math.round(journeyData.callMetrics.directBookingRate * 100)}%</span>
                              </div>
                              <Progress value={journeyData.callMetrics.directBookingRate * 100} className="h-2" />
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm">Cancel Rate</span>
                                <span className="text-sm">{Math.round(journeyData.callMetrics.cancelRate * 100)}%</span>
                              </div>
                              <Progress value={journeyData.callMetrics.cancelRate * 100} className="h-2" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Sales Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between">
                              <span className="text-sm">Closed Won</span>
                              <span className="text-sm font-medium">{journeyData.salesMetrics.closedWon}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Sales Cycle</span>
                              <span className="text-sm font-medium">{formatDuration(journeyData.salesMetrics.salesCycleDays)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Cost per Closed Won</span>
                              <span className="text-sm font-medium">{journeyData.salesMetrics.costPerClosedWon ? formatCurrency(journeyData.salesMetrics.costPerClosedWon.toString()) : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Solution Call Close Rate</span>
                              <span className="text-sm font-medium">{Math.round(journeyData.salesMetrics.solutionCallCloseRate * 100)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Profit per Call</span>
                              <span className="text-sm font-medium">{journeyData.salesMetrics.profitPerSolutionCall ? formatCurrency(journeyData.salesMetrics.profitPerSolutionCall.toString()) : 'N/A'}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="attribution" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Attribution Analysis</CardTitle>
                    <CardDescription>
                      Analysis of touchpoints and their impact
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <Card className="bg-muted/20">
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{journeyData.journeyMetrics.engagementScore}</div>
                          <p className="text-xs text-muted-foreground">Engagement Score</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/20">
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{formatDuration(journeyData.journeyMetrics.averageResponseTime)}</div>
                          <p className="text-xs text-muted-foreground">Average Response Time</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/20">
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{journeyData.journeyMetrics.conversionRate ? Math.round(journeyData.journeyMetrics.conversionRate * 100) + '%' : 'N/A'}</div>
                          <p className="text-xs text-muted-foreground">Conversion Rate</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="mt-6">
                      <h3 className="text-md font-semibold mb-3">Source Breakdown</h3>
                      <Card>
                        <CardContent className="pt-6">
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={Object.entries(journeyData.sources).map(([source, count]) => ({ source, count }))}>
                              <XAxis dataKey="source" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="count" fill="#3b82f6" name="Touchpoints" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {journeyData.journeyMetrics.stageTransitions.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-md font-semibold mb-3">Stage Transitions</h3>
                        <div className="space-y-3">
                          {journeyData.journeyMetrics.stageTransitions.map((transition, index) => (
                            <Card key={index} className="bg-muted/30">
                              <CardContent className="py-3 px-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{transition.fromStage}</Badge>
                                    <ChevronLeft className="rotate-180 h-4 w-4" />
                                    <Badge>{transition.toStage}</Badge>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground">{transition.daysInStage} days</span>
                                    <span className="text-xs">{formatDate(new Date(transition.timestamp))}</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerJourneyPage;