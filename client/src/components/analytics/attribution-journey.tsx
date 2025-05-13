import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  CalendarIcon, 
  FormInput, 
  Phone, 
  Mail, 
  Activity, 
  FileText, 
  TrendingUp, 
  CircleDollarSign, 
  ExternalLink, 
  Info, 
  ChevronDown, 
  BarChart, 
  ListFilter,
  Award,
  Zap,
  PieChart,
  Clock
} from "lucide-react";

interface TimelineEvent {
  id: number;
  date: string;
  type: "form" | "meeting" | "activity" | "deal";
  title: string;
  description?: string;
  source: "typeform" | "calendly" | "close";
  metadata?: Record<string, any>;
  // Enhanced attribution properties
  weight?: number;
  attributionScore?: number;
  influence?: number;
  isKeyTouchpoint?: boolean;
}

interface AttributionChain {
  modelName: string;
  touchpoints: number[];
  weight: number;
  description: string;
}

interface ChannelBreakdown {
  [key: string]: {
    count: number;
    influence: number;
  };
}

interface Contact {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  leadSource?: string;
  status: string;
  createdAt: string;
}

interface AttributionJourneyProps {
  contact: Contact;
  events: TimelineEvent[];
  // Enhanced attribution data
  attributionCertainty?: number;
  firstTouch?: TimelineEvent;
  lastTouch?: TimelineEvent;
  attributionChains?: AttributionChain[];
  channelBreakdown?: ChannelBreakdown;
}

