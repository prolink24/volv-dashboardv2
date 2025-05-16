import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

export interface DataCompletenessField {
  name: string;
  completionRate: number;
  importance: 'critical' | 'high' | 'medium' | 'low';
}

interface DataCompletenessCardProps {
  title: string;
  description: string;
  entityType: string;
  overallCompleteness: number;
  fields: DataCompletenessField[];
}

export function DataCompletenessCard({
  title,
  description,
  entityType,
  overallCompleteness,
  fields
}: DataCompletenessCardProps) {
  // Sort fields by importance and then by completion rate (ascending)
  const sortedFields = [...fields].sort((a, b) => {
    const importanceOrder = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3
    };
    
    if (importanceOrder[a.importance] !== importanceOrder[b.importance]) {
      return importanceOrder[a.importance] - importanceOrder[b.importance];
    }
    
    return a.completionRate - b.completionRate;
  });

  const getCompletenessColor = (percentage: number) => {
    if (percentage >= 95) return "bg-green-500";
    if (percentage >= 80) return "bg-green-400";
    if (percentage >= 70) return "bg-yellow-500";
    if (percentage >= 50) return "bg-yellow-400";
    return "bg-red-500";
  };

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="warning">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return null;
    }
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
          Overall completeness: {Math.round(overallCompleteness)}%
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress 
          value={overallCompleteness} 
          className="h-2 mb-4" 
          color={getCompletenessColor(overallCompleteness)} 
        />
        
        <div className="space-y-3 mt-4">
          {sortedFields.map((field, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-2">
                  <span>{field.name}</span>
                  {getImportanceBadge(field.importance)}
                </div>
                <span>{Math.round(field.completionRate)}%</span>
              </div>
              <Progress 
                value={field.completionRate} 
                className="h-1" 
                color={getCompletenessColor(field.completionRate)} 
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}