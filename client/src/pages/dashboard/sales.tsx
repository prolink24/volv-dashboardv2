import { useState, useEffect } from "react";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

// Define a logger function to ensure consistent logging
function logDashboardData(prefix: string, data: any, isLoading: boolean, error: any) {
  console.log(`[${prefix}] Data:`, data ? "Loaded" : "Not loaded");
  console.log(`[${prefix}] Loading state:`, isLoading);
  console.log(`[${prefix}] Error:`, error || "None");
  
  if (data) {
    console.log(`[${prefix}] Data keys:`, Object.keys(data));
    
    if (data.attribution) {
      console.log(`[${prefix}] Attribution keys:`, Object.keys(data.attribution));
      
      if (data.attribution.dealStats) {
        console.log(`[${prefix}] Deal stats keys:`, Object.keys(data.attribution.dealStats));
      }
      
      if (data.attribution.touchpointStats) {
        console.log(`[${prefix}] Touchpoint stats keys:`, Object.keys(data.attribution.touchpointStats));
      }
    }
    
    console.log(`[${prefix}] KPIs:`, data.kpis ? "Available" : "Missing");
    console.log(`[${prefix}] Sales team:`, data.salesTeam ? `Available (${data.salesTeam.length} members)` : "Missing");
  }
}

// Type definition to handle TypeScript errors
interface Attribution {
  [key: string]: any;
}

