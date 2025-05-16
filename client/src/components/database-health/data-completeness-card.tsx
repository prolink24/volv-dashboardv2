import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Field {
  name: string;
  completionRate: number;
  importance: 'critical' | 'high' | 'medium' | 'low';
}

interface DataCompletenessCardProps {
  title: string;
  description: string;
  entityType: string;
  overallCompleteness: number;
  fields: Field[];
  className?: string;
}

export function DataCompletenessCard({
  title,
  description,
  entityType,
  overallCompleteness,
  fields,
  className
}: DataCompletenessCardProps) {
  // Sort fields by completeness rate (ascending)
  const sortedFields = [...fields].sort((a, b) => a.completionRate - b.completionRate);
  
  // Get classification based on overall completeness
  const getOverallClass = (value: number) => {
    if (value >= 90) return "text-green-600";
    if (value >= 75) return "text-amber-600";
    return "text-red-600";
  };
  
  // Get color for individual field based on completion rate
  const getFieldColor = (value: number) => {
    if (value >= 90) return "bg-green-600";
    if (value >= 75) return "bg-amber-500";
    if (value >= 60) return "bg-orange-500";
    return "bg-red-500";
  };
  
  // Get badge variant for importance
  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'critical':
        return "destructive";
      case 'high':
        return "secondary";
      case 'medium':
        return "outline";
      case 'low':
      default:
        return "outline";
    }
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
          {entityType} data completeness: <span className={getOverallClass(overallCompleteness)}>
            {Math.round(overallCompleteness)}%
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overall progress bar */}
          <div className="space-y-2">
            <Progress 
              value={overallCompleteness} 
              className="h-2"
              style={{ backgroundColor: "rgba(0,0,0,0.1)" }}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
          </div>
          
          {/* Field breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Field Completeness</h4>
            {sortedFields.map((field, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span>{field.name}</span>
                    <Badge variant={getImportanceBadge(field.importance) as any}>
                      {field.importance}
                    </Badge>
                  </div>
                  <span className="font-medium">{field.completionRate?.toFixed(1) || '0.0'}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getFieldColor(field.completionRate)}`}
                    style={{ width: `${field.completionRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          {/* Importance legend */}
          <div className="pt-2 border-t">
            <h4 className="text-xs font-medium mb-2">Field Importance Guide</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Badge variant="destructive" className="h-5 px-1">critical</Badge>
                <span className="text-muted-foreground">Required fields</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="h-5 px-1">high</Badge>
                <span className="text-muted-foreground">Primary fields</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="h-5 px-1">medium</Badge>
                <span className="text-muted-foreground">Secondary fields</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="h-5 px-1">low</Badge>
                <span className="text-muted-foreground">Optional fields</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}