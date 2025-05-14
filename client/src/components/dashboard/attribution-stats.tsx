import React, { useEffect } from "react";
import { useAttributionStats } from "@/hooks/use-dashboard-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, Clock, HelpCircle, AlertTriangle, Zap } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const AttributionStats = () => {
  const { data, isLoading, error, isError, refetch } = useAttributionStats();
  
  // Log data flow for debugging
  useEffect(() => {
    const debugInfo = [
      "Attribution Stats Component Debug:",
      `- Is Loading: ${isLoading}`,
      `- Is Error: ${isError}`,
      `- Error: ${error || null}`,
      `- Has Data: ${Boolean(data)}`,
    ];
    
    if (data) {
      debugInfo.push(
        `- Data Keys: ${JSON.stringify(Object.keys(data))}`,
        `- Success Flag: ${data.success}`,
        `- AttributionAccuracy: ${data.attributionAccuracy}`
      );
      
      if (data.stats) {
        debugInfo.push(
          `- Has Stats: ${Boolean(data.stats)}`,
          `- Stats Keys: ${JSON.stringify(Object.keys(data.stats))}`
        );
      } else {
        debugInfo.push("- Stats: Missing");
      }
    }
    
    // Log all debug info at once to keep console cleaner
    console.log(...debugInfo);
    
    // Implement progressive retry with backoff
    if (isError && !isLoading) {
      console.log("Attribution stats error detected, will retry in 2s");
      const retryTimer = setTimeout(() => {
        console.log("Retrying attribution stats fetch...");
        refetch().catch(e => {
          console.error("Retry failed:", e instanceof Error ? e.message : String(e));
        });
      }, 2000);
      
      return () => clearTimeout(retryTimer);
    }
  }, [isLoading, isError, data, error, refetch]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            Attribution Statistics
            <Clock className="ml-2 h-4 w-4 animate-pulse text-muted-foreground" />
          </CardTitle>
          <CardDescription>Loading attribution metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data || !data.success) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center text-destructive">
            Attribution Statistics
            <AlertCircle className="ml-2 h-4 w-4" />
          </CardTitle>
          <CardDescription>Unable to load attribution data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : data?.error || "An unknown error occurred"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { attributionAccuracy, stats } = data;
  
  // Get status indicator based on accuracy
  const getStatusIndicator = (accuracy: number) => {
    if (accuracy >= 90) {
      return { 
        color: "text-green-500", 
        icon: <Check className="h-4 w-4" />,
        label: "Excellent",
        badgeColor: "bg-green-100 text-green-800 hover:bg-green-200"
      };
    } else if (accuracy >= 75) {
      return { 
        color: "text-amber-500", 
        icon: <AlertTriangle className="h-4 w-4" />,
        label: "Good",
        badgeColor: "bg-amber-100 text-amber-800 hover:bg-amber-200"
      };
    } else {
      return { 
        color: "text-red-500", 
        icon: <AlertCircle className="h-4 w-4" />, 
        label: "Needs Improvement",
        badgeColor: "bg-red-100 text-red-800 hover:bg-red-200"
      };
    }
  };

  const accuracyStatus = getStatusIndicator(attributionAccuracy || 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Attribution Statistics</span>
          <Badge className={accuracyStatus.badgeColor}>
            <span className="flex items-center">
              {accuracyStatus.icon}
              <span className="ml-1">{accuracyStatus.label}</span>
            </span>
          </Badge>
        </CardTitle>
        <CardDescription>Metrics about contact attribution quality</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Attribution Accuracy */}
          <div>
            <div className="flex justify-between mb-1">
              <div className="flex items-center">
                <span className="text-sm font-medium">Attribution Accuracy</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 ml-1 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Overall certainty of our attribution model based on data quality and completeness.
                        Goal is &gt;90% for reliable reporting.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className={`text-sm font-medium ${accuracyStatus.color}`}>
                {attributionAccuracy?.toFixed(1)}%
              </span>
            </div>
            <Progress value={attributionAccuracy} max={100} className="h-2" />
          </div>

          {/* Multi-source contact rate */}
          {stats?.multiSourceRate !== undefined && (
            <div className="border-t pt-3">
              <div className="flex justify-between mb-1">
                <div className="flex items-center">
                  <span className="text-sm font-medium">Multi-Source Contacts</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 ml-1 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Percentage of contacts with data from multiple platforms (Close CRM, Calendly, etc.).
                          Higher values indicate better cross-platform attribution.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-sm font-medium">
                  {stats.multiSourceRate.toFixed(1)}%
                </span>
              </div>
              <Progress value={stats.multiSourceRate} max={100} className="h-2" />
            </div>
          )}

          {/* Deal Attribution Rate */}
          {stats?.dealAttributionRate !== undefined && (
            <div className="border-t pt-3">
              <div className="flex justify-between mb-1">
                <div className="flex items-center">
                  <span className="text-sm font-medium">Deal Attribution</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 ml-1 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Percentage of deals with complete attribution chains including meetings and activities.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-sm font-medium">
                  {stats.dealAttributionRate.toFixed(1)}%
                </span>
              </div>
              <Progress value={stats.dealAttributionRate} max={100} className="h-2" />
            </div>
          )}
          
          {/* Field Coverage */}
          {stats?.fieldCoverage !== undefined && (
            <div className="border-t pt-3">
              <div className="flex justify-between mb-1">
                <div className="flex items-center">
                  <span className="text-sm font-medium">Field Coverage</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 ml-1 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Percentage of contacts with all required fields properly mapped.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-sm font-medium">
                  {stats.fieldCoverage.toFixed(1)}%
                </span>
              </div>
              <Progress value={stats.fieldCoverage} max={100} className="h-2" />
            </div>
          )}

          {/* System Status */}
          <div className="border-t pt-3 flex justify-between items-center">
            <span className="text-sm font-medium">System Status</span>
            <span className="text-sm font-medium flex items-center text-green-500">
              <Zap className="mr-1 h-4 w-4" /> Live
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttributionStats;