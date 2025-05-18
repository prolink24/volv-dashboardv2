import { useState, useEffect } from "react";
import { 
  Activity, BarChart as BarChartIcon, CheckCircle, FileCheck, FileText, 
  HelpCircle, LayoutDashboard 
} from "lucide-react";
import { useDashboard } from "@/providers/dashboard-provider";
import { useDateRange } from "@/providers/date-context";
import { useDashboardData, syncData, invalidateDashboardData, useAttributionStats } from "@/hooks/use-dashboard-data";
import { useToast } from "@/contexts/toast-context";
import { DashboardDebugWrapper } from "@/components/debug/dashboard-debug-wrapper";
import { safeMap } from "@/utils/debug-logger";

import KpiCard from "@/components/dashboard/kpi-card";
import BarChart from "@/components/dashboard/bar-chart";
import MetricsGrid from "@/components/dashboard/metrics-grid";
import PerformanceTable from "@/components/dashboard/performance-table";
import AdminList from "@/components/dashboard/admin-list";
import ProgressBar from "@/components/dashboard/progress-bar";
import DashboardTabs from "@/components/dashboard/dashboard-tabs";
import DashboardFilters from "@/components/dashboard/dashboard-filters";
import AttributionStats from "@/components/dashboard/attribution-stats";
import AttributionChannels from "@/components/dashboard/attribution-channels";
import AttributionInsights from "@/components/dashboard/attribution-insights";

import { formatCurrency } from "@/lib/utils";

