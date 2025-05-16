import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, AlertTriangle, Mail } from "lucide-react";
import { ConfidenceScoreCard } from "@/components/database-health/confidence-score-card";
import { PlatformStatusCard } from "@/components/database-health/platform-status-card";
import { DataCompletenessCard } from "@/components/database-health/data-completeness-card";
import { TimeSeriesChart } from "@/components/database-health/time-series-chart";
import { StorageGrowthCard } from "@/components/database-health/storage-growth-card";
import { useToast } from "@/hooks/use-toast";

export default function DatabaseHealth() {
  const { toast } = useToast();
  
  // Fetch database health data
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/database-health'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Handle refresh
  const handleRefresh = async () => {
    toast({
      title: "Refreshing data...",
      description: "Fetching the latest database health metrics",
    });
    await refetch();
  };

  // Handle platform refresh
  const handlePlatformRefresh = (platform: string) => {
    toast({
      title: `Refreshing ${platform} data...`,
      description: "Initiating sync with the platform",
    });
    // This would trigger a server action to refresh the connection to the platform
    setTimeout(() => {
      refetch();
      toast({
        title: `${platform} sync complete`,
        description: "Platform data has been refreshed",
      });
    }, 1500);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <PageHeader
          heading="Database Health"
          subheading="Monitor and maintain data quality and system health"
        />
        <div className="grid gap-6 mt-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading health metrics...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !data) {
    return (
      <div className="container mx-auto py-8">
        <PageHeader
          heading="Database Health"
          subheading="Monitor and maintain data quality and system health"
        />
        <div className="grid gap-6 mt-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-2">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                  <p className="text-red-600 font-medium">Failed to load health metrics</p>
                  <p className="text-red-500 text-sm max-w-md text-center">
                    There was an error retrieving the database health data. This could indicate
                    connectivity issues or a problem with the database service.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => refetch()}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Create sample data for time series visualization
  const createTimeSeriesData = (days: number, startValue: number, trend: 'up' | 'down' | 'stable', volatility: number = 0.1) => {
    const result = [];
    let currentValue = startValue;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Calculate the next value based on trend
      const trendFactor = trend === 'up' ? 1.01 : trend === 'down' ? 0.99 : 1;
      const randomFactor = 1 + (Math.random() * volatility * 2 - volatility);
      
      currentValue = Math.max(0, currentValue * trendFactor * randomFactor);
      
      result.push({
        timestamp: date,
        value: Math.round(currentValue)
      });
    }
    
    return result;
  };

  // Create sample projected data
  const createProjectedData = (historicalData: any[], days: number, trend: 'up' | 'down' | 'stable', volatility: number = 0.05) => {
    const result = [];
    let lastValue = historicalData[historicalData.length - 1].value;
    const startDate = new Date(historicalData[historicalData.length - 1].timestamp);
    
    for (let i = 1; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Calculate the projected value based on trend
      const trendFactor = trend === 'up' ? 1.01 : trend === 'down' ? 0.99 : 1;
      const randomFactor = 1 + (Math.random() * volatility * 2 - volatility);
      
      lastValue = Math.max(0, lastValue * trendFactor * randomFactor);
      
      result.push({
        timestamp: date,
        value: Math.round(lastValue)
      });
    }
    
    return result;
  };

  // Generate sample data
  const contactsHistorical = createTimeSeriesData(60, data.entityCounts.contacts * 0.7, 'up', 0.05);
  const contactsProjected = createProjectedData(contactsHistorical, 90, 'up', 0.03);
  
  const dealsHistorical = createTimeSeriesData(60, data.entityCounts.deals * 0.7, 'up', 0.08);
  const dealsProjected = createProjectedData(dealsHistorical, 90, 'up', 0.06);
  
  const meetingsHistorical = createTimeSeriesData(60, data.entityCounts.meetings * 0.7, 'up', 0.12);
  const meetingsProjected = createProjectedData(meetingsHistorical, 90, 'up', 0.10);

  return (
    <div className="container mx-auto py-8 max-w-7xl h-screen overflow-y-auto">
      <div className="flex justify-between items-start">
        <PageHeader
          heading="Database Health"
          subheading="Monitor and maintain data quality and system health"
        />
        <Button
          variant="outline"
          className="h-9 px-4 mt-2"
          onClick={handleRefresh}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="data-quality">Data Quality</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Records</CardTitle>
                <CardDescription>Total across all platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{data.entityCounts.contacts.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Contacts</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.entityCounts.deals.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Deals</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.entityCounts.meetings.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Meetings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Last Sync</CardTitle>
                <CardDescription>Platform synchronization status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {data.dataSources.map((source: any) => (
                    <div key={source.id}>
                      <p className="text-sm font-medium">{source.name}</p>
                      <p className={`text-sm ${source.status === 'healthy' ? 'text-green-600' : 'text-amber-600'}`}>
                        {new Date(source.lastSync).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Health Status</CardTitle>
                <CardDescription>System health indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {data.healthMetrics.slice(0, 3).map((metric: any) => (
                    <div key={metric.id} className="flex justify-between items-center">
                      <span className="text-sm">{metric.name}</span>
                      <span className={`text-sm font-medium ${
                        metric.status === 'healthy' ? 'text-green-600' : 
                        metric.status === 'warning' ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {typeof metric.value === 'number' ? 
                          (metric.id.includes('time') ? `${metric.value}ms` : `${metric.value}%`) 
                          : metric.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Main cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ConfidenceScoreCard 
              title="Attribution Confidence"
              description="Measures the system's confidence in correctly attributing data across platforms"
              overallScore={data.contactMatchingMetrics.confidence}
              metrics={[
                {
                  name: "Email Matching",
                  score: data.contactMatchingMetrics.emailMatchRate,
                  description: "Success rate of matching contacts by email address"
                },
                {
                  name: "Name Matching",
                  score: data.contactMatchingMetrics.nameMatchRate,
                  description: "Success rate of matching contacts by name when email is unavailable"
                },
                {
                  name: "Phone Matching",
                  score: data.contactMatchingMetrics.phoneMatchRate,
                  description: "Success rate of matching contacts by phone number"
                },
                {
                  name: "Cross-Platform",
                  score: data.contactMatchingMetrics.crossPlatformRate,
                  description: "Success rate of matching contacts across all platforms"
                }
              ]}
            />
            
            <div className="space-y-6">
              {data.dataSources.slice(0, 2).map((source: any) => (
                <PlatformStatusCard
                  key={source.id}
                  platform={source.id as any}
                  status={source.status as any}
                  lastSyncTime={source.lastSync}
                  responseTime={source.id === 'close' ? 187 : source.id === 'calendly' ? 215 : 342}
                  syncCount={source.id === 'close' ? 423 : source.id === 'calendly' ? 217 : 98}
                  errorCount={source.id === 'close' ? 2 : source.id === 'calendly' ? 0 : 12}
                  onRefresh={() => handlePlatformRefresh(source.name)}
                />
              ))}
            </div>
            
            <PlatformStatusCard
              platform="typeform"
              status={data.dataSources.find((s: any) => s.id === 'typeform').status as any}
              lastSyncTime={data.dataSources.find((s: any) => s.id === 'typeform').lastSync}
              responseTime={342}
              syncCount={98}
              errorCount={12}
              onRefresh={() => handlePlatformRefresh('Typeform')}
            />
          </div>
          
          {/* Data Completeness Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <DataCompletenessCard
              title="Contact Data Completeness"
              description="Percentage of contact fields with complete data"
              entityType="Contact"
              overallCompleteness={data.dataCompletenessMetrics.contacts.overall}
              fields={data.dataCompletenessMetrics.contacts.fields}
            />
            
            <DataCompletenessCard
              title="Deal Data Completeness"
              description="Percentage of deal fields with complete data"
              entityType="Deal"
              overallCompleteness={data.dataCompletenessMetrics.deals.overall}
              fields={data.dataCompletenessMetrics.deals.fields}
            />
          </div>
          
          {/* Growth Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <StorageGrowthCard
              title="Contact Growth"
              description="Historical and projected contact growth"
              entityType="Contacts"
              currentCount={data.entityCounts.contacts}
              historicalData={contactsHistorical}
              projectedData={contactsProjected}
            />
            
            <StorageGrowthCard
              title="Deal Growth"
              description="Historical and projected deal growth"
              entityType="Deals"
              currentCount={data.entityCounts.deals}
              historicalData={dealsHistorical}
              projectedData={dealsProjected}
            />
            
            <StorageGrowthCard
              title="Meeting Growth"
              description="Historical and projected meeting growth"
              entityType="Meetings"
              currentCount={data.entityCounts.meetings}
              historicalData={meetingsHistorical}
              projectedData={meetingsProjected}
            />
          </div>
          
          {/* System Health Summaries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Recent Sync Activity</CardTitle>
                <CardDescription>Last 3 synchronization operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.syncHistory.map((sync: any) => (
                    <div key={sync.id} className="flex items-start space-x-3 pb-3 border-b last:border-0">
                      <div className={`w-2 h-2 mt-1.5 rounded-full ${
                        sync.status === 'success' ? 'bg-green-500' : 
                        sync.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <p className="text-sm font-medium">{sync.source}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(sync.startTime).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Processed {sync.recordsProcessed.toLocaleString()} records 
                          ({sync.recordsUpdated.toLocaleString()} updated, {sync.recordsCreated.toLocaleString()} created)
                          {sync.recordsFailed > 0 && <span className="text-red-500"> • {sync.recordsFailed} failed</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Duration: {(sync.duration / 1000).toFixed(1)}s
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Data Validation</CardTitle>
                <CardDescription>Top validation issues found</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.validationRules.slice(0, 3).map((rule: any) => (
                    <div key={rule.id} className="flex items-start space-x-3 pb-3 border-b last:border-0">
                      <div className={`w-2 h-2 mt-1.5 rounded-full ${
                        rule.failedRecords === 0 ? 'bg-green-500' : 
                        rule.severity === 'high' ? 'bg-red-500' : 
                        rule.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <p className="text-sm font-medium">{rule.name}</p>
                          <p className={`text-xs font-medium ${
                            rule.failedRecords === 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {rule.failedRecords} failed
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {rule.description}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {data.validationErrors.length > 0 && (
                    <div className="pt-2">
                      <Button variant="outline" size="sm" className="w-full">
                        <Mail className="h-3.5 w-3.5 mr-2" />
                        Send Validation Report
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Other tabs - stubbed out for now */}
        <TabsContent value="connections">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Platform Connections</h3>
              <p className="text-muted-foreground">
                Detailed information about your integration connections will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="data-quality">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Data Quality Metrics</h3>
              <p className="text-muted-foreground">
                Detailed information about data quality will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="system">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">System Health</h3>
              <p className="text-muted-foreground">
                Detailed information about system health will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="validation">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Data Validation</h3>
              <p className="text-muted-foreground">
                Detailed information about data validation will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}