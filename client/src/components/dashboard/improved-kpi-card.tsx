import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ImprovedKpiCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: React.ReactNode;
  className?: string;
  isLoading?: boolean;
}

export function ImprovedKpiCard({
  title,
  value,
  subValue,
  trend,
  icon,
  className,
  isLoading = false
}: ImprovedKpiCardProps) {
  // Helper to determine trend arrow and color
  const renderTrend = () => {
    if (!trend) return null;
    
    const trendValue = trend.value || 0;
    const isPositive = trendValue > 0;
    const isNeutral = trendValue === 0;
    
    return (
      <div className="flex items-center space-x-1">
        <span
          className={cn(
            "text-sm font-medium",
            isPositive && "text-green-500",
            isNeutral && "text-gray-500",
            !isPositive && !isNeutral && "text-red-500"
          )}
        >
          {isPositive && "↑"}
          {!isPositive && !isNeutral && "↓"}
          {isNeutral && "→"}
          {Math.abs(trendValue)}%
        </span>
        {trend.label && (
          <span className="text-xs text-muted-foreground">
            {trend.label}
          </span>
        )}
      </div>
    );
  };
  
  // Loading skeleton
  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-2 flex items-center justify-between">
          <Skeleton className="h-4 w-[100px]" />
          {icon && <Skeleton className="h-5 w-5 rounded-full" />}
        </CardHeader>
        <CardContent className="pb-3">
          <Skeleton className="h-8 w-[120px] mb-2" />
          <Skeleton className="h-3 w-[80px]" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2 flex items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-primary">{icon}</div>
        )}
      </CardHeader>
      <CardContent className="pb-3">
        <div className="text-2xl font-bold">
          {value}
        </div>
        <div className="flex justify-between items-center mt-1">
          {subValue && (
            <span className="text-xs text-muted-foreground">
              {subValue}
            </span>
          )}
          {renderTrend()}
        </div>
      </CardContent>
    </Card>
  );
}

export default ImprovedKpiCard;