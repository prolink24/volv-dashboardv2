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

const CustomerJourneyPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const dateRange = useDateRange();
  const [contactId, setContactId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('timeline');

  // Get contact ID from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const contactIdParam = urlParams.get('contactId');
    
    if (contactIdParam) {
      setContactId(parseInt(contactIdParam, 10));
    }
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
          throw new Error('Failed to load contact data');
        }
        
        const contact = await contactResponse.json();
        
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

  // Get icon for timeline event
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'activity':
        return <Activity className="h-4 w-4" />;
      case 'deal':
        return <DollarSign className="h-4 w-4" />;
      case 'form':
        return <Info className="h-4 w-4" />;
      case 'note':
        return <Mail className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
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
  
  // Component for the visual journey timeline
  const VisualJourneyTimeline: React.FC<{ events: TimelineEvent[] }> = ({ events }) => {
    if (!events || events.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">No timeline events available</div>;
    }
    
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Get the earliest and latest dates
    const earliestDate = new Date(sortedEvents[0].timestamp);
    const latestDate = new Date(sortedEvents[sortedEvents.length - 1].timestamp);
    const totalTimespan = latestDate.getTime() - earliestDate.getTime();
    
    return (
      <div className="relative mt-8 mb-12">
        {/* Timeline line */}
        <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-muted-foreground/20 rounded"></div>
        
        {/* Timeline events */}
        {sortedEvents.map((event, index) => {
          // Calculate position percentage based on time
          const eventTime = new Date(event.timestamp).getTime();
          const timeSinceStart = eventTime - earliestDate.getTime();
          const positionPercentage = Math.min(Math.max((timeSinceStart / totalTimespan) * 100, 5), 95);
          
          // Alternate events on left and right
          const isLeft = index % 2 === 0;
          
          return (
            <div 
              key={event.id} 
              className={`relative mb-16 ${isLeft ? 'pr-1/2 text-right' : 'pl-1/2'}`}
              style={{ marginTop: index === 0 ? '0' : '2rem' }}
            >
              {/* Event marker */}
              <div 
                className={`absolute top-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center z-10`}
                style={{ 
                  left: 'calc(50% - 12px)', 
                  boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.8)'
                }}
              >
                {getEventIcon(event.type)}
              </div>
              
              {/* Event content */}
              <div 
                className={`bg-card border rounded-lg p-4 shadow-md ${isLeft ? 'mr-6' : 'ml-6'}`}
                style={{ 
                  width: 'calc(100% - 3rem)',
                  marginLeft: isLeft ? 'auto' : '3rem',
                  marginRight: isLeft ? '3rem' : 'auto',
                  position: 'relative',
                  zIndex: 1
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <Badge variant={
                      event.type === 'meeting' ? 'default' :
                      event.type === 'deal' ? 'secondary' :
                      event.type === 'form' ? 'outline' :
                      'default'
                    }>
                      {event.type} {event.subtype ? `- ${event.subtype}` : ''}
                    </Badge>
                    <h4 className="text-lg font-semibold mt-1">{event.title}</h4>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(event.timestamp)}
                  </div>
                </div>
                
                {event.description && (
                  <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                )}
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Source:</span> 
                    <Badge variant="outline" className="px-1 py-0 h-auto text-xs">
                      {event.source}
                    </Badge>
                  </div>
                  
                  {event.userName && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">User:</span>
                      <span>{event.userName}</span>
                    </div>
                  )}
                  
                  {event.score !== undefined && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Score:</span>
                      <Badge variant={event.score > 75 ? "default" : 
                                      event.score > 50 ? "secondary" : 
                                      event.score > 25 ? "outline" : 
                                      "destructive"} 
                             className="px-1 py-0 h-auto text-xs">
                        {event.score}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setLocation('/contacts')}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Button>
          <h1 className="text-3xl font-bold">Customer Journey</h1>
        </div>
        
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
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !journeyData) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => setLocation('/contacts')}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Button>
          <h1 className="text-3xl font-bold">Customer Journey</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              {error ? (error as Error).message : 'No journey data available for this contact.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Please try selecting a different contact or adjusting your date range.</p>
            <Button className="mt-4" onClick={() => setLocation('/contacts')}>
              Back to Contacts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare data for charts
  const touchpointData = Object.entries(journeyData.sources).map(([source, count]) => ({
    source,
    count
  })).sort((a, b) => b.count - a.count);

  const callsByStageData = Object.entries(journeyData.callMetrics.callsPerStage).map(([stage, count]) => ({
    stage,
    count
  })).sort((a, b) => b.count - a.count);

  const stageTransitionData = journeyData.journeyMetrics.stageTransitions.map(transition => ({
    stage: `${transition.fromStage} → ${transition.toStage}`,
    days: transition.daysInStage,
    date: new Date(transition.timestamp)
  }));

  const timelineEvents = [...journeyData.timelineEvents].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const contactSource = journeyData.contact.source || 'Unknown';
  const contactStatus = journeyData.contact.status || 'Unknown';
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => setLocation('/contacts')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Contacts
        </Button>
        <h1 className="text-3xl font-bold">Customer Journey</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback>{journeyData.contact.name ? journeyData.contact.name.substring(0, 2).toUpperCase() : 'CN'}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{journeyData.contact.name || 'Unknown'}</h3>
                <p className="text-sm text-muted-foreground">{journeyData.contact.title || journeyData.contact.company || ''}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{journeyData.contact.email || 'No email'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{journeyData.contact.phone || 'No phone'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Source</p>
                  <Badge variant="outline">{contactSource}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={
                    contactStatus === 'Qualified' ? 'default' :
                    contactStatus === 'Disqualified' ? 'destructive' :
                    'outline'
                  }>
                    {contactStatus}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold mb-2">Assigned Users</h4>
              <div className="space-y-3">
                {journeyData.assignedUsers.length > 0 ? (
                  journeyData.assignedUsers.map(user => (
                    <div key={user.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.role}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{user.totalInteractions} interactions</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No assigned users</p>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold mb-2">Journey Metrics</h4>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">First Touch</p>
                    <p className="text-sm">{journeyData.firstTouch ? formatDate(journeyData.firstTouch) : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Touch</p>
                    <p className="text-sm">{journeyData.lastTouch ? formatDate(journeyData.lastTouch) : 'N/A'}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground">Journey Length</p>
                  <p className="text-sm">{journeyData.journeyMetrics.journeyLength ? `${journeyData.journeyMetrics.journeyLength} days` : 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground">Engagement Score</p>
                  <div className="flex items-center gap-2">
                    <Progress value={journeyData.journeyMetrics.engagementScore * 100} className="h-2" />
                    <span className="text-sm">{Math.round(journeyData.journeyMetrics.engagementScore * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Journey Overview</CardTitle>
            <CardDescription>Comprehensive metrics across the entire customer journey</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-5xl font-bold">{journeyData.totalTouchpoints}</p>
                    <p className="text-sm text-muted-foreground mt-2">Total Touchpoints</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-5xl font-bold">{journeyData.callMetrics.totalCalls}</p>
                    <p className="text-sm text-muted-foreground mt-2">Total Calls</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-5xl font-bold">{journeyData.deals.length}</p>
                    <p className="text-sm text-muted-foreground mt-2">Total Deals</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-5xl font-bold">{formatDuration(journeyData.callMetrics.speedToLead)}</p>
                    <p className="text-sm text-muted-foreground mt-2">Speed to Lead</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="calls">Call Metrics</TabsTrigger>
                <TabsTrigger value="sales">Sales Metrics</TabsTrigger>
                <TabsTrigger value="admin">Admin Metrics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="timeline" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-3">Touchpoints by Source</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={touchpointData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="source" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Stage Transitions</h4>
                    <div className="h-64">
                      {stageTransitionData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stageTransitionData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="stage" type="category" width={150} />
                            <Tooltip formatter={(value) => [`${value} days`, 'Time in Stage']} />
                            <Bar dataKey="days" fill="#82ca9d" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-center text-muted-foreground">No stage transitions recorded</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Customer Journey Timeline</CardTitle>
                    <CardDescription>Visual representation of all customer touchpoints and interactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="visual" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="visual">Visual Timeline</TabsTrigger>
                        <TabsTrigger value="list">Chronological List</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="visual" className="mt-4">
                        {timelineEvents.length > 0 ? (
                          <div className="bg-accent/10 rounded-lg p-4 overflow-hidden">
                            <VisualJourneyTimeline events={timelineEvents} />
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No timeline events found for this contact
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="list" className="mt-4">
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="space-y-6">
                            {timelineEvents.length > 0 ? (
                              timelineEvents.map((event) => (
                                <div key={`${event.type}-${event.id}`} className="flex gap-4">
                                  <div className="mt-1">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                                      {getEventIcon(event.type)}
                                    </div>
                                  </div>
                                  <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {event.source}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {formatDate(event.timestamp)}
                                      </span>
                                    </div>
                                    <h4 className="font-medium">{event.title}</h4>
                                    {event.description && (
                                      <p className="text-sm text-muted-foreground">{event.description}</p>
                                    )}
                                    {event.userName && (
                                      <div className="flex items-center gap-2 mt-1">
                                        <Avatar className="h-6 w-6">
                                          <AvatarFallback className="text-xs">{event.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs">{event.userName}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center justify-center h-24">
                                <p className="text-muted-foreground">No timeline events found</p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="calls" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold">{journeyData.callMetrics.solutionCallShowRate > 0 ? 
                          `${Math.round(journeyData.callMetrics.solutionCallShowRate * 100)}%` : 'N/A'}</div>
                        <p className="text-sm text-muted-foreground mt-2">Solution Call Show Rate</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold">{journeyData.callMetrics.triageShowRate > 0 ? 
                          `${Math.round(journeyData.callMetrics.triageShowRate * 100)}%` : 'N/A'}</div>
                        <p className="text-sm text-muted-foreground mt-2">Triage Call Show Rate</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold">{journeyData.callMetrics.pickUpRate > 0 ? 
                          `${Math.round(journeyData.callMetrics.pickUpRate * 100)}%` : 'N/A'}</div>
                        <p className="text-sm text-muted-foreground mt-2">Call Pick-up Rate</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Call Response Times</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm">Speed to Lead</p>
                            <Badge variant={
                              journeyData.callMetrics.speedToLead === null ? 'outline' :
                              journeyData.callMetrics.speedToLead < 15 ? 'default' :
                              journeyData.callMetrics.speedToLead < 60 ? 'secondary' :
                              'destructive'
                            }>
                              {formatDuration(journeyData.callMetrics.speedToLead)}
                            </Badge>
                          </div>
                          <Progress 
                            value={journeyData.callMetrics.speedToLead === null ? 0 : 
                              Math.max(0, 100 - (journeyData.callMetrics.speedToLead / 60 * 100))}
                            className="h-2"
                          />
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm">Lead Response Time</p>
                            <Badge variant={
                              journeyData.callMetrics.leadResponseTime === null ? 'outline' :
                              journeyData.callMetrics.leadResponseTime < 30 ? 'default' :
                              journeyData.callMetrics.leadResponseTime < 120 ? 'secondary' :
                              'destructive'
                            }>
                              {formatDuration(journeyData.callMetrics.leadResponseTime)}
                            </Badge>
                          </div>
                          <Progress 
                            value={journeyData.callMetrics.leadResponseTime === null ? 0 : 
                              Math.max(0, 100 - (journeyData.callMetrics.leadResponseTime / 120 * 100))}
                            className="h-2"
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Dials</p>
                            <p className="text-xl font-semibold">{journeyData.callMetrics.totalDials}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Calls to Close</p>
                            <p className="text-xl font-semibold">{journeyData.callMetrics.callsToClose || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Calls By Stage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        {callsByStageData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={callsByStageData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="stage" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" fill="#82ca9d" />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <p className="text-center text-muted-foreground">No call stage data available</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="sales" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold">{journeyData.salesMetrics.solutionCallCloseRate > 0 ? 
                          `${Math.round(journeyData.salesMetrics.solutionCallCloseRate * 100)}%` : 'N/A'}</div>
                        <p className="text-sm text-muted-foreground mt-2">Solution Call Close Rate</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold">{journeyData.salesMetrics.salesCycleDays || 'N/A'}</div>
                        <p className="text-sm text-muted-foreground mt-2">Sales Cycle (Days)</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold">{journeyData.salesMetrics.closedWon}</div>
                        <p className="text-sm text-muted-foreground mt-2">Deals Closed Won</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Deal Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[250px] pr-4">
                        {journeyData.deals.length > 0 ? (
                          <div className="space-y-4">
                            {journeyData.deals.map((deal, index) => (
                              <div key={index} className="p-4 border rounded-md">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium">{deal.name || `Deal ${index + 1}`}</h4>
                                  <Badge variant={
                                    deal.status === 'won' ? 'default' :
                                    deal.status === 'lost' ? 'destructive' :
                                    'outline'
                                  }>
                                    {deal.status}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-y-2 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Value</p>
                                    <p>{deal.value ? `$${deal.value.toLocaleString()}` : 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Stage</p>
                                    <p>{deal.stage || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Created</p>
                                    <p>{deal.created_at ? formatDate(deal.created_at) : 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Closed</p>
                                    <p>{deal.closed_at ? formatDate(deal.closed_at) : 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                              <p className="text-muted-foreground">No deals found for this contact</p>
                            </div>
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Financial Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Revenue Per Solution Call Booked</p>
                          <p className="text-xl font-semibold">
                            {journeyData.salesMetrics.revenuePerSolutionCallBooked !== null
                              ? `$${journeyData.salesMetrics.revenuePerSolutionCallBooked.toLocaleString(undefined, {maximumFractionDigits: 2})}`
                              : 'N/A'}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground">Cost Per Solution Call</p>
                          <p className="text-xl font-semibold">
                            {journeyData.salesMetrics.costPerSolutionCall !== null
                              ? `$${journeyData.salesMetrics.costPerSolutionCall.toLocaleString(undefined, {maximumFractionDigits: 2})}`
                              : 'N/A'}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground">Profit Per Solution Call</p>
                          <p className="text-xl font-semibold">
                            {journeyData.salesMetrics.profitPerSolutionCall !== null
                              ? `$${journeyData.salesMetrics.profitPerSolutionCall.toLocaleString(undefined, {maximumFractionDigits: 2})}`
                              : 'N/A'}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground">Cost Per Closed Won</p>
                          <p className="text-xl font-semibold">
                            {journeyData.salesMetrics.costPerClosedWon !== null
                              ? `$${journeyData.salesMetrics.costPerClosedWon.toLocaleString(undefined, {maximumFractionDigits: 2})}`
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="admin" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold">{journeyData.adminMetrics.completedAdmin}</div>
                        <p className="text-sm text-muted-foreground mt-2">Completed Admin Tasks</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold">{journeyData.adminMetrics.missingAdmins}</div>
                        <p className="text-sm text-muted-foreground mt-2">Missing Admin Tasks</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold">{
                          journeyData.adminMetrics.adminMissingPercentage > 0 ? 
                            `${Math.round(100 - journeyData.adminMetrics.adminMissingPercentage * 100)}%` : 'N/A'
                        }</div>
                        <p className="text-sm text-muted-foreground mt-2">Admin Completion Rate</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Admin Assignment Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {journeyData.adminMetrics.adminAssignments.length > 0 ? (
                      <div className="space-y-4">
                        {journeyData.adminMetrics.adminAssignments.map(assignment => (
                          <div key={assignment.userId} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{assignment.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <p className="font-medium">{assignment.userName}</p>
                              </div>
                              <Badge variant={
                                assignment.missingPercentage < 0.1 ? 'default' :
                                assignment.missingPercentage < 0.3 ? 'secondary' :
                                'destructive'
                              }>
                                {Math.round((1 - assignment.missingPercentage) * 100)}% Complete
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Total Tasks</p>
                                <p>{assignment.count}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Completed</p>
                                <p className="text-green-600">{assignment.completed}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Missing</p>
                                <p className="text-red-600">{assignment.missing}</p>
                              </div>
                            </div>
                            
                            <Progress
                              value={(1 - assignment.missingPercentage) * 100}
                              className="h-2"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-40">
                        <div className="text-center">
                          <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No admin tasks found for this contact</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Lead Processing Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-3">Response Time Analysis</h4>
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm">First response</p>
                              <Badge variant="outline">
                                {formatDuration(journeyData.journeyMetrics.averageResponseTime)}
                              </Badge>
                            </div>
                            <Progress 
                              value={journeyData.journeyMetrics.averageResponseTime === null ? 0 : 
                                Math.max(0, 100 - (journeyData.journeyMetrics.averageResponseTime / 120 * 100))}
                              className="h-2"
                            />
                          </div>
                          
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm">Last Activity Gap</p>
                              <Badge variant="outline">
                                {journeyData.journeyMetrics.lastActivityGap !== null
                                  ? `${journeyData.journeyMetrics.lastActivityGap} days`
                                  : 'N/A'}
                              </Badge>
                            </div>
                            <Progress 
                              value={journeyData.journeyMetrics.lastActivityGap === null ? 0 : 
                                Math.max(0, 100 - (journeyData.journeyMetrics.lastActivityGap / 14 * 100))}
                              className="h-2"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-3">Lead Metrics</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm">Lead Status</p>
                            <Badge variant={
                              journeyData.journeyMetrics.leadStatus === 'Qualified' ? 'default' :
                              journeyData.journeyMetrics.leadStatus === 'Disqualified' ? 'destructive' :
                              'outline'
                            }>
                              {journeyData.journeyMetrics.leadStatus || 'Unknown'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p className="text-sm">Conversion Rate</p>
                            <Badge variant="outline">
                              {journeyData.journeyMetrics.conversionRate !== null
                                ? `${Math.round(journeyData.journeyMetrics.conversionRate * 100)}%`
                                : 'N/A'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p className="text-sm">Call-1 Show Rate</p>
                            <Badge variant="outline">
                              {journeyData.leadMetrics.totalCallOneShowRate > 0
                                ? `${Math.round(journeyData.leadMetrics.totalCallOneShowRate * 100)}%`
                                : 'N/A'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerJourneyPage;