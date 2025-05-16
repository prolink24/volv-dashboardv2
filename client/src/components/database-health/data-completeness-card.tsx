import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

interface DataCompletenessCardProps {
  completeness?: number;
  target?: number;
  description?: string;
}

const DataCompletenessCard = ({ 
  completeness, 
  target = 95, 
  description = "Overall data completeness across all integrated systems"
}: DataCompletenessCardProps) => {
  // Handle undefined completeness with a default of 0
  const valueToShow = completeness !== undefined ? completeness : 0;
  
  // Determine status based on data completeness
  const getStatus = (value?: number) => {
    if (value === undefined) return 'critical';
    if (value >= 90) return 'healthy';
    if (value >= 70) return 'warning';
    return 'critical';
  };
  
  const status = getStatus(completeness);
  
  // Get icon based on status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
      default:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getStatusIcon(status)}
          Data Completeness
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mt-1">
          <div className="flex justify-between mb-1">
            <span className="text-2xl font-bold">{valueToShow.toFixed(1)}%</span>
            <Badge variant={status === 'healthy' ? 'default' : status === 'warning' ? 'warning' : 'destructive'}>
              {status}
            </Badge>
          </div>
          <Progress value={valueToShow} max={100} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1 flex justify-between">
            <span>Target: {target}%</span>
            <span>Last checked: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataCompletenessCard;