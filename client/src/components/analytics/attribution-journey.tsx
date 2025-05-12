import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Calendar, 
  PhoneCall, 
  DollarSign, 
  AlertCircle, 
  ChevronRight, 
  ArrowRight 
} from "lucide-react";

// Sample contact journey data
const contactJourneys = [
  {
    id: 1,
    name: "John Anderson",
    email: "john.anderson@example.com",
    journey: [
      { 
        id: 1, 
        type: "form", 
        source: "typeform", 
        title: "Initial Assessment Form", 
        date: "2025-02-02T14:30:00", 
        icon: FileText,
        color: "bg-blue-500" 
      },
      { 
        id: 2, 
        type: "meeting", 
        source: "calendly", 
        title: "Triage Call", 
        date: "2025-02-05T10:00:00", 
        icon: Calendar,
        color: "bg-green-500" 
      },
      { 
        id: 3, 
        type: "activity", 
        source: "close", 
        title: "Sales Call", 
        date: "2025-02-12T15:30:00", 
        icon: PhoneCall,
        color: "bg-amber-500" 
      },
      { 
        id: 4, 
        type: "activity", 
        source: "close", 
        title: "Solution Call", 
        date: "2025-02-19T11:00:00", 
        icon: PhoneCall,
        color: "bg-amber-500" 
      },
      { 
        id: 5, 
        type: "deal", 
        source: "close", 
        title: "Contract Signed", 
        date: "2025-03-01T09:15:00", 
        value: 25000,
        icon: DollarSign,
        color: "bg-purple-500" 
      }
    ]
  },
  {
    id: 2,
    name: "Sarah Miller",
    email: "sarah.miller@example.com",
    journey: [
      { 
        id: 1, 
        type: "meeting", 
        source: "calendly", 
        title: "Direct Booking", 
        date: "2025-01-15T13:00:00", 
        icon: Calendar,
        color: "bg-green-500" 
      },
      { 
        id: 2, 
        type: "activity", 
        source: "close", 
        title: "Solution Call", 
        date: "2025-01-22T14:30:00", 
        icon: PhoneCall,
        color: "bg-amber-500" 
      },
      { 
        id: 3, 
        type: "deal", 
        source: "close", 
        title: "Contract Signed", 
        date: "2025-02-05T10:45:00", 
        value: 15000,
        icon: DollarSign,
        color: "bg-purple-500" 
      }
    ]
  },
  {
    id: 3,
    name: "Michael Johnson",
    email: "michael.johnson@example.com",
    journey: [
      { 
        id: 1, 
        type: "form", 
        source: "typeform", 
        title: "Lead Qualification Form", 
        date: "2025-02-10T09:20:00", 
        icon: FileText,
        color: "bg-blue-500" 
      },
      { 
        id: 2, 
        type: "activity", 
        source: "close", 
        title: "Outreach Call", 
        date: "2025-02-12T11:00:00", 
        icon: PhoneCall,
        color: "bg-amber-500" 
      },
      { 
        id: 3, 
        type: "meeting", 
        source: "calendly", 
        title: "Triage Call", 
        date: "2025-02-15T14:00:00", 
        icon: Calendar,
        color: "bg-green-500" 
      },
      { 
        id: 4, 
        type: "activity", 
        source: "close", 
        title: "Disqualified", 
        date: "2025-02-20T16:30:00", 
        icon: AlertCircle,
        color: "bg-red-500" 
      }
    ]
  }
];

const AttributionJourney = () => {
  const [selectedContact, setSelectedContact] = useState(contactJourneys[0].id.toString());
  
  const contact = contactJourneys.find(contact => contact.id.toString() === selectedContact);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Contact Attribution Journey</CardTitle>
        <CardDescription>Visualize the complete customer journey from first touch to deal</CardDescription>
        <div className="mt-2">
          <Select value={selectedContact} onValueChange={setSelectedContact}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a contact" />
            </SelectTrigger>
            <SelectContent>
              {contactJourneys.map(contact => (
                <SelectItem key={contact.id} value={contact.id.toString()}>
                  {contact.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {contact && (
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-medium">{contact.name}</h3>
              <p className="text-sm text-muted-foreground">{contact.email}</p>
            </div>
            
            <div className="space-y-4 mt-6">
              {/* Journey visualization with line connecting events */}
              <div className="relative pt-2 pb-8">
                <div className="absolute top-6 bottom-0 left-[15px] w-0.5 bg-border"></div>
                
                <div className="space-y-8">
                  {contact.journey.map((event, index) => {
                    const Icon = event.icon;
                    const isLast = index === contact.journey.length - 1;
                    
                    return (
                      <div key={event.id} className="relative flex items-start gap-4">
                        <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full z-10 ${event.color} text-white`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row justify-between gap-1">
                            <div>
                              <h4 className="text-sm font-medium">{event.title}</h4>
                              <p className="text-xs text-muted-foreground capitalize">
                                {event.source} - {event.type}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(event.date)}
                            </p>
                          </div>
                          
                          {'value' in event && (
                            <div className="mt-1 text-sm font-medium">
                              Value: ${event.value.toLocaleString()}
                            </div>
                          )}
                          
                          {!isLast && (
                            <div className="hidden sm:flex items-center text-muted-foreground mt-2 text-xs gap-1">
                              <span>{Math.floor(Math.random() * 14) + 1} days</span>
                              <ArrowRight className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Key insights */}
              <div className="bg-muted/50 p-4 rounded-lg mt-4">
                <h4 className="text-sm font-medium mb-2">Attribution Insights</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>First touch: <span className="font-medium capitalize">{contact.journey[0].source}</span> ({contact.journey[0].title})</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>Journey length: <span className="font-medium">{contact.journey.length} touchpoints</span></span>
                  </li>
                  {contact.journey.some(event => event.type === 'deal') && (
                    <>
                      <li className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>Days to close: <span className="font-medium">{Math.floor(Math.random() * 60) + 10} days</span></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>Deal value: <span className="font-medium">${contact.journey.find(e => e.type === 'deal')?.value?.toLocaleString()}</span></span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button variant="outline" size="sm">
                View Full Contact Details
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttributionJourney;