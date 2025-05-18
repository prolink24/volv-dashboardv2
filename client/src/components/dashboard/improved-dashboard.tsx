import React from 'react';
import { useDashboard } from '@/providers/dashboard-provider';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImprovedKPICard } from './improved-kpi-card';
import { ImprovedDateRangePicker } from './improved-date-range-picker';
import { ImprovedUserFilter } from './improved-user-filter';
import { ImprovedPerformanceTable } from './improved-performance-table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, ArrowUpRightIcon, CalendarDays, DollarSign, FileDigit, Users, ArrowDownRightIcon } from 'lucide-react';

/**
 * Main Dashboard Component
 * 
 * Displays KPI cards, date range picker, user filter, and performance table
 * using data from the dashboard provider
 */
export function ImprovedDashboard() {
  const {
    dashboardData,
    attributionStats,
    salesTeamMembers,
    selectedUserId,
    selectUser,
    isLoading,
    error,
    refetchDashboard
  } = useDashboard();

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading dashboard</AlertTitle>
        <AlertDescription>
          Failed to load dashboard data. Please try again later or contact support.
          <button
            onClick={() => refetchDashboard()}
            className="ml-2 underline"
          >
            Retry
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <ImprovedDateRangePicker />
        </div>
        <div className="w-full md:w-64">
          <ImprovedUserFilter
            users={salesTeamMembers}
            selectedUserId={selectedUserId}
            onSelectUser={selectUser}
          />
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue/Cash KPIs */}
        <ImprovedKPICard
          title="Revenue Generated"
          value={isLoading ? undefined : formatCurrency(dashboardData?.revenueGenerated || 0)}
          previousValue={dashboardData?.previousPeriod?.totalRevenue}
          formatter={formatCurrency}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <ImprovedKPICard
          title="Cash Collected"
          value={isLoading ? undefined : formatCurrency(dashboardData?.cashCollected || 0)}
          previousValue={dashboardData?.previousPeriod?.cashCollected}
          formatter={formatCurrency}
          icon={<DollarSign className="h-5 w-5" />}
        />

        {/* Contact KPIs */}
        <ImprovedKPICard
          title="Total Contacts"
          value={isLoading ? undefined : formatNumber(dashboardData?.totalContacts || 0)}
          previousValue={dashboardData?.previousPeriod?.totalContacts}
          formatter={formatNumber}
          icon={<Users className="h-5 w-5" />}
        />
        <ImprovedKPICard
          title="Total Deals"
          value={isLoading ? undefined : formatNumber(dashboardData?.totalDeals || 0)}
          previousValue={dashboardData?.previousPeriod?.totalDeals}
          formatter={formatNumber}
          icon={<FileDigit className="h-5 w-5" />}
        />

        {/* Activity KPIs */}
        <ImprovedKPICard
          title="Total Meetings"
          value={isLoading ? undefined : formatNumber(dashboardData?.totalMeetings || 0)}
          previousValue={dashboardData?.previousPeriod?.totalMeetings}
          formatter={formatNumber}
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <ImprovedKPICard
          title="Total Activities"
          value={isLoading ? undefined : formatNumber(dashboardData?.totalActivities || 0)}
          previousValue={dashboardData?.previousPeriod?.totalActivities}
          formatter={formatNumber}
          icon={<ArrowUpRightIcon className="h-5 w-5" />}
        />

        {/* Attribution KPIs */}
        <ImprovedKPICard
          title="Multi-Source Rate"
          value={isLoading ? undefined : `${Math.round(dashboardData?.multiSourceRate || 0)}%`}
          help="Percentage of contacts with data from multiple sources"
          icon={<ArrowDownRightIcon className="h-5 w-5" />}
        />
        <ImprovedKPICard
          title="Field Coverage"
          value={isLoading ? undefined : `${Math.round(dashboardData?.fieldCoverageRate || 0)}%`}
          help="Percentage of contact fields with data"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      {/* Performance Table */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
        </TabsList>
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Sales Team Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="w-full h-52" />
              ) : (
                <ImprovedPerformanceTable salesTeam={dashboardData?.salesTeam || []} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="attribution">
          <Card>
            <CardHeader>
              <CardTitle>Attribution Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="w-full h-52" />
              ) : attributionStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Contact Coverage</h3>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt>Contacts with Deals:</dt>
                        <dd className="font-medium">{attributionStats.contactStats.contactsWithDeals} ({Math.round(attributionStats.contactStats.contactsWithDeals / attributionStats.contactStats.totalContacts * 100)}%)</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Contacts with Meetings:</dt>
                        <dd className="font-medium">{attributionStats.contactStats.contactsWithMeetings} ({Math.round(attributionStats.contactStats.contactsWithMeetings / attributionStats.contactStats.totalContacts * 100)}%)</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Contacts with Forms:</dt>
                        <dd className="font-medium">{attributionStats.contactStats.contactsWithForms} ({Math.round(attributionStats.contactStats.contactsWithForms / attributionStats.contactStats.totalContacts * 100)}%)</dd>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <dt>Conversion Rate:</dt>
                        <dd className="font-medium">{Math.round(attributionStats.contactStats.conversionRate * 100)}%</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">Field Coverage</h3>
                    <dl className="space-y-2">
                      {Object.entries(attributionStats.fieldCoverage)
                        .filter(([key]) => key !== 'averageCoverage')
                        .sort(([, valueA], [, valueB]) => (valueB as number) - (valueA as number))
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <dt className="capitalize">{key}:</dt>
                            <dd className="font-medium">{Math.round((value as number) * 100)}%</dd>
                          </div>
                        ))}
                      <div className="flex justify-between border-t pt-2 text-green-600">
                        <dt>Average Field Coverage:</dt>
                        <dd className="font-medium">{Math.round(attributionStats.fieldCoverage.averageCoverage * 100)}%</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No attribution data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}