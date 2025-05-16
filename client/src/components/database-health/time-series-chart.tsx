import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TimeSeriesData {
  timestamp: Date;
  value: number;
}

interface TimeSeriesChartProps {
  title: string;
  description: string;
  data: TimeSeriesData[];
  yAxisLabel?: string;
  height?: number;
  lineColor?: string;
  className?: string;
}

export function TimeSeriesChart({
  title,
  description,
  data,
  yAxisLabel,
  height = 300,
  lineColor = "#4f46e5",
  className
}: TimeSeriesChartProps) {
  // Format data for the chart
  const formattedData = data.map(item => ({
    date: item.timestamp,
    value: item.value
  }));

  // Format date for tooltip
  const formatDate = (date: Date) => {
    return format(new Date(date), "MMM d, yyyy");
  };

  // Format value with appropriate unit (e.g., adding comma separators)
  const formatValue = (value: number) => {
    return value.toLocaleString();
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border shadow-sm rounded-md">
          <p className="font-medium">{formatDate(label)}</p>
          <p className="text-sm">
            <span style={{ color: lineColor }}>{`${yAxisLabel || 'Value'}: ${formatValue(payload[0].value)}`}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={formattedData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lineColor} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(date) => format(new Date(date), "MMM d")}
                minTickGap={30}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                  return value;
                }}
                width={40}
                label={{ 
                  value: yAxisLabel, 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: 12, fill: '#666' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={lineColor} 
                fillOpacity={1}
                fill="url(#colorValue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}