import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Database, 
  AlertCircle, 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Users,
  Calendar,
  MessageSquare,
  Briefcase
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Simplified types for our database health data
interface HealthMetric {
  id: string;
  name: string;
  value: number;
  status: 'healthy' | 'warning' | 'critical';
  lastChecked: string;
  target: number;
  description: string;
}

interface DataSource {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  lastSync: string;
  recordCount: number;
  integrity: number;
  syncFrequency: string;
}

interface EntityCounts {
  deals: number;
  contacts: number;
  activities: number;
  meetings: number;
}

interface DatabaseHealthResponse {
  success: boolean;
  healthMetrics: HealthMetric[];
  dataSources: DataSource[];
  entityCounts: EntityCounts;
  lastUpdated: string;
}

// Mock data to use when the backend is not available
const mockDatabaseHealth: DatabaseHealthResponse = {
  success: true,
  healthMetrics: [
    {
      id: "metric_1",
      name: "Data Completeness",
      value: 95,
      status: "healthy",
      lastChecked: new Date().toISOString(),
      target: 90,
      description: "Percentage of required fields with valid data across all entities"
    },
    {
      id: "metric_2",
      name: "Multi-Source Contact Rate",
      value: 42,
      status: "warning",
      lastChecked: new Date().toISOString(),
      target: 50,
      description: "Percentage of contacts with data from multiple sources"
    },
    {
      id: "metric_3",
      name: "Data Integration Health",
      value: 98,
      status: "healthy",
      lastChecked: new Date().toISOString(),
      target: 95,
      description: "Health of data integration between systems"
    },
    {
      id: "metric_4",
      name: "Deal Assignment Coverage",
      value: 100,
      status: "healthy",
      lastChecked: new Date().toISOString(),
      target: 100,
      description: "Percentage of deals assigned to users"
    }
  ],
  dataSources: [
    {
      id: "source_1",
      name: "Close CRM",
      status: "healthy",
      lastSync: new Date().toISOString(),
      recordCount: 2450,
      integrity: 98,
      syncFrequency: "Every 15 minutes"
    },
    {
      id: "source_2",
      name: "Calendly",
      status: "healthy",
      lastSync: new Date().toISOString(),
      recordCount: 1280,
      integrity: 100,
      syncFrequency: "Every 30 minutes"
    }
  ],
  entityCounts: {
    deals: 850,
    contacts: 1600,
    activities: 3200,
    meetings: 1280
  },
  lastUpdated: new Date().toISOString()
};

