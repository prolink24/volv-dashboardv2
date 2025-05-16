import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { TimeSeriesChart } from "./time-series-chart";

interface StorageGrowthPoint {
  timestamp: Date | string;
  count: number;
}

interface StorageGrowthCardProps {
  title: string;
  description: string;
  entityType: string;
  currentCount: number;
  historicalData: StorageGrowthPoint[];
  projectedData?: StorageGrowthPoint[];
}

export function StorageGrowthCard({
  title,
  description,
  entityType,
  currentCount,
  historicalData,
  projectedData
}: StorageGrowthCardProps) {
  // Calculate growth rate
  const calculateGrowthRate = () => {
    if (historicalData.length < 2) return { rate: 0, direction: "neutral" };
    
    const sortedData = [...historicalData].sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
    
    // Get the first and latest points
    const firstPoint = sortedData[0];
    const latestPoint = sortedData[sortedData.length - 1];
    
    // Calculate time difference in days
    const daysDiff = (new Date(latestPoint.timestamp).getTime() - new Date(firstPoint.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff === 0) return { rate: 0, direction: "neutral" };
    
    // Calculate growth rate per day
    const growthRate = (latestPoint.count - firstPoint.count) / daysDiff;
    
    // Determine direction
    const direction = growthRate > 0 ? "up" : growthRate < 0 ? "down" : "neutral";
    
    // Return absolute percentage growth per month (approximating a 30-day month)
    return { 
      rate: Math.abs(growthRate * 30), 
      direction 
    };
  };
  
  const { rate, direction } = calculateGrowthRate();
  
  // Prepare formatted data for TimeSeriesChart
  const chartData = historicalData.map(point => ({
    timestamp: new Date(point.timestamp),
    value: point.count
  }));
  
  // Add projected data if available
  const projectionData = projectedData 
    ? projectedData.map(point => ({
        timestamp: new Date(point.timestamp),
        value: point.count
      }))
    : [];
  
  // Convert growth rate to readable format
  const formatGrowthRate = (rate: number) => {
    if (rate < 1000) return `${Math.round(rate)} per month`;
    return `${(rate / 1000).toFixed(1)}k per month`;
  };
  
  // Get trend indicator
  const getTrendIndicator = () => {
    switch (direction) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get growth description
  const getGrowthDescription = () => {
    if (direction === "neutral") return "Stable";
    if (direction === "up") return formatGrowthRate(rate) + " increase";
    return formatGrowthRate(rate) + " decrease";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>
          <div className="flex items-center justify-between">
            <span>Current: {currentCount.toLocaleString()} {entityType}</span>
            <span className="flex items-center gap-1">
              {getTrendIndicator()}
              {getGrowthDescription()}
            </span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TimeSeriesChart
          title=""
          description=""
          data={chartData}
          yAxisLabel={entityType}
          height={180}
        />
        
        {projectionData.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Forecast (Next 90 Days)</h4>
            <TimeSeriesChart
              title=""
              description=""
              data={[...chartData.slice(-1), ...projectionData]} // Include the last actual data point
              yAxisLabel={entityType}
              height={140}
              lineColor="#8b5cf6" // Purple for projection
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}