import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles, TrendingUp, TrendingDown, Users, Clock, Calendar, Layers, DollarSign, Info, MessageSquare } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Define the type for the analytics data to be displayed
interface JourneyAnalyticsProps {
  contactId: number;
  engagementScore: number; 
  lastActivityGap: number | null;
  averageResponseTime: number | null;
  conversionRate: number | null;
  leadStatus: string;
  journeyLength: number | null;
  stageTransitions: {
    fromStage: string;
    toStage: string;
    daysInStage: number;
    timestamp: Date;
  }[];
  callMetrics: {
    totalCalls: number;
    callsToClose: number;
    solutionCallShowRate: number;
    triageShowRate: number;
    pickUpRate: number;
    speedToLead: number | null;
  };
  salesMetrics: {
    closedWon: number;
    salesCycleDays: number | null;
    solutionCallCloseRate: number;
  };
  sources: {[key: string]: number};
  assignedUsers: {
    userId: number;
    name: string;
    email: string;
    role: string;
    assignmentType: string;
    totalInteractions: number;
  }[];
  totalTouchpoints: number;
}

// Format a duration in days/hours/minutes
const formatDuration = (minutes: number | null) => {
  if (minutes === null) return 'N/A';
  
  if (minutes < 60) {
    return `${Math.round(minutes)} minutes`;
  } else if (minutes < 1440) { // Less than a day
    return `${Math.round(minutes / 60)} hours`;
  } else {
    return `${Math.round(minutes / 1440)} days`;
  }
};

// Format a percentage value
const formatPercentage = (value: number | null) => {
  if (value === null) return 'N/A';
  return `${Math.round(value * 100)}%`;
};

// Get color class based on value comparison to benchmark
const getComparisonColor = (value: number | null, benchmark: number, higherIsBetter: boolean = true) => {
  if (value === null) return 'text-muted-foreground';
  
  const comparison = value - benchmark;
  if (Math.abs(comparison) < benchmark * 0.1) return 'text-amber-500'; // Within 10% of benchmark
  
  if (higherIsBetter) {
    return comparison > 0 ? 'text-green-500' : 'text-red-500';
  } else {
    return comparison < 0 ? 'text-green-500' : 'text-red-500';
  }
};

// Helper function to get background color for source
const getSourceColor = (source: string): string => {
  const sourceLower = source.toLowerCase();
  if (sourceLower === 'close') return 'bg-blue-500';
  if (sourceLower === 'calendly') return 'bg-green-500';
  if (sourceLower === 'typeform') return 'bg-purple-500';
  return 'bg-gray-500';
};

