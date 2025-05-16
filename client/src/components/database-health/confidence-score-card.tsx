import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip
} from "recharts";

interface ConfidenceScoreCardProps {
  title: string;
  description: string;
  overallScore: number;
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
    none: number;
  };
  className?: string;
}

export function ConfidenceScoreCard({
  title,
  description,
  overallScore,
  confidenceDistribution,
  className
}: ConfidenceScoreCardProps) {
  // Colors for confidence levels
  const COLORS = {
    high: '#10b981', // green
    medium: '#f59e0b', // amber
    low: '#f97316', // orange
    none: '#ef4444'  // red
  };

  // Format the distribution data for the pie chart
  const distributionData = [
    { name: 'High', value: confidenceDistribution.high * 100, color: COLORS.high },
    { name: 'Medium', value: confidenceDistribution.medium * 100, color: COLORS.medium },
    { name: 'Low', value: confidenceDistribution.low * 100, color: COLORS.low },
    { name: 'None', value: confidenceDistribution.none * 100, color: COLORS.none }
  ];

  // Score breakdown with descriptions
  const scoreBreakdown = [
    { 
      level: 'High', 
      percentage: confidenceDistribution.high * 100,
      description: 'Exact matches across multiple data points',
      color: COLORS.high
    },
    { 
      level: 'Medium', 
      percentage: confidenceDistribution.medium * 100,
      description: 'Strong matches with minor variations',
      color: COLORS.medium
    },
    { 
      level: 'Low', 
      percentage: confidenceDistribution.low * 100,
      description: 'Potential matches requiring verification',
      color: COLORS.low
    },
    { 
      level: 'None', 
      percentage: confidenceDistribution.none * 100,
      description: 'No matching confidence established',
      color: COLORS.none
    }
  ];

  // Function to get appropriate color for overall score
  const getScoreColor = (score: number) => {
    if (score >= 80) return COLORS.high;
    if (score >= 60) return COLORS.medium;
    if (score >= 40) return COLORS.low;
    return COLORS.none;
  };

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-sm text-xs">
          <p className="font-medium">{`${payload[0].name}: ${payload[0].value.toFixed(1)}%`}</p>
          <p className="text-muted-foreground">{
            scoreBreakdown.find(item => item.level === payload[0].name)?.description
          }</p>
        </div>
      );
    }
    return null;
  };

  // Format percentage for display
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
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
          Overall matching confidence: {Math.round(overallScore)}%
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall score progress bar */}
          <div className="space-y-2">
            <Progress 
              value={overallScore} 
              className="h-2" 
              style={{ 
                backgroundColor: "rgba(0,0,0,0.1)",
                "--progress-color": getScoreColor(overallScore) 
              } as React.CSSProperties}
            />

            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Low confidence</span>
              <span>High confidence</span>
            </div>
          </div>

          {/* Confidence distribution pie chart */}
          <div className="h-[200px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  labelLine={false}
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
                <RechartsTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Score breakdown */}
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-medium">Confidence Distribution</h4>
            {scoreBreakdown.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium">{item.level}</span>
                </div>
                <div className="flex space-x-4">
                  <span className="text-muted-foreground max-w-[180px] hidden sm:block">
                    {item.description}
                  </span>
                  <span className="font-medium">
                    {formatPercentage(item.percentage)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}