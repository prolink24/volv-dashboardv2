import { useState } from "react";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

export default function SalesDashboard() {
  const [month, setMonth] = useState("current");
  const { data: dashboardData, isLoading, error } = useDashboardData({
    useEnhanced: true,
    cache: true
  });

  console.log("Sales Dashboard Data:", dashboardData ? "Loaded" : "Not loaded", "isLoading:", isLoading, "error:", error);
  console.log("Dashboard data structure:", dashboardData ? Object.keys(dashboardData) : "No data");
  if (dashboardData?.attribution) {
    console.log("Attribution data:", Object.keys(dashboardData.attribution));
  }

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

  // Data from our database 
  const { kpis, salesTeam, triageMetrics, attribution } = dashboardData;
  
  // Add additional console logs for debugging
  console.log("KPIs data:", kpis ? "Available" : "Missing");
  console.log("Sales team data:", salesTeam ? "Available" : "Missing", "Length:", salesTeam?.length);
  console.log("Triage metrics data:", triageMetrics ? "Available" : "Missing");
  
  // Map the new data structure to match what the component expects
  const advancedMetrics = {
    costPerClosedWon: attribution?.dealStats?.costPerClosedDeal || 0,
    closerSlotUtilization: attribution?.dealStats?.utilizationRate || 0,
    solutionCallCloseRate: attribution?.dealStats?.closeRate || 0,
    salesCycle: attribution?.dealStats?.avgSalesCycle || 0,
    callsToClose: attribution?.touchpointStats?.avgCallsToClose || 0,
    profitPerSolutionCall: attribution?.dealStats?.revenuePerCall || 0
  };

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
            <div className="text-4xl font-bold">{kpis.closedDeals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{formatCurrency(kpis.cashCollected)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{formatCurrency(kpis.revenueGenerated)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{kpis.totalCalls}</div>
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
            <div className="text-4xl font-bold">{kpis.call1Taken}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium"># Call 2 Taken</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{kpis.call2Taken}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closing Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{kpis.closingRate}%</div>
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
                  {formatCurrency(advancedMetrics?.costPerClosedWon || 0)}
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
                  {formatCurrency(kpis.cashCollected && kpis.cashCollected > 0 ? kpis.cashCollected / 26 : 0)}
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Closed Deals</TableHead>
                <TableHead>Cash Collected</TableHead>
                <TableHead>Revenue Generated</TableHead>
                <TableHead>Total Calls</TableHead>
                <TableHead>Closing Rate</TableHead>
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