const DatabaseHealth: React.FC = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Fetch database health data with fallback to mock data during development
  const { data, isLoading, isError, error, refetch } = useQuery<DatabaseHealthResponse>({
    queryKey: ['/api/database-health'],
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    onError: (err) => console.error('Database health fetch error:', err)
  });
  
  // Function to refresh data
  const updateHealthMetrics = async () => {
    try {
      setIsUpdating(true);
      await refetch();
    } catch (error) {
      console.error('Error updating health metrics:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'critical': return <AlertCircle className="h-6 w-6 text-red-500" />;
      case 'offline': return <XCircle className="h-6 w-6 text-gray-500" />;
      default: return <Database className="h-6 w-6 text-gray-500" />;
    }
  };
  
  const getBadgeVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'healthy': return 'outline';
      case 'warning': return 'secondary';
      case 'critical': return 'destructive';
      case 'offline': return 'outline';
      default: return 'default';
    }
  };
  
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(date);
    } catch {
      return 'Invalid date';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Activity className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-semibold">Loading Database Health...</h2>
          <p className="text-gray-500">Gathering metrics and statistics</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (isError || !data) {
    return (
      <div className="flex flex-col gap-8 p-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Database Health</h1>
            <p className="text-gray-500 mt-1">Error loading database health data</p>
          </div>
          <Button onClick={() => refetch()} disabled={isLoading || isUpdating}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} /> 
            {isUpdating ? 'Refreshing...' : 'Retry'}
          </Button>
        </div>
        
        <Card className="border-red-300">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
              Error Loading Data
            </CardTitle>
            <CardDescription>
              We encountered an error while loading the database health data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">
              {error instanceof Error ? error.message : "Unknown error occurred"}
            </p>
            <p className="mt-4">
              This could be due to:
            </p>
            <ul className="list-disc list-inside mt-2 text-gray-600">
              <li>API endpoint unavailable</li>
              <li>Database connection issue</li>
              <li>Temporary server error</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Choose between real data or mock data (for development)
  const healthData = data || mockDatabaseHealth;
  
  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Database Health</h1>
          <p className="text-gray-500 mt-1">
            Last updated: {formatDate(healthData.lastUpdated)}
          </p>
        </div>
        <Button onClick={updateHealthMetrics} disabled={isLoading || isUpdating}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
          {isUpdating ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="datasources">Data Sources</TabsTrigger>
          <TabsTrigger value="metrics">Health Metrics</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Entity Count Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Users className="mr-2 h-4 w-4" /> Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthData.entityCounts.contacts.toLocaleString()}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Briefcase className="mr-2 h-4 w-4" /> Deals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthData.entityCounts.deals.toLocaleString()}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <MessageSquare className="mr-2 h-4 w-4" /> Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthData.entityCounts.activities.toLocaleString()}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Calendar className="mr-2 h-4 w-4" /> Meetings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthData.entityCounts.meetings.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Health Metrics Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Health Metrics Summary</CardTitle>
              <CardDescription>Key health indicators for your data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthData.healthMetrics.map((metric) => (
                  <div key={metric.id} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        {getStatusIcon(metric.status)}
                        <span className="ml-2 font-medium">{metric.name}</span>
                      </div>
                      <Badge variant={getBadgeVariant(metric.status)}>
                        {metric.status}
                      </Badge>
                    </div>
                    <Progress 
                      value={metric.value} 
                      className={`h-2 ${
                        metric.status === 'healthy' 
                          ? 'bg-gray-100' 
                          : metric.status === 'warning' 
                            ? 'bg-yellow-100' 
                            : 'bg-red-100'
                      }`}
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{metric.value}% (Target: {metric.target}%)</span>
                      <span>Last checked: {formatDate(metric.lastChecked)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Data Sources Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Data Sources</CardTitle>
              <CardDescription>Status of connected data sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthData.dataSources.map((source) => (
                  <div key={source.id} className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center">
                      {getStatusIcon(source.status)}
                      <div className="ml-2">
                        <div className="font-medium">{source.name}</div>
                        <div className="text-sm text-gray-500">
                          {source.recordCount.toLocaleString()} records • {source.syncFrequency}
                        </div>
                      </div>
                    </div>
                    <Badge variant={getBadgeVariant(source.status)}>
                      {source.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Data Sources Tab */}
        <TabsContent value="datasources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connected Data Sources</CardTitle>
              <CardDescription>Detailed information about your data sources</CardDescription>
            </CardHeader>
            <CardContent>
              {healthData.dataSources.map((source) => (
                <div key={source.id} className="mb-6 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      {getStatusIcon(source.status)}
                      <h3 className="ml-2 text-lg font-semibold">{source.name}</h3>
                    </div>
                    <Badge variant={getBadgeVariant(source.status)}>
                      {source.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-md">
                    <div>
                      <p className="text-sm text-gray-500">Last Synced</p>
                      <p className="font-medium">{formatDate(source.lastSync)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Record Count</p>
                      <p className="font-medium">{source.recordCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Data Integrity</p>
                      <div className="flex items-center">
                        <span className="font-medium">{source.integrity}%</span>
                        <Progress value={source.integrity} className="ml-2 h-2 w-20" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-500">
                    Sync Frequency: {source.syncFrequency}
                  </div>
                  
                  <Separator className="my-4" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Health Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Health Metrics Details</CardTitle>
              <CardDescription>Detailed information about data health metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {healthData.healthMetrics.map((metric) => (
                <div key={metric.id} className="mb-6 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      {getStatusIcon(metric.status)}
                      <h3 className="ml-2 text-lg font-semibold">{metric.name}</h3>
                    </div>
                    <Badge variant={getBadgeVariant(metric.status)}>
                      {metric.status}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 mb-2">{metric.description}</p>
                  
                  <div className="mt-2 mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Current Value: {metric.value}%</span>
                      <span>Target: {metric.target}%</span>
                    </div>
                    <Progress 
                      value={metric.value}
                      className={`h-3 ${
                        metric.status === 'healthy' 
                          ? 'bg-gray-100' 
                          : metric.status === 'warning' 
                            ? 'bg-yellow-100' 
                            : 'bg-red-100'
                      }`}
                    />
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    Last checked: {formatDate(metric.lastChecked)}
                  </div>
                  
                  <Separator className="my-4" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DatabaseHealth;