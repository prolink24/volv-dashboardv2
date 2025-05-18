import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ImprovedKPICard } from '@/components/dashboard/improved-kpi-card';
import { ImprovedStatsCard } from '@/components/dashboard/improved-stats-card';
import { ImprovedDateRangePicker } from '@/components/dashboard/improved-date-range-picker';
import { ImprovedUserFilter } from '@/components/dashboard/improved-user-filter';
import { useDashboard } from '@/providers/dashboard-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, 
  DollarSign, 
  Download, 
  LayoutDashboard, 
  Phone, 
  RefreshCw, 
  UserRoundPlus, 
  Users,
  Calendar,
  LineChart,
  TrendingUp,
  Activity,
  CheckCircle,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import { format } from 'date-fns';
import { syncData } from '@/hooks/use-dashboard-data';

interface ImprovedDashboardProps {
  className?: string;
}

export function ImprovedDashboard({ className }: ImprovedDashboardProps) {
  const { 
    dashboardData, 
    attributionStats, 
    isLoading, 
    refreshDashboard,
    useEnhancedMode,
    setUseEnhancedMode 
  } = useDashboard();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Function to handle dashboard refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // First attempt to sync data from external sources
    await syncData();
    // Then refresh the dashboard data
    await refreshDashboard();
    setIsRefreshing(false);
  };
  
  // Function to handle enhanced mode toggle
  const handleEnhancedModeToggle = () => {
    setUseEnhancedMode(!useEnhancedMode);
  };
  
  return (
    <div className={cn('flex flex-col gap-6 p-4 md:p-8', className)}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            View your contact attribution metrics and KPIs
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <ImprovedDateRangePicker />
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          
          <Button
            variant={useEnhancedMode ? 'default' : 'outline'}
            size="sm"
            onClick={handleEnhancedModeToggle}
          >
            {useEnhancedMode ? 'Enhanced Mode' : 'Standard Mode'}
          </Button>
        </div>
      </header>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="attribution" className="flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              Attribution
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <ImprovedUserFilter />
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        
        {/* Overview Tab Content */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ImprovedKPICard
              title="Total Revenue"
              value={dashboardData?.kpis.revenue.current || 0}
              previousValue={dashboardData?.kpis.revenue.previous || 0}
              change={dashboardData?.kpis.revenue.change || 0}
              formatType="currency"
              icon={<DollarSign className="h-4 w-4" />}
              isLoading={isLoading}
            />
            
            <ImprovedKPICard
              title="Cash Collected"
              value={dashboardData?.kpis.cashCollected.current || 0}
              previousValue={dashboardData?.kpis.cashCollected.previous || 0}
              change={dashboardData?.kpis.cashCollected.change || 0}
              formatType="currency"
              icon={<DollarSign className="h-4 w-4" />}
              isLoading={isLoading}
            />
            
            <ImprovedKPICard
              title="Total Deals"
              value={dashboardData?.kpis.deals.current || 0}
              previousValue={dashboardData?.kpis.deals.previous || 0}
              change={dashboardData?.kpis.deals.change || 0}
              formatType="number"
              icon={<BarChart3 className="h-4 w-4" />}
              isLoading={isLoading}
            />
            
            <ImprovedKPICard
              title="Total Meetings"
              value={dashboardData?.kpis.meetings.current || 0}
              previousValue={dashboardData?.kpis.meetings.previous || 0}
              change={dashboardData?.kpis.meetings.change || 0}
              formatType="number"
              icon={<Calendar className="h-4 w-4" />}
              isLoading={isLoading}
            />
          </div>
          
          {/* Secondary KPI Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ImprovedKPICard
              title="Closing Rate"
              value={dashboardData?.kpis.closingRate || 0}
              formatType="percentage"
              icon={<TrendingUp className="h-4 w-4" />}
              isLoading={isLoading}
              size="sm"
            />
            
            <ImprovedKPICard
              title="Solution Call Show Rate"
              value={dashboardData?.kpis.solutionCallShowRate || 0}
              formatType="percentage"
              icon={<CheckCircle className="h-4 w-4" />}
              isLoading={isLoading}
              size="sm"
            />
            
            <ImprovedKPICard
              title="Avg. Cash Collected"
              value={dashboardData?.kpis.avgCashCollected || 0}
              formatType="currency"
              icon={<DollarSign className="h-4 w-4" />}
              isLoading={isLoading}
              size="sm"
            />
          </div>
          
          {/* Attribution Stats and Timeline */}
          <div className="grid gap-4 md:grid-cols-7">
            <Card className="md:col-span-5">
              <CardHeader>
                <CardTitle>Revenue Timeline</CardTitle>
                <CardDescription>
                  Monthly revenue over the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] w-full animate-pulse bg-muted rounded" />
                ) : dashboardData?.timelineData?.length ? (
                  <div className="h-[300px]">
                    {/* Timeline chart would go here */}
                    <p className="text-sm text-muted-foreground">
                      Chart showing revenue for each date in the selected period.
                    </p>
                    <div className="mt-2 space-y-2">
                      {dashboardData.timelineData.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="text-sm">{format(new Date(item.date), 'MMM d, yyyy')}</div>
                          <div className="font-medium">${item.revenue.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-sm text-muted-foreground">No timeline data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="grid gap-4 md:col-span-2">
              <ImprovedStatsCard
                title="Multi-Source Rate"
                statValue={`${attributionStats?.sourceDistribution.multiSourceRate || 0}%`}
                description="Contacts with multiple data sources"
                icon={<TrendingUp className="h-4 w-4" />}
                isLoading={isLoading}
              />
              
              <ImprovedStatsCard
                title="Field Coverage"
                statValue={`${attributionStats?.fieldCoverage.coverageRate || 0}%`}
                description="Completeness of contact data fields"
                icon={<CheckCircle className="h-4 w-4" />}
                isLoading={isLoading}
              />
              
              <ImprovedStatsCard
                title="Total Touchpoints"
                statValue={attributionStats?.totalTouchpoints || 0}
                description={`Avg: ${attributionStats?.touchpointStats.average.toFixed(1)} per contact`}
                icon={<Activity className="h-4 w-4" />}
                isLoading={isLoading}
              />
            </div>
          </div>
          
          {/* Top Deals */}
          <Card>
            <CardHeader>
              <CardTitle>Top Deals</CardTitle>
              <CardDescription>
                Your highest value opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse bg-muted rounded" />
                  ))}
                </div>
              ) : dashboardData?.topDeals?.length ? (
                <div className="space-y-4">
                  {dashboardData.topDeals.slice(0, 5).map((deal) => (
                    <div key={deal.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="space-y-1">
                          <p className="font-medium">{deal.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {deal.stage} · {deal.owner}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="mr-4 text-right">
                          <p className="font-medium">${deal.value.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {deal.closeDate ? format(new Date(deal.closeDate), 'MMM d, yyyy') : 'No close date'}
                          </p>
                        </div>
                        {deal.status === 'won' ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        ) : deal.status === 'lost' ? (
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center">
                  <p className="text-sm text-muted-foreground">No deals available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Attribution Tab Content */}
        <TabsContent value="attribution" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Attribution Accuracy</CardTitle>
                <CardDescription>
                  Overall accuracy of contact attribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold">
                    {isLoading ? (
                      <div className="h-9 w-16 mx-auto animate-pulse bg-muted rounded" />
                    ) : (
                      `${attributionStats?.attributionAccuracy || 0}%`
                    )}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Based on data consistency and completeness
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Contact Sources</CardTitle>
                <CardDescription>
                  Distribution of contact data sources
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-6 animate-pulse bg-muted rounded" />
                    <div className="h-6 animate-pulse bg-muted rounded" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>Single Source</div>
                      <div className="font-medium">{attributionStats?.sourceDistribution.singleSource || 0}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>Multi Source</div>
                      <div className="font-medium">{attributionStats?.sourceDistribution.multiSource || 0}</div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>Multi-Source Rate</div>
                      <div className="font-medium">{attributionStats?.sourceDistribution.multiSourceRate || 0}%</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Channel Distribution</CardTitle>
                <CardDescription>
                  Contact attribution by channel
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array(4).fill(0).map((_, i) => (
                      <div key={i} className="h-6 animate-pulse bg-muted rounded" />
                    ))}
                  </div>
                ) : attributionStats?.channelDistribution && Object.keys(attributionStats.channelDistribution).length ? (
                  <div className="space-y-2">
                    {Object.entries(attributionStats.channelDistribution)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 4)
                      .map(([channel, count]) => (
                        <div key={channel} className="flex items-center justify-between">
                          <div className="capitalize">{channel}</div>
                          <div className="font-medium">{count}</div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex h-[100px] items-center justify-center">
                    <p className="text-sm text-muted-foreground">No channel data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Contact Attribution Stats</CardTitle>
              <CardDescription>
                Key metrics about your contact attribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse bg-muted rounded" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <h3 className="font-medium">Contact Stats</h3>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <div className="text-sm">Total Contacts</div>
                        <div className="text-sm font-medium">{attributionStats?.contactStats.totalContacts || 0}</div>
                      </div>
                      <div className="flex justify-between">
                        <div className="text-sm">With Deals</div>
                        <div className="text-sm font-medium">{attributionStats?.contactStats.contactsWithDeals || 0}</div>
                      </div>
                      <div className="flex justify-between">
                        <div className="text-sm">With Meetings</div>
                        <div className="text-sm font-medium">{attributionStats?.contactStats.contactsWithMeetings || 0}</div>
                      </div>
                      <div className="flex justify-between">
                        <div className="text-sm">With Forms</div>
                        <div className="text-sm font-medium">{attributionStats?.contactStats.contactsWithForms || 0}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium">Field Coverage</h3>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <div className="text-sm">Total Fields</div>
                        <div className="text-sm font-medium">{attributionStats?.fieldCoverage.total || 0}</div>
                      </div>
                      <div className="flex justify-between">
                        <div className="text-sm">Covered Fields</div>
                        <div className="text-sm font-medium">{attributionStats?.fieldCoverage.covered || 0}</div>
                      </div>
                      <div className="flex justify-between">
                        <div className="text-sm">Coverage Rate</div>
                        <div className="text-sm font-medium">{attributionStats?.fieldCoverage.coverageRate || 0}%</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium">Touchpoint Stats</h3>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <div className="text-sm">Total Touchpoints</div>
                        <div className="text-sm font-medium">{attributionStats?.touchpointStats.total || 0}</div>
                      </div>
                      <div className="flex justify-between">
                        <div className="text-sm">Average per Contact</div>
                        <div className="text-sm font-medium">{attributionStats?.touchpointStats.average.toFixed(1) || 0}</div>
                      </div>
                      <div className="flex justify-between">
                        <div className="text-sm">Maximum Touchpoints</div>
                        <div className="text-sm font-medium">{attributionStats?.touchpointStats.max || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Team Tab Content */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Team Performance</CardTitle>
              <CardDescription>
                Individual metrics for each team member
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse bg-muted rounded" />
                  ))}
                </div>
              ) : dashboardData?.salesTeam?.length ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-5 gap-4 font-medium text-sm">
                    <div>Name</div>
                    <div>Role</div>
                    <div className="text-right">Deals</div>
                    <div className="text-right">Revenue</div>
                    <div className="text-right">Activities</div>
                  </div>
                  <Separator />
                  {dashboardData.salesTeam.map((member) => (
                    <div key={member.id} className="grid grid-cols-5 gap-4 text-sm">
                      <div className="font-medium">{member.name}</div>
                      <div className="text-muted-foreground">{member.role}</div>
                      <div className="text-right">{member.deals}</div>
                      <div className="text-right">${member.revenue.toLocaleString()}</div>
                      <div className="text-right">{member.activities}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center">
                  <p className="text-sm text-muted-foreground">No team data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Data Refresh Info */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Dashboard Mode: {useEnhancedMode ? 'Enhanced' : 'Standard'}
        </div>
        <div className="text-xs text-muted-foreground">
          Data retrieved {format(new Date(), 'MMM d, yyyy h:mm a')}
        </div>
      </div>
    </div>
  );
}