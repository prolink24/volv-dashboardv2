import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

interface DataCompletenessCardProps {
  completeness?: number;
  target?: number;
  description?: string;
  title?: string;
}

const DataCompletenessCard = ({ 
  completeness, 
  target = 95, 
  description = "Overall data completeness across all integrated systems",
  title = "Data Completeness"
}: DataCompletenessCardProps) => {
  // Handle undefined completeness with a default of 0
  const valueToShow = completeness !== undefined ? completeness : 0;
  
  // Define status types for type safety
  type StatusType = 'healthy' | 'warning' | 'critical';
  
  // Determine status based on data completeness
  const getStatus = (value?: number): StatusType => {
    if (value === undefined) return 'critical';
    if (value >= 90) return 'healthy';
    if (value >= 70) return 'warning';
    return 'critical';
  };
  
  const status = getStatus(completeness);
  
  // Map status to valid badge variant
  const getBadgeVariant = (status: StatusType): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'healthy': return 'default';
      case 'warning': return 'secondary';
      case 'critical': return 'destructive';
    }
  };
  
  // Get icon based on status
  const getStatusIcon = (status: StatusType) => {
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
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mt-1">
          <div className="flex justify-between mb-1">
            <span className="text-2xl font-bold">{valueToShow !== undefined ? valueToShow.toFixed(1) : '0.0'}%</span>
            <Badge variant={getBadgeVariant(status)}>
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