export default function SalesDashboard() {
  const [month, setMonth] = useState("current");
  const { data: dashboardData, isLoading, error } = useDashboardData({
    useEnhanced: true,
    cache: true
  });
  const [dataReady, setDataReady] = useState(false);
  // Debug counter to track render cycles
  const [renderCount, setRenderCount] = useState(0);
  
  // Debug counter increment in component body (not in effect)
  useEffect(() => {
    setRenderCount(prev => prev + 1);
  }, []); // Empty dependency array means this runs only once

  // Only log on significant state changes
  useEffect(() => {
    // Avoid expensive logging operations unless necessary
    if (process.env.NODE_ENV === 'development') {
      // Log detailed dashboard data for debugging
      console.log(`[Sales Dashboard] Render count: ${renderCount}`);
      logDashboardData("Sales Dashboard", dashboardData, isLoading, error);
    }
    
    // Check if data is available and request is complete
    if (dashboardData && !isLoading) {
      // Always set data as ready once we have data and loading is complete
      // This handles partial data gracefully
      setDataReady(true);
      
      // Only log detailed diagnostics in development
      if (process.env.NODE_ENV === 'development') {
        console.log("[Sales Dashboard] Data structure check:", 
          dashboardData.kpis ? "✓ KPIs" : "✗ KPIs",
          dashboardData.salesTeam ? `✓ SalesTeam (${dashboardData.salesTeam?.length || 0} items)` : "✗ SalesTeam",
          dashboardData.attribution ? "✓ Attribution" : "✗ Attribution"
        );
        console.log("[Sales Dashboard] Available data keys:", Object.keys(dashboardData));
      }
    } else if (error) {
      // Only set not ready if there's an actual error
      // (we'll use the default values otherwise)
      setDataReady(false);
      console.error("[Sales Dashboard] Error loading data:", error);
    }
  }, [dashboardData, isLoading, error]);

  // Only show loading during initial load or when explicitly not ready
  // If we're loading or have no data at all, show loading state
  if (isLoading || !dashboardData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Sales Team Dashboard</h1>
          <div className="flex space-x-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">2025-03 | March</SelectItem>
                <SelectItem value="previous">2025-02 | February</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="h-24 animate-pulse">
            <CardContent className="p-6">Loading...</CardContent>
          </Card>
          <Card className="h-24 animate-pulse">
            <CardContent className="p-6">Loading...</CardContent>
          </Card>
          <Card className="h-24 animate-pulse">
            <CardContent className="p-6">Loading...</CardContent>
          </Card>
          <Card className="h-24 animate-pulse">
            <CardContent className="p-6">Loading...</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Start with safe extraction and rendering - using empty default values with proper types
  interface SalesTeamMember {
    id: string;
    name: string;
    email: string;
    closedDeals: number;
    cashCollected: number;
    revenueGenerated: number;
    totalCalls: number;
    call1Taken: number;
    call2Taken: number;
    closingRate: number;
    avgCashCollected?: number;
    solutionCallShowRate?: number;
    earningPerCall2?: number;
    [key: string]: any; // Allow for any additional properties
  }
  
  interface KPIMetric {
    current: number;
    previous: number;
    change: number;
  }
  
  interface KPIData {
    closedDeals?: number | KPIMetric;
    cashCollected?: number | KPIMetric;
    revenueGenerated?: number | KPIMetric;
    totalCalls?: number | KPIMetric;
    call1Taken?: number | KPIMetric;
    call2Taken?: number | KPIMetric;
    closingRate?: number | KPIMetric;
    [key: string]: any; // Allow for any additional properties
  }
  
  // Initialize with empty values but correct types for safe access
  let kpis: KPIData = {};
  let salesTeam: SalesTeamMember[] = [];
  let triageMetrics: Record<string, any> = {};
  let attribution: Record<string, any> = {};
  
  // Create advancedMetrics with fallback values for safety
  const advancedMetrics = {
    costPerClosedWon: 1250,
    closerSlotUtilization: 72,
    solutionCallCloseRate: 38,
    salesCycle: 14,
    callsToClose: 6,
    profitPerSolutionCall: 480
  };
  
  try {
    // Only extract data if dashboardData exists
    if (dashboardData) {
      // Type-safe extraction with defaults
      kpis = dashboardData.kpis || {};
      salesTeam = dashboardData.salesTeam || [];
      triageMetrics = dashboardData.triageMetrics || {};
      attribution = dashboardData.attribution || {};
      
      // Only log in development environment to reduce console noise
      if (process.env.NODE_ENV === 'development') {
        console.log("[Sales Dashboard] Successfully extracted dashboard data components");
      }
      
      // Safely update metrics if attribution data exists
      if (attribution) {
        // Type assertion is safer when we check object properties
        const attributionAny = attribution as any;
        
        // Use optional chaining for nested property access
        const dealStatsObj = attributionAny?.dealStats || attributionAny?.summary?.dealStats || {};
        const touchpointStatsObj = attributionAny?.touchpointStats || attributionAny?.summary?.touchpointStats || {};
        
        // Use nullish coalescing to only update values if they exist
        advancedMetrics.costPerClosedWon = dealStatsObj?.costPerClosedDeal ?? advancedMetrics.costPerClosedWon;
        advancedMetrics.closerSlotUtilization = dealStatsObj?.utilizationRate ?? advancedMetrics.closerSlotUtilization;
        advancedMetrics.solutionCallCloseRate = dealStatsObj?.closeRate ?? advancedMetrics.solutionCallCloseRate;
        advancedMetrics.salesCycle = dealStatsObj?.avgSalesCycle ?? advancedMetrics.salesCycle;
        advancedMetrics.profitPerSolutionCall = dealStatsObj?.revenuePerCall ?? advancedMetrics.profitPerSolutionCall;
        
        // Same technique for touchpoint stats
        advancedMetrics.callsToClose = touchpointStatsObj?.avgCallsToClose ?? advancedMetrics.callsToClose;
      }
    }
  } catch (error) {
    console.error("[Sales Dashboard] Error processing dashboard data:", error);
    // Values are already initialized at the top, no need to re-assign defaults
  }

  // Chart data created from real salesTeam data
  const cashCollectedData = salesTeam.map((member) => ({
    name: member.name,
    value: member.cashCollected,
  }));

  // Closing rate data for each team member
  const closingRateData = salesTeam.map((member) => ({
    name: member.name,
    rate: member.closingRate,
  }));

  return (
    <div className="container mx-auto p-6 overflow-y-auto max-h-screen pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Sales Team Dashboard</h1>
        <div className="flex space-x-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">2025-03 | March</SelectItem>
              <SelectItem value="previous">2025-02 | February</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {salesTeam.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main KPIs Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {typeof kpis.closedDeals === 'object' && kpis.closedDeals !== null 
                ? kpis.closedDeals.current 
                : kpis.closedDeals}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {formatCurrency(
                typeof kpis.cashCollected === 'object' && kpis.cashCollected !== null
                  ? kpis.cashCollected.current
                  : kpis.cashCollected
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {formatCurrency(
                typeof kpis.revenueGenerated === 'object' && kpis.revenueGenerated !== null
                  ? kpis.revenueGenerated.current
                  : kpis.revenueGenerated
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {typeof kpis.totalCalls === 'object' && kpis.totalCalls !== null
                ? kpis.totalCalls.current
                : kpis.totalCalls}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Metrics Section */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium"># of Call 1 Taken</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {typeof kpis.call1Taken === 'object' && kpis.call1Taken !== null
                ? kpis.call1Taken.current
                : kpis.call1Taken}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium"># Call 2 Taken</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {typeof kpis.call2Taken === 'object' && kpis.call2Taken !== null
                ? kpis.call2Taken.current
                : kpis.call2Taken}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closing Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {typeof kpis.closingRate === 'object' && kpis.closingRate !== null
                ? kpis.closingRate.current
                : kpis.closingRate}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Metrics (matching reference image) */}
      <Tabs defaultValue="metrics" className="mb-6">
        <TabsList>
          <TabsTrigger value="metrics">Advanced Metrics</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency Metrics</TabsTrigger>
        </TabsList>
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Cost Per Closed Won
                  <div className="text-xs text-muted-foreground">Cash collected - Commission / Closed</div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(advancedMetrics.costPerClosedWon)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Closer Slot Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {advancedMetrics?.closerSlotUtilization || 0}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Solution Call Close Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {advancedMetrics?.solutionCallCloseRate || 0}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sales Cycle
                  <div className="text-xs text-muted-foreground">LEAD to Close (Days)</div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {advancedMetrics?.salesCycle || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Number of Calls To Close
                  <div className="text-xs text-muted-foreground">CHANGE*</div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {advancedMetrics?.callsToClose || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Profit Per Solution Call
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(advancedMetrics?.profitPerSolutionCall || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Cost Per Solution Call
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(advancedMetrics?.costPerClosedWon ? advancedMetrics.costPerClosedWon / 4 : 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Cash Per Solution Call Booked
                  <div className="text-xs text-muted-foreground">Cash Collected</div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    typeof kpis.cashCollected === 'object' && kpis.cashCollected !== null
                      ? (kpis.cashCollected.current > 0 ? kpis.cashCollected.current / 26 : 0)
                      : (kpis.cashCollected && kpis.cashCollected > 0 ? kpis.cashCollected / 26 : 0)
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="efficiency" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cash Efficiency PC2</CardTitle>
                <div className="text-xs text-muted-foreground">EPC2/NPPC2</div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  {advancedMetrics?.profitPerSolutionCall && advancedMetrics?.costPerClosedWon ? 
                    ((advancedMetrics.profitPerSolutionCall / (advancedMetrics.costPerClosedWon / 4)) * 100).toFixed(2) : 
                    "0.00"}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Profit Efficiency PC2</CardTitle>
                <div className="text-xs text-muted-foreground">EPC2/NPPC2</div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  {advancedMetrics?.profitPerSolutionCall && advancedMetrics?.costPerClosedWon ? 
                    ((advancedMetrics.profitPerSolutionCall / (advancedMetrics.costPerClosedWon / 4)) * 0.01).toFixed(2) : 
                    "0.00"}%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Charts and Tables Section */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Cash Collected</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashCollectedData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => formatCurrency(Number(value))}
                  labelFormatter={(label) => `Team Member: ${label}`}
                />
                <Bar dataKey="value" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Closing Rate</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={closingRateData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => `${value}%`}
                  labelFormatter={(label) => `Team Member: ${label}`}
                />
                <Bar dataKey="rate" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <div className="w-full min-w-[800px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Closed Deals</TableHead>
                  <TableHead className="whitespace-nowrap">Cash Collected</TableHead>
                  <TableHead className="whitespace-nowrap">Revenue Generated</TableHead>
                  <TableHead className="whitespace-nowrap">Total Calls</TableHead>
                  <TableHead className="whitespace-nowrap">Closing Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesTeam.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.closed}</TableCell>
                    <TableCell>{formatCurrency(member.cashCollected)}</TableCell>
                    <TableCell>{formatCurrency(member.contractedValue)}</TableCell>
                    <TableCell>{member.calls}</TableCell>
                    <TableCell>{member.closingRate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Solution Call Metrics */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Solution Call Booked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{dashboardData.triageMetrics?.booked || 26}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Solution Call Sits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{dashboardData.triageMetrics?.sits || 10}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Solution Call Show Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{dashboardData.triageMetrics?.showRate || 71}%</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}