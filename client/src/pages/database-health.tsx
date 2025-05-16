import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, CheckCircle, Database, AlertCircle, Activity, RefreshCw, Server, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Types
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

interface FieldMapping {
  id: string;
  sourceField: string;
  destinationField: string;
  dataType: string;
  coverage: number;
  status: 'active' | 'missing' | 'mismatched';
}

interface ValidationError {
  id: string;
  ruleId: string;
  entityType: string;
  entityId: number;
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
  resolved: boolean;
}

interface SyncHistory {
  id: string;
  source: string;
  startTime: string;
  endTime: string;
  status: 'success' | 'partial' | 'failed';
  recordsProcessed: number;
  recordsUpdated: number;
  recordsCreated: number;
  recordsFailed: number;
  duration: number;
  error?: string;
}

interface DatabaseHealthResponse {
  success: boolean;
  healthMetrics: HealthMetric[];
  dataSources: DataSource[];
  validationRules: any[];
  entityCounts: {
    deals: number;
    contacts: number;
    activities: number;
    meetings: number;
  };
  fieldMappings: FieldMapping[];
  validationErrors: ValidationError[];
  syncHistory: SyncHistory[];
  lastUpdated: string;
}

const DatabaseHealth = () => {
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch database health data
  const { data, isLoading, isError, error, refetch } = useQuery<DatabaseHealthResponse>({
    queryKey: ['/api/database-health'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      case 'offline':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'offline':
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Database className="h-5 w-5 text-blue-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    }).format(date);
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes === 0) {
      return `${seconds} seconds`;
    }
    
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px]">
        <Database className="h-12 w-12 text-primary animate-pulse mb-4" />
        <h2 className="text-2xl font-bold mb-2">Loading database health data...</h2>
        <p className="text-muted-foreground">Please wait while we analyze your database.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Error loading database health data</h2>
        <p className="text-muted-foreground mb-4">
          {error instanceof Error ? error.message : "An unknown error occurred while fetching database health information."}
        </p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Database health data unavailable</h2>
        <p className="text-muted-foreground mb-4">
          The database health information could not be retrieved at this time.
        </p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Health</h1>
          <p className="text-muted-foreground">
            Monitor and maintain data integrity across all your integrated systems.
          </p>
        </div>
        <Button onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        Last updated: {formatDate(data.lastUpdated)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.healthMetrics.map((metric) => (
          <Card key={metric.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                {getStatusIcon(metric.status)}
                {metric.name}
              </CardTitle>
              <CardDescription>{metric.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mt-1">
                <div className="flex justify-between mb-1">
                  <span className="text-2xl font-bold">{metric.value.toFixed(1)}%</span>
                  <Badge variant={metric.status === 'healthy' ? 'default' : metric.status === 'warning' ? 'warning' : 'destructive'}>
                    {metric.status}
                  </Badge>
                </div>
                <Progress value={metric.value} max={100} className="h-2" />
                <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                  <span>Target: {metric.target}%</span>
                  <span>Last checked: {formatDate(metric.lastChecked)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="field-mappings">Field Mappings</TabsTrigger>
          <TabsTrigger value="validation">Data Validation</TabsTrigger>
          <TabsTrigger value="sync-history">Sync History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Sources
                </CardTitle>
                <CardDescription>Connected systems and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.dataSources.map((source) => (
                    <div key={source.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(source.status)}`}></div>
                          <span className="font-medium">{source.name}</span>
                        </div>
                        <Badge variant={source.status === 'healthy' ? 'outline' : 'secondary'}>
                          {source.recordCount.toLocaleString()} records
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground">Integrity</div>
                          <div className="font-medium">{source.integrity.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Last Sync</div>
                          <div className="font-medium">{formatDate(source.lastSync)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Frequency</div>
                          <div className="font-medium">{source.syncFrequency}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Entity Overview
                </CardTitle>
                <CardDescription>Current record counts by entity type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="font-medium">Deals</span>
                      <Badge variant="outline">{data.entityCounts.deals.toLocaleString()}</Badge>
                    </div>
                    <Progress value={data.entityCounts.deals} max={data.entityCounts.deals} className="h-2 bg-blue-100" />
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="font-medium">Contacts</span>
                      <Badge variant="outline">{data.entityCounts.contacts.toLocaleString()}</Badge>
                    </div>
                    <Progress value={data.entityCounts.contacts} max={data.entityCounts.contacts} className="h-2 bg-green-100" />
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="font-medium">Activities</span>
                      <Badge variant="outline">{data.entityCounts.activities.toLocaleString()}</Badge>
                    </div>
                    <Progress value={data.entityCounts.activities} max={data.entityCounts.activities} className="h-2 bg-purple-100" />
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <span className="font-medium">Meetings</span>
                      <Badge variant="outline">{data.entityCounts.meetings.toLocaleString()}</Badge>
                    </div>
                    <Progress value={data.entityCounts.meetings} max={data.entityCounts.meetings} className="h-2 bg-amber-100" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Validation Summary
              </CardTitle>
              <CardDescription>
                {data.validationErrors.length} issue{data.validationErrors.length !== 1 ? 's' : ''} found across all entities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.validationErrors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-xl font-medium mb-1">All validation checks pass</h3>
                  <p className="text-muted-foreground">No data issues were found in your database.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.validationErrors.slice(0, 5).map((error) => (
                      <TableRow key={error.id}>
                        <TableCell>{error.entityType}</TableCell>
                        <TableCell>{error.field}</TableCell>
                        <TableCell>{error.message}</TableCell>
                        <TableCell>
                          <Badge variant={error.severity === 'high' ? 'destructive' : error.severity === 'medium' ? 'warning' : 'outline'}>
                            {error.severity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.validationErrors.length > 5 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          + {data.validationErrors.length - 5} more issues
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="field-mappings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Field Mappings
              </CardTitle>
              <CardDescription>
                How data is mapped between external systems and your database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source Field</TableHead>
                    <TableHead>Destination Field</TableHead>
                    <TableHead>Data Type</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.fieldMappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell>{mapping.sourceField}</TableCell>
                      <TableCell>{mapping.destinationField}</TableCell>
                      <TableCell>{mapping.dataType}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={mapping.coverage} max={100} className="h-2 w-24" />
                          <span>{mapping.coverage.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            mapping.status === 'active' ? 'default' : 
                            mapping.status === 'missing' ? 'destructive' : 
                            'warning'
                          }
                        >
                          {mapping.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Field Coverage Issues
              </CardTitle>
              <CardDescription>
                Fields with low coverage that may need attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.fieldMappings.filter(m => m.coverage < 90).length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No significant coverage issues found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.fieldMappings
                    .filter(m => m.coverage < 90)
                    .map((mapping) => (
                      <div key={mapping.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{mapping.destinationField}</p>
                          <p className="text-sm text-muted-foreground">
                            Source: {mapping.sourceField} ({mapping.dataType})
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-amber-600">
                            {mapping.coverage.toFixed(1)}%
                          </p>
                          <p className="text-sm text-muted-foreground">coverage</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Validation Errors
              </CardTitle>
              <CardDescription>
                Data integrity issues requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.validationErrors.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-medium mb-2">All validation checks pass</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your database appears to be in excellent health with no validation errors detected.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entity</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Detected</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.validationErrors.map((error) => (
                      <TableRow key={error.id}>
                        <TableCell>{error.entityType} #{error.entityId}</TableCell>
                        <TableCell>{error.field}</TableCell>
                        <TableCell>{error.message}</TableCell>
                        <TableCell>
                          <Badge variant={
                            error.severity === 'high' ? 'destructive' : 
                            error.severity === 'medium' ? 'warning' : 
                            'outline'
                          }>
                            {error.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(error.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant={error.resolved ? 'default' : 'outline'}>
                            {error.resolved ? 'Resolved' : 'Unresolved'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync-history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Sync History
              </CardTitle>
              <CardDescription>
                Recent synchronization operations with external systems
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.syncHistory.map((sync) => (
                    <TableRow key={sync.id}>
                      <TableCell>{sync.source}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(sync.status)}
                          <span>{sync.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(sync.startTime)}</TableCell>
                      <TableCell>{sync.recordsProcessed.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div className="text-green-600">+{sync.recordsCreated} created</div>
                          <div className="text-blue-600">~{sync.recordsUpdated} updated</div>
                          {sync.recordsFailed > 0 && (
                            <div className="text-red-600">!{sync.recordsFailed} failed</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDuration(sync.duration)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Sync Performance
              </CardTitle>
              <CardDescription>
                Performance metrics for data synchronization operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Records Processed Per Sync</h3>
                  <div className="h-60 flex items-end gap-4 justify-between border-b pb-2">
                    {data.syncHistory.map((sync) => (
                      <div key={sync.id} className="flex flex-col items-center">
                        <div className="text-xs mb-1">{sync.recordsProcessed}</div>
                        <div 
                          className={`w-14 ${
                            sync.status === 'success' ? 'bg-green-500' : 
                            sync.status === 'partial' ? 'bg-yellow-500' : 
                            'bg-red-500'
                          } rounded-t`}
                          style={{ 
                            height: `${(sync.recordsProcessed / Math.max(...data.syncHistory.map(s => s.recordsProcessed))) * 180}px` 
                          }}
                        ></div>
                        <div className="text-xs mt-2 w-16 text-center truncate">{sync.source}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Sync Duration (seconds)</h3>
                  <div className="h-40 flex items-end gap-4 justify-between border-b pb-2">
                    {data.syncHistory.map((sync) => (
                      <div key={`duration-${sync.id}`} className="flex flex-col items-center">
                        <div className="text-xs mb-1">{(sync.duration / 1000).toFixed(0)}s</div>
                        <div 
                          className="w-14 bg-blue-500 rounded-t"
                          style={{ 
                            height: `${(sync.duration / Math.max(...data.syncHistory.map(s => s.duration))) * 120}px` 
                          }}
                        ></div>
                        <div className="text-xs mt-2 w-16 text-center truncate">{sync.source}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DatabaseHealth;