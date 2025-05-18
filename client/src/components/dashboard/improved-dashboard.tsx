import React from 'react';
import { useDashboardData, type DashboardData } from '@/hooks/use-dashboard-data';
import { ImprovedKpiCard } from './improved-kpi-card';
import { ImprovedDateRangePicker } from './improved-date-range-picker';
import { ImprovedUserFilter } from './improved-user-filter';
import { ImprovedPerformanceTable } from './improved-performance-table';
import { useDateContext } from '@/providers/date-context';
import { useDashboard } from '@/providers/dashboard-provider';

/**
 * Improved Dashboard Component
 * 
 * Main dashboard component displaying KPI cards, filters, and performance table
 */
export function ImprovedDashboard() {
  const { startDate, endDate, comparePreviousPeriod } = useDateContext();
  const { salesTeam, isLoading, isError } = useDashboard();

  // Fetch dashboard data using the hook
  const { dashboardData } = useDashboardData();

  if (isError) {
    return (
      <div className="p-6 bg-red-50 rounded-lg shadow-sm">
        <h2 className="text-lg font-bold text-red-700">Error loading dashboard data</h2>
        <p className="text-red-600">
          There was a problem fetching the data from the server. Please try again later.
        </p>
      </div>
    );
  }

  // Prepare the date range display text
  const dateRangeText = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Performance metrics for {dateRangeText}
          {comparePreviousPeriod && ' with comparison to previous period'}
        </p>
      </div>

      {/* Filters Section */}
      <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
        <ImprovedDateRangePicker />
        <ImprovedUserFilter />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <ImprovedKpiCard
          title="Total Contacts"
          value={dashboardData?.totalContacts.current || 0}
          previousValue={dashboardData?.totalContacts.previous}
          change={dashboardData?.totalContacts.change}
          icon="users"
          loading={isLoading}
        />
        <ImprovedKpiCard
          title="Total Revenue"
          value={dashboardData?.totalRevenue.current || 0}
          previousValue={dashboardData?.totalRevenue.previous}
          change={dashboardData?.totalRevenue.change}
          type="currency"
          icon="dollar"
          loading={isLoading}
        />
        <ImprovedKpiCard
          title="Cash Collected"
          value={dashboardData?.totalCashCollected.current || 0}
          previousValue={dashboardData?.totalCashCollected.previous}
          change={dashboardData?.totalCashCollected.change}
          type="currency"
          icon="dollar"
          loading={isLoading}
        />
        <ImprovedKpiCard
          title="Total Deals"
          value={dashboardData?.totalDeals.current || 0}
          previousValue={dashboardData?.totalDeals.previous}
          change={dashboardData?.totalDeals.change}
          icon="deals"
          loading={isLoading}
        />
        <ImprovedKpiCard
          title="Meetings"
          value={dashboardData?.totalMeetings.current || 0}
          previousValue={dashboardData?.totalMeetings.previous}
          change={dashboardData?.totalMeetings.change}
          icon="meetings"
          loading={isLoading}
        />
        <ImprovedKpiCard
          title="Activities"
          value={dashboardData?.totalActivities.current || 0}
          previousValue={dashboardData?.totalActivities.previous}
          change={dashboardData?.totalActivities.change}
          icon="activities"
          loading={isLoading}
        />
        <ImprovedKpiCard
          title="Conversion Rate"
          value={dashboardData?.conversionRate.current || 0}
          previousValue={dashboardData?.conversionRate.previous}
          change={dashboardData?.conversionRate.change}
          type="percent"
          icon="percent"
          loading={isLoading}
        />
        <ImprovedKpiCard
          title="Multi-Source Rate"
          value={dashboardData?.multiSourceRate.current || 0}
          previousValue={dashboardData?.multiSourceRate.previous}
          change={dashboardData?.multiSourceRate.change}
          type="percent"
          icon="percent"
          loading={isLoading}
        />
      </div>

      {/* Performance Table */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Sales Team Performance</h2>
        {salesTeam && salesTeam.length > 0 ? (
          <ImprovedPerformanceTable salesTeam={salesTeam} />
        ) : isLoading ? (
          <div className="w-full h-16 bg-gray-200 animate-pulse rounded"></div>
        ) : (
          <p className="text-gray-600">No sales team data available for the selected period.</p>
        )}
      </div>
    </div>
  );
}