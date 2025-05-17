import { useState } from "react";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useDateRange } from "@/hooks/use-date-range";
import { DateRangePicker } from "@/components/global/date-range-picker";

export default function AdminDashboard() {
  const { dateRange } = useDateRange();
  const { data: dashboardData, isLoading } = useDashboardData();
  const [expandedUsers, setExpandedUsers] = useState<string[]>([]);

  if (isLoading || !dashboardData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-2">
            <h1 className="text-3xl font-bold">Admin Center</h1>
            <Tabs defaultValue="missing">
              <TabsList>
                <TabsTrigger value="missing">Missing Admins</TabsTrigger>
                <TabsTrigger value="completed">Completed Admins</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex space-x-2">
            <DateRangePicker />
          </div>
        </div>
        <div className="w-full animate-pulse">
          <Card className="h-96 mb-6">
            <CardContent className="p-6">Loading missing admin data...</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Use real data from our database
  const { missingAdmins } = dashboardData;

  // Group contacts by assigned user
  const userAdminGroups = missingAdmins || [];
  
  const toggleUserExpansion = (userId: string) => {
    if (expandedUsers.includes(userId)) {
      setExpandedUsers(expandedUsers.filter(id => id !== userId));
    } else {
      setExpandedUsers([...expandedUsers, userId]);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row items-start justify-between mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold">Admin Center</h1>
          <Tabs defaultValue="missing" className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="missing">Missing Admins</TabsTrigger>
              <TabsTrigger value="completed">Completed Admins</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="mt-4 md:mt-0">
          <DateRangePicker />
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Missing Admins</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Assigned To</TableHead>
                  <TableHead className="w-[150px]">Creation Date</TableHead>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead className="w-[250px]">Email</TableHead>
                  <TableHead className="w-[120px]">Event Type</TableHead>
                  <TableHead className="w-[200px]">Call Date & Time</TableHead>
                  <TableHead className="w-[120px]">Close ID</TableHead>
                  <TableHead className="w-[150px]">Assigned To</TableHead>
                  <TableHead className="w-[120px]">Interface User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userAdminGroups.map((group) => (
                  <>
                    <TableRow 
                      key={group.assignedTo} 
                      onClick={() => toggleUserExpansion(group.assignedTo)}
                      className="cursor-pointer hover:bg-muted"
                    >
                      <TableCell colSpan={9} className="py-3">
                        <div className="flex items-center">
                          {expandedUsers.includes(group.assignedTo) ? (
                            <ChevronDown className="mr-2 h-4 w-4" />
                          ) : (
                            <ChevronRight className="mr-2 h-4 w-4" />
                          )}
                          <span className="font-medium mr-2">{group.assignedTo}</span>
                          <Badge variant="secondary" className="ml-auto">{group.count}</Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {expandedUsers.includes(group.assignedTo) && group.contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell></TableCell>
                        <TableCell>
                          {contact.callDateTime ? 
                            new Date(contact.callDateTime).toLocaleDateString() :
                            new Date().toLocaleDateString()}
                        </TableCell>
                        <TableCell>{contact.name}</TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              contact.eventType === 'Strategy Call' ? 
                                'bg-blue-100 text-blue-800 hover:bg-blue-100' : 
                              contact.eventType === 'Triage Call' ? 
                                'bg-green-100 text-green-800 hover:bg-green-100' : 
                              contact.eventType === 'Follow-Up Call' ? 
                                'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' : 
                                'bg-gray-100 text-gray-800 hover:bg-gray-100'
                            }
                          >
                            {contact.eventType || 'Triage Call'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {contact.callDateTime ? 
                            new Date(contact.callDateTime).toLocaleString() :
                            ''}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 hover:bg-blue-50">
                            Close ID
                          </Badge>
                        </TableCell>
                        <TableCell>{group.assignedTo}</TableCell>
                        <TableCell>{group.assignedTo}</TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}
                
                {userAdminGroups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      No missing admin tasks found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Admin Metrics Summary */}
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
            <div className="text-4xl font-bold text-red-600">
              {userAdminGroups.reduce((total, group) => total + group.count, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-pink-600">Admin Missing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-pink-600">
              {userAdminGroups.length > 0 
                ? Math.round((userAdminGroups.reduce((total, group) => total + group.count, 0) / 
                   (userAdminGroups.reduce((total, group) => total + group.count, 0) + 27)) * 100)
                : 0}
              <span className="text-2xl">%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}