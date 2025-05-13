import { useState, useEffect } from "react";
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
  const apiDate = new Date(dateFilter.split('|')[0].trim().replace('-', '/') + '/01');
  
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

  // Handle refresh data
  const handleRefresh = async () => {
    try {
      await syncData();
      await invalidateDashboardData();
      toast({
        title: "Data refreshed",
        description: "Dashboard data has been updated from all sources",
      });
    } catch (error) {
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

  // Prepare attribution channel data if available
  const channelData = dashboardData.attribution?.channelStats 
    ? {
        channels: Object.entries(dashboardData.attribution.channelStats)
          .map(([name, stats]) => ({
            name,
            value: stats.count || 0,
            percentage: stats.percentage || (stats.count / dashboardData.attribution.contactStats.totalContacts * 100) || 0,
            color: name === 'calendly' ? '#FF8A65' : 
                  name === 'close' ? '#4CAF50' : 
                  name === 'typeform' ? '#AB47BC' : 
                  name === 'email' ? '#42A5F5' : 
                  name === 'call' ? '#FFA726' : '#78909C'
          })),
        title: "Channel Attribution",
        description: "Contact attribution by source channel"
      }
    : undefined;

  // Prepare attribution insights if available
  const attributionInsights = dashboardData.attribution?.insights 
    ? Object.entries(dashboardData.attribution.insights).map(([key, value]) => {
        let icon;
        let badge;
        
        if (key === 'mostEffectiveChannel') {
          icon = <span className="i-lucide-mail text-blue-500" />;
          badge = { text: "Top Channel", variant: "secondary" };
        } else if (key === 'averageTouchpoints') {
          icon = <span className="i-lucide-activity text-green-500" />;
        } else if (key === 'salesCycleDuration') {
          icon = <span className="i-lucide-clock text-orange-500" />;
        }

        return {
          title: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
          description: value.toString(),
          icon,
          badge
        };
      })
    : undefined;

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
        <AttributionChannels data={channelData} />
        <AttributionInsights insights={attributionInsights} />
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
          trend={dashboardData.attribution?.modelStats?.modelAccuracy ? {
            value: Math.round(dashboardData.attribution.modelStats.modelAccuracy),
            label: "attribution certainty"
          } : undefined}
        />
        <KpiCard 
          title="Avg Cash Collected" 
          value={formatCurrency(dashboardData.kpis.avgCashCollected)}
          trend={dashboardData.attribution?.dealStats?.avgDealValue ? {
            value: Math.round((dashboardData.kpis.avgCashCollected / dashboardData.attribution.dealStats.avgDealValue - 1) * 100),
            label: "vs. predicted"
          } : undefined}
        />
        <KpiCard 
          title="Solution Call Show Rate" 
          value={`${dashboardData.kpis.solutionCallShowRate}%`}
          trend={dashboardData.attribution?.touchpointStats?.calendlyShowRate ? {
            value: Math.round(dashboardData.attribution.touchpointStats.calendlyShowRate - dashboardData.kpis.solutionCallShowRate),
            label: "vs. all meetings"
          } : undefined}
        />
        <KpiCard 
          title="Earning Per Call 2" 
          value={formatCurrency(dashboardData.kpis.earningPerCall2)}
          trend={dashboardData.attribution?.dealStats?.revenuePerTouchpoint ? {
            value: Math.round((dashboardData.kpis.earningPerCall2 / dashboardData.attribution.dealStats.revenuePerTouchpoint - 1) * 100),
            label: "vs. avg touchpoint"
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
            value: dashboardData.attribution?.insights?.salesCycleDuration || dashboardData.advancedMetrics?.salesCycle || 0, 
            description: "First Touch -> Close (Days)",
          },
          { 
            label: "Touchpoints To Close", 
            value: dashboardData.attribution?.insights?.averageTouchpoints || dashboardData.advancedMetrics?.callsToClose || 0, 
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
      
      {/* Tabs and Data Tables */}
      <DashboardTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {activeTab === "team-performance" && (
        <PerformanceTable data={dashboardData.salesTeam} className="mb-6" />
      )}
      
      {activeTab === "missing-admins" && (
        <AdminList data={dashboardData.missingAdmins} className="mb-6" />
      )}
      
      {/* Triage Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="col-span-1 md:col-span-2 bg-card rounded-lg shadow-sm border border-border p-4">
          <h3 className="text-base font-medium mb-4">Triage Performance Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Triage Booked</span>
              <span className="text-xl font-bold">{dashboardData.triageMetrics.booked}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Triage Sits</span>
              <span className="text-xl font-bold">{dashboardData.triageMetrics.sits}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Triage Show Rate</span>
              <span className="text-xl font-bold">{dashboardData.triageMetrics.showRate}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Solution Booking Rate</span>
              <span className="text-xl font-bold">{dashboardData.triageMetrics.solutionBookingRate}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Cancel Rate</span>
              <span className="text-xl font-bold">{dashboardData.triageMetrics.cancelRate}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Outbound Triages Set</span>
              <span className="text-xl font-bold">{dashboardData.triageMetrics.outboundTriagesSet}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Total Direct Bookings</span>
              <span className="text-xl font-bold">{dashboardData.triageMetrics.totalDirectBookings}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Direct Booking Rate</span>
              <span className="text-xl font-bold">{dashboardData.triageMetrics.directBookingRate}%</span>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-lg shadow-sm border border-border p-4">
          <h3 className="text-base font-medium mb-4">Lead Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">New Leads</span>
              <span className="text-xl font-bold">{dashboardData.leadMetrics.newLeads}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Leads Disqualified</span>
              <span className="text-xl font-bold">{dashboardData.leadMetrics.disqualified}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Total Dials</span>
              <span className="text-xl font-bold">{dashboardData.leadMetrics.totalDials}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Pick Up Rate</span>
              <span className="text-xl font-bold">{dashboardData.leadMetrics.pickUpRate}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Dashboard;
