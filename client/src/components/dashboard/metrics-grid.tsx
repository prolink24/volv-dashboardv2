import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatPercentage } from "@/lib/utils";

interface MetricItem {
  label: string;
  value: number | string;
  description?: string;
  format?: "number" | "currency" | "percentage";
}

interface MetricsGridProps {
  title: string;
  metrics: MetricItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

const MetricsGrid = ({ title, metrics, columns = 4, className }: MetricsGridProps) => {
  const formatValue = (metric: MetricItem) => {
    if (metric.format === "currency") {
      return formatCurrency(Number(metric.value));
    } else if (metric.format === "percentage") {
      return `${metric.value}%`;
    }
    return metric.value;
  };
  
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <h3 className="text-base font-medium mb-4">{title}</h3>
        <div className={`grid grid-cols-2 md:grid-cols-${columns} gap-4`}>
          {metrics.map((metric, index) => (
            <div key={index} className="flex flex-col">
              <span className="text-sm text-muted-foreground">
                {metric.label}
                {metric.description && (
                  <div className="text-xs text-muted-foreground">{metric.description}</div>
                )}
              </span>
              <span className="text-xl font-bold font-mono">{formatValue(metric)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricsGrid;
