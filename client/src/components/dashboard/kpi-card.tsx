import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

const KpiCard = ({ title, value, subValue, trend, className }: KpiCardProps) => {
  // Determine trend color and icon
  const getTrendBadge = () => {
    if (!trend) return null;
    
    const isPositive = trend.value > 0;
    const isNegative = trend.value < 0;
    
    let bgClass = "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
    let icon = "→";
    
    if (isPositive) {
      bgClass = "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
      icon = "↑";
    } else if (isNegative) {
      bgClass = "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
      icon = "↓";
    }
    
    return (
      <span className={`text-xs px-1.5 py-0.5 ${bgClass} rounded`}>
        {icon} {Math.abs(trend.value)}%
      </span>
    );
  };
  
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          {trend && getTrendBadge()}
        </div>
        <div className="flex items-baseline">
          <span className="text-2xl font-bold">{value}</span>
          {subValue && (
            <span className="ml-1 text-xs text-muted-foreground">{subValue}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default KpiCard;
