import React from 'react';
import { ImprovedKPICard } from './improved-kpi-card';
import { ImprovedDateRangePicker } from './improved-date-range-picker';
import { ImprovedUserFilter } from './improved-user-filter';
import { useDashboard } from '@/providers/dashboard-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart3, Users, DollarSign, Calendar, Phone, Activity } from 'lucide-react';
import { calculatePercentChange, formatCurrency, formatNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Main dashboard component that connects to the database and displays KPIs
 */
export function ImprovedDashboard() {
  // Get dashboard data and state from context
  const { data, isLoading, error } = useDashboard();
  
  // Calculate percent changes if we have previous period data
  const contactsChange = data?.previousPeriod
    ? calculatePercentChange(data.totalContacts, data.previousPeriod.totalContacts)
    : null;
  
  const dealsChange = data?.previousPeriod
    ? calculatePercentChange(data.totalDeals, data.previousPeriod.totalDeals)
    : null;
  
  const revenueChange = data?.previousPeriod && data.revenueGenerated
    ? calculatePercentChange(data.revenueGenerated, data.previousPeriod.totalRevenue)
    : null;
  
  const cashCollectedChange = data?.previousPeriod && data.cashCollected
    ? calculatePercentChange(data.cashCollected, data.previousPeriod.cashCollected)
    : null;
  
  return (
    <div className="space-y-6">
      {/* Header with date range picker and user filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <ImprovedDateRangePicker />
          <ImprovedUserFilter />
        </div>
      </div>
      
      {/* Show error if any */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Error loading dashboard data: {error.message}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <ImprovedKPICard
          title="Total Contacts"
          value={data?.totalContacts || 0}
          percentChange={contactsChange}
          previousValue={data?.previousPeriod?.totalContacts}
          icon={<Users className="h-4 w-4" />}
          isLoading={isLoading}
          variant="contacts"
        />
        
        <ImprovedKPICard
          title="Total Deals"
          value={data?.totalDeals || 0}
          percentChange={dealsChange}
          previousValue={data?.previousPeriod?.totalDeals}
          icon={<BarChart3 className="h-4 w-4" />}
          isLoading={isLoading}
        />
        
        <ImprovedKPICard
          title="Revenue Generated"
          value={data?.revenueGenerated || 0}
          percentChange={revenueChange}
          previousValue={data?.previousPeriod?.totalRevenue}
          valuePrefix="$"
          icon={<DollarSign className="h-4 w-4" />}
          isLoading={isLoading}
          variant="revenue"
        />
        
        <ImprovedKPICard
          title="Cash Collected"
          value={data?.cashCollected || 0}
          percentChange={cashCollectedChange}
          previousValue={data?.previousPeriod?.cashCollected}
          valuePrefix="$"
          icon={<DollarSign className="h-4 w-4" />}
          isLoading={isLoading}
          variant="revenue"
        />
      </div>
      
      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <ImprovedKPICard
          title="Activities"
          value={data?.totalActivities || 0}
          icon={<Activity className="h-4 w-4" />}
          isLoading={isLoading}
        />
        
        <ImprovedKPICard
          title="Meetings"
          value={data?.totalMeetings || 0}
          icon={<Calendar className="h-4 w-4" />}
          isLoading={isLoading}
          variant="meetings"
        />
        
        <ImprovedKPICard
          title="Avg. Deal Value"
          value={data?.averageDealValue || 0}
          valuePrefix="$"
          icon={<DollarSign className="h-4 w-4" />}
          isLoading={isLoading}
          variant="revenue"
        />
      </div>
      
      {/* Team performance table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Sales Team Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Deals</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Meetings</TableHead>
                  <TableHead className="text-right">Contacts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.salesTeam && data.salesTeam.length > 0 ? (
                  data.salesTeam.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell className="text-right">{member.deals}</TableCell>
                      <TableCell className="text-right">{formatCurrency(member.revenue)}</TableCell>
                      <TableCell className="text-right">{member.meetings}</TableCell>
                      <TableCell className="text-right">{member.contacts}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                      No team data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Attribution metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Attribution Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Attribution Accuracy</span>
                <span className="font-medium">
                  {isLoading ? (
                    <Skeleton className="h-4 w-16 inline-block" />
                  ) : (
                    `${data?.attributionAccuracy || 0}%`
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Multi-Source Contacts</span>
                <span className="font-medium">
                  {isLoading ? (
                    <Skeleton className="h-4 w-16 inline-block" />
                  ) : (
                    formatNumber(data?.contactsWithMultipleSources || 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Contacts with Attribution</span>
                <span className="font-medium">
                  {isLoading ? (
                    <Skeleton className="h-4 w-16 inline-block" />
                  ) : (
                    formatNumber(data?.totalContactsWithAttribution || 0)
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Sales Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Average Deal Cycle</span>
                <span className="font-medium">
                  {isLoading ? (
                    <Skeleton className="h-4 w-16 inline-block" />
                  ) : (
                    `${data?.averageDealCycle || 0} days`
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Revenue per Deal</span>
                <span className="font-medium">
                  {isLoading ? (
                    <Skeleton className="h-4 w-16 inline-block" />
                  ) : (
                    formatCurrency(data?.revenueGenerated && data?.totalDeals ? 
                      data?.revenueGenerated / (data?.totalDeals || 1) : 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Deals per Contact</span>
                <span className="font-medium">
                  {isLoading ? (
                    <Skeleton className="h-4 w-16 inline-block" />
                  ) : (
                    (data?.totalDeals && data?.totalContacts ? 
                      (data.totalDeals / (data.totalContacts || 1)).toFixed(2) : '0.00')
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}