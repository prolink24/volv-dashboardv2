import { useState } from "react";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from "recharts";

export default function ComplianceDashboard() {
  const [month, setMonth] = useState("current");
  const { data: dashboardData, isLoading } = useDashboardData();

  if (isLoading || !dashboardData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
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
  const { salesTeam } = dashboardData;

  // Calculate admin completion rate for each team member
  const adminCompletionData = salesTeam.map(member => ({
    name: member.name,
    completionRate: 100 - (member.adminMissingPercent || 0),
    missing: member.adminMissingPercent || 0
  }));

  // Compliance status data - based on real sales team data
  const complianceStatusData = [
    { name: "Compliant", value: salesTeam.filter(member => (member.adminMissingPercent || 0) < 10).length },
    { name: "At Risk", value: salesTeam.filter(member => (member.adminMissingPercent || 0) >= 10 && (member.adminMissingPercent || 0) < 20).length },
    { name: "Non-Compliant", value: salesTeam.filter(member => (member.adminMissingPercent || 0) >= 20).length }
  ];

  // Documentation completion by type (example data)
  const documentationData = [
    { name: "Triage Call Notes", completion: 92 },
    { name: "Solution Call Notes", completion: 85 },
    { name: "Deal Documentation", completion: 78 },
    { name: "Contact Info", completion: 95 },
    { name: "Contract Signatures", completion: 88 }
  ];

  // COLORS for the pie chart
  const COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
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

      {/* Admin Completion Summary */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Admin Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">
              {Math.round(
                salesTeam.reduce((sum, member) => sum + (100 - (member.adminMissingPercent || 0)), 0) / 
                (salesTeam.length || 1)
              )}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Completed Admin Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">27</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Missing Admin Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-600">
              {salesTeam.reduce((sum, member) => {
                const missingPercentage = member.adminMissingPercent || 0;
                // Rough estimate: if admin missing is 10%, and each person has ~10 admin tasks, that means 1 is missing
                return sum + Math.round((missingPercentage / 100) * 10);
              }, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Compliance Status */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Compliance Status</CardTitle>
            <CardDescription>Overview of team compliance with documentation requirements</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={complianceStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {complianceStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} team members`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Documentation Completion by Type</CardTitle>
            <CardDescription>Completion rate for different documentation requirements</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={documentationData} layout="vertical">
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="name" />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="completion" fill="#0ea5e9">
                  {documentationData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={entry.completion >= 90 ? '#22c55e' : 
                            entry.completion >= 80 ? '#0ea5e9' : 
                            entry.completion >= 70 ? '#f59e0b' : '#ef4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Individual Team Member Compliance */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Team Member Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Member</TableHead>
                <TableHead>Completion Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Missing Tasks</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminCompletionData.map((member) => (
                <TableRow key={member.name}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.completionRate}%</TableCell>
                  <TableCell>
                    <Badge 
                      className={
                        member.completionRate >= 90 ? "bg-green-100 text-green-800 hover:bg-green-100" : 
                        member.completionRate >= 80 ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : 
                        member.completionRate >= 70 ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" : 
                        "bg-red-100 text-red-800 hover:bg-red-100"
                      }
                    >
                      {member.completionRate >= 90 ? "Compliant" : 
                       member.completionRate >= 80 ? "Mostly Compliant" : 
                       member.completionRate >= 70 ? "At Risk" : 
                       "Non-Compliant"}
                    </Badge>
                  </TableCell>
                  <TableCell>{Math.round((member.missing / 100) * 10)}</TableCell>
                  <TableCell>
                    <Progress 
                      value={member.completionRate} 
                      className={
                        member.completionRate >= 90 ? "bg-green-100" : 
                        member.completionRate >= 80 ? "bg-blue-100" : 
                        member.completionRate >= 70 ? "bg-yellow-100" : 
                        "bg-red-100"
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Compliance Trend (Example data) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Compliance Trend</CardTitle>
          <CardDescription>Team compliance rate over time</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={[
                { month: "January", rate: 78 },
                { month: "February", rate: 82 },
                { month: "March", rate: Math.round(
                  salesTeam.reduce((sum, member) => sum + (100 - (member.adminMissingPercent || 0)), 0) / 
                  (salesTeam.length || 1)
                ) }
              ]} 
            >
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="rate" fill="#0ea5e9">
                {[
                  { month: "January", rate: 78 },
                  { month: "February", rate: 82 },
                  { month: "March", rate: Math.round(
                    salesTeam.reduce((sum, member) => sum + (100 - (member.adminMissingPercent || 0)), 0) / 
                    (salesTeam.length || 1)
                  ) }
                ].map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.rate >= 90 ? '#22c55e' : 
                          entry.rate >= 80 ? '#0ea5e9' : 
                          entry.rate >= 70 ? '#f59e0b' : '#ef4444'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}