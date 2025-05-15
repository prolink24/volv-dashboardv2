import React from 'react';
import { 
  Activity, 
  Calendar, 
  DollarSign, 
  MessageSquare, 
  Mail, 
  Phone, 
  FileText, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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

interface VisualJourneyTimelineProps {
  events: TimelineEvent[];
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(new Date(date));
};

const getEventIcon = (type: string) => {
  switch (type) {
    case 'meeting':
      return <Calendar className="h-4 w-4" />;
    case 'activity':
      return <Activity className="h-4 w-4" />;
    case 'deal':
      return <DollarSign className="h-4 w-4" />;
    case 'note':
      return <FileText className="h-4 w-4" />;
    case 'form':
      return <MessageSquare className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

const getSourceColor = (source: string) => {
  switch (source.toLowerCase()) {
    case 'close':
      return 'bg-blue-500';
    case 'calendly':
      return 'bg-green-500';
    case 'typeform':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
};

export function VisualJourneyTimeline({ events }: VisualJourneyTimelineProps) {
  // Sort events by timestamp
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
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
  const groupedDates = Object.keys(eventsByDate).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );
  
  return (
    <div className="relative">
      {/* Main timeline track */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
      
      <div className="space-y-12">
        {groupedDates.map((date, groupIndex) => (
          <div key={date} className="relative">
            {/* Date marker */}
            <div className="flex items-center mb-6">
              <div className="absolute left-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center z-10">
                <Calendar className="h-4 w-4 text-primary-foreground" />
              </div>
              <h3 className="text-md font-medium ml-14">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
            </div>
            
            {/* Events for this date */}
            <div className="space-y-6 ml-14">
              {eventsByDate[date].map((event, eventIndex) => (
                <TooltipProvider key={event.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer relative overflow-hidden border-l-4" style={{ borderLeftColor: event.source === 'Close' ? '#3498db' : event.source === 'Calendly' ? '#2ecc71' : '#9b59b6' }}>
                        <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: event.source === 'Close' ? '#3498db' : event.source === 'Calendly' ? '#2ecc71' : '#9b59b6' }} />
                        
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3">
                            <div className={`rounded-full p-2 ${getSourceColor(event.source)} text-white`}>
                              {getEventIcon(event.type)}
                            </div>
                            
                            <div>
                              <div className="font-medium">{event.title}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(event.timestamp)}
                              </div>
                              
                              {event.description && (
                                <div className="mt-2 text-sm">{event.description}</div>
                              )}
                              
                              {event.userName && (
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  <Avatar className="h-4 w-4">
                                    <AvatarFallback className="text-[8px]">{event.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <span>{event.userName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className="text-xs">
                              {event.source}
                            </Badge>
                            
                            <Badge variant="secondary" className="text-xs">
                              {event.type}
                              {event.subtype ? ` - ${event.subtype}` : ''}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-md">
                      <div>
                        <h4 className="font-semibold">{event.title}</h4>
                        <p className="text-xs mt-1">{formatDate(event.timestamp)}</p>
                        {event.description && <p className="mt-2 text-sm">{event.description}</p>}
                        <div className="mt-2 flex items-center justify-between">
                          <Badge>{event.source}</Badge>
                          {event.score !== undefined && (
                            <span className="text-xs flex items-center gap-1">
                              Impact Score: {event.score * 100}%
                              {event.score > 0.7 ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : event.score < 0.3 ? (
                                <AlertCircle className="h-3 w-3 text-red-500" />
                              ) : (
                                <Activity className="h-3 w-3 text-yellow-500" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VisualJourneyTimeline;