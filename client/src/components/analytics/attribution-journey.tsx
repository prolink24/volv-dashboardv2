import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, FormInput, Phone, Mail, Activity, FileText, TrendingUp, CircleDollarSign } from "lucide-react";

interface TimelineEvent {
  id: number;
  date: string;
  type: "form" | "meeting" | "activity" | "deal";
  title: string;
  description?: string;
  source: "typeform" | "calendly" | "close";
  metadata?: Record<string, any>;
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
}

export function AttributionJourney({ contact, events }: AttributionJourneyProps) {
  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
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
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 mb-4">
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
        
        {sortedEvents.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No journey data available for this contact yet.
          </div>
        ) : (
          <div className="relative pl-8 border-l-2 border-gray-100 space-y-6 py-2">
            {sortedEvents.map((event, index) => {
              const previousDate = index > 0 ? sortedEvents[index - 1].date : contact.createdAt;
              const daysSince = daysBetween(previousDate, event.date);
              
              return (
                <div key={event.id} className="relative -left-10">
                  <div className="absolute -left-1 w-8 flex items-center justify-center">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center bg-white border">
                      {getEventIcon(event.type, event.source)}
                    </div>
                  </div>
                  
                  <div className="ml-10 bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium">{event.title}</span>
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
                    
                    {event.description && (
                      <p className="text-sm mt-1">{event.description}</p>
                    )}
                    
                    {event.type === "deal" && event.metadata?.value && (
                      <Badge className="mt-2 bg-emerald-50 text-emerald-700 border-emerald-200">
                        ${event.metadata.value.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}