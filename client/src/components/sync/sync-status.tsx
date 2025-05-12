import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";

interface SyncStatusProps {
  onRefreshData?: () => void;
}

interface SyncStatusData {
  inProgress: boolean;
  startTime: number | null;
  endTime: number | null;
  close: {
    totalLeads: number;
    processedLeads: number;
    importedContacts: number;
    errors: number;
    percentComplete: number;
  };
  calendly: {
    totalEvents: number;
    processedEvents: number;
    importedMeetings: number;
    errors: number;
    percentComplete: number;
  };
  typeform: {
    totalForms: number;
    totalResponses: number;
    processedResponses: number;
    importedSubmissions: number;
    errors: number;
    percentComplete: number;
  };
  totalContactsAfterSync: number;
  overallProgress: number;
  currentPhase: 'idle' | 'close' | 'calendly' | 'typeform' | 'attribution' | 'metrics' | 'completed';
  error: string | null;
}

export function SyncStatus({ onRefreshData }: SyncStatusProps) {
  const [refreshInterval, setRefreshInterval] = useState<number>(5000);

  // Query for sync status with automatic refetching while sync is in progress
  const { data: status, isLoading, error, refetch } = useQuery<SyncStatusData>({
    queryKey: ['/api/sync/status'],
    refetchInterval: refreshInterval,
    onSuccess: (data) => {
      // If sync is completed or has an error, stop auto-refreshing
      if (!data.inProgress || data.error) {
        setRefreshInterval(0);
      } else {
        setRefreshInterval(5000); // Otherwise refresh every 5 seconds
      }
    }
  });

  // Format time duration from milliseconds
  const formatDuration = (ms: number) => {
    if (!ms) return '--';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Get status badge and color based on sync phase
  const getStatusBadge = () => {
    if (!status) return null;
    
    if (status.error) {
      return <Badge variant="destructive">Error</Badge>;
    }
    
    if (!status.inProgress && status.currentPhase === 'completed') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
    }
    
    const phaseLabels: Record<string, string> = {
      idle: 'Idle',
      close: 'Syncing Close CRM',
      calendly: 'Syncing Calendly',
      typeform: 'Syncing Typeform',
      attribution: 'Running Attribution',
      metrics: 'Calculating Metrics'
    };
    
    return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
      {phaseLabels[status.currentPhase] || 'Processing'}
    </Badge>;
  };

  // Calculate elapsed time
  const getElapsedTime = () => {
    if (!status?.startTime) return '--';
    
    const endTime = status.endTime || Date.now();
    return formatDuration(endTime - status.startTime);
  };

  // Trigger a manual sync
  const handleManualSync = async () => {
    try {
      await fetch('/api/sync/all', {
        method: 'POST'
      });
      refetch();
      if (onRefreshData) {
        setTimeout(onRefreshData, 1000);
      }
    } catch (err) {
      console.error('Failed to trigger sync:', err);
    }
  };

  // Render appropriate icon based on sync status
  const renderStatusIcon = () => {
    if (isLoading) return <Loader2 className="animate-spin h-6 w-6 text-gray-400" />;
    
    if (!status) return null;
    
    if (status.error) {
      return <AlertCircle className="h-6 w-6 text-red-500" />;
    }
    
    if (status.inProgress) {
      return <Loader2 className="animate-spin h-6 w-6 text-blue-500" />;
    }
    
    if (status.currentPhase === 'completed') {
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    }
    
    return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-semibold">Data Synchronization</CardTitle>
          <CardDescription>Import data from Close, Calendly, and Typeform</CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge()}
          {renderStatusIcon()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="animate-spin mr-2 h-6 w-6 text-gray-400" />
            <span className="text-gray-500">Loading sync status...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-md">
            <p>Failed to load sync status. Please try again.</p>
          </div>
        ) : !status ? (
          <div className="p-4 bg-gray-50 text-gray-700 rounded-md">
            <p>No sync status available.</p>
          </div>
        ) : (
          <>
            {status.error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-md mb-4">
                <p className="font-semibold">Sync Error:</p>
                <p>{status.error}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Overall Progress</span>
                <span className="font-medium">{Math.round(status.overallProgress)}%</span>
              </div>
              <Progress value={status.overallProgress} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-1">
                <span className="text-sm text-gray-500">Elapsed Time</span>
                <p className="font-medium">{getElapsedTime()}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-gray-500">Current Phase</span>
                <p className="font-medium capitalize">{status.currentPhase.replace('-', ' ')}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-gray-500">Contacts Processed</span>
                <p className="font-medium">{status.close.importedContacts}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-gray-500">Total Contacts</span>
                <p className="font-medium">{status.totalContactsAfterSync || 'Pending'}</p>
              </div>
            </div>
            
            {status.inProgress && (
              <div className="mt-2 pt-2 border-t">
                <h4 className="font-medium mb-2">Current Progress</h4>
                <div className="space-y-4">
                  {status.currentPhase === 'close' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Close CRM - Leads Processed</span>
                        <span className="font-medium">{status.close.processedLeads} / {status.close.totalLeads || '?'}</span>
                      </div>
                      <Progress value={status.close.percentComplete} className="h-1.5" />
                    </div>
                  )}
                  
                  {status.currentPhase === 'calendly' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Calendly - Events Processed</span>
                        <span className="font-medium">{status.calendly.processedEvents} / {status.calendly.totalEvents || '?'}</span>
                      </div>
                      <Progress value={status.calendly.percentComplete} className="h-1.5" />
                    </div>
                  )}
                  
                  {status.currentPhase === 'typeform' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Typeform - Responses Processed</span>
                        <span className="font-medium">{status.typeform.processedResponses} / {status.typeform.totalResponses || '?'}</span>
                      </div>
                      <Progress value={status.typeform.percentComplete} className="h-1.5" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <Button
          variant="outline"
          onClick={refetch}
          disabled={isLoading || (status?.inProgress || false)}
        >
          Refresh Status
        </Button>
        <Button
          onClick={handleManualSync}
          disabled={isLoading || (status?.inProgress || false)}
        >
          Sync All Data
        </Button>
      </CardFooter>
    </Card>
  );
}