const Dashboard = () => {
  const { userFilter, refreshData, isRefreshing, activeTab, setActiveTab } = useDashboard();
  const { dateRange, isLoading: isDateLoading } = useDateRange();
  const { toast } = useToast();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Log the current date range
  console.log(`[Dashboard] Current date range: ${dateRange.startDate.toDateString()} to ${dateRange.endDate.toDateString()}`);
  console.log(`[Dashboard] Current date range label: ${dateRange.label}`);
  
  // Fetch dashboard data with enhanced attribution
  const { 
    data: dashboardData, 
    isLoading, 
    isError, 
    error 
  } = useDashboardData({ 
    userId: userFilter !== "All Users" ? userFilter : undefined,
    useEnhanced: true
  });
  
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
    topDeals: []
  };

  // Get attribution stats separately
  const { data: attributionStatsData } = useAttributionStats();

  useEffect(() => {
    if (isInitialLoad && dashboardData) {
      setIsInitialLoad(false);
    }
  }, [dashboardData, isInitialLoad]);

  // Handle refresh data with improved error handling
  const handleRefresh = async () => {
    toast({
      title: "Refreshing data",
      description: "Syncing data from all sources...",
    });
    
    try {
      // First try to sync the data
      const syncResult = await syncData().catch(err => {
        console.error("Error syncing data:", err);
        throw new Error("Data sync failed. Please try again.");
      });
      
      // If sync was successful, invalidate the cache
      if (syncResult) {
        await invalidateDashboardData().catch(err => {
          console.error("Error invalidating cache:", err);
          throw new Error("Cache invalidation failed. Please reload the page.");
        });
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

  if (isLoading && isInitialLoad) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
        <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <DashboardFilters />
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-lg shadow-sm p-4 border border-border animate-pulse">
                <div className="h-4 bg-muted rounded w-2/3 mb-3"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
        <div className="rounded-lg border border-destructive p-6 flex flex-col items-center justify-center text-center">
          <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Dashboard</h3>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "Failed to load dashboard data. Please try again."}
          </p>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  // Prepare chart data with safe access to properties
  const cashCollectedData = dashboardData?.salesTeam && Array.isArray(dashboardData.salesTeam) 
    ? dashboardData.salesTeam.map(person => ({
        name: person?.name ? person.name.split(' ')[0] : 'Unknown',
        value: person?.cashCollected || 0,
        color: "var(--primary)"
      })) 
    : [];

  const closingRateData = dashboardData?.salesTeam && Array.isArray(dashboardData.salesTeam) 
    ? dashboardData.salesTeam.map(person => ({
        name: person?.name ? person.name.split(' ')[0] : 'Unknown',
        value: person?.closingRate || 0,
        color: (person?.closingRate || 0) > 0 ? "var(--primary)" : "var(--muted)"
      })) 
    : [];

  // Generate attribution channel data from our actual API data
  const channelData = attributionStatsData
    ? {
        channels: attributionStatsData.channelBreakdown 
          ? Object.entries(attributionStatsData.channelBreakdown).map(([name, value], index) => {
              // Calculate percentage based on total touchpoints
              const totalTouchpoints = attributionStatsData.totalTouchpoints || 1;
              const percentage = (value / totalTouchpoints) * 100;
              
              // Assign colors based on channel name
              let color;
              switch(name.toLowerCase()) {
                case 'close':
                  color = '#4CAF50'; // Green
                  break;
                case 'calendly':
                  color = '#FF8A65'; // Orange
                  break;
                case 'typeform':
                  color = '#42A5F5'; // Blue
                  break;
                default:
                  color = `hsl(${index * 40}, 70%, 50%)`;
              }
              
              return {
                name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize channel name
                value: value as number,
                percentage,
                color
              };
            })
          : [],
        title: "Channel Attribution",
        description: "Contact attribution by source channel"
      }
    : undefined;

  // Generate attribution insights from our actual stats
  const attributionInsights = attributionStatsData?.stats 
    ? [
        {
          title: "Attribution Accuracy",
          description: `${attributionStatsData.attributionAccuracy?.toFixed(1)}% accuracy in contact attribution`,
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          badge: { text: "Excellent", variant: "default" }
        },
        {
          title: "Field Coverage",
          description: `${typeof attributionStatsData.stats.fieldCoverage === 'object' 
            ? attributionStatsData.stats.fieldCoverage.average.toFixed(1) 
            : attributionStatsData.stats.fieldCoverage.toFixed(1)}% of contacts have complete data`,
          icon: <FileCheck className="h-5 w-5 text-blue-500" />,
          badge: { text: "Complete", variant: "default" }
        },
        {
          title: "Deal Attribution",
          description: `${attributionStatsData.stats.dealAttributionRate.toFixed(1)}% of deals have attribution chains`,
          icon: <BarChartIcon className="h-5 w-5 text-amber-500" />,
          badge: { text: "Good", variant: "default" }
        }
      ]
    : [];

  return (
    <DashboardDebugWrapper 
      dashboardData={dashboardData} 
      rawData={attributionStatsData}
    >
      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <DashboardFilters />
          
          <div className="flex gap-2">
            <button 
              type="button" 
              className="px-3 py-1.5 rounded-md bg-card border border-border text-sm font-medium flex items-center gap-1"
              onClick={() => {
                toast({
                  title: "Filters Applied",
                  description: "Dashboard data filtered",
                });
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              <span>Filters</span>
            </button>
            <button 
              type="button" 
              className="px-3 py-1.5 rounded-md bg-card border border-border text-sm font-medium flex items-center gap-1"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              <span>Refresh</span>
            </button>
            <button 
              type="button" 
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1"
              onClick={() => {
                toast({
                  title: "Export Started",
                  description: "Your data is being exported",
                });
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              <span>Export</span>
            </button>
          </div>
        </div>
      
      {/* Attribution Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <AttributionStats />
        {channelData && <AttributionChannels data={channelData} />}
        {attributionInsights.length > 0 && <AttributionInsights insights={attributionInsights} />}
        {!channelData && <AttributionChannels data={{ isLoading: !attributionStatsData }} />}
        {attributionInsights.length === 0 && <AttributionInsights insights={[]} isLoading={!attributionStatsData} />}
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KpiCard 
          title="Closed Deals" 
          value={safeData.kpis.closedDeals?.current || safeData.kpis.deals.current} 
          subValue="/10 target" 
          trend={{ 
            value: safeData.kpis.closedDeals?.change || safeData.kpis.deals.change, 
            label: "vs. last month" 
          }}
        />
        <KpiCard 
          title="Cash Collected" 
          value={formatCurrency(safeData.kpis.cashCollected?.current || 0)} 
          subValue="/150k target"
          trend={{ 
            value: safeData.kpis.cashCollected?.change || 0, 
            label: "vs. last month" 
          }}
        />
        <KpiCard 
          title="Revenue Generated" 
          value={formatCurrency(safeData.kpis.revenueGenerated?.current || safeData.kpis.revenue.current)} 
          subValue="/250k target"
          trend={{ 
            value: safeData.kpis.revenueGenerated?.change || safeData.kpis.revenue.change, 
            label: "vs. last month" 
          }}
        />
        <KpiCard 
          title="Total Calls" 
          value={typeof safeData.kpis.totalCalls === 'object' ? safeData.kpis.totalCalls.current : 
                 (typeof safeData.kpis.totalCalls === 'number' ? safeData.kpis.totalCalls : safeData.kpis.activities.current)} 
          subValue="/60 target"
          trend={{ 
            value: typeof safeData.kpis.totalCalls === 'object' ? safeData.kpis.totalCalls.change : -5, 
            label: "vs. last month" 
          }}
        />
        <KpiCard 
          title="Call 1 Taken" 
          value={typeof safeData.kpis.call1Taken === 'object' ? safeData.kpis.call1Taken.current : 
                 (typeof safeData.kpis.call1Taken === 'number' ? safeData.kpis.call1Taken : 0)} 
          subValue="/40 target"
          trend={{ 
            value: typeof safeData.kpis.call1Taken === 'object' ? safeData.kpis.call1Taken.change : 8, 
            label: "vs. last month" 
          }}
        />
        <KpiCard 
          title="Call 2 Taken" 
          value={typeof safeData.kpis.call2Taken === 'object' ? safeData.kpis.call2Taken.current : 
                 (typeof safeData.kpis.call2Taken === 'number' ? safeData.kpis.call2Taken : 0)} 
          subValue="/20 target"
          trend={{ 
            value: typeof safeData.kpis.call2Taken === 'object' ? safeData.kpis.call2Taken.change : -10, 
            label: "vs. last month" 
          }}
        />
      </div>
      
      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard 
          title="Closing Rate" 
          value={`${typeof safeData.kpis.closingRate === 'object' ? safeData.kpis.closingRate.current : 
                 (typeof safeData.kpis.closingRate === 'number' ? safeData.kpis.closingRate : 0)}%`} 
          trend={attributionStatsData?.attributionAccuracy ? {
            value: Math.round(attributionStatsData.attributionAccuracy),
            label: "attribution certainty"
          } : undefined}
        />
        <KpiCard 
          title="Avg Cash Collected" 
          value={formatCurrency(typeof safeData.kpis.avgCashCollected === 'object' ? 
                 safeData.kpis.avgCashCollected.current : 
                 (typeof safeData.kpis.avgCashCollected === 'number' ? safeData.kpis.avgCashCollected : 0))}
          trend={attributionStatsData?.stats?.dealAttributionRate ? {
            value: Math.round(attributionStatsData.stats.dealAttributionRate),
            label: "deal attribution"
          } : undefined}
        />
        <KpiCard 
          title="Solution Call Show Rate" 
          value={`${typeof safeData.kpis.solutionCallShowRate === 'object' ? 
                 safeData.kpis.solutionCallShowRate.current : 
                 (typeof safeData.kpis.solutionCallShowRate === 'number' ? 
                  safeData.kpis.solutionCallShowRate : 0)}%`}
          trend={attributionStatsData?.stats?.highCertaintyContacts ? {
            value: attributionStatsData.stats.highCertaintyContacts,
            label: "high certainty contacts"
          } : undefined}
        />
        <KpiCard 
          title="Earning Per Call 2" 
          value={formatCurrency(typeof safeData.kpis.earningPerCall2 === 'object' ? 
                 safeData.kpis.earningPerCall2.current : 
                 (typeof safeData.kpis.earningPerCall2 === 'number' ? 
                  safeData.kpis.earningPerCall2 : 0))}
          trend={attributionStatsData?.stats?.multiSourceRate ? {
            value: Math.round(attributionStatsData.stats.multiSourceRate),
            label: "multi-source rate"
          } : undefined}
        />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Cash Collected Chart */}
        <div className="bg-card rounded-lg shadow-sm p-4 border border-border">
          <h3 className="text-base font-medium mb-4">Cash Collected by Rep</h3>
          <div className="space-y-4">
            {dashboardData?.salesTeam && Array.isArray(dashboardData.salesTeam) ? 
              dashboardData.salesTeam.map((person, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">{person?.name || 'Unknown'}</span>
                    <span className="text-sm font-medium">{formatCurrency(person?.cashCollected || 0)}</span>
                  </div>
                  <ProgressBar 
                    value={person?.cashCollected || 0} 
                    max={dashboardData.salesTeam && dashboardData.salesTeam.length > 0 
                      ? Math.max(...dashboardData.salesTeam.map(p => p?.cashCollected || 0)) 
                      : 100} 
                  />
                </div>
              )) 
              : (
                <div className="text-sm text-muted-foreground">No sales team data available</div>
              )
            }
          </div>
        </div>
        
        {/* Closing Rate Chart */}
        <BarChart 
          title="Closing Rate by Rep" 
          data={closingRateData} 
          formatValue={(value) => `${value}%`}
          formatYAxis={(value) => `${value}%`}
        />
      </div>
      
      {/* Advanced Metrics Cards */}
      {dashboardData.advancedMetrics && (
        <MetricsGrid 
          title="Advanced Metrics" 
          columns={3}
          metrics={[
            { 
              label: "Cost Per Closed Won", 
              value: dashboardData.advancedMetrics?.costPerClosedWon || 0, 
              description: "Cash collected - Commission / Closed",
              format: "currency" 
            },
            { 
              label: "Closer Slot Utilization", 
              value: dashboardData.advancedMetrics?.closerSlotUtilization || 0, 
              format: "percentage" 
            },
            { 
              label: "Solution Call Close Rate", 
              value: dashboardData.advancedMetrics?.solutionCallCloseRate || 0, 
              format: "percentage" 
            },
            { 
              label: "Sales Cycle", 
              value: dashboardData.advancedMetrics?.salesCycle || 0, 
              description: "First Touch -> Close (Days)",
            },
            { 
              label: "Touchpoints To Close", 
              value: dashboardData.advancedMetrics?.callsToClose || 0, 
              description: "Avg interactions before conversion",
            },
            { 
              label: "Profit Per Solution Call", 
              value: dashboardData.advancedMetrics?.profitPerSolutionCall || 0, 
              format: "currency" 
            },
          ]}
          className="mb-6"
        />
      )}
      
      {/* Tabs and Data Tables */}
      <DashboardTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {activeTab === "team-performance" && dashboardData?.salesTeam && (
        <PerformanceTable data={dashboardData.salesTeam} className="mb-6" />
      )}
      
      {activeTab === "missing-admins" && dashboardData?.missingAdmins && (
        <AdminList data={dashboardData.missingAdmins} className="mb-6" />
      )}
      
      {/* Triage Metrics */}
      {dashboardData?.triageMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="col-span-1 md:col-span-2 bg-card rounded-lg shadow-sm border border-border p-4">
            <h3 className="text-base font-medium mb-4">Triage Performance Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Triage Booked</span>
                <span className="text-xl font-bold">{dashboardData.triageMetrics?.booked || 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Triage Sits</span>
                <span className="text-xl font-bold">{dashboardData.triageMetrics?.sits || 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Show Rate</span>
                <span className="text-xl font-bold">{dashboardData.triageMetrics?.showRate || 0}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Bookings/Day</span>
                <span className="text-xl font-bold">{dashboardData.triageMetrics?.bookingsPerDay || 0}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg shadow-sm border border-border p-4">
            <h3 className="text-base font-medium mb-4">Setter Performance</h3>
            <div className="space-y-4">
              <div className="flex flex-col">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Setter Show Rate</span>
                  <span className="text-sm font-medium">{dashboardData.triageMetrics?.setterShowRate || 0}%</span>
                </div>
                <ProgressBar 
                  value={dashboardData.triageMetrics?.setterShowRate || 0} 
                  max={100} 
                  color="green"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Setter Close Rate</span>
                  <span className="text-sm font-medium">{dashboardData.triageMetrics?.setterCloseRate || 0}%</span>
                </div>
                <ProgressBar 
                  value={dashboardData.triageMetrics?.setterCloseRate || 0} 
                  max={100} 
                  color="blue"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Lead Metrics */}
      {dashboardData.leadMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="col-span-1 md:col-span-2 bg-card rounded-lg shadow-sm border border-border p-4">
            <h3 className="text-base font-medium mb-4">Lead Source Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Total Leads</span>
                <span className="text-xl font-bold">{dashboardData.leadMetrics?.totalLeads || 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Qualified Leads</span>
                <span className="text-xl font-bold">{dashboardData.leadMetrics?.qualifiedLeads || 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Conversion Rate</span>
                <span className="text-xl font-bold">{dashboardData.leadMetrics?.conversionRate || 0}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Cost Per Lead</span>
                <span className="text-xl font-bold">${dashboardData.leadMetrics?.costPerLead || 0}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg shadow-sm border border-border p-4">
            <h3 className="text-base font-medium mb-4">Lead Quality</h3>
            <div className="space-y-4">
              <div className="flex flex-col">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Qualified Rate</span>
                  <span className="text-sm font-medium">{dashboardData.leadMetrics?.qualifiedRate || 0}%</span>
                </div>
                <ProgressBar 
                  value={dashboardData.leadMetrics?.qualifiedRate || 0} 
                  max={100} 
                  color="green"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Response Rate</span>
                  <span className="text-sm font-medium">{dashboardData.leadMetrics?.responseRate || 0}%</span>
                </div>
                <ProgressBar 
                  value={dashboardData.leadMetrics?.responseRate || 0} 
                  max={100} 
                  color="blue"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
    </DashboardDebugWrapper>
  );
};

export default Dashboard;