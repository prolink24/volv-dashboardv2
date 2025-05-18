import React from 'react';
import { 
  Activity, 
  CreditCard, 
  DollarSign, 
  Users, 
  CalendarClock,
  Briefcase 
} from 'lucide-react';
import { ImprovedKPICard } from './improved-kpi-card';
import { ImprovedDateRangePicker } from './improved-date-range-picker';
import { ImprovedUserFilter } from './improved-user-filter';
import { ImprovedPerformanceTable } from './improved-performance-table';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import { SalesTeamMember } from '@/hooks/use-dashboard-data';

/**
 * Main Dashboard Component
 * 
 * Displays KPI cards, date range picker, user filter, and performance table
 * using data from the dashboard provider
 */
export function ImprovedDashboard() {
  const { 
    totalContacts,
    totalRevenue,
    totalCashCollected,
    totalDeals,
    totalMeetings,
    totalActivities,
    conversionRate,
    multiSourceRate,
    cashCollectedRate,
    salesTeam,
    isLoading,
    previousPeriod,
    selectedUserId,
    selectUser
  } = useDashboardData();

  return (
    <div className="space-y-8">
      <div className="flex flex-col-reverse md:flex-row md:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full md:w-auto">
          <div className="md:w-[280px]">
            <ImprovedDateRangePicker />
          </div>
          <div className="md:w-[250px]">
            <ImprovedUserFilter 
              users={salesTeam} 
              selectedUserId={selectedUserId} 
              onSelectUser={selectUser} 
            />
          </div>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ImprovedKPICard
          title="Total Contacts"
          currentValue={totalContacts?.current}
          previousValue={previousPeriod ? totalContacts?.previous : undefined}
          formatter={formatNumber}
          icon={<Users className="h-4 w-4" />}
          help="Total number of contacts in the CRM system"
          isLoading={isLoading}
        />
        <ImprovedKPICard
          title="Total Revenue"
          currentValue={totalRevenue?.current}
          previousValue={previousPeriod ? totalRevenue?.previous : undefined}
          formatter={formatCurrency}
          icon={<DollarSign className="h-4 w-4" />}
          help="Sum of all deal values for the selected period"
          isLoading={isLoading}
        />
        <ImprovedKPICard
          title="Cash Collected"
          currentValue={totalCashCollected?.current}
          previousValue={previousPeriod ? totalCashCollected?.previous : undefined}
          formatter={formatCurrency}
          icon={<CreditCard className="h-4 w-4" />}
          help="Total cash collected from won deals"
          isLoading={isLoading}
        />
        <ImprovedKPICard
          title="Total Deals"
          currentValue={totalDeals?.current}
          previousValue={previousPeriod ? totalDeals?.previous : undefined}
          formatter={formatNumber}
          icon={<Briefcase className="h-4 w-4" />}
          help="Number of deals created in the selected period"
          isLoading={isLoading}
        />
        <ImprovedKPICard
          title="Total Meetings"
          currentValue={totalMeetings?.current}
          previousValue={previousPeriod ? totalMeetings?.previous : undefined}
          formatter={formatNumber}
          icon={<CalendarClock className="h-4 w-4" />}
          help="Number of meetings scheduled in the selected period"
          isLoading={isLoading}
        />
        <ImprovedKPICard
          title="Total Activities"
          currentValue={totalActivities?.current}
          previousValue={previousPeriod ? totalActivities?.previous : undefined}
          formatter={formatNumber}
          icon={<Activity className="h-4 w-4" />}
          help="Number of activities (calls, emails, tasks) in the selected period"
          isLoading={isLoading}
        />
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <ImprovedKPICard
          title="Deal Conversion Rate"
          currentValue={conversionRate?.current}
          previousValue={previousPeriod ? conversionRate?.previous : undefined}
          formatter={formatPercent}
          help="Percentage of contacts that have deals"
          isLoading={isLoading}
        />
        <ImprovedKPICard
          title="Multi-Source Rate"
          currentValue={multiSourceRate?.current}
          previousValue={previousPeriod ? multiSourceRate?.previous : undefined}
          formatter={formatPercent}
          help="Percentage of contacts with data from multiple platforms"
          isLoading={isLoading}
        />
        <ImprovedKPICard
          title="Cash Collected Rate"
          currentValue={cashCollectedRate?.current}
          previousValue={previousPeriod ? cashCollectedRate?.previous : undefined}
          formatter={formatPercent}
          help="Percentage of won deals with cash collected values"
          isLoading={isLoading}
        />
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Team Performance</h2>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ImprovedPerformanceTable salesTeam={salesTeam} />
        )}
      </div>
    </div>
  );
}