export function JourneyAnalytics({
  contactId,
  engagementScore,
  lastActivityGap,
  averageResponseTime,
  conversionRate,
  leadStatus,
  journeyLength,
  stageTransitions,
  callMetrics,
  salesMetrics,
  sources,
  assignedUsers,
  totalTouchpoints
}: JourneyAnalyticsProps) {
  
  // Prepare data for source breakdown chart
  const sourceChartData = Object.entries(sources).map(([source, count]) => ({
    name: source,
    value: count,
    percent: Math.round((count / totalTouchpoints) * 100)
  }));
  
  // Prepare data for stage transitions chart
  const stageTransitionData = stageTransitions.map((transition) => ({
    name: transition.toStage,
    days: transition.daysInStage,
    timestamp: new Date(transition.timestamp).toLocaleDateString()
  }));
  
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid grid-cols-4 mb-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="engagement">Engagement</TabsTrigger>
        <TabsTrigger value="conversion">Conversion</TabsTrigger>
        <TabsTrigger value="attribution">Attribution</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Engagement Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                Engagement Score
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Measures overall engagement based on interactions across all platforms</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{engagementScore}/100</div>
              <Progress value={engagementScore} className="h-2 mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {engagementScore >= 70 ? (
                  <span className="text-green-500 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    High engagement level
                  </span>
                ) : engagementScore >= 40 ? (
                  <span className="text-amber-500 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Moderate engagement
                  </span>
                ) : (
                  <span className="text-red-500 flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    Low engagement level
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
          
          {/* Total Touchpoints */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Touchpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTouchpoints}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Across {Object.keys(sources).length} different sources
              </p>
            </CardContent>
          </Card>
          
          {/* Last Activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lastActivityGap !== null ? formatDuration(lastActivityGap) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Time since last touchpoint
              </p>
            </CardContent>
          </Card>
          
          {/* Journey Length */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Journey Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {journeyLength !== null ? formatDuration(journeyLength) : 'New'}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                From first touch to now
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Current Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Journey Overview</CardTitle>
            <CardDescription>
              Current status and key metrics for this contact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Lead Status */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Current Status</h4>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    leadStatus === 'customer' ? 'default' : 
                    leadStatus === 'qualified' ? 'outline' :
                    leadStatus === 'disqualified' ? 'destructive' : 'secondary'
                  } className="capitalize">
                    {leadStatus}
                  </Badge>
                </div>
                
                <h4 className="text-sm font-medium mt-4">Sales Cycle</h4>
                <div>
                  <div className="text-sm flex justify-between">
                    <span>Cycle Days:</span>
                    <span className="font-medium">
                      {salesMetrics.salesCycleDays !== null ? `${salesMetrics.salesCycleDays} days` : 'N/A'}
                    </span>
                  </div>
                  <div className="text-sm flex justify-between">
                    <span>Deals Won:</span>
                    <span className="font-medium">{salesMetrics.closedWon}</span>
                  </div>
                  <div className="text-sm flex justify-between">
                    <span>Solution Call Rate:</span>
                    <span className="font-medium">{formatPercentage(salesMetrics.solutionCallCloseRate)}</span>
                  </div>
                </div>
              </div>
              
              {/* Source Distribution */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Source Distribution</h4>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={sourceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value, name, props) => [`${value} touchpoints (${props.payload.percent}%)`, props.payload.name]}
                    />
                    <Bar dataKey="value" fill="#3b82f6" name="Touchpoints" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Assigned Users */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Assigned Team Members</h4>
                <ScrollArea className="h-[160px]">
                  <div className="space-y-3">
                    {assignedUsers.length > 0 ? assignedUsers.map((user) => (
                      <div key={user.userId} className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.role}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {user.assignmentType}
                            </Badge>
                            <span className="text-xs">{user.totalInteractions} interactions</span>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        No team members assigned
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="engagement" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Engagement Analysis</CardTitle>
            <CardDescription>
              Detailed breakdown of engagement metrics and benchmarks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Response Metrics</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Average Response Time</span>
                      <span className={`text-sm font-medium ${getComparisonColor(averageResponseTime, 60, false)}`}>
                        {averageResponseTime !== null ? `${Math.round(averageResponseTime)} min` : 'N/A'}
                      </span>
                    </div>
                    {averageResponseTime !== null && (
                      <Progress value={Math.min(100, (120 - averageResponseTime) / 1.2)} className="h-2" />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Benchmark: 60 min</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Last Activity Gap</span>
                      <span className={`text-sm font-medium ${getComparisonColor(lastActivityGap, 1440, false)}`}>
                        {lastActivityGap !== null ? formatDuration(lastActivityGap) : 'N/A'}
                      </span>
                    </div>
                    {lastActivityGap !== null && (
                      <Progress value={Math.min(100, (2880 - lastActivityGap) / 28.8)} className="h-2" />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Benchmark: 1 day</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Speed To Lead</span>
                      <span className={`text-sm font-medium ${callMetrics.speedToLead < 0 ? 'text-green-500' : getComparisonColor(callMetrics.speedToLead, 15, false)}`}>
                        {callMetrics.speedToLead !== null ? `${Math.abs(Math.round(callMetrics.speedToLead))} min${callMetrics.speedToLead < 0 ? ' (proactive)' : ''}` : 'N/A'}
                      </span>
                    </div>
                    {callMetrics.speedToLead !== null && (
                      <Progress 
                        value={callMetrics.speedToLead < 0 ? 100 : Math.min(100, (60 - callMetrics.speedToLead) / 0.6)} 
                        className={`h-2 ${callMetrics.speedToLead < 0 ? 'bg-green-500' : ''}`} 
                      />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Benchmark: 15 min</p>
                  </div>
                </div>
                
                <h3 className="text-lg font-medium mt-8 mb-4">Call Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-2">Call Show Rates</h4>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Solution Calls</span>
                          <span className="font-medium">{formatPercentage(callMetrics.solutionCallShowRate)}</span>
                        </div>
                        <Progress value={callMetrics.solutionCallShowRate !== null ? callMetrics.solutionCallShowRate * 100 : 0} className="h-1" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Triage Calls</span>
                          <span className="font-medium">{formatPercentage(callMetrics.triageShowRate)}</span>
                        </div>
                        <Progress value={callMetrics.triageShowRate !== null ? callMetrics.triageShowRate * 100 : 0} className="h-1" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-2">Call Efficiency</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Pick-up Rate</span>
                        <span className="font-medium">{formatPercentage(callMetrics.pickUpRate)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Total Calls</span>
                        <span className="font-medium">{callMetrics.totalCalls}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Calls to Close</span>
                        <span className="font-medium">{callMetrics.callsToClose}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Engagement Score Breakdown</h3>
                <Card className="bg-muted/20">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <div className="text-3xl font-bold">{engagementScore}/100</div>
                        <div className="text-sm text-muted-foreground">Overall Score</div>
                      </div>
                      <div className={`text-lg font-semibold ${
                        engagementScore >= 70 ? 'text-green-500' : 
                        engagementScore >= 40 ? 'text-amber-500' : 
                        'text-red-500'
                      }`}>
                        {engagementScore >= 70 ? 'High' : 
                        engagementScore >= 40 ? 'Medium' : 
                        'Low'}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Recency</span>
                          <span className="text-sm font-medium">
                            {lastActivityGap !== null ? 
                              lastActivityGap < 1440 ? '25/25' : 
                              lastActivityGap < 4320 ? '15/25' : 
                              lastActivityGap < 10080 ? '10/25' : '5/25'
                            : 'N/A'}
                          </span>
                        </div>
                        <Progress 
                          value={lastActivityGap !== null ? 
                            lastActivityGap < 1440 ? 100 : 
                            lastActivityGap < 4320 ? 60 : 
                            lastActivityGap < 10080 ? 40 : 20
                          : 0} 
                          className="h-2" 
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Frequency</span>
                          <span className="text-sm font-medium">
                            {totalTouchpoints > 10 ? '25/25' :
                             totalTouchpoints > 5 ? '20/25' :
                             totalTouchpoints > 2 ? '15/25' : '10/25'}
                          </span>
                        </div>
                        <Progress 
                          value={
                            totalTouchpoints > 10 ? 100 :
                            totalTouchpoints > 5 ? 80 :
                            totalTouchpoints > 2 ? 60 : 40
                          } 
                          className="h-2" 
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Cross-Platform</span>
                          <span className="text-sm font-medium">
                            {Object.keys(sources).length > 2 ? '25/25' :
                             Object.keys(sources).length === 2 ? '20/25' : '10/25'}
                          </span>
                        </div>
                        <Progress 
                          value={
                            Object.keys(sources).length > 2 ? 100 :
                            Object.keys(sources).length === 2 ? 80 : 40
                          } 
                          className="h-2" 
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Conversion Actions</span>
                          <span className="text-sm font-medium">
                            {(callMetrics.totalCalls > 0 || salesMetrics.closedWon > 0) ? '25/25' : '0/25'}
                          </span>
                        </div>
                        <Progress 
                          value={(callMetrics.totalCalls > 0 || salesMetrics.closedWon > 0) ? 100 : 0} 
                          className="h-2" 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <h3 className="text-lg font-medium mt-8 mb-4">Engagement Trends</h3>
                {stageTransitions.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={stageTransitionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip 
                        formatter={(value, name, props) => [`${value} days`, `Time in ${props.payload.name}`]}
                      />
                      <Line type="monotone" dataKey="days" stroke="#3b82f6" name="Days in Stage" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="border rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">No stage transitions recorded yet</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="conversion" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Conversion Analysis</CardTitle>
            <CardDescription>
              Performance metrics throughout the sales funnel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Conversion Metrics</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Conversion Rate</span>
                      <span className={`text-sm font-medium ${getComparisonColor(conversionRate, 0.2)}`}>
                        {formatPercentage(conversionRate)}
                      </span>
                    </div>
                    {conversionRate !== null && (
                      <Progress value={conversionRate * 100} className="h-2" />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Benchmark: 20%</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Solution Call Close Rate</span>
                      <span className={`text-sm font-medium ${getComparisonColor(salesMetrics.solutionCallCloseRate, 0.3)}`}>
                        {formatPercentage(salesMetrics.solutionCallCloseRate)}
                      </span>
                    </div>
                    {salesMetrics.solutionCallCloseRate !== null && (
                      <Progress value={salesMetrics.solutionCallCloseRate * 100} className="h-2" />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Benchmark: 30%</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Sales Cycle Length</span>
                      <span className={`text-sm font-medium ${getComparisonColor(salesMetrics.salesCycleDays, 30, false)}`}>
                        {salesMetrics.salesCycleDays !== null ? `${salesMetrics.salesCycleDays} days` : 'N/A'}
                      </span>
                    </div>
                    {salesMetrics.salesCycleDays !== null && (
                      <Progress value={Math.min(100, (60 - salesMetrics.salesCycleDays) / 0.6)} className="h-2" />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Benchmark: 30 days</p>
                  </div>
                </div>
                
                <h3 className="text-lg font-medium mt-8 mb-4">Current Funnel Position</h3>
                <div className="relative h-64 w-full bg-muted/30 rounded-lg p-4">
                  <div className="absolute inset-x-0 top-0 h-20 bg-green-100 dark:bg-green-900/20 rounded-t-lg flex items-center justify-center">
                    <span className="text-sm font-medium">Awareness</span>
                  </div>
                  <div className="absolute inset-x-0 top-20 h-16 bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <span className="text-sm font-medium">Interest</span>
                  </div>
                  <div className="absolute inset-x-0 top-36 h-12 bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                    <span className="text-sm font-medium">Consideration</span>
                  </div>
                  <div className="absolute inset-x-0 top-48 h-8 bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <span className="text-sm font-medium">Decision</span>
                  </div>
                  <div className="absolute inset-x-0 top-56 h-8 bg-red-100 dark:bg-red-900/20 rounded-b-lg flex items-center justify-center">
                    <span className="text-sm font-medium">Action</span>
                  </div>
                  
                  {/* Position marker */}
                  <div 
                    className="absolute left-0 right-0 h-1 bg-primary z-10"
                    style={{
                      top: leadStatus === 'customer' ? '60px' : 
                           leadStatus === 'qualified' ? '110px' :
                           leadStatus === 'prospect' ? '150px' :
                           stageTransitions.length > 0 ? '180px' : '40px'
                    }}
                  />
                  
                  <div 
                    className="absolute right-4 z-20 bg-background text-primary border border-primary rounded-full w-6 h-6 flex items-center justify-center shadow-md"
                    style={{
                      top: leadStatus === 'customer' ? '56px' : 
                           leadStatus === 'qualified' ? '106px' :
                           leadStatus === 'prospect' ? '146px' :
                           stageTransitions.length > 0 ? '176px' : '36px'
                    }}
                  >
                    <span className="text-xs">•</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Journey Stage Analysis</h3>
                {stageTransitions.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/30 p-3">
                      <h4 className="text-sm font-medium">Stage Progression</h4>
                    </div>
                    <div className="p-4">
                      <ul className="space-y-6 relative">
                        {/* Vertical line connecting timeline items */}
                        <div className="absolute left-2.5 top-0 bottom-6 w-0.5 bg-muted-foreground/20"></div>
                        
                        {stageTransitions.map((transition, index) => (
                          <li key={index} className="relative pl-8">
                            {/* Timeline marker */}
                            <div className="absolute left-0 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                              <span className="text-xs font-bold">{index + 1}</span>
                            </div>
                            
                            <div className="flex flex-col">
                              <div className="font-medium">
                                {transition.toStage}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(transition.timestamp).toLocaleDateString()}
                                {index > 0 && (
                                  <span> • {transition.daysInStage} days in previous stage</span>
                                )}
                              </div>
                              {index < stageTransitions.length - 1 && (
                                <div className="text-xs mt-1">
                                  Time to next stage: <span className="font-medium">
                                    {stageTransitions[index + 1].daysInStage} days
                                  </span>
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">No stage transitions recorded yet</p>
                  </div>
                )}
                
                <Separator className="my-6" />
                
                <h3 className="text-lg font-medium mb-4">Benchmarks Comparison</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Calls To Close</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{callMetrics.callsToClose}</span>
                        <span className={`text-xs ${callMetrics.callsToClose <= 3 ? 'text-green-500' : 
                                                  callMetrics.callsToClose <= 5 ? 'text-amber-500' : 
                                                  'text-red-500'}`}>
                          {callMetrics.callsToClose <= 3 ? 'Great' : 
                           callMetrics.callsToClose <= 5 ? 'Average' : 
                           'High'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: '33.3%' }}></div>
                      </div>
                      <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: '33.3%' }}></div>
                      </div>
                      <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: '33.3%' }}></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>≤ 3 (Great)</span>
                      <span>4-5 (Avg)</span>
                      <span>≥ 6 (High)</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Journey Length</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {journeyLength !== null ? formatDuration(journeyLength) : 'N/A'}
                        </span>
                        {journeyLength !== null && (
                          <span className={`text-xs ${
                            journeyLength / 1440 <= 14 ? 'text-green-500' : 
                            journeyLength / 1440 <= 30 ? 'text-amber-500' : 
                            'text-red-500'
                          }`}>
                            {journeyLength / 1440 <= 14 ? 'Fast' : 
                             journeyLength / 1440 <= 30 ? 'Average' : 
                             'Long'}
                          </span>
                        )}
                      </div>
                    </div>
                    {journeyLength !== null && (
                      <>
                        <div className="flex items-center gap-1">
                          <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: '33.3%' }}></div>
                          </div>
                          <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: '33.3%' }}></div>
                          </div>
                          <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-red-500" style={{ width: '33.3%' }}></div>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>≤ 14 days</span>
                          <span>15-30 days</span>
                          <span>≥ 31 days</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="attribution" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Attribution Analysis</CardTitle>
            <CardDescription>
              Multi-source attribution and touchpoint impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Source Attribution</h3>
                
                <div className="space-y-4">
                  {Object.entries(sources).map(([source, count]) => {
                    const percentage = Math.round((count / totalTouchpoints) * 100);
                    
                    return (
                      <div key={source}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium capitalize">{source}</span>
                          <span className="text-sm">
                            {count} touchpoints ({percentage}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
                
                <h3 className="text-lg font-medium mt-8 mb-4">Multi-Source Analysis</h3>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="flex flex-col items-center gap-2 mb-4">
                    <div className="text-2xl font-bold">
                      {Object.keys(sources).length} sources
                    </div>
                    <Badge 
                      variant={Object.keys(sources).length > 1 ? 'default' : 'outline'}
                      className="capitalize"
                    >
                      {Object.keys(sources).length > 1 ? 'Multi-Source' : 'Single Source'}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-around">
                    {Object.keys(sources).includes('close') && (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-2">
                          <DollarSign className="h-6 w-6 text-blue-500" />
                        </div>
                        <span className="text-xs font-medium">Close</span>
                      </div>
                    )}
                    
                    {Object.keys(sources).includes('calendly') && (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-2">
                          <Calendar className="h-6 w-6 text-green-500" />
                        </div>
                        <span className="text-xs font-medium">Calendly</span>
                      </div>
                    )}
                    
                    {Object.keys(sources).includes('typeform') && (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-2">
                          <MessageSquare className="h-6 w-6 text-purple-500" />
                        </div>
                        <span className="text-xs font-medium">Typeform</span>
                      </div>
                    )}
                  </div>
                  
                  {Object.keys(sources).length > 1 && (
                    <div className="flex justify-center mt-4">
                      <div className="text-center max-w-xs text-sm text-muted-foreground">
                        Multi-source contacts are 3.2x more likely to convert than single source contacts
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Attribution Model Comparison</h3>
                
                <div className="space-y-6">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/30 p-3">
                      <h4 className="text-sm font-medium">First Touch Attribution</h4>
                    </div>
                    <div className="p-4">
                      {Object.entries(sources).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(sources).slice(0, 1).map(([source, count]) => (
                            <div key={source} className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getSourceColor(source)}`}>
                                {source === 'close' ? <DollarSign className="h-4 w-4 text-white" /> :
                                source === 'calendly' ? <Calendar className="h-4 w-4 text-white" /> :
                                <MessageSquare className="h-4 w-4 text-white" />}
                              </div>
                              <div>
                                <div className="font-medium capitalize">{source}</div>
                                <div className="text-xs text-muted-foreground">First touch channel</div>
                              </div>
                              <div className="ml-auto">
                                <Badge variant="outline">100%</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          No source data available
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/30 p-3">
                      <h4 className="text-sm font-medium">Last Touch Attribution</h4>
                    </div>
                    <div className="p-4">
                      {Object.entries(sources).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(sources).slice(-1).map(([source, count]) => (
                            <div key={source} className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getSourceColor(source)}`}>
                                {source === 'close' ? <DollarSign className="h-4 w-4 text-white" /> :
                                source === 'calendly' ? <Calendar className="h-4 w-4 text-white" /> :
                                <MessageSquare className="h-4 w-4 text-white" />}
                              </div>
                              <div>
                                <div className="font-medium capitalize">{source}</div>
                                <div className="text-xs text-muted-foreground">Last touch channel</div>
                              </div>
                              <div className="ml-auto">
                                <Badge variant="outline">100%</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          No source data available
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/30 p-3">
                      <h4 className="text-sm font-medium">Linear Attribution Model</h4>
                    </div>
                    <div className="p-4">
                      {Object.entries(sources).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(sources).map(([source, count]) => {
                            const percentage = Math.round((count / totalTouchpoints) * 100);
                            
                            return (
                              <div key={source} className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getSourceColor(source)}`}>
                                  {source === 'close' ? <DollarSign className="h-4 w-4 text-white" /> :
                                  source === 'calendly' ? <Calendar className="h-4 w-4 text-white" /> :
                                  <MessageSquare className="h-4 w-4 text-white" />}
                                </div>
                                <div>
                                  <div className="font-medium capitalize">{source}</div>
                                  <div className="text-xs text-muted-foreground">{count} touchpoints</div>
                                </div>
                                <div className="ml-auto">
                                  <Badge variant="outline">{percentage}%</Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          No source data available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export default JourneyAnalytics;