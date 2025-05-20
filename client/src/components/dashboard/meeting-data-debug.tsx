import React from "react";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useDateRange } from "@/providers/date-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

// Define meeting interface to match what's in the API response
interface Meeting {
  id: number;
  contactId: number;
  calendlyEventId?: string;
  type: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  assignedTo: string;
  [key: string]: any; // Allow for additional properties
}

// Extend DashboardData to include meetings
interface ExtendedDashboardData {
  meetings?: Meeting[];
  kpis: any; // Using any for brevity, should match the actual type
  [key: string]: any; // Allow other dashboard properties
}

export const MeetingDataDebug = () => {
  const { dateRange } = useDateRange();
  const [dateFilter, setDateFilter] = React.useState<string | null>(null);
  
  // Format for API filter
  const formatDateForFilter = (date: Date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };
  
  // Create different test date ranges
  const last30Days = `${formatDateForFilter(dateRange.startDate)}_${formatDateForFilter(dateRange.endDate)}`;
  const april2025Start = new Date(2025, 3, 1); // April is month 3 (0-indexed)
  const april2025End = new Date(2025, 3, 30);
  const april2025 = `${formatDateForFilter(april2025Start)}_${formatDateForFilter(april2025End)}`;
  
  // Set default date filter to match current dashboard selection
  React.useEffect(() => {
    if (!dateFilter) {
      setDateFilter(last30Days);
    }
  }, [last30Days, dateFilter]);
  
  // Fetch dashboard data with the selected date filter
  const { 
    data: dashboardData, 
    isLoading, 
    isError,
    error,
    refetch
  } = useDashboardData({ 
    useEnhanced: true,
    date: dateFilter || undefined
  });
  
  // Cast to our extended type that includes meetings
  const extendedData = dashboardData as unknown as ExtendedDashboardData;
  
  // Count meeting types
  const totalMeetings = extendedData?.meetings?.length || 0;
  const calendlyMeetings = extendedData?.meetings?.filter(m => m.calendlyEventId)?.length || 0;
  
  // Prepare call metrics for display
  const callMetrics = {
    totalCalls: extendedData?.kpis?.totalCalls?.current || 0,
    call1Taken: extendedData?.kpis?.call1Taken?.current || 0,
    call2Taken: extendedData?.kpis?.call2Taken?.current || 0
  };
  
  // Pretty-print JSON
  const prettyJson = (data: any) => {
    return JSON.stringify(data, null, 2);
  };
  
  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          Meeting Data Debug
          <div className="flex gap-2 text-sm">
            <Button 
              size="sm" 
              variant={dateFilter === last30Days ? "default" : "outline"}
              onClick={() => setDateFilter(last30Days)}
            >
              Last 30 Days
            </Button>
            <Button 
              size="sm" 
              variant={dateFilter === april2025 ? "default" : "outline"}
              onClick={() => setDateFilter(april2025)}
            >
              April 2025
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-muted-foreground">Loading data...</p>
          </div>
        ) : isError ? (
          <div className="bg-destructive/10 p-4 rounded-md text-destructive mb-4">
            <p className="font-semibold">Error loading dashboard data:</p>
            <p>{error instanceof Error ? error.message : "Unknown error"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-muted/50 p-4 rounded-md">
                <p className="text-muted-foreground text-sm">Date Range</p>
                <p className="font-medium">{dateFilter?.replace('_', ' to ')}</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-md">
                <p className="text-muted-foreground text-sm">Total Meetings</p>
                <p className="font-medium">{totalMeetings}</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-md">
                <p className="text-muted-foreground text-sm">Calendly Meetings</p>
                <p className="font-medium">{calendlyMeetings}</p>
              </div>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-md mb-4">
              <p className="text-muted-foreground text-sm mb-2">Call Metrics from KPIs</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Calls</p>
                  <p className="font-semibold">{callMetrics.totalCalls}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Call 1 Taken</p>
                  <p className="font-semibold">{callMetrics.call1Taken}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Call 2 Taken</p>
                  <p className="font-semibold">{callMetrics.call2Taken}</p>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <Accordion type="single" collapsible className="w-full">
              {extendedData?.meetings && extendedData.meetings.length > 0 ? (
                <AccordionItem value="meetings">
                  <AccordionTrigger className="font-medium">
                    Meeting Data ({extendedData.meetings.length} items)
                  </AccordionTrigger>
                  <AccordionContent>
                    <ScrollArea className="h-[300px] rounded-md border">
                      <div className="p-4 text-xs font-mono whitespace-pre">
                        {prettyJson(extendedData.meetings)}
                      </div>
                    </ScrollArea>
                  </AccordionContent>
                </AccordionItem>
              ) : (
                <div className="py-2 px-4 text-muted-foreground">
                  No meeting data available for the selected date range
                </div>
              )}
              
              <AccordionItem value="kpis">
                <AccordionTrigger className="font-medium">
                  KPI Data
                </AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="h-[300px] rounded-md border">
                    <div className="p-4 text-xs font-mono whitespace-pre">
                      {prettyJson(extendedData?.kpis || {})}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="raw">
                <AccordionTrigger className="font-medium">
                  Raw Response
                </AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="h-[300px] rounded-md border">
                    <div className="p-4 text-xs font-mono whitespace-pre">
                      {prettyJson(extendedData || {})}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MeetingDataDebug;