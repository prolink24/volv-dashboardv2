import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

// Mock data for analytics charts
const monthlyData = [
  { month: "Jan", leads: 140, meetings: 35, deals: 3, revenue: 180000 },
  { month: "Feb", leads: 165, meetings: 38, deals: 3, revenue: 150000 },
  { month: "Mar", leads: 185, meetings: 44, deals: 4, revenue: 210000 },
  { month: "Apr", leads: 172, meetings: 41, deals: 2, revenue: 120000 },
  { month: "May", leads: 190, meetings: 48, deals: 5, revenue: 240000 },
  { month: "Jun", leads: 210, meetings: 52, deals: 6, revenue: 270000 },
];

const sourceData = [
  { name: "Typeform", value: 45 },
  { name: "Calendly", value: 30 },
  { name: "Close CRM", value: 15 },
  { name: "Direct", value: 10 },
];

const conversionData = [
  { name: "Triage to Solution", rate: 56.67 },
  { name: "Solution to Close", rate: 15.38 },
  { name: "Lead to Close", rate: 3.25 },
  { name: "Direct Booking", rate: 16.67 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const Analytics = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [timeframe, setTimeframe] = useState("6-months");
  
  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Analyze contact attribution and performance metrics
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30-days">Last 30 Days</SelectItem>
              <SelectItem value="90-days">Last 90 Days</SelectItem>
              <SelectItem value="6-months">Last 6 Months</SelectItem>
              <SelectItem value="12-months">Last 12 Months</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Overview Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">185</div>
                <p className="text-muted-foreground">New Leads</p>
                <div className="text-xs text-green-600 mt-2">↑ 12% vs previous period</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">44</div>
                <p className="text-muted-foreground">Meetings</p>
                <div className="text-xs text-green-600 mt-2">↑ 8% vs previous period</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">4</div>
                <p className="text-muted-foreground">Closed Deals</p>
                <div className="text-xs text-green-600 mt-2">↑ 33% vs previous period</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">$210,000</div>
                <p className="text-muted-foreground">Revenue</p>
                <div className="text-xs text-green-600 mt-2">↑ 40% vs previous period</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Overview Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead & Meeting Growth</CardTitle>
                <CardDescription>Monthly trend of new leads and meetings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="leads" stroke="#8884d8" name="New Leads" />
                      <Line type="monotone" dataKey="meetings" stroke="#82ca9d" name="Meetings" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Revenue & Deals</CardTitle>
                <CardDescription>Monthly trend of closed deals and revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="deals" fill="#8884d8" name="Closed Deals" />
                      <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Revenue ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="attribution" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lead Source Attribution</CardTitle>
              <CardDescription>Where your leads are coming from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex justify-center">
                <ResponsiveContainer width="80%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, "Percentage"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>First Touch Attribution</CardTitle>
              <CardDescription>First interaction by channel for closed deals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Form Submission", value: 40 },
                      { name: "Direct Booking", value: 25 },
                      { name: "Sales Outreach", value: 20 },
                      { name: "Website", value: 15 },
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" name="Percentage" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="conversion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Rates</CardTitle>
              <CardDescription>Key conversion metrics across the sales funnel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={conversionData}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip formatter={(value) => [`${value}%`, "Conversion Rate"]} />
                    <Bar dataKey="rate" fill="#8884d8" name="Conversion Rate">
                      {conversionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Sales Cycle Length</CardTitle>
              <CardDescription>Average days from lead to close by channel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Typeform Lead", days: 108 },
                      { name: "Calendly Direct", days: 92 },
                      { name: "Sales Outreach", days: 76 },
                      { name: "Referral", days: 64 },
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} days`, "Average Sales Cycle"]} />
                    <Bar dataKey="days" fill="#82ca9d" name="Days to Close" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Attribution Source</CardTitle>
              <CardDescription>Total revenue generated by initial contact source</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Typeform", value: 85000 },
                      { name: "Calendly", value: 65000 },
                      { name: "Close CRM", value: 35000 },
                      { name: "Direct", value: 25000 },
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, "Revenue"]} />
                    <Bar dataKey="value" fill="#8884d8">
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>ROI by Channel</CardTitle>
              <CardDescription>Return on investment for each acquisition channel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Typeform", roi: 320 },
                      { name: "Calendly", roi: 275 },
                      { name: "Close CRM", roi: 180 },
                      { name: "Direct", roi: 410 },
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}%`, "ROI"]} />
                    <Bar dataKey="roi" name="ROI (%)">
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Analytics;
