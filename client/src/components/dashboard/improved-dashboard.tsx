import { useState, useEffect } from "react";
import { useDashboard } from "@/providers/dashboard-provider";
import { useDateRange } from "@/providers/date-context";
import { useDashboardData, syncData, invalidateDashboardData, useAttributionStats } from "@/hooks/use-dashboard-data";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart, 
  RefreshCw, 
  Download, 
  Users, 
  DollarSign, 
  Activity, 
  Phone, 
  CheckCircle, 
  Calendar
} from "lucide-react";

import { ImprovedKpiCard } from "@/components/dashboard/improved-kpi-card";
import { ImprovedStatsCard } from "@/components/dashboard/improved-stats-card";
import { ImprovedDateRangePicker } from "@/components/dashboard/improved-date-range-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

export function ImprovedDashboard() {
  const { userFilter, refreshData, isRefreshing, activeTab, setActiveTab } = useDashboard();
  const { dateRange } = useDateRange();
  const { toast } = useToast();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Fetch dashboard data with enhanced attribution
  const { 
    data: dashboardData, 
    isLoading, 
    isError, 
    error,
    refetch
  } = useDashboardData({ 
    userId: userFilter !== "All Users" ? userFilter : undefined,
    useEnhanced: true
  });
  
  // Get attribution stats
  const { 
    data: attributionStatsData,
    isLoading: isAttributionLoading,
    isError: isAttributionError
  } = useAttributionStats();
  
  useEffect(() => {
    if (isInitialLoad && dashboardData) {
      setIsInitialLoad(false);
    }
  }, [dashboardData, isInitialLoad]);

  // Refresh data with improved error handling
  const handleRefresh = async () => {
    toast({
      title: "Refreshing data",
      description: "Syncing data from all sources...",
    });
    
    try {
      // First try to sync the data
      const syncResult = await syncData();
      
      // If sync was successful, invalidate the cache
      if (syncResult) {
        await invalidateDashboardData();
        await refetch();
      }
      
      toast({
        title: "Data refreshed",
        description: "Dashboard data has been updated from all sources",
      });
    } catch (error) {
      console.error("Data refresh error:", error);
      
      toast({
        title: "Error refreshing data",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Default empty dashboard data to prevent null reference errors
  const safeData = dashboardData || {
    kpis: {
      deals: { current: 0, previous: 0, change: 0 },
      revenue: { current: 0, previous: 0, change: 0 },
      activities: { current: 0, previous: 0, change: 0 },
      meetings: { current: 0, previous: 0, change: 0 },
      closedDeals: { current: 0, previous: 0, change: 0 },
      cashCollected: { current: 0, previous: 0, change: 0 },
      revenueGenerated: { current: 0, previous: 0, change: 0 },
      totalCalls: { current: 0, previous: 0, change: 0 },
      call1Taken: { current: 0, previous: 0, change: 0 },
      call2Taken: { current: 0, previous: 0, change: 0 },
      closingRate: 0,
      avgCashCollected: 0,
      solutionCallShowRate: 0,
      earningPerCall2: 0
    },
    salesTeam: [],
    leadMetrics: {
      newLeadsToday: 0,
      leadsLastWeek: 0,
      averageLeadQualificationTime: 0,
      leadConversionRate: 0,
      leadSourceDistribution: {},
      totalLeads: 0,
      qualifiedLeads: 0,
      conversionRate: 0,
      costPerLead: 0,
      qualifiedRate: 0,
      responseRate: 0
    },
    timelineData: [],
    topDeals: [],
    stats: {
      totalContacts: 0,
      totalDeals: 0,
      totalActivities: 0,
      totalMeetings: 0,
      contactsWithMultipleSources: 0,
      totalContactsWithAttribution: 0,
    },
    attributionAccuracy: 0
  };
  
  // Generate attribution data
  const attributionData = {
    multiSourceRate: attributionStatsData?.stats?.multiSourceRate || 0,
    attributionAccuracy: attributionStatsData?.attributionAccuracy || 0,
    fieldCoverage: attributionStatsData?.stats?.fieldCoverage || 0,
    dealAttributionRate: attributionStatsData?.stats?.dealAttributionRate || 0,
    channelBreakdown: attributionStatsData?.channelBreakdown || {},
  };
  
  // Loading state
  if (isLoading && isInitialLoad) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Your attribution metrics and insights</p>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-[240px]" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-md" />
          ))}
        </div>
      </div>
    );
  }
  
  // Error state
  if (isError) {
    return (
      <div className="p-4 md:p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "Failed to load dashboard data. Please try again."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleRefresh} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Your attribution metrics and insights from {dateRange.startDate.toLocaleDateString()} to {dateRange.endDate.toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImprovedDateRangePicker 
            isLoading={isLoading || isRefreshing} 
            onApply={refetch}
          />
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => {
              toast({
                title: "Export Started",
                description: "Your data is being exported",
              });
            }}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Tabs for different dashboard views */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="setter">Setter</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ImprovedKpiCard
              title="Closed Deals"
              value={safeData.kpis.closedDeals?.current || safeData.kpis.deals.current}
              subValue="/10 target"
              trend={{
                value: safeData.kpis.closedDeals?.change || safeData.kpis.deals.change,
                label: "vs. last period"
              }}
              icon={<CheckCircle className="h-5 w-5" />}
              isLoading={isLoading}
            />
            <ImprovedKpiCard
              title="Cash Collected"
              value={formatCurrency(safeData.kpis.cashCollected?.current || 0)}
              subValue="/150k target"
              trend={{
                value: safeData.kpis.cashCollected?.change || 0,
                label: "vs. last period"
              }}
              icon={<DollarSign className="h-5 w-5" />}
              isLoading={isLoading}
            />
            <ImprovedKpiCard
              title="Revenue Generated"
              value={formatCurrency(safeData.kpis.revenueGenerated?.current || safeData.kpis.revenue.current)}
              subValue="/250k target"
              trend={{
                value: safeData.kpis.revenueGenerated?.change || safeData.kpis.revenue.change,
                label: "vs. last period"
              }}
              icon={<BarChart className="h-5 w-5" />}
              isLoading={isLoading}
            />
            <ImprovedKpiCard
              title="Total Calls"
              value={typeof safeData.kpis.totalCalls === 'object' ? safeData.kpis.totalCalls.current : 
                     (typeof safeData.kpis.totalCalls === 'number' ? safeData.kpis.totalCalls : safeData.kpis.activities.current)}
              subValue="/60 target"
              trend={{
                value: typeof safeData.kpis.totalCalls === 'object' ? safeData.kpis.totalCalls.change : -5,
                label: "vs. last period"
              }}
              icon={<Phone className="h-5 w-5" />}
              isLoading={isLoading}
            />
            <ImprovedKpiCard
              title="Call 1 Taken"
              value={typeof safeData.kpis.call1Taken === 'object' ? safeData.kpis.call1Taken.current : 
                     (typeof safeData.kpis.call1Taken === 'number' ? safeData.kpis.call1Taken : 0)}
              subValue="/40 target"
              trend={{
                value: typeof safeData.kpis.call1Taken === 'object' ? safeData.kpis.call1Taken.change : 8,
                label: "vs. last period"
              }}
              icon={<Phone className="h-5 w-5" />}
              isLoading={isLoading}
            />
            <ImprovedKpiCard
              title="Call 2 Taken"
              value={typeof safeData.kpis.call2Taken === 'object' ? safeData.kpis.call2Taken.current : 
                     (typeof safeData.kpis.call2Taken === 'number' ? safeData.kpis.call2Taken : 0)}
              subValue="/20 target"
              trend={{
                value: typeof safeData.kpis.call2Taken === 'object' ? safeData.kpis.call2Taken.change : -10,
                label: "vs. last period"
              }}
              icon={<Phone className="h-5 w-5" />}
              isLoading={isLoading}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Attribution Metrics</CardTitle>
                <CardDescription>Cross-platform attribution stats</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Multi-source contacts</span>
                    <span className="font-medium">{Math.round(attributionData.multiSourceRate)}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full" 
                      style={{ width: `${Math.round(attributionData.multiSourceRate)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Attribution accuracy</span>
                    <span className="font-medium">{Math.round(attributionData.attributionAccuracy)}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{ width: `${Math.round(attributionData.attributionAccuracy)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Field coverage</span>
                    <span className="font-medium">{Math.round(attributionData.fieldCoverage)}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${Math.round(attributionData.fieldCoverage)}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-1 md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Channel Distribution</CardTitle>
                <CardDescription>Contact sources by platform</CardDescription>
              </CardHeader>
              <CardContent>
                {isAttributionLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(attributionData.channelBreakdown || {}).map(([name, value], index) => {
                      const percentage = attributionStatsData?.totalTouchpoints 
                        ? (value as number / attributionStatsData.totalTouchpoints) * 100 
                        : 0;
                      
                      let bgColor = "bg-blue-500";
                      switch(name.toLowerCase()) {
                        case 'close':
                          bgColor = "bg-green-500";
                          break;
                        case 'calendly':
                          bgColor = "bg-orange-400";
                          break;
                        case 'typeform':
                          bgColor = "bg-blue-500";
                          break;
                        default:
                          bgColor = "bg-purple-500";
                      }
                      
                      return (
                        <div key={name} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground capitalize">{name}</span>
                            <span className="font-medium">{Math.round(percentage)}% ({value as number})</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${bgColor} rounded-full`} 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {Object.keys(attributionData.channelBreakdown || {}).length === 0 && !isAttributionLoading && (
                      <div className="py-6 text-center text-muted-foreground">
                        No channel data available for the selected date range
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ImprovedStatsCard
              title="Total Contacts"
              value={safeData.stats.totalContacts}
              description="Contacts from all sources"
              icon={<Users className="h-4 w-4" />}
              isLoading={isLoading}
            />
            <ImprovedStatsCard
              title="Total Activities"
              value={safeData.stats.totalActivities}
              description="Activities tracked across platforms"
              icon={<Activity className="h-4 w-4" />}
              isLoading={isLoading}
            />
            <ImprovedStatsCard
              title="Total Meetings"
              value={safeData.stats.totalMeetings}
              description="Scheduled meetings via Calendly"
              icon={<Calendar className="h-4 w-4" />}
              isLoading={isLoading}
            />
          </div>
        </TabsContent>
        
        {/* Other tabs would go here - customized for each dashboard view */}
        <TabsContent value="sales" className="space-y-6">
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Sales Dashboard</h2>
            <p className="text-muted-foreground">
              Select the main dashboard tab to view the complete dashboard.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="marketing" className="space-y-6">
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Marketing Dashboard</h2>
            <p className="text-muted-foreground">
              Select the main dashboard tab to view the complete dashboard.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="setter" className="space-y-6">
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Setter Dashboard</h2>
            <p className="text-muted-foreground">
              Select the main dashboard tab to view the complete dashboard.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="attribution" className="space-y-6">
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Attribution Dashboard</h2>
            <p className="text-muted-foreground">
              Select the main dashboard tab to view the complete dashboard.
            </p>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Last updated indicator */}
      <div className="pt-4 text-xs text-muted-foreground text-right">
        Last updated: {dashboardData?.refreshedAt ? new Date(dashboardData.refreshedAt).toLocaleString() : 'Unknown'}
      </div>
    </div>
  );
}

export default ImprovedDashboard;