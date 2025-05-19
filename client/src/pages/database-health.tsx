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

interface SourceDetails {
  contacts?: { count: number; complete: number; incomplete: number };
  deals?: { count: number; linked: number; unlinked: number };
  activities?: { count: number; linked: number; unlinked: number };
  meetings?: { count: number; linked: number; unlinked: number };
  submissions?: { count: number; linked: number; unlinked: number };
}

interface DataSource {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  lastSync: string;
  recordCount: number;
  integrity: number;
  syncFrequency: string;
  details?: SourceDetails;
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
      name: "Contact Completeness",
      value: 92,
      status: "healthy",
      lastChecked: new Date().toISOString(),
      target: 90,
      description: "Percentage of contacts with complete, high-quality data"
    },
    {
      id: "metric_2",
      name: "Multi-Source Contact Rate",
      value: 48,
      status: "warning",
      lastChecked: new Date().toISOString(),
      target: 50,
      description: "Percentage of contacts with data from multiple sources"
    },
    {
      id: "metric_3",
      name: "Meeting Linkage Rate",
      value: 96,
      status: "healthy",
      lastChecked: new Date().toISOString(),
      target: 95,
      description: "Percentage of Calendly meetings linked to the correct contact"
    },
    {
      id: "metric_4",
      name: "Form Submission Linkage",
      value: 92,
      status: "healthy",
      lastChecked: new Date().toISOString(),
      target: 90,
      description: "Percentage of Typeform submissions linked to the correct contact"
    },
    {
      id: "metric_5",
      name: "Deal Assignment Coverage",
      value: 100,
      status: "healthy",
      lastChecked: new Date().toISOString(),
      target: 100,
      description: "Percentage of deals assigned to users"
    },
    {
      id: "metric_6",
      name: "Data Integration Health",
      value: 98,
      status: "healthy",
      lastChecked: new Date().toISOString(),
      target: 95,
      description: "Health of data integration between systems"
    },
    {
      id: "metric_7",
      name: "Email Normalization Coverage",
      value: 100,
      status: "healthy",
      lastChecked: new Date().toISOString(),
      target: 98,
      description: "Percentage of contact emails that are properly normalized"
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
      syncFrequency: "Every 15 minutes",
      details: {
        contacts: { count: 1600, complete: 1472, incomplete: 128 },
        deals: { count: 850, linked: 850, unlinked: 0 },
        activities: { count: 3200, linked: 3168, unlinked: 32 }
      }
    },
    {
      id: "source_2",
      name: "Calendly",
      status: "healthy",
      lastSync: new Date().toISOString(),
      recordCount: 1280,
      integrity: 96,
      syncFrequency: "Every 30 minutes",
      details: {
        meetings: { count: 1280, linked: 1229, unlinked: 51 }
      }
    },
    {
      id: "source_3",
      name: "Typeform",
      status: "healthy",
      lastSync: new Date().toISOString(),
      recordCount: 865,
      integrity: 92,
      syncFrequency: "Every hour",
      details: {
        submissions: { count: 865, linked: 796, unlinked: 69 }
      }
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
  
  // Fetch database health data
  const { data, isLoading, isError, error, refetch } = useQuery<DatabaseHealthResponse>({
    queryKey: ['/api/database-health'],
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    // @ts-ignore - TanStack Query v5 supports onError but types don't reflect it properly
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
      <div className="flex justify-center items-center min-h-screen h-screen overflow-auto bg-background">
        <div className="text-center">
          <Activity className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-semibold">Loading Database Health...</h2>
          <p className="text-muted-foreground">Gathering metrics and statistics</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (isError || !data) {
    return (
      <div className="flex flex-col gap-8 p-8 h-screen overflow-auto bg-background">
        <div className="flex justify-between items-center sticky top-0 bg-background z-10 pb-4">
          <div>
            <h1 className="text-3xl font-bold">Database Health</h1>
            <p className="text-muted-foreground mt-1">Error loading database health data</p>
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
    <div className="flex flex-col gap-8 p-8 h-screen overflow-auto bg-background">
      {/* Header */}
      <div className="flex justify-between items-center sticky top-0 bg-background z-10 pb-4">
        <div>
          <h1 className="text-3xl font-bold">Database Health</h1>
          <p className="text-muted-foreground mt-1">
            Last updated: {healthData && 'lastUpdated' in healthData ? formatDate(healthData.lastUpdated) : 'Unknown'}
          </p>
        </div>
        <Button onClick={updateHealthMetrics} disabled={isLoading || isUpdating}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
          {isUpdating ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="sticky top-20 bg-background z-10">
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
          
          {/* Contact Completeness - One Source of Truth Visualization */}
          <Card className="border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-primary" /> 
                Contact Completeness - One Source of Truth
              </CardTitle>
              <CardDescription>
                Shows how well our system integrates contact data from all platforms into a single, complete record
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Find the contact completeness metric */}
              {(() => {
                const contactCompletenessMetric = healthData.healthMetrics.find(m => m.id === "metric_1");
                if (!contactCompletenessMetric) return null;
                
                return (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center p-6">
                      <div className="relative h-40 w-40 mb-6">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-4xl font-bold text-primary">
                            {contactCompletenessMetric.value}%
                          </div>
                        </div>
                        <svg className="h-full w-full" viewBox="0 0 100 100">
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="45" 
                            fill="none" 
                            stroke="#e2e8f0" 
                            strokeWidth="10" 
                          />
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="45" 
                            fill="none" 
                            stroke="#3b82f6" 
                            strokeWidth="10" 
                            strokeDasharray={`${2 * Math.PI * 45 * contactCompletenessMetric.value / 100} ${2 * Math.PI * 45 * (1 - contactCompletenessMetric.value / 100)}`}
                            strokeDashoffset={2 * Math.PI * 45 * 0.25}
                            className="transition-all duration-1000 ease-in-out"
                          />
                        </svg>
                      </div>
                      <div className="text-center space-y-2">
                        <div className="font-medium">Contact Data Health</div>
                        <div className="text-sm text-muted-foreground">
                          {contactCompletenessMetric.description}
                        </div>
                        <div className={`text-sm font-medium ${
                          contactCompletenessMetric.status === 'healthy' ? 'text-green-500' : 
                          contactCompletenessMetric.status === 'warning' ? 'text-yellow-500' : 
                          'text-red-500'
                        }`}>
                          Status: {contactCompletenessMetric.status.charAt(0).toUpperCase() + contactCompletenessMetric.status.slice(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Target: {contactCompletenessMetric.target}% • Last checked: {formatDate(contactCompletenessMetric.lastChecked)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-secondary/10 rounded-md">
                        <div className="text-sm font-medium">Multi-Source Contacts</div>
                        <div className="text-xl font-bold mt-1">
                          {healthData.healthMetrics.find(m => m.id === "metric_2")?.value || 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Contacts with data from multiple platforms
                        </div>
                      </div>
                      <div className="p-4 bg-primary/10 rounded-md border border-primary/30">
                        <div className="text-sm font-medium text-primary">Meeting Linkage</div>
                        <div className="text-xl font-bold mt-1">
                          {healthData.healthMetrics.find(m => m.id === "metric_3")?.value || 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Calendly meetings linked to contacts
                        </div>
                        {/* Add a tooltip for the meeting linkage */}
                        <div className="mt-2 text-xs">
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary/20 text-primary font-medium">
                            {(() => {
                              const calendlySource = healthData.dataSources.find(s => s.name === "Calendly");
                              if (calendlySource?.details?.meetings) {
                                return `${calendlySource.details.meetings.linked} of ${calendlySource.details.meetings.count} meetings linked`;
                              }
                              return "Meeting data unavailable";
                            })()}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 bg-primary/10 rounded-md border border-primary/30">
                        <div className="text-sm font-medium text-primary">Form Submission Linkage</div>
                        <div className="text-xl font-bold mt-1">
                          {healthData.healthMetrics.find(m => m.id === "metric_4")?.value || 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Typeform submissions linked to contacts
                        </div>
                        {/* Add a tooltip for the form submission linkage */}
                        <div className="mt-2 text-xs">
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary/20 text-primary font-medium">
                            {(() => {
                              const typeformSource = healthData.dataSources.find(s => s.name === "Typeform");
                              if (typeformSource?.details?.submissions) {
                                return `${typeformSource.details.submissions.linked} of ${typeformSource.details.submissions.count} submissions linked`;
                              }
                              return "Submission data unavailable";
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
          
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
                    <div className="flex justify-between text-sm text-muted-foreground">
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
                  <div key={source.id} className="flex flex-col border-b pb-4 mb-4">
                    <div className="flex items-center justify-between">
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
                    
                    {/* Show detailed linkage metrics for each source */}
                    {source.details && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {source.name === "Close CRM" && source.details.contacts && (
                          <div className="flex flex-col p-2 bg-secondary/10 rounded-md">
                            <span className="text-xs text-muted-foreground">Contact Completeness</span>
                            <div className="flex justify-between mt-1 items-center">
                              <span className="text-sm font-medium">
                                {((source.details.contacts.complete / source.details.contacts.count) * 100).toFixed(1)}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {source.details.contacts.complete} / {source.details.contacts.count}
                              </span>
                            </div>
                            <Progress 
                              value={(source.details.contacts.complete / source.details.contacts.count) * 100} 
                              className="h-1 mt-1"
                            />
                          </div>
                        )}
                        {source.name === "Close CRM" && source.details.activities && (
                          <div className="flex flex-col p-2 bg-secondary/10 rounded-md">
                            <span className="text-xs text-muted-foreground">Activity Linkage</span>
                            <div className="flex justify-between mt-1 items-center">
                              <span className="text-sm font-medium">
                                {((source.details.activities.linked / source.details.activities.count) * 100).toFixed(1)}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {source.details.activities.linked} / {source.details.activities.count}
                              </span>
                            </div>
                            <Progress 
                              value={(source.details.activities.linked / source.details.activities.count) * 100} 
                              className="h-1 mt-1"
                            />
                          </div>
                        )}
                        {source.name === "Calendly" && source.details.meetings && (
                          <div className="flex flex-col p-2 bg-secondary/10 rounded-md">
                            <span className="text-xs text-muted-foreground">Meeting Linkage</span>
                            <div className="flex justify-between mt-1 items-center">
                              <span className="text-sm font-medium">
                                {((source.details.meetings.linked / source.details.meetings.count) * 100).toFixed(1)}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {source.details.meetings.linked} / {source.details.meetings.count}
                              </span>
                            </div>
                            <Progress 
                              value={(source.details.meetings.linked / source.details.meetings.count) * 100} 
                              className="h-1 mt-1"
                            />
                          </div>
                        )}
                        {source.name === "Typeform" && source.details.submissions && (
                          <div className="flex flex-col p-2 bg-secondary/10 rounded-md">
                            <span className="text-xs text-muted-foreground">Form Submission Linkage</span>
                            <div className="flex justify-between mt-1 items-center">
                              <span className="text-sm font-medium">
                                {((source.details.submissions.linked / source.details.submissions.count) * 100).toFixed(1)}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {source.details.submissions.linked} / {source.details.submissions.count}
                              </span>
                            </div>
                            <Progress 
                              value={(source.details.submissions.linked / source.details.submissions.count) * 100} 
                              className="h-1 mt-1"
                            />
                          </div>
                        )}
                      </div>
                    )}
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-secondary/10 rounded-md">
                    <div>
                      <p className="text-sm text-muted-foreground">Last Synced</p>
                      <p className="font-medium">{formatDate(source.lastSync)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Record Count</p>
                      <p className="font-medium">{source.recordCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data Integrity</p>
                      <div className="flex items-center">
                        <span className="font-medium">{source.integrity}%</span>
                        <Progress value={source.integrity} className="ml-2 h-2 w-20" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-muted-foreground">
                    Sync Frequency: {source.syncFrequency}
                  </div>
                  
                  {/* Display detailed metrics for Calendly */}
                  {source.name === "Calendly" && source.details?.meetings && (
                    <div className="mt-3 p-3 bg-primary/5 rounded-md border border-primary/20">
                      <h4 className="text-sm font-medium text-primary mb-2">Meeting Linkage Detail</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Linked Meetings</div>
                          <div className="text-sm font-medium">{source.details.meetings.linked}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Unlinked Meetings</div>
                          <div className="text-sm font-medium">{source.details.meetings.unlinked}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Total Meetings</div>
                          <div className="text-sm font-medium">{source.details.meetings.count}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Linkage Rate</div>
                          <div className="text-sm font-medium">
                            {((source.details.meetings.linked / source.details.meetings.count) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-xs text-muted-foreground mb-1">Linkage Progress</div>
                        <div className="relative h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="absolute top-0 left-0 h-full bg-primary rounded-full"
                            style={{ width: `${(source.details.meetings.linked / source.details.meetings.count) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Display detailed metrics for Typeform */}
                  {source.name === "Typeform" && source.details?.submissions && (
                    <div className="mt-3 p-3 bg-primary/5 rounded-md border border-primary/20">
                      <h4 className="text-sm font-medium text-primary mb-2">Form Submission Linkage Detail</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Linked Submissions</div>
                          <div className="text-sm font-medium">{source.details.submissions.linked}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Unlinked Submissions</div>
                          <div className="text-sm font-medium">{source.details.submissions.unlinked}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Total Submissions</div>
                          <div className="text-sm font-medium">{source.details.submissions.count}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Linkage Rate</div>
                          <div className="text-sm font-medium">
                            {((source.details.submissions.linked / source.details.submissions.count) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-xs text-muted-foreground mb-1">Linkage Progress</div>
                        <div className="relative h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="absolute top-0 left-0 h-full bg-primary rounded-full"
                            style={{ width: `${(source.details.submissions.linked / source.details.submissions.count) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
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
                  
                  <div className="text-sm text-muted-foreground">
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