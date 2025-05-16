import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCcw, CheckCircle, AlertTriangle, XCircle, HelpCircle, Clock, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SiCalendly, SiTypeform } from "react-icons/si";

interface PlatformStatusCardProps {
  platform: "close" | "calendly" | "typeform";
  status: "healthy" | "warning" | "critical" | "offline" | "unknown";
  lastSyncTime: string;
  responseTime: number;
  syncCount: number;
  errorCount: number;
  onRefresh: () => void;
}

export function PlatformStatusCard({
  platform,
  status,
  lastSyncTime,
  responseTime,
  syncCount,
  errorCount,
  onRefresh
}: PlatformStatusCardProps) {
  // Platform-specific data
  const platformData = {
    close: {
      name: "Close CRM",
      icon: <Database className="h-5 w-5" />,
      color: "text-blue-600",
      description: "Primary CRM data source for contacts, deals, and activities"
    },
    calendly: {
      name: "Calendly",
      icon: <SiCalendly className="h-5 w-5" />,
      color: "text-indigo-600",
      description: "Meeting scheduling and calendar integration"
    },
    typeform: {
      name: "Typeform",
      icon: <SiTypeform className="h-5 w-5" />,
      color: "text-gray-600",
      description: "Forms and survey data collection"
    }
  };

  // Status indicator information
  const statusInfo = {
    healthy: {
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      label: "Healthy",
      badge: <Badge variant="default" className="bg-green-500">Healthy</Badge>,
      description: "All systems operational"
    },
    warning: {
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      label: "Warning",
      badge: <Badge variant="default" className="bg-amber-500">Warning</Badge>,
      description: "Minor issues detected"
    },
    critical: {
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      label: "Critical",
      badge: <Badge variant="destructive">Critical</Badge>,
      description: "Major issues detected"
    },
    offline: {
      icon: <XCircle className="h-5 w-5 text-gray-500" />,
      label: "Offline",
      badge: <Badge variant="outline" className="text-gray-500">Offline</Badge>,
      description: "Service unavailable"
    },
    unknown: {
      icon: <HelpCircle className="h-5 w-5 text-gray-400" />,
      label: "Unknown",
      badge: <Badge variant="outline">Unknown</Badge>,
      description: "Status cannot be determined"
    }
  };

  // For calculating response time quality
  const getResponseQuality = (time: number) => {
    if (time < 300) return "text-green-500";
    if (time < 800) return "text-amber-500";
    return "text-red-500";
  };
  
  // For calculating error rate severity
  const getErrorSeverity = (count: number) => {
    if (count === 0) return 0;
    if (count < 5) return 1;
    if (count < 20) return 2;
    return 3;
  };
  
  const errorSeverityClass = [
    "bg-green-500", // No errors
    "bg-amber-300", // Low 
    "bg-amber-500", // Medium
    "bg-red-500"    // High
  ];

  // Current platform and status
  const currentPlatform = platformData[platform];
  const currentStatus = statusInfo[status];
  
  // Calculate last sync time in relative format
  const getRelativeTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diffMinutes = Math.round((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={cn("flex items-center justify-center", currentPlatform.color)}>
              {currentPlatform.icon}
            </div>
            <CardTitle className="text-lg font-medium">{currentPlatform.name}</CardTitle>
          </div>
          {currentStatus.badge}
        </div>
        <CardDescription>{currentPlatform.description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-4">
          {/* Status detail */}
          <div className="flex items-center space-x-2 text-sm">
            {currentStatus.icon}
            <span>{currentStatus.description}</span>
          </div>
          
          {/* Last sync time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="mr-1 h-3.5 w-3.5" />
              <span>Last synced:</span>
            </div>
            <div className="flex items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm font-medium">{getRelativeTime(lastSyncTime)}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{new Date(lastSyncTime).toLocaleString()}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          {/* Response time */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Response time</span>
              <span className={getResponseQuality(responseTime)}>{responseTime} ms</span>
            </div>
            <Progress value={Math.min(100, (responseTime / 1000) * 100)} max={100} 
              className={`h-1 ${getResponseQuality(responseTime).replace('text-', 'bg-')}`} />
          </div>
          
          {/* Error rate */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Error rate</span>
              <span>{syncCount > 0 ? ((errorCount / syncCount) * 100).toFixed(1) : '0'}%</span>
            </div>
            <div className="grid grid-cols-4 gap-1 h-1">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={cn(
                    "h-full rounded-full",
                    index <= getErrorSeverity(errorCount) ? errorSeverityClass[getErrorSeverity(errorCount)] : "bg-gray-200"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="flex w-full justify-between text-xs">
          <span className="text-muted-foreground">{syncCount} syncs</span>
          <span className="text-muted-foreground">{errorCount} errors</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute right-2 bottom-2"
          onClick={onRefresh}
        >
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}