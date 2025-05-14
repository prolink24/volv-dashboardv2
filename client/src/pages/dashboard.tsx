import { useState, useEffect } from "react";
import { 
  Activity, BarChart as BarChartIcon, CheckCircle, FileCheck, FileText, 
  HelpCircle, LayoutDashboard 
} from "lucide-react";
import { useDashboard } from "@/providers/dashboard-provider";
import { useDashboardData, syncData, invalidateDashboardData, useAttributionStats } from "@/hooks/use-dashboard-data";
import { useToast } from "@/hooks/use-toast";

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
  const { dateFilter, userFilter, refreshData, isRefreshing, activeTab, setActiveTab } = useDashboard();
  const { toast } = useToast();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Convert dateFilter to API format
  // Extract the year and month from the dateFilter (format: "YYYY-MM | Month")
  const dateParts = dateFilter.split('|')[0].trim().split('-');
  const year = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1; // JavaScript months are 0-indexed
  
  // Create a date object for the first day of the selected month
  const apiDate = new Date(year, month, 1);
  
  // Debug log the date conversion
  console.log(`Date filter: "${dateFilter}" -> API date: "${apiDate.toISOString()}" (${year}-${month+1}-1)`);
  
  // Fetch dashboard data with enhanced attribution
  const { 
    data: dashboardData, 
    isLoading, 
    isError, 
    error 
  } = useDashboardData({ 
    date: apiDate.toISOString(), 
    userId: userFilter !== "All Users" ? userFilter : undefined,
    useEnhanced: true
  });

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

  // Prepare chart data
  const cashCollectedData = dashboardData.salesTeam.map(person => ({
    name: person.name.split(' ')[0],
    value: person.cashCollected,
    color: "var(--primary)"
  }));

  const closingRateData = dashboardData.salesTeam.map(person => ({
    name: person.name.split(' ')[0],
    value: person.closingRate,
    color: person.closingRate > 0 ? "var(--primary)" : "var(--muted)"
  }));

  // Generate attribution channel data from our actual stats
  const channelData = attributionStatsData?.stats 
    ? {
        channels: [
          {
            name: 'Close CRM',
            value: attributionStatsData.stats.totalContacts - attributionStatsData.stats.multiSourceContacts,
            percentage: 100 - attributionStatsData.stats.multiSourceRate,
            color: '#4CAF50'
          },
          {
            name: 'Multi-Source',
            value: attributionStatsData.stats.multiSourceContacts,
            percentage: attributionStatsData.stats.multiSourceRate,
            color: '#FF8A65'
          }
        ],
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
          description: `${attributionStatsData.stats.fieldCoverage.toFixed(1)}% of contacts have complete data`,
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
        {!channelData && <AttributionChannels isLoading={!attributionStatsData} />}
        {attributionInsights.length === 0 && <AttributionInsights isLoading={!attributionStatsData} />}
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KpiCard 
          title="Closed Deals" 
          value={dashboardData.kpis.closedDeals} 
          subValue="/10 target" 
          trend={{ value: 20, label: "vs. last month" }}
        />
        <KpiCard 
          title="Cash Collected" 
          value={formatCurrency(dashboardData.kpis.cashCollected)} 
          subValue="/150k target"
          trend={{ value: 15, label: "vs. last month" }}
        />
        <KpiCard 
          title="Revenue Generated" 
          value={formatCurrency(dashboardData.kpis.revenueGenerated)} 
          subValue="/250k target"
          trend={{ value: 12, label: "vs. last month" }}
        />
        <KpiCard 
          title="Total Calls" 
          value={dashboardData.kpis.totalCalls} 
          subValue="/60 target"
          trend={{ value: -5, label: "vs. last month" }}
        />
        <KpiCard 
          title="Call 1 Taken" 
          value={dashboardData.kpis.call1Taken} 
          subValue="/40 target"
          trend={{ value: 8, label: "vs. last month" }}
        />
        <KpiCard 
          title="Call 2 Taken" 
          value={dashboardData.kpis.call2Taken} 
          subValue="/20 target"
          trend={{ value: -10, label: "vs. last month" }}
        />
      </div>
      
      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard 
          title="Closing Rate" 
          value={`${dashboardData.kpis.closingRate}%`} 
          trend={attributionStatsData?.attributionAccuracy ? {
            value: Math.round(attributionStatsData.attributionAccuracy),
            label: "attribution certainty"
          } : undefined}
        />
        <KpiCard 
          title="Avg Cash Collected" 
          value={formatCurrency(dashboardData.kpis.avgCashCollected)}
          trend={attributionStatsData?.stats?.dealAttributionRate ? {
            value: Math.round(attributionStatsData.stats.dealAttributionRate),
            label: "deal attribution"
          } : undefined}
        />
        <KpiCard 
          title="Solution Call Show Rate" 
          value={`${dashboardData.kpis.solutionCallShowRate}%`}
          trend={attributionStatsData?.stats?.highCertaintyContacts ? {
            value: attributionStatsData.stats.highCertaintyContacts,
            label: "high certainty contacts"
          } : undefined}
        />
        <KpiCard 
          title="Earning Per Call 2" 
          value={formatCurrency(dashboardData.kpis.earningPerCall2)}
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
            {dashboardData.salesTeam.map((person, index) => (
              <div key={index}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">{person.name}</span>
                  <span className="text-sm font-medium">{formatCurrency(person.cashCollected)}</span>
                </div>
                <ProgressBar 
                  value={person.cashCollected} 
                  max={Math.max(...dashboardData.salesTeam.map(p => p.cashCollected))} 
                />
              </div>
            ))}
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
      
      {activeTab === "team-performance" && (
        <PerformanceTable data={dashboardData.salesTeam} className="mb-6" />
      )}
      
      {activeTab === "missing-admins" && (
        <AdminList data={dashboardData.missingAdmins} className="mb-6" />
      )}
      
      {/* Triage Metrics */}
      {dashboardData.triageMetrics && (
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
  );
};

export default Dashboard;