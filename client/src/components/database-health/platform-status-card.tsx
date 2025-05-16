import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, AlertTriangle, AlertCircle, HelpCircle, WifiOff } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type PlatformStatus = 'healthy' | 'warning' | 'critical' | 'offline' | 'unknown';

interface PlatformStatusCardProps {
  platform: 'close' | 'calendly' | 'typeform';
  status: PlatformStatus;
  lastSyncTime: string | Date;
  responseTime?: number; // in ms
  syncCount?: number;
  errorCount?: number;
  onRefresh?: () => void;
}

export function PlatformStatusCard({
  platform,
  status,
  lastSyncTime,
  responseTime,
  syncCount,
  errorCount = 0,
  onRefresh
}: PlatformStatusCardProps) {
  const lastSync = typeof lastSyncTime === 'string' 
    ? new Date(lastSyncTime) 
    : lastSyncTime;

  return (
    <Card className="overflow-hidden">
      <div className={`h-1 ${getStatusInfo(status).colorClass}`} />
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-medium">
              {platform === 'close' ? 'Close CRM' : 
               platform === 'calendly' ? 'Calendly' : 'Typeform'}
            </CardTitle>
            <Badge variant={getStatusInfo(status).badgeVariant}>
              {getStatusInfo(status).label}
            </Badge>
          </div>
          {onRefresh && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onRefresh}
              title="Refresh connection"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          Last synced {getTimeAgo(lastSync)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium flex items-center gap-1">
                  {getStatusInfo(status).icon}
                  {getStatusInfo(status).label}
                </span>
              </div>
              {responseTime !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Response time:</span>
                  <span className="font-medium">
                    {responseTime} ms
                  </span>
                </div>
              )}
              {syncCount !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Synced records:</span>
                  <span className="font-medium">
                    {syncCount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Errors:</span>
                <span className={`font-medium ${errorCount > 0 ? "text-red-500" : ""}`}>
                  {errorCount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          
          {status === 'warning' || status === 'critical' || status === 'offline' ? (
            <div className="text-sm bg-muted p-2 rounded-md">
              <div className="font-semibold mb-1">Recommended action:</div>
              <p>
                {status === 'warning' 
                  ? `Check API rate limits and connection stability for the ${platform} integration.` 
                  : status === 'critical' 
                    ? `Verify API credentials and that the ${platform} service is operational.`
                    : `Check network connectivity and that the ${platform} API is available.`}
              </p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} days ago`;
  
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} months ago`;
}

function getStatusInfo(status: PlatformStatus) {
  switch (status) {
    case 'healthy':
      return {
        label: 'Healthy',
        icon: <Check className="h-4 w-4 text-green-500" />,
        colorClass: 'bg-green-500',
        badgeVariant: 'success' as const
      };
    case 'warning':
      return {
        label: 'Warning',
        icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
        colorClass: 'bg-yellow-500',
        badgeVariant: 'warning' as const
      };
    case 'critical':
      return {
        label: 'Critical',
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
        colorClass: 'bg-red-500',
        badgeVariant: 'destructive' as const
      };
    case 'offline':
      return {
        label: 'Offline',
        icon: <WifiOff className="h-4 w-4 text-gray-500" />,
        colorClass: 'bg-gray-500',
        badgeVariant: 'secondary' as const
      };
    default:
      return {
        label: 'Unknown',
        icon: <HelpCircle className="h-4 w-4 text-gray-500" />,
        colorClass: 'bg-gray-500',
        badgeVariant: 'outline' as const
      };
  }
}