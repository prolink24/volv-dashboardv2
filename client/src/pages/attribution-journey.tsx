import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttributionJourney } from "@/components/analytics/attribution-journey";
import { SyncStatus } from "@/components/sync/sync-status";

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

interface TimelineEvent {
  id: number;
  date: string;
  type: "form" | "meeting" | "activity" | "deal";
  title: string;
  description?: string;
  source: "typeform" | "calendly" | "close";
  metadata?: Record<string, any>;
}

interface ContactDetailResponse {
  contact: Contact;
  activities: TimelineEvent[];
  deals: TimelineEvent[];
  meetings: TimelineEvent[];
  forms: TimelineEvent[];
}

const AttributionJourneyPage = () => {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const contactId = params?.id ? parseInt(params.id) : undefined;
  const [activeTab, setActiveTab] = useState("journey");
  
  // If no contact ID, show a search interface
  if (!contactId) {
    return <ContactSearch setLocation={setLocation} />;
  }
  
  // Fetch contact details with all activities
  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<ContactDetailResponse>({
    queryKey: [`/api/contacts/${contactId}`],
  });
  
  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-medium">Loading contact data...</h2>
        <p className="text-muted-foreground">Fetching attribution journey information</p>
      </div>
    );
  }
  
  // If error, show error state
  if (error || !data) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-center max-w-md">
          <h2 className="text-xl font-medium text-red-700 mb-2">Error Loading Contact</h2>
          <p className="text-red-600 mb-4">
            {error instanceof Error ? error.message : "Failed to load contact details"}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => refetch()}>Retry</Button>
            <Button variant="outline" onClick={() => setLocation("/contacts")}>
              Back to Contacts
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Combine all events into a single timeline
  const allEvents: TimelineEvent[] = [
    ...data.activities.map(a => ({ ...a, type: "activity" as const })),
    ...data.meetings.map(m => ({ ...m, type: "meeting" as const })),
    ...data.forms.map(f => ({ ...f, type: "form" as const })),
    ...data.deals.map(d => ({ ...d, type: "deal" as const }))
  ];
  
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="flex flex-col">
        <div className="border-b">
          <div className="container py-4 px-4 lg:px-8">
            <Button variant="ghost" onClick={() => setLocation("/contacts")} className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Contacts
            </Button>
            <h1 className="text-2xl font-bold">{data.contact.name}</h1>
            <p className="text-muted-foreground">
              Contact Attribution Journey &amp; Synchronization
            </p>
          </div>
        </div>
        
        <div className="container py-6 px-4 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="journey">Attribution Journey</TabsTrigger>
              <TabsTrigger value="sync">Data Synchronization</TabsTrigger>
            </TabsList>
            
            <TabsContent value="journey" className="space-y-6">
              <AttributionJourney 
                contact={data.contact} 
                events={allEvents} 
              />
            </TabsContent>
            
            <TabsContent value="sync" className="space-y-6">
              <SyncStatus onRefreshData={() => refetch()} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
};

// If no contact ID, show a search interface
const ContactSearch = ({ setLocation }: { setLocation: (to: string) => void }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const { 
    data: searchResults, 
    isFetching,
    refetch
  } = useQuery<{contacts: Contact[]}>({
    queryKey: ['/api/contacts/search', searchQuery],
    enabled: false, // Don't fetch automatically
  });
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    await refetch();
    setIsSearching(false);
  };
  
  return (
    <div className="flex-1 p-6 container max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Contact Attribution Journey</h1>
      
      <div className="bg-white rounded-lg border p-6 mb-8">
        <h2 className="text-lg font-medium mb-4">Search for a Contact</h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="text"
            placeholder="Search by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
            {isFetching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              "Search"
            )}
          </Button>
        </form>
        
        {searchResults && searchResults.contacts.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              {searchResults.contacts.length} contacts found
            </h3>
            <div className="divide-y">
              {searchResults.contacts.map((contact) => (
                <div 
                  key={contact.id} 
                  className="py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer px-2 rounded-md"
                  onClick={() => setLocation(`/attribution-journey/${contact.id}`)}
                >
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-gray-500">{contact.email}</p>
                    {contact.company && (
                      <p className="text-xs text-gray-400">{contact.company}</p>
                    )}
                  </div>
                  <Button size="sm" variant="ghost">
                    View Journey
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : searchResults?.contacts.length === 0 ? (
          <div className="mt-6 text-center py-8 bg-gray-50 rounded-md">
            <p className="text-gray-500">No contacts found matching your search criteria.</p>
          </div>
        ) : null}
      </div>
      
      <div className="mb-6">
        <Button variant="outline" onClick={() => setLocation("/contacts")}>
          Back to Contacts List
        </Button>
      </div>
    </div>
  );
};

export default AttributionJourneyPage;