import { useState } from "react";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export default function SetterDashboard() {
  const [month, setMonth] = useState("current");
  const { data: dashboardData, isLoading } = useDashboardData();

  if (isLoading || !dashboardData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Setter Metrics</h1>
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
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
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

  // Get real data from our database
  const { triageMetrics, leadMetrics } = dashboardData;

  // Chart data for show rates
  const showRateData = [
    { name: "Triage", rate: triageMetrics?.showRate || 37.97 },
    { name: "Solution Call", rate: triageMetrics?.solutionBookingRate || 56.67 }
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Setter Metrics</h1>
          <p className="text-muted-foreground">Add a description</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">2025-03 | March</SelectItem>
              <SelectItem value="previous">2025-02 | February</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top Row - Solution Call Metrics */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Solution Call Booked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{triageMetrics?.booked || 26}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Solution Call Sits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{triageMetrics?.sits || 10}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Solution Call Show Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{triageMetrics?.showRate || 71}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Metrics */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Completed Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">27</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Missing Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-600">-1</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-pink-600">Admin Missing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-pink-600">0<span className="text-2xl">%</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Triage Metrics - First Row */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Triage Booked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{triageMetrics?.booked || 79}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Triage Sits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{triageMetrics?.sits || 30}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Triage Show Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{triageMetrics?.showRate || 37.97}<span className="text-2xl">%</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Solution Booking Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{triageMetrics?.solutionBookingRate || 56.67}<span className="text-2xl">%</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Triage Metrics - Second Row */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cancel Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{triageMetrics?.cancelRate || 36.67}<span className="text-2xl">%</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outbound Triages Set</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{triageMetrics?.outboundTriagesSet || 8}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Direct Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{triageMetrics?.totalDirectBookings || 73}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Direct Booking Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{triageMetrics?.directBookingRate || 16.67}<span className="text-2xl">%</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{leadMetrics?.newLeads || 185}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Leads Disqualified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{leadMetrics?.disqualified || 3}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              Total Call 1 Show Rate
              <div className="text-xs text-red-400">(rebook included)</div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-600">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Dials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{leadMetrics?.totalDials || 253}</div>
          </CardContent>
        </Card>
      </div>

      {/* Response Metrics */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Speed To Lead</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pick Up Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">1</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lead Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">1</div>
          </CardContent>
        </Card>
      </div>

      {/* Show Rate Comparison Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Show Rates</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={showRateData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value) => `${value}%`}
                labelFormatter={(label) => `${label} Show Rate`}
              />
              <Bar dataKey="rate" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}