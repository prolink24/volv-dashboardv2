import React, { useState, useEffect } from 'react';
import { 
  Calendar, Activity, DollarSign, FileText, MessageSquare, Clock, 
  Phone, Mail, ExternalLink, AlertCircle, CheckCircle, Filter, 
  Star, StarOff, ChevronDown, ChevronUp, Info, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

interface TimelineEvent {
  id: number;
  type: 'meeting' | 'meeting_booked' | 'activity' | 'deal' | 'form_submission' | 'form' | 'note';
  subtype?: string;
  title: string;
  description?: string;
  timestamp: Date;
  date?: Date;
  source: string;
  sourceId?: string;
  data: any;
  userId?: number;
  userName?: string;
  scheduledBy?: string;
  score?: number;
  bookedAt?: string | Date;
  callSequence?: string;
}

interface VisualJourneyTimelineProps {
  events: TimelineEvent[];
}

// Helper functions for formatting and visual elements
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(new Date(date));
};

const formatRelativeTime = (timestamp: Date) => {
  const now = new Date();
  const diff = now.getTime() - new Date(timestamp).getTime();
  
  // Convert diff to appropriate unit
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
};

const getEventIcon = (type: string, subtype?: string) => {
  switch (type) {
    case 'meeting':
      return <Calendar className="h-4 w-4" />;
    case 'meeting_booked':
      return <Clock className="h-4 w-4 text-blue-500" />;
    case 'activity':
      if (subtype === 'email') return <Mail className="h-4 w-4" />;
      if (subtype === 'call') return <Phone className="h-4 w-4" />;
      return <Activity className="h-4 w-4" />;
    case 'deal':
      return <DollarSign className="h-4 w-4" />;
    case 'note':
      return <FileText className="h-4 w-4" />;
    case 'form_submission':
      return <FileText className="h-4 w-4 text-purple-500 animate-pulse" />;
    case 'form':
      return <MessageSquare className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

const getSourceColor = (source: string) => {
  switch (source.toLowerCase()) {
    case 'close':
    case 'close crm':
      return 'bg-blue-500';
    case 'calendly':
      return 'bg-green-500';
    case 'typeform':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
};

const getSourceBgColor = (source: string) => {
  switch (source.toLowerCase()) {
    case 'close':
    case 'close crm':
      return 'bg-blue-100 dark:bg-blue-900/20';
    case 'calendly':
      return 'bg-green-100 dark:bg-green-900/20';
    case 'typeform':
      return 'bg-purple-100 dark:bg-purple-900/20';
    default:
      return 'bg-gray-100 dark:bg-gray-900/20';
  }
};

const getEventTypeLabel = (type: string, subtype?: string) => {
  if (subtype) {
    return `${type} - ${subtype}`;
  }
  return type;
};

const getImpactScore = (event: TimelineEvent) => {
  // Determine impact based on type, source and any score data
  const baseScore = event.score || 0;
  
  // Add weight based on event type
  let typeScore = 0;
  if (event.type === 'meeting') typeScore = 8;
  else if (event.type === 'deal') typeScore = 10;
  else if (event.type === 'form_submission') typeScore = 7;
  else if (event.type === 'form') typeScore = 6;
  else if (event.type === 'activity') {
    if (event.subtype === 'call') typeScore = 7;
    else if (event.subtype === 'email') typeScore = 5;
    else typeScore = 4;
  }
  
  // Calculate total score (0-10 scale)
  const combinedScore = (baseScore + typeScore) / 2;
  return Math.min(10, Math.max(1, Math.round(combinedScore)));
};

export function VisualJourneyTimeline({ events }: VisualJourneyTimelineProps) {
  const [sourceFilters, setSourceFilters] = useState<Record<string, boolean>>({
    close: true,
    calendly: true,
    typeform: true
  });
  
  const [typeFilters, setTypeFilters] = useState<Record<string, boolean>>({
    meeting: true,
    meeting_booked: true,
    activity: true,
    deal: true,
    form: true,
    form_submission: true,
    note: true
  });
  
  const [expandedEvents, setExpandedEvents] = useState<Record<number, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [highlightMilestones, setHighlightMilestones] = useState(true);
  const [timeDirection, setTimeDirection] = useState<'asc' | 'desc'>('asc');

  // Initialize all sources from events
  useEffect(() => {
    const sources = new Set<string>();
    events.forEach(event => {
      sources.add(event.source.toLowerCase());
    });
    
    const initialSourceFilters: Record<string, boolean> = {};
    sources.forEach(source => {
      initialSourceFilters[source] = true;
    });
    
    setSourceFilters(prev => ({...prev, ...initialSourceFilters}));
  }, [events]);

  // Identify milestones (important events in the journey)
  const getMilestones = () => {
    const milestones: Record<number, boolean> = {};
    
    // First touch
    const firstEvent = [...events].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )[0];
    if (firstEvent) milestones[firstEvent.id] = true;
    
    // All deals (they're always milestones)
    events.forEach(event => {
      if (event.type === 'deal') {
        milestones[event.id] = true;
      }
    });
    
    // First meeting
    const firstMeeting = events
      .filter(e => e.type === 'meeting')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];
    if (firstMeeting) milestones[firstMeeting.id] = true;
    
    // High impact events (score >= 8)
    events.forEach(event => {
      if (getImpactScore(event) >= 8) {
        milestones[event.id] = true;
      }
    });
    
    return milestones;
  };
  
  const milestones = getMilestones();

  // Toggle expanded state for a specific event
  const toggleEventExpanded = (eventId: number) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  // Filter the events based on current filter settings
  const filteredEvents = events.filter(event => {
    const sourceMatches = sourceFilters[event.source.toLowerCase()];
    const typeMatches = typeFilters[event.type];
    return sourceMatches && typeMatches;
  });
  
  // Sort events by timestamp
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeDirection === 'asc' ? timeA - timeB : timeB - timeA;
  });
  
  // Group events by date (day)
  const eventsByDate = sortedEvents.reduce((acc, event) => {
    const date = new Date(event.timestamp).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);
  
  // Convert to array and sort by date
  const groupedDates = Object.keys(eventsByDate).sort((a, b) => {
    const dateA = new Date(a).getTime();
    const dateB = new Date(b).getTime();
    return timeDirection === 'asc' ? dateA - dateB : dateB - dateA;
  });
  
  // Extract all unique sources from events
  const uniqueSources = Array.from(new Set(events.map(e => e.source.toLowerCase())));
  
  return (
    <div className="space-y-4">
      {/* Controls and filters */}
      <div className="mb-4 flex flex-col md:flex-row gap-4 justify-between items-start">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setTimeDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
          >
            {timeDirection === 'asc' ? (
              <>
                <Clock className="h-4 w-4 mr-1" />
                <span>Oldest First</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-1" />
                <span>Newest First</span>
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setHighlightMilestones(prev => !prev)}
          >
            {highlightMilestones ? (
              <>
                <StarOff className="h-4 w-4 mr-1" />
                <span>Hide Milestones</span>
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-1" />
                <span>Show Milestones</span>
              </>
            )}
          </Button>
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              Filter Timeline
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Filter by Source</h4>
                <div className="grid grid-cols-2 gap-2">
                  {uniqueSources.map(source => (
                    <div key={source} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`source-${source}`}
                        checked={sourceFilters[source]}
                        onCheckedChange={(checked) => {
                          setSourceFilters(prev => ({
                            ...prev,
                            [source]: !!checked
                          }))
                        }}
                      />
                      <label
                        htmlFor={`source-${source}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                      >
                        {source}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Filter by Event Type</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(typeFilters).map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`type-${type}`}
                        checked={typeFilters[type]}
                        onCheckedChange={(checked) => {
                          setTypeFilters(prev => ({
                            ...prev,
                            [type]: !!checked
                          }))
                        }}
                      />
                      <label
                        htmlFor={`type-${type}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                      >
                        {type.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Timeline summary */}
      <div className="bg-muted/30 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Events</p>
            <p className="text-2xl font-bold">{events.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Time Span</p>
            <p className="text-2xl font-bold">
              {events.length > 0 ? 
                (() => {
                  const timestamps = events.map(e => new Date(e.timestamp).getTime());
                  const maxDate = new Date(Math.max(...timestamps));
                  const minDate = new Date(Math.min(...timestamps));
                  const diffTime = maxDate.getTime() - minDate.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return `${diffDays} days`;
                })() : 
                '0 days'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Sources</p>
            <p className="text-2xl font-bold">{uniqueSources.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Milestones</p>
            <p className="text-2xl font-bold">{Object.keys(milestones).length}</p>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Source Breakdown</span>
            <span className="text-muted-foreground">{events.length} events</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
            {uniqueSources.map((source, index) => {
              const count = events.filter(e => e.source.toLowerCase() === source).length;
              const percentage = (count / events.length) * 100;
              
              let bgColor = 'bg-gray-500';
              if (source === 'close') bgColor = 'bg-blue-500';
              if (source === 'calendly') bgColor = 'bg-green-500';
              if (source === 'typeform') bgColor = 'bg-purple-500';
              
              return (
                <div 
                  key={source} 
                  className={`h-full ${bgColor}`} 
                  style={{ width: `${percentage}%` }}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {uniqueSources.map((source) => {
              const count = events.filter(e => e.source.toLowerCase() === source).length;
              const percentage = Math.round((count / events.length) * 100);
              
              let bgColor = 'bg-gray-200 dark:bg-gray-700';
              let textColor = 'text-gray-700 dark:text-gray-300';
              if (source === 'close') {
                bgColor = 'bg-blue-100 dark:bg-blue-950/50';
                textColor = 'text-blue-700 dark:text-blue-300';
              }
              if (source === 'calendly') {
                bgColor = 'bg-green-100 dark:bg-green-950/50';
                textColor = 'text-green-700 dark:text-green-300';
              }
              if (source === 'typeform') {
                bgColor = 'bg-purple-100 dark:bg-purple-950/50';
                textColor = 'text-purple-700 dark:text-purple-300';
              }
              
              return (
                <div 
                  key={source}
                  className={`text-xs px-2 py-1 rounded-full ${bgColor} ${textColor} capitalize flex items-center gap-1`}
                >
                  <span>{source}</span>
                  <span className="font-medium">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {filteredEvents.length === 0 ? (
        <div className="bg-muted/30 p-8 rounded-lg text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-1">No Events Found</h3>
          <p className="text-muted-foreground mb-4">
            There are no events matching your current filter criteria.
          </p>
          <Button 
            variant="outline" 
            onClick={() => {
              setSourceFilters(Object.fromEntries(uniqueSources.map(s => [s, true])));
              setTypeFilters({
                meeting: true,
                meeting_booked: true,
                activity: true,
                deal: true,
                form: true,
                form_submission: true,
                note: true
              });
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="relative">
          {/* Main timeline track */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
          
          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="space-y-12 pr-4">
              {groupedDates.map((date, groupIndex) => (
                <div key={date} className="relative">
                  {/* Date marker */}
                  <div className="flex items-center mb-6">
                    <div className="absolute left-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center z-10">
                      <Calendar className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <h3 className="text-md font-medium ml-14">
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h3>
                  </div>
                  
                  {/* Events for this date */}
                  <div className="space-y-6 ml-14">
                    {eventsByDate[date].map((event, eventIndex) => {
                      const isExpanded = expandedEvents[event.id] || false;
                      const isMilestone = milestones[event.id] || false;
                      const impactScore = getImpactScore(event);
                      
                      return (
                        <Card 
                          key={`${event.id}-${eventIndex}`} 
                          className={`p-0 shadow-sm border-l-4 transition-all duration-150 
                            ${isMilestone && highlightMilestones ? 'ring-2 ring-amber-300 dark:ring-amber-700' : ''}`}
                          style={{ borderLeftColor: event.source.toLowerCase() === 'close' ? '#3498db' : 
                                                  event.source.toLowerCase() === 'calendly' ? '#2ecc71' : 
                                                  event.source.toLowerCase() === 'typeform' ? '#9b59b6' : '#95a5a6' }}
                        >
                          <CardContent className="p-0">
                            {/* Event header */}
                            <div 
                              className={`flex justify-between items-start p-4 cursor-pointer ${getSourceBgColor(event.source)}`}
                              onClick={() => toggleEventExpanded(event.id)}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`rounded-full p-2 ${getSourceColor(event.source)} text-white`}>
                                  {getEventIcon(event.type, event.subtype)}
                                </div>
                                
                                <div>
                                  <div className="font-medium flex items-center gap-2 flex-wrap">
                                    {event.title}
                                    
                                    {/* Call Sequence Badge */}
                                    {event.callSequence && (
                                      <Badge variant="outline" className={
                                        event.callSequence === 'NC1' 
                                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800'
                                          : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                                      }>
                                        {event.callSequence}
                                      </Badge>
                                    )}
                                    
                                    {isMilestone && highlightMilestones && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Star className="h-4 w-4 text-amber-500" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Milestone Event</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                    
                                    {event.type === 'form_submission' && (
                                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                                        Form Submission
                                      </Badge>
                                    )}
                                    
                                    {event.type === 'meeting_booked' && (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                        Booking
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="text-sm text-muted-foreground flex flex-col gap-1 mt-1">
                                    {/* Meeting/Call time */}
                                    <div className="flex items-center gap-2">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDate(event.timestamp)}
                                      </span>
                                      <span className="inline-block text-xs px-1.5 py-0.5 rounded bg-muted">
                                        {formatRelativeTime(event.timestamp)}
                                      </span>
                                    </div>
                                    
                                    {/* Booking time (for meeting_booked type) */}
                                    {event.type === 'meeting_booked' && (
                                      <div className="flex items-center gap-2 text-xs text-blue-600">
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          Booked at: {formatDate(event.timestamp)}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {/* For meetings, show when they were booked if available */}
                                    {event.type === 'meeting' && event.bookedAt && (
                                      <div className="flex items-center gap-2 text-xs text-blue-600">
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          Originally booked: {formatDate(new Date(event.bookedAt))}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {/* Source and assigned to */}
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {event.source}
                                      </Badge>
                                      {event.userName && (
                                        <span className="text-xs flex items-center gap-1">
                                          <Avatar className="h-4 w-4 mr-1">
                                            <AvatarFallback className="text-[10px]">
                                              {event.userName.split(' ').map(n => n[0]).join('')}
                                            </AvatarFallback>
                                          </Avatar>
                                          {event.userName}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col items-end gap-2">
                                  <div className="flex items-center">
                                    <span 
                                      className={`inline-block h-2 w-2 rounded-full mr-1.5 ${
                                        impactScore >= 8 ? 'bg-green-500' : 
                                        impactScore >= 5 ? 'bg-yellow-500' : 
                                        'bg-gray-400'
                                      }`}
                                    />
                                    <span className="text-xs text-muted-foreground mr-1">Impact</span>
                                    <span className="text-xs font-medium">
                                      {impactScore}/10
                                    </span>
                                  </div>
                                  
                                  <Progress value={impactScore * 10} className="h-1 w-16" />
                                </div>
                                
                                <div>
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Expanded event details */}
                            {isExpanded && (
                              <div className="p-4 border-t space-y-3">
                                {/* Event type and date */}
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground capitalize">
                                    {getEventTypeLabel(event.type, event.subtype)}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {formatDate(event.timestamp)}
                                  </span>
                                </div>
                                
                                {/* Description */}
                                {event.description && (
                                  <div className="text-sm">
                                    <p>{event.description}</p>
                                  </div>
                                )}
                                
                                {/* Meeting details */}
                                {event.type === 'meeting' && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-muted-foreground">Status:</span>
                                      <Badge variant={
                                        event.data?.status === 'completed' ? 'success' :
                                        event.data?.status === 'canceled' ? 'destructive' :
                                        'default'
                                      }>
                                        {event.data?.status || 'Scheduled'}
                                      </Badge>
                                    </div>
                                    
                                    {event.data?.conferenceUrl && (
                                      <div className="flex items-center text-sm">
                                        <span className="text-muted-foreground mr-2">Conference:</span>
                                        <Button 
                                          variant="link" 
                                          size="sm" 
                                          className="h-auto p-0 text-sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(event.data.conferenceUrl, '_blank');
                                          }}
                                        >
                                          Join Meeting <ExternalLink className="h-3 w-3 ml-1" />
                                        </Button>
                                      </div>
                                    )}
                                    
                                    {event.scheduledBy && (
                                      <div className="flex items-center text-sm">
                                        <span className="text-muted-foreground mr-2">Scheduled by:</span>
                                        <span>{event.scheduledBy}</span>
                                      </div>
                                    )}
                                    
                                    {event.data?.inviteeName && (
                                      <div className="flex items-center text-sm">
                                        <span className="text-muted-foreground mr-2">Invitee:</span>
                                        <span>{event.data.inviteeName}</span>
                                      </div>
                                    )}
                                    
                                    {event.callSequence && (
                                      <div className="flex items-center text-sm">
                                        <span className="text-muted-foreground mr-2">Call Sequence:</span>
                                        <Badge variant="outline" className={
                                          event.callSequence === 'NC1' 
                                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800'
                                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                                        }>
                                          {event.callSequence}
                                        </Badge>
                                      </div>
                                    )}
                                    
                                    {event.bookedAt && (
                                      <div className="flex items-center text-sm">
                                        <span className="text-muted-foreground mr-2">Booked at:</span>
                                        <span>{formatDate(new Date(event.bookedAt))}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Deal details */}
                                {event.type === 'deal' && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-muted-foreground">Status:</span>
                                      <Badge variant={
                                        event.data?.status === 'won' ? 'success' :
                                        event.data?.status === 'lost' ? 'destructive' :
                                        'default'
                                      }>
                                        {event.data?.status || 'Open'}
                                      </Badge>
                                    </div>
                                    
                                    {event.data?.stage && (
                                      <div className="flex items-center text-sm">
                                        <span className="text-muted-foreground mr-2">Stage:</span>
                                        <span>{event.data.stage}</span>
                                      </div>
                                    )}
                                    
                                    {event.data?.value && (
                                      <div className="flex items-center text-sm">
                                        <span className="text-muted-foreground mr-2">Value:</span>
                                        <span className="font-medium">${parseFloat(event.data.value).toLocaleString()}</span>
                                      </div>
                                    )}
                                    
                                    {event.data?.closeDate && (
                                      <div className="flex items-center text-sm">
                                        <span className="text-muted-foreground mr-2">Close Date:</span>
                                        <span>{new Date(event.data.closeDate).toLocaleDateString()}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Form details */}
                                {(event.type === 'form' || event.type === 'form_submission') && (
                                  <div className="space-y-2">
                                    {event.data?.formName && (
                                      <div className="flex items-center text-sm">
                                        <span className="text-muted-foreground mr-2">Form:</span>
                                        <span>{event.data.formName}</span>
                                      </div>
                                    )}
                                    
                                    {event.data?.completionPercentage && (
                                      <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Completion:</span>
                                          <span>{event.data.completionPercentage}%</span>
                                        </div>
                                        <Progress value={event.data.completionPercentage} className="h-1" />
                                      </div>
                                    )}
                                    
                                    {event.data?.completionTime && (
                                      <div className="flex items-center text-sm">
                                        <span className="text-muted-foreground mr-2">Time to complete:</span>
                                        <span>{Math.floor(event.data.completionTime / 60)}m {event.data.completionTime % 60}s</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Activity details */}
                                {event.type === 'activity' && (
                                  <div className="space-y-2">
                                    {event.data?.status && (
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className="text-muted-foreground">Status:</span>
                                        <Badge variant={
                                          event.data.status === 'completed' ? 'success' :
                                          event.data.status === 'canceled' ? 'destructive' :
                                          'default'
                                        }>
                                          {event.data.status}
                                        </Badge>
                                      </div>
                                    )}
                                    
                                    {event.data?.notes && (
                                      <div className="text-sm">
                                        <div className="text-muted-foreground mb-1">Notes:</div>
                                        <p className="whitespace-pre-line">{event.data.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Source ID */}
                                <div className="text-xs text-muted-foreground pt-1 border-t">
                                  <span>Source ID: {event.sourceId || 'N/A'}</span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}