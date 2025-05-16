import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Database, 
  RefreshCw, 
  ShieldAlert, 
  BarChart3,
  Clock,
  ArrowDownUp,
  FileCheck,
  ActivitySquare
} from "lucide-react";

// Type definitions
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

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  lastRun: string;
  failedRecords: number;
  severity: 'low' | 'medium' | 'high';
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

// Custom hook for health metrics data
const useDatabaseHealth = () => {
  return useQuery({
    queryKey: ['/api/database-health'],
    refetchInterval: 60000, // Refresh every minute
  });
}

// Helper function for getting status color
const getStatusColor = (status: 'healthy' | 'warning' | 'critical' | 'offline' | 'active' | 'missing' | 'mismatched') => {
  switch (status) {
    case 'healthy':
    case 'active':
      return 'bg-green-500/20 text-green-700 border-green-500/50';
    case 'warning':
    case 'mismatched':
      return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/50';
    case 'critical':
    case 'offline':
    case 'missing':
      return 'bg-red-500/20 text-red-700 border-red-500/50';
    default:
      return 'bg-gray-500/20 text-gray-700 border-gray-500/50';
  }
}

// Helper function for formatting date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString();
}

// Health Summary Component
const HealthSummary = ({ metrics }: { metrics: HealthMetric[] }) => {
  const overallHealth = metrics.reduce((acc, metric) => {
    if (metric.status === 'critical') return 'critical';
    if (metric.status === 'warning' && acc !== 'critical') return 'warning';
    return acc;
  }, 'healthy' as 'healthy' | 'warning' | 'critical');

  const overallHealthPercentage = metrics.reduce((acc, metric) => acc + metric.value, 0) / metrics.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Health Summary
        </CardTitle>
        <CardDescription>
          Overall system health and key metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex flex-col items-center space-y-2">
            <div className={`p-4 rounded-full ${getStatusColor(overallHealth)}`}>
              {overallHealth === 'healthy' && <CheckCircle2 className="h-12 w-12" />}
              {overallHealth === 'warning' && <AlertTriangle className="h-12 w-12" />}
              {overallHealth === 'critical' && <ShieldAlert className="h-12 w-12" />}
            </div>
            <h3 className="text-xl font-semibold">
              {overallHealth === 'healthy' && 'System Healthy'}
              {overallHealth === 'warning' && 'Attention Needed'}
              {overallHealth === 'critical' && 'Critical Issues'}
            </h3>
            <Progress value={overallHealthPercentage} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {overallHealthPercentage.toFixed(1)}% system integrity
            </p>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-4">
            {metrics.map((metric) => (
              <div key={metric.id} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{metric.name}</span>
                  <Badge variant="outline" className={getStatusColor(metric.status)}>
                    {metric.status}
                  </Badge>
                </div>
                <Progress value={metric.value} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {metric.value.toFixed(1)}% (Target: {metric.target}%)
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <p className="text-xs text-muted-foreground">Last checked: {formatDate(metrics[0]?.lastChecked || new Date().toISOString())}</p>
      </CardFooter>
    </Card>
  );
};

// Data Sources Component
const DataSources = ({ sources }: { sources: DataSource[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowDownUp className="h-5 w-5" />
          Data Sources & Sync Status
        </CardTitle>
        <CardDescription>
          External system connections and synchronization status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Integrity</TableHead>
                <TableHead>Frequency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="font-medium">{source.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(source.status)}>
                      {source.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(source.lastSync)}</TableCell>
                  <TableCell>{source.recordCount.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={source.integrity} className="h-2 w-20" />
                      <span>{source.integrity}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{source.syncFrequency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <RefreshCw className="h-4 w-4" /> Sync All
            </Button>
            <Button size="sm" className="flex items-center gap-1">
              Configure
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Field Mappings Component
const FieldMappings = ({ mappings }: { mappings: FieldMapping[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Field Mappings
        </CardTitle>
        <CardDescription>
          How data fields are mapped between systems
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
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
              {mappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell className="font-medium">{mapping.sourceField}</TableCell>
                  <TableCell>{mapping.destinationField}</TableCell>
                  <TableCell>{mapping.dataType}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={mapping.coverage} className="h-2 w-20" />
                      <span>{mapping.coverage}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(mapping.status)}>
                      {mapping.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <Alert variant="default">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Field Coverage Issues Detected</AlertTitle>
            <AlertDescription>
              There are 3 field mappings with coverage below 90%. Please review and address these mapping issues.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
};

// Validation Rules Component
const ValidationRules = ({ rules }: { rules: ValidationRule[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          Validation Rules
        </CardTitle>
        <CardDescription>
          Data integrity validation rules and their status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Failed Records</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{rule.description}</TableCell>
                  <TableCell>
                    <Badge variant={
                      rule.severity === 'high' ? 'destructive' : 
                      rule.severity === 'medium' ? 'default' : 'outline'
                    }>
                      {rule.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>{rule.failedRecords}</TableCell>
                  <TableCell>{formatDate(rule.lastRun)}</TableCell>
                  <TableCell>
                    <Switch checked={rule.enabled} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <RefreshCw className="h-4 w-4" /> Run All
            </Button>
            <Button size="sm" className="flex items-center gap-1">
              Add Rule
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Validation Errors Component
const ValidationErrors = ({ errors }: { errors: ValidationError[] }) => {
  const [filterResolved, setFilterResolved] = useState(false);
  
  const filteredErrors = filterResolved ? errors : errors.filter(e => !e.resolved);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Validation Errors
        </CardTitle>
        <CardDescription>
          Current data validation issues requiring attention
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-resolved"
              checked={filterResolved}
              onCheckedChange={setFilterResolved}
            />
            <Label htmlFor="show-resolved">Show resolved issues</Label>
          </div>
          
          {filteredErrors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredErrors.map((error) => (
                  <TableRow key={error.id}>
                    <TableCell className="font-medium">{error.message}</TableCell>
                    <TableCell>{error.entityType} #{error.entityId}</TableCell>
                    <TableCell>{error.field}</TableCell>
                    <TableCell>
                      <Badge variant={
                        error.severity === 'high' ? 'destructive' : 
                        error.severity === 'medium' ? 'default' : 'outline'
                      }>
                        {error.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(error.createdAt)}</TableCell>
                    <TableCell>
                      {error.resolved ? (
                        <Badge variant="outline" className="bg-green-500/20 text-green-700">
                          Resolved
                        </Badge>
                      ) : (
                        <Button variant="outline" size="sm">Resolve</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
              <h3 className="text-lg font-medium">No validation errors</h3>
              <p className="text-sm text-muted-foreground">
                All data validation rules are passing successfully
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Sync History Component
const SyncHistory = ({ history }: { history: SyncHistory[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Sync History
        </CardTitle>
        <CardDescription>
          Recent synchronization activity and status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Failed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.source}</TableCell>
                  <TableCell>{formatDate(item.startTime)}</TableCell>
                  <TableCell>
                    <Badge variant={
                      item.status === 'success' ? 'outline' : 
                      item.status === 'partial' ? 'default' : 'destructive'
                    } className={
                      item.status === 'success' ? 'bg-green-500/20 text-green-700' : 
                      item.status === 'partial' ? 'bg-yellow-500/20 text-yellow-700' : 
                      'bg-red-500/20 text-red-700'
                    }>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{(item.duration / 1000).toFixed(1)}s</TableCell>
                  <TableCell>{item.recordsProcessed.toLocaleString()}</TableCell>
                  <TableCell>{item.recordsCreated.toLocaleString()}</TableCell>
                  <TableCell>{item.recordsUpdated.toLocaleString()}</TableCell>
                  <TableCell>{item.recordsFailed.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

// Analytics Component
const DataAnalytics = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Data Analytics
        </CardTitle>
        <CardDescription>
          Insights about data quality and distribution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Total Entities</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold">12,547</div>
                <p className="text-xs text-muted-foreground">+234 since last sync</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Data Completion</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold">94.7%</div>
                <p className="text-xs text-muted-foreground">+2.3% from previous month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Sync Efficiency</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold">98.2%</div>
                <p className="text-xs text-muted-foreground">Avg. success rate</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Top Field Coverage Issues</h3>
              <ul className="space-y-2">
                <li className="flex items-center justify-between">
                  <span>cash_collected (deals)</span>
                  <div className="flex items-center gap-2">
                    <Progress value={72} className="h-2 w-20" />
                    <span className="text-sm">72%</span>
                  </div>
                </li>
                <li className="flex items-center justify-between">
                  <span>assignedTo (contacts)</span>
                  <div className="flex items-center gap-2">
                    <Progress value={84} className="h-2 w-20" />
                    <span className="text-sm">84%</span>
                  </div>
                </li>
                <li className="flex items-center justify-between">
                  <span>closeDate (deals)</span>
                  <div className="flex items-center gap-2">
                    <Progress value={86} className="h-2 w-20" />
                    <span className="text-sm">86%</span>
                  </div>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Entity Growth Trends</h3>
              <ul className="space-y-2">
                <li className="flex items-center justify-between">
                  <span>Contacts</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">+12.3%</span>
                  </div>
                </li>
                <li className="flex items-center justify-between">
                  <span>Deals</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">+8.7%</span>
                  </div>
                </li>
                <li className="flex items-center justify-between">
                  <span>Activities</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">+24.1%</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Automation Monitor Component
const AutomationMonitor = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ActivitySquare className="h-5 w-5" />
          Automated Processes
        </CardTitle>
        <CardDescription>
          Status of automated data processes and scheduled tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Process</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Close CRM Sync</TableCell>
                <TableCell>Every 60 minutes</TableCell>
                <TableCell>{formatDate(new Date(Date.now() - 1000 * 60 * 35).toISOString())}</TableCell>
                <TableCell>{formatDate(new Date(Date.now() + 1000 * 60 * 25).toISOString())}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-green-500/20 text-green-700">
                    Active
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">Run Now</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Calendly Sync</TableCell>
                <TableCell>Every 30 minutes</TableCell>
                <TableCell>{formatDate(new Date(Date.now() - 1000 * 60 * 15).toISOString())}</TableCell>
                <TableCell>{formatDate(new Date(Date.now() + 1000 * 60 * 15).toISOString())}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-green-500/20 text-green-700">
                    Active
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">Run Now</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Cash Collected Update</TableCell>
                <TableCell>Daily at 00:00</TableCell>
                <TableCell>{formatDate(new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString())}</TableCell>
                <TableCell>{formatDate(new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString())}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-green-500/20 text-green-700">
                    Active
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">Run Now</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Data Integrity Check</TableCell>
                <TableCell>Every 6 hours</TableCell>
                <TableCell>{formatDate(new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString())}</TableCell>
                <TableCell>{formatDate(new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString())}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-green-500/20 text-green-700">
                    Active
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">Run Now</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Automation History</AlertTitle>
            <AlertDescription>
              All automated processes have been running successfully. Last failed process: Cash Collected Update (3 days ago)
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Database Health Page
const DatabaseHealthPage = () => {
  // In a real application, this data would come from the API
  // Fetch real data using the useDatabaseHealth hook
  const { data, isLoading, error, refetch } = useDatabaseHealth();
  
  // Mock data for demonstration
  const mockMetrics: HealthMetric[] = [
    {
      id: '1',
      name: 'Data Completeness',
      value: 98.3,
      status: 'healthy',
      lastChecked: new Date().toISOString(),
      target: 95,
      description: 'Percentage of required fields with valid data'
    },
    {
      id: '2',
      name: 'Field Mappings',
      value: 92.7,
      status: 'warning',
      lastChecked: new Date().toISOString(),
      target: 100,
      description: 'Percentage of fields correctly mapped between systems'
    },
    {
      id: '3',
      name: 'Cross-System Consistency',
      value: 88.5,
      status: 'warning',
      lastChecked: new Date().toISOString(),
      target: 95,
      description: 'Data consistency across multiple systems'
    },
    {
      id: '4',
      name: 'Cash Collected Coverage',
      value: 72.4,
      status: 'critical',
      lastChecked: new Date().toISOString(),
      target: 95,
      description: 'Deals with cash collected values properly set'
    },
  ];

  const mockSources: DataSource[] = [
    {
      id: '1',
      name: 'Close CRM',
      status: 'healthy',
      lastSync: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      recordCount: 12435,
      integrity: 96.8,
      syncFrequency: 'Every 60 minutes'
    },
    {
      id: '2',
      name: 'Calendly',
      status: 'healthy',
      lastSync: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      recordCount: 4893,
      integrity: 98.2,
      syncFrequency: 'Every 30 minutes'
    },
    {
      id: '3',
      name: 'Typeform',
      status: 'warning',
      lastSync: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      recordCount: 1235,
      integrity: 82.4,
      syncFrequency: 'Every 2 hours'
    }
  ];

  const mockMappings: FieldMapping[] = [
    {
      id: '1',
      sourceField: 'value_formatted',
      destinationField: 'value',
      dataType: 'Currency',
      coverage: 99.8,
      status: 'active'
    },
    {
      id: '2',
      sourceField: 'custom.payment_received',
      destinationField: 'cash_collected',
      dataType: 'Currency',
      coverage: 72.4,
      status: 'mismatched'
    },
    {
      id: '3',
      sourceField: 'status_type',
      destinationField: 'status',
      dataType: 'String',
      coverage: 100,
      status: 'active'
    },
    {
      id: '4',
      sourceField: 'date_won',
      destinationField: 'closeDate',
      dataType: 'Date',
      coverage: 86.2,
      status: 'active'
    },
    {
      id: '5',
      sourceField: 'lead_name',
      destinationField: 'contactName',
      dataType: 'String',
      coverage: 100,
      status: 'active'
    },
    {
      id: '6',
      sourceField: 'custom.contract_value',
      destinationField: 'contractedValue',
      dataType: 'Currency',
      coverage: 45.8,
      status: 'missing'
    }
  ];

  const mockRules: ValidationRule[] = [
    {
      id: '1',
      name: 'Cash Collected Required for Won Deals',
      description: 'All deals with status "won" must have a cash_collected value set',
      enabled: true,
      lastRun: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      failedRecords: 78,
      severity: 'high'
    },
    {
      id: '2',
      name: 'Valid Email Format',
      description: 'All contact email addresses must be in a valid format',
      enabled: true,
      lastRun: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      failedRecords: 12,
      severity: 'medium'
    },
    {
      id: '3',
      name: 'Deal Value Range Check',
      description: 'Deal values must be within realistic ranges',
      enabled: true,
      lastRun: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      failedRecords: 3,
      severity: 'high'
    },
    {
      id: '4',
      name: 'Close Date for Won Deals',
      description: 'All won deals must have a close date',
      enabled: true,
      lastRun: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      failedRecords: 24,
      severity: 'medium'
    },
    {
      id: '5',
      name: 'Contact-Deal Relationship',
      description: 'All deals must be associated with a valid contact',
      enabled: true,
      lastRun: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      failedRecords: 0,
      severity: 'high'
    }
  ];

  const mockErrors: ValidationError[] = [
    {
      id: '1',
      ruleId: '1',
      entityType: 'Deal',
      entityId: 2543,
      field: 'cash_collected',
      message: 'Won deal is missing cash collected value',
      severity: 'high',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      resolved: false
    },
    {
      id: '2',
      ruleId: '1',
      entityType: 'Deal',
      entityId: 2876,
      field: 'cash_collected',
      message: 'Won deal is missing cash collected value',
      severity: 'high',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      resolved: false
    },
    {
      id: '3',
      ruleId: '2',
      entityType: 'Contact',
      entityId: 1243,
      field: 'email',
      message: 'Invalid email format: missing domain',
      severity: 'medium',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      resolved: true
    },
    {
      id: '4',
      ruleId: '3',
      entityType: 'Deal',
      entityId: 3120,
      field: 'value',
      message: 'Deal value exceeds realistic threshold (10,000,000)',
      severity: 'high',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
      resolved: false
    }
  ];

  const mockHistory: SyncHistory[] = [
    {
      id: '1',
      source: 'Close CRM',
      startTime: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      endTime: new Date(Date.now() - 1000 * 60 * 33).toISOString(),
      status: 'success',
      recordsProcessed: 12435,
      recordsUpdated: 234,
      recordsCreated: 18,
      recordsFailed: 0,
      duration: 120000
    },
    {
      id: '2',
      source: 'Calendly',
      startTime: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      endTime: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
      status: 'success',
      recordsProcessed: 4893,
      recordsUpdated: 42,
      recordsCreated: 8,
      recordsFailed: 0,
      duration: 60000
    },
    {
      id: '3',
      source: 'Typeform',
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      endTime: new Date(Date.now() - 1000 * 60 * 60 * 24 + 1000 * 60 * 2).toISOString(),
      status: 'partial',
      recordsProcessed: 1235,
      recordsUpdated: 12,
      recordsCreated: 3,
      recordsFailed: 5,
      duration: 120000,
      error: 'API rate limit exceeded'
    },
    {
      id: '4',
      source: 'Close CRM',
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      endTime: new Date(Date.now() - 1000 * 60 * 60 * 2 + 1000 * 60 * 2).toISOString(),
      status: 'success',
      recordsProcessed: 12405,
      recordsUpdated: 156,
      recordsCreated: 30,
      recordsFailed: 0,
      duration: 120000
    },
    {
      id: '5',
      source: 'Cash Collected Update',
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      endTime: new Date(Date.now() - 1000 * 60 * 60 * 12 + 1000 * 60 * 3).toISOString(),
      status: 'success',
      recordsProcessed: 406,
      recordsUpdated: 406,
      recordsCreated: 0,
      recordsFailed: 0,
      duration: 180000
    }
  ];

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Health Monitor</h1>
          <p className="text-muted-foreground">
            Comprehensive monitoring of data integrity and synchronization
          </p>
        </div>
        <Button onClick={() => refetch()} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading database health data...</p>
          </div>
        </div>
      ) : error ? (
        <Alert variant="destructive" className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error fetching data</AlertTitle>
          <AlertDescription>
            There was a problem loading the database health information.
            Please try refreshing the page or contact support if the problem persists.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2">
              <HealthSummary metrics={mockMetrics} />
            </div>
            <div>
              <DataAnalytics />
            </div>
          </div>

          <Tabs defaultValue="sources" className="space-y-4">
            <TabsList>
              <TabsTrigger value="sources">Data Sources</TabsTrigger>
              <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
              <TabsTrigger value="history">Sync History</TabsTrigger>
              <TabsTrigger value="automation">Automation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sources" className="space-y-4">
              <DataSources sources={mockSources} />
            </TabsContent>
            
            <TabsContent value="mappings" className="space-y-4">
              <FieldMappings mappings={mockMappings} />
            </TabsContent>
            
            <TabsContent value="validation" className="space-y-4">
              <ValidationRules rules={mockRules} />
              <ValidationErrors errors={mockErrors} />
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4">
              <SyncHistory history={mockHistory} />
            </TabsContent>
            
            <TabsContent value="automation" className="space-y-4">
              <AutomationMonitor />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default DatabaseHealthPage;