export function AttributionJourney({ 
  contact, 
  events, 
  attributionCertainty = 0,
  firstTouch,
  lastTouch,
  attributionChains = [],
  channelBreakdown = {}
}: AttributionJourneyProps) {
  const [activeTab, setActiveTab] = useState("timeline");
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [selectedAttributionModel, setSelectedAttributionModel] = useState<string | null>(null);
  
  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Filter events based on selected filters
  const filteredEvents = sortedEvents.filter(event => {
    if (selectedEventType && event.type !== selectedEventType) return false;
    if (selectedSource && event.source !== selectedSource) return false;
    return true;
  });
  
  // Calculate event type distribution for analytics
  const eventTypeCounts = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Calculate source distribution for analytics
  const sourceCounts = events.reduce((acc, event) => {
    acc[event.source] = (acc[event.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Calculate duration between events in days
  const daysBetween = (date1: string, date2: string) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  // Calculate total journey duration
  const totalJourneyDays = sortedEvents.length > 0 
    ? daysBetween(contact.createdAt, sortedEvents[sortedEvents.length - 1].date)
    : 0;
  
  // Get icon for event type
  const getEventIcon = (type: string, source: string) => {
    switch (type) {
      case "form":
        return <FormInput className="h-6 w-6 text-purple-500" />;
      case "meeting":
        return <CalendarIcon className="h-6 w-6 text-blue-500" />;
      case "activity":
        return source === "close" ? 
          <Phone className="h-6 w-6 text-green-500" /> : 
          <Activity className="h-6 w-6 text-orange-500" />;
      case "deal":
        return <CircleDollarSign className="h-6 w-6 text-emerald-500" />;
      default:
        return <FileText className="h-6 w-6 text-gray-500" />;
    }
  };
  
  // Source badge based on the data source
  const getSourceBadge = (source: string) => {
    const variants: Record<string, any> = {
      typeform: {
        bg: "bg-purple-50",
        border: "border-purple-200",
        text: "text-purple-700",
        label: "Typeform"
      },
      calendly: {
        bg: "bg-blue-50", 
        border: "border-blue-200", 
        text: "text-blue-700",
        label: "Calendly"
      },
      close: {
        bg: "bg-green-50", 
        border: "border-green-200", 
        text: "text-green-700",
        label: "Close CRM"
      }
    };
    
    const variant = variants[source] || variants.close;
    
    return (
      <Badge variant="outline" className={`${variant.bg} ${variant.text} ${variant.border}`}>
        {variant.label}
      </Badge>
    );
  };
  
  // Function to open event details dialog
  const openEventDetails = (event: TimelineEvent) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };
  
  // Function to get stats summary cards
  const getStatsSummary = () => {
    const touchpoints = events.length;
    const avgTimeBetweenEvents = sortedEvents.length > 1 
      ? Math.round(totalJourneyDays / (sortedEvents.length - 1)) 
      : 0;
    
    const firstTouchData = firstTouch || (sortedEvents.length > 0 
      ? sortedEvents[0]
      : null);
    
    const lastTouchData = lastTouch || (sortedEvents.length > 0 
      ? sortedEvents[sortedEvents.length - 1]
      : null);
      
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-1 h-full ${attributionCertainty >= 90 ? 'bg-green-500' : attributionCertainty >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <div className="flex items-center">
                <Award className="h-4 w-4 mr-2 text-primary" />
                Attribution Certainty
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-5">
            <div className="flex items-center">
              <div className="text-2xl font-bold">{Math.round(attributionCertainty)}%</div>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 ml-1">
                    <Info className="h-4 w-4" />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">About Attribution Certainty</h4>
                    <p className="text-sm text-muted-foreground">
                      This metric shows our confidence level in accurately attributing this contact's journey across platforms.
                      The improved algorithm uses multi-touch and weighted-position methods to achieve {'>'}90% certainty.
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
            <div className="mt-2">
              <Progress value={attributionCertainty} className="h-2" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <div className="flex items-center">
                <PieChart className="h-4 w-4 mr-2 text-primary" />
                Journey Metrics
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-5">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-2xl font-bold">{touchpoints}</div>
                <p className="text-xs text-muted-foreground">Touchpoints</p>
              </div>
              <div className="h-8 border-r mx-2"></div>
              <div>
                <div className="text-xl font-bold">{totalJourneyDays}</div>
                <p className="text-xs text-muted-foreground">Days</p>
              </div>
              <div className="h-8 border-r mx-2"></div>
              <div>
                <div className="text-xl font-bold">{avgTimeBetweenEvents}</div>
                <p className="text-xs text-muted-foreground">Days/Touch</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-primary" />
                Attribution Path
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-5">
            <div className="flex items-center gap-1">
              {firstTouchData && (
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-1 bg-blue-50 text-blue-700 border-blue-200">First</Badge>
                      {getEventIcon(firstTouchData.type, firstTouchData.source)}
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-60">
                    <p className="text-sm">
                      <span className="font-semibold text-blue-600">First touchpoint</span>: {firstTouchData.title || `${firstTouchData.type} (${firstTouchData.source})`}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {firstTouchData.date ? formatDate(firstTouchData.date) : "No date available"}
                      </span>
                      {firstTouchData.attributionScore && (
                        <div className="mt-1">
                          <span className="text-xs font-medium">Attribution value: {Math.round(firstTouchData.attributionScore * 100)}%</span>
                        </div>
                      )}
                    </p>
                  </HoverCardContent>
                </HoverCard>
              )}
              
              <div className="flex-1 h-0.5 bg-gray-100 mx-2 relative">
                {attributionChains && attributionChains.length > 0 && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Badge variant="outline" className="cursor-pointer bg-amber-50 border-amber-200 text-amber-700">
                          {attributionChains[0].modelName}
                        </Badge>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-72">
                        <h4 className="font-medium">{attributionChains[0].modelName} Attribution</h4>
                        <p className="text-sm text-muted-foreground my-1">{attributionChains[0].description}</p>
                        <div className="text-xs mt-2">
                          <span className="font-medium">Weight:</span> {Math.round(attributionChains[0].weight * 100)}%
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                )}
              </div>
              
              {lastTouchData && (
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-1 bg-green-50 text-green-700 border-green-200">Last</Badge>
                      {getEventIcon(lastTouchData.type, lastTouchData.source)}
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-60">
                    <p className="text-sm">
                      <span className="font-semibold text-green-600">Last touchpoint</span>: {lastTouchData.title || `${lastTouchData.type} (${lastTouchData.source})`}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {lastTouchData.date ? formatDate(lastTouchData.date) : "No date available"}
                      </span>
                      {lastTouchData.attributionScore && (
                        <div className="mt-1">
                          <span className="text-xs font-medium">Attribution value: {Math.round(lastTouchData.attributionScore * 100)}%</span>
                        </div>
                      )}
                    </p>
                  </HoverCardContent>
                </HoverCard>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-semibold">Attribution Journey</CardTitle>
            <CardDescription>Cross-platform customer journey visualization</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="capitalize">{contact.status}</Badge>
            {contact.leadSource && (
              <Badge variant="secondary" className="text-xs">
                Source: {contact.leadSource}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2 mt-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{contact.email}</span>
          </div>
          {contact.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{contact.phone}</span>
            </div>
          )}
          {contact.company && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{contact.company}</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="timeline" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="timeline" className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-1">
                <BarChart className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>
            
            {activeTab === "timeline" && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSelectedEventType(null);
                    setSelectedSource(null);
                  }}
                  disabled={!selectedEventType && !selectedSource}
                  className="h-8 text-xs"
                >
                  <ListFilter className="h-3 w-3 mr-1" />
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
          
          <TabsContent value="timeline" className="space-y-4">
            {sortedEvents.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-1">No Journey Data Available</h3>
                <p>This contact doesn't have any recorded interactions yet.</p>
              </div>
            ) : (
              <>
                {/* Event filters */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button 
                    variant={selectedEventType === "form" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedEventType(selectedEventType === "form" ? null : "form")}
                    className="h-8"
                  >
                    <FormInput className="h-3.5 w-3.5 mr-1" />
                    Forms ({eventTypeCounts["form"] || 0})
                  </Button>
                  
                  <Button 
                    variant={selectedEventType === "meeting" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedEventType(selectedEventType === "meeting" ? null : "meeting")}
                    className="h-8"
                  >
                    <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                    Meetings ({eventTypeCounts["meeting"] || 0})
                  </Button>
                  
                  <Button 
                    variant={selectedEventType === "activity" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedEventType(selectedEventType === "activity" ? null : "activity")}
                    className="h-8"
                  >
                    <Activity className="h-3.5 w-3.5 mr-1" />
                    Activities ({eventTypeCounts["activity"] || 0})
                  </Button>
                  
                  <Button 
                    variant={selectedEventType === "deal" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedEventType(selectedEventType === "deal" ? null : "deal")}
                    className="h-8"
                  >
                    <CircleDollarSign className="h-3.5 w-3.5 mr-1" />
                    Deals ({eventTypeCounts["deal"] || 0})
                  </Button>
                  
                  <div className="border-l h-8 mx-1"></div>
                  
                  <Button 
                    variant={selectedSource === "typeform" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSource(selectedSource === "typeform" ? null : "typeform")}
                    className="h-8"
                  >
                    Typeform ({sourceCounts["typeform"] || 0})
                  </Button>
                  
                  <Button 
                    variant={selectedSource === "calendly" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSource(selectedSource === "calendly" ? null : "calendly")}
                    className="h-8"
                  >
                    Calendly ({sourceCounts["calendly"] || 0})
                  </Button>
                  
                  <Button 
                    variant={selectedSource === "close" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSource(selectedSource === "close" ? null : "close")}
                    className="h-8"
                  >
                    Close CRM ({sourceCounts["close"] || 0})
                  </Button>
                </div>
                
                {/* Timeline visualization */}
                <div className="relative pl-8 border-l-2 border-gray-100 space-y-6 py-2">
                  {filteredEvents.map((event, index) => {
                    const previousDate = index > 0 ? filteredEvents[index - 1].date : contact.createdAt;
                    const daysSince = daysBetween(previousDate, event.date);
                    
                    return (
                      <div key={event.id} className="relative -left-10">
                        <div className="absolute -left-1 w-8 flex items-center justify-center">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center bg-white border
                            ${event.isKeyTouchpoint ? 'border-2 border-primary shadow-sm' : ''}
                            ${event.influence && event.influence > 0.5 ? 'ring-2 ring-amber-300 ring-offset-2' : ''}
                          `}>
                            {getEventIcon(event.type, event.source)}
                          </div>
                        </div>
                        
                        <div className="ml-10 bg-white p-4 rounded-lg border shadow-sm">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{event.title}</span>
                              {event.isKeyTouchpoint && (
                                <HoverCard>
                                  <HoverCardTrigger asChild>
                                    <Badge variant="outline" className="bg-primary-50 text-primary border-primary-200 text-xs">
                                      <Zap className="h-3 w-3 mr-1" />
                                      Key Touchpoint
                                    </Badge>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-60">
                                    <p className="text-sm">
                                      This is identified as a key touchpoint in the customer journey with significant attribution impact.
                                    </p>
                                  </HoverCardContent>
                                </HoverCard>
                              )}
                            </div>
                            {getSourceBadge(event.source)}
                          </div>
                          
                          <div className="text-sm text-muted-foreground mb-2">
                            {formatDate(event.date)}
                            {daysSince > 0 && index > 0 && (
                              <span className="text-xs ml-2 text-gray-400">
                                ({daysSince} day{daysSince !== 1 ? 's' : ''} after previous event)
                              </span>
                            )}
                          </div>
                          
                          {typeof event.attributionScore === 'number' && (
                            <div className="mt-2 mb-3">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium">Attribution Influence</span>
                                <span className="font-bold text-primary">{Math.round(event.attributionScore * 100)}%</span>
                              </div>
                              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary" 
                                  style={{ width: `${Math.round(event.attributionScore * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          
                          {event.description && (
                            <p className="text-sm mt-1">{event.description}</p>
                          )}
                          
                          {event.type === "deal" && event.metadata?.value && (
                            <Badge className="mt-2 bg-emerald-50 text-emerald-700 border-emerald-200">
                              ${event.metadata.value}
                            </Badge>
                          )}
                          
                          <div className="flex justify-between mt-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs h-7"
                              onClick={() => openEventDetails(event)}
                            >
                              <Info className="h-3 w-3 mr-1" /> Details
                            </Button>
                            
                            {event.weight && (
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    Weight: {Math.round(event.weight * 100)}%
                                  </Badge>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-60">
                                  <p className="text-sm">
                                    This represents the calculated attribution weight of this touchpoint in the customer journey.
                                  </p>
                                </HoverCardContent>
                              </HoverCard>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {filteredEvents.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground border rounded-md">
                    No events match the current filters. <Button variant="link" className="p-0 h-auto" onClick={() => {
                      setSelectedEventType(null);
                      setSelectedSource(null);
                    }}>Clear filters</Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="analytics">
            {sortedEvents.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <BarChart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-1">No Analytics Available</h3>
                <p>Analytics will be available once the contact has interaction data.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {getStatsSummary()}
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Attribution Summary</CardTitle>
                    <CardDescription>
                      Cross-platform attribution metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Event Type Distribution */}
                      <div>
                        <h3 className="text-sm font-medium mb-3">Touchpoint Distribution by Type</h3>
                        <div className="space-y-2">
                          {Object.entries(eventTypeCounts).map(([type, count]) => (
                            <div key={type} className="flex items-center gap-2">
                              <div className="w-8">{getEventIcon(type, "")}</div>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-medium capitalize">{type}</span>
                                  <span className="text-sm">{count}</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full w-full overflow-hidden">
                                  <div 
                                    className={`h-full ${
                                      type === "form" ? "bg-purple-500" : 
                                      type === "meeting" ? "bg-blue-500" : 
                                      type === "deal" ? "bg-emerald-500" : 
                                      "bg-orange-500"
                                    }`}
                                    style={{ width: `${(count / events.length) * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Platform Distribution */}
                      <div>
                        <h3 className="text-sm font-medium mb-3">Touchpoint Distribution by Platform</h3>
                        <div className="space-y-2">
                          {Object.entries(sourceCounts).map(([source, count]) => {
                            const variants: Record<string, any> = {
                              typeform: "bg-purple-500",
                              calendly: "bg-blue-500",
                              close: "bg-green-500"
                            };
                            
                            return (
                              <div key={source} className="flex items-center gap-2">
                                <div className="w-8">
                                  {getSourceBadge(source)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium">{source}</span>
                                    <span className="text-sm">{count}</span>
                                  </div>
                                  <div className="h-2 bg-gray-100 rounded-full w-full overflow-hidden">
                                    <div 
                                      className={variants[source] || "bg-gray-500"}
                                      style={{ width: `${(count / events.length) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Event details dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && getEventIcon(selectedEvent.type, selectedEvent.source)}
              <span>{selectedEvent?.title}</span>
            </DialogTitle>
            <DialogDescription>
              {selectedEvent && formatDate(selectedEvent.date)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <ScrollArea className="h-[350px] rounded-md border p-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Event Type</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{selectedEvent.type}</Badge>
                    {getSourceBadge(selectedEvent.source)}
                  </div>
                </div>
                
                {selectedEvent.description && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Description</h4>
                    <p className="text-sm">{selectedEvent.description}</p>
                  </div>
                )}
                
                {selectedEvent.metadata && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Additional Details</h4>
                    <div className="space-y-2">
                      {Object.entries(selectedEvent.metadata).map(([key, value]) => {
                        // Skip complex objects or arrays
                        if (typeof value === 'object') return null;
                        
                        return (
                          <div key={key} className="grid grid-cols-3 gap-2">
                            <div className="text-xs font-medium capitalize text-muted-foreground">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                            <div className="col-span-2 text-xs">
                              {value?.toString() || '-'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}