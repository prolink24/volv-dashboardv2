import React from 'react';
import { ImprovedKPICard } from './improved-kpi-card';
import { ImprovedStatsCard } from './improved-stats-card';
import { ImprovedDateRangePicker } from './improved-date-range-picker';
import { ImprovedUserFilter } from './improved-user-filter';
import { useDashboard } from '@/providers/dashboard-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { 
  Users, 
  DollarSign, 
  Calendar, 
  BarChart3, 
  Phone, 
  Mail, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  AlertCircle,
  Target,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DateProvider } from '@/providers/date-context';

export function ImprovedDashboard() {
  const { 
    dashboardData, 
    isLoading, 
    error, 
    refreshData 
  } = useDashboard();
  
  const handleRefresh = () => {
    refreshData();
  };
  
  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
        <p className="text-muted-foreground mb-4 text-center max-w-md">
          There was a problem loading your dashboard data. 
          This could be due to a connection issue or a problem with the database.
        </p>
        <Button onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }
  
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Performance Dashboard</h1>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <ImprovedUserFilter />
          <ImprovedDateRangePicker />
        </div>
      </div>
      
      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ImprovedKPICard 
          title="Total Revenue" 
          value={dashboardData?.totalRevenue || 0}
          previousValue={dashboardData?.previousPeriod?.totalRevenue}
          formatType="currency"
          icon={<DollarSign className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <ImprovedKPICard 
          title="Cash Collected" 
          value={dashboardData?.cashCollected || 0}
          previousValue={dashboardData?.previousPeriod?.totalRevenue}
          formatType="currency"
          icon={<DollarSign className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <ImprovedKPICard 
          title="Total Contacts" 
          value={dashboardData?.totalContacts || 0}
          previousValue={dashboardData?.previousPeriod?.totalContacts}
          icon={<Users className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <ImprovedKPICard 
          title="Average Deal Size" 
          value={dashboardData?.avgDealSize || 0}
          formatType="currency"
          icon={<BarChart3 className="h-4 w-4" />}
          isLoading={isLoading}
        />
      </div>
      
      {/* Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-3 md:w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ImprovedStatsCard 
              title="Multi-Source Rate" 
              statValue={`${dashboardData?.multiSourceRate || 0}%`}
              description="Contacts with data from multiple platforms"
              icon={<Target className="h-4 w-4" />}
              isLoading={isLoading}
            />
            <ImprovedStatsCard 
              title="Field Coverage" 
              statValue={`${dashboardData?.fieldCoverage || 0}%`}
              description="Percentage of contact fields with data"
              icon={<CheckCircle className="h-4 w-4" />}
              isLoading={isLoading}
            />
            <ImprovedStatsCard 
              title="Total Meetings" 
              statValue={dashboardData?.totalMeetings || 0}
              description="Meetings scheduled across all platforms"
              icon={<Calendar className="h-4 w-4" />}
              isLoading={isLoading}
            />
          </div>
          
          {/* Team Performance Table */}
          <Card className="p-5">
            <h3 className="text-lg font-semibold mb-4">Team Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Team Member</th>
                    <th className="text-right p-2">Deals</th>
                    <th className="text-right p-2">Revenue</th>
                    <th className="text-right p-2">Meetings</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">
                          <div className="h-5 bg-gray-200 animate-pulse rounded w-32"></div>
                        </td>
                        <td className="p-2 text-right">
                          <div className="h-5 bg-gray-200 animate-pulse rounded w-12 ml-auto"></div>
                        </td>
                        <td className="p-2 text-right">
                          <div className="h-5 bg-gray-200 animate-pulse rounded w-20 ml-auto"></div>
                        </td>
                        <td className="p-2 text-right">
                          <div className="h-5 bg-gray-200 animate-pulse rounded w-12 ml-auto"></div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    dashboardData?.salesTeam?.map((member) => (
                      <tr key={member.id} className="border-b">
                        <td className="p-2 font-medium">{member.name}</td>
                        <td className="p-2 text-right">{member.deals}</td>
                        <td className="p-2 text-right">${member.revenue.toLocaleString()}</td>
                        <td className="p-2 text-right">{member.meetings}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
        
        {/* Deals Tab */}
        <TabsContent value="deals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ImprovedStatsCard 
              title="Total Deals" 
              statValue={dashboardData?.totalDeals || 0}
              icon={<BarChart3 className="h-4 w-4" />}
              isLoading={isLoading}
            />
            <ImprovedStatsCard 
              title="Won Deals" 
              statValue={dashboardData?.wonDeals || 0}
              icon={<CheckCircle className="h-4 w-4" />}
              isLoading={isLoading}
            />
            <ImprovedStatsCard 
              title="Lost Deals" 
              statValue={dashboardData?.lostDeals || 0}
              icon={<XCircle className="h-4 w-4" />}
              isLoading={isLoading}
            />
            <ImprovedStatsCard 
              title="Open Deals" 
              statValue={dashboardData?.openDeals || 0}
              icon={<TrendingUp className="h-4 w-4" />}
              isLoading={isLoading}
            />
          </div>
        </TabsContent>
        
        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ImprovedStatsCard 
              title="Total Activities" 
              statValue={dashboardData?.totalActivities || 0}
              icon={<BarChart3 className="h-4 w-4" />}
              isLoading={isLoading}
            />
            <ImprovedStatsCard 
              title="Meetings Scheduled" 
              statValue={dashboardData?.totalMeetings || 0}
              icon={<Calendar className="h-4 w-4" />}
              isLoading={isLoading}
            />
            <ImprovedStatsCard 
              title="Meetings Attended" 
              statValue={dashboardData?.meetingsAttended || 0}
              icon={<CheckCircle className="h-4 w-4" />}
              isLoading={isLoading}
            />
            <ImprovedStatsCard 
              title="Meetings Canceled" 
              statValue={dashboardData?.meetingsCanceled || 0}
              icon={<XCircle className="h-4 w-4" />}
              isLoading={isLoading}
            />
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </Button>
      </div>
    </div>
  );
}

// Wrap the dashboard in the DateProvider for use outside this file
export function ImprovedDashboardWithContext() {
  return (
    <DateProvider>
      <ImprovedDashboard />
    </DateProvider>
  );
}