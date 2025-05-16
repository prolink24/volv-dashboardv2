import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface TimeSeriesData {
  timestamp: Date;
  value: number;
}

interface StorageGrowthCardProps {
  title: string;
  description: string;
  entityType: string;
  currentCount: number;
  historicalData: TimeSeriesData[];
  projectedData: TimeSeriesData[];
  className?: string;
}

export function StorageGrowthCard({
  title,
  description,
  entityType,
  currentCount,
  historicalData,
  projectedData,
  className
}: StorageGrowthCardProps) {
  // Merge historical and projected data for the combined chart
  const combinedData = [
    ...historicalData.map(item => ({
      date: item.timestamp,
      historical: item.value,
      projected: null
    })),
    // Add the projection data
    ...projectedData.map(item => ({
      date: item.timestamp,
      historical: null,
      projected: item.value
    }))
  ];

  // Sort data by date
  combinedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate growth rates
  const calculateGrowthRate = (data: TimeSeriesData[]) => {
    if (data.length < 2) return "N/A";

    const oldestValue = data[0].value;
    const newestValue = data[data.length - 1].value;
    const daysDifference = Math.max(1, (new Date(data[data.length - 1].timestamp).getTime() - 
                               new Date(data[0].timestamp).getTime()) / (1000 * 60 * 60 * 24));
    
    const dailyGrowthRate = (newestValue - oldestValue) / oldestValue / daysDifference;
    const monthlyGrowthRate = dailyGrowthRate * 30;
    
    const formattedRate = (monthlyGrowthRate * 100).toFixed(1);
    return `${formattedRate}% / month`;
  };

  // Growth projections
  const growthRate = calculateGrowthRate(historicalData);
  const projectedGrowth = calculateGrowthRate(projectedData);

  // Format value for better readability
  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value;
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dateLabel = format(new Date(label), "MMM d, yyyy");
      return (
        <div className="bg-white p-3 border shadow-sm rounded-md">
          <p className="font-medium">{dateLabel}</p>
          {payload.map((entry: any, index: number) => (
            entry.value !== null && (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {`${entry.name === 'historical' ? 'Actual' : 'Projected'}: ${formatValue(entry.value)}`}
              </p>
            )
          ))}
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
        <div className="flex flex-col space-y-4">
          {/* Current stats */}
          <div className="flex justify-between p-3 bg-muted/30 rounded-md">
            <div>
              <p className="text-sm text-muted-foreground">Current Count</p>
              <p className="text-xl font-bold">{currentCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Growth Rate</p>
              <p className="text-xl font-bold">{growthRate}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Projected (90d)</p>
              <p className="text-xl font-bold">{formatValue(projectedData[projectedData.length - 1]?.value || 0)}</p>
            </div>
          </div>
          
          {/* Growth chart */}
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={combinedData}>
                <defs>
                  <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(date) => format(new Date(date), "MMM d")}
                  minTickGap={40}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => formatValue(value)}
                  width={40}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={30} 
                  formatter={(value) => value === 'historical' ? 'Historical Data' : 'Projected Growth'} 
                />
                <Area 
                  type="monotone" 
                  dataKey="historical" 
                  stroke="#8884d8" 
                  fillOpacity={1}
                  fill="url(#colorHistorical)" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="projected" 
                  stroke="#ff7300" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Growth indicators */}
          <div className="text-xs text-muted-foreground">
            <p>
              <span className="font-medium">{entityType}</span> growing at <span className="font-medium">{growthRate}</span>. 
              With this growth rate, you should consider scaling database resources 
              in {Math.round((currentCount * 2 - currentCount) / (currentCount * (parseInt(growthRate as string) / 100) / 30))} days.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}