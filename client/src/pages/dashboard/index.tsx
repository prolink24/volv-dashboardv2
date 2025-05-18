import React from 'react';
import { ImprovedDashboard } from '@/components/dashboard/improved-dashboard';
import { DateContextProvider } from '@/providers/date-context';
import { DashboardProvider } from '@/providers/dashboard-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Main Dashboard Page
 * 
 * This page serves as the container for the dashboard, wrapping it with
 * the necessary context providers for date filtering and data fetching.
 */
export default function DashboardPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Contact Attribution Dashboard</h1>
        <p className="text-muted-foreground">
          Track key performance indicators and measure attribution across all channels
        </p>
      </div>
      
      <DateContextProvider>
        <DashboardProvider>
          <div className="grid gap-6">
            <ImprovedDashboard />
            
            {/* Additional info section */}
            <Card>
              <CardHeader>
                <CardTitle>About This Dashboard</CardTitle>
                <CardDescription>
                  How to interpret the data shown above
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-4">
                <p>
                  This dashboard shows attribution data from across multiple sources:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Close CRM</strong> - Contact and deal information</li>
                  <li><strong>Calendly</strong> - Meeting scheduling and attendance</li>
                  <li><strong>Typeform</strong> - Form submissions and responses</li>
                </ul>
                <p>
                  Use the date range picker to select different time periods, and toggle 
                  the comparison option to see period-over-period changes. Filter by team 
                  member to view individual performance metrics.
                </p>
                <p>
                  The attribution metrics section shows how well we're connecting contacts 
                  across different platforms, giving you a complete picture of each customer's 
                  journey.
                </p>
              </CardContent>
            </Card>
          </div>
        </DashboardProvider>
      </DateContextProvider>
    </div>
  );
}