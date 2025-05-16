import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConfidenceMetric {
  name: string;
  score: number;
  description?: string;
}

interface ConfidenceScoreCardProps {
  title: string;
  description: string;
  overallScore: number;
  metrics: ConfidenceMetric[];
  className?: string;
}

export function ConfidenceScoreCard({
  title,
  description,
  overallScore,
  metrics,
  className
}: ConfidenceScoreCardProps) {
  // Sort metrics by score (descending)
  const sortedMetrics = [...metrics].sort((a, b) => b.score - a.score);
  
  // Generate color based on score
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-amber-500";
    if (score >= 60) return "text-orange-500";
    return "text-red-600";
  };
  
  // Generate ring classes based on score
  const getRingClasses = (score: number) => {
    const baseClasses = "rounded-full flex items-center justify-center";
    const sizeClasses = "w-16 h-16 md:w-20 md:h-20";
    
    if (score >= 90) return cn(baseClasses, sizeClasses, "ring-4 ring-green-100 bg-green-50");
    if (score >= 75) return cn(baseClasses, sizeClasses, "ring-4 ring-amber-100 bg-amber-50");
    if (score >= 60) return cn(baseClasses, sizeClasses, "ring-4 ring-orange-100 bg-orange-50");
    return cn(baseClasses, sizeClasses, "ring-4 ring-red-100 bg-red-50");
  };

  // Generate ring text class based on score
  const getRingTextClass = (score: number) => {
    if (score >= 90) return "text-green-700 text-2xl font-bold md:text-3xl";
    if (score >= 75) return "text-amber-700 text-2xl font-bold md:text-3xl";
    if (score >= 60) return "text-orange-700 text-2xl font-bold md:text-3xl";
    return "text-red-700 text-2xl font-bold md:text-3xl";
  };

  // Get score label
  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 60) return "Fair";
    return "Poor";
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
          Measures the reliability and accuracy of data synchronization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-6">
          {/* Overall score indicator */}
          <div className="flex flex-col md:flex-row items-center justify-center md:justify-between space-y-4 md:space-y-0">
            <div className={getRingClasses(overallScore)}>
              <span className={getRingTextClass(overallScore)}>{Math.round(overallScore)}%</span>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-lg font-medium">Overall Confidence</h3>
              <p className={cn("text-2xl font-bold", getScoreColor(overallScore))}>
                {getScoreLabel(overallScore)}
              </p>
              <p className="text-sm text-muted-foreground max-w-xs">
                {overallScore >= 90 ? (
                  "Very high confidence in data accuracy and completeness"
                ) : overallScore >= 75 ? (
                  "Good confidence with minor improvements needed"
                ) : overallScore >= 60 ? (
                  "Moderate confidence with several areas for improvement"
                ) : (
                  "Low confidence with significant data quality issues"
                )}
              </p>
            </div>
          </div>
          
          {/* Metrics breakdown */}
          <div className="space-y-3">
            {sortedMetrics.map((metric, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-2">{metric.name}</span>
                    {metric.description && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{metric.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full", {
                        "bg-green-500": metric.score >= 90,
                        "bg-amber-500": metric.score >= 75 && metric.score < 90,
                        "bg-orange-500": metric.score >= 60 && metric.score < 75,
                        "bg-red-500": metric.score < 60
                      })}
                      style={{ width: `${metric.score}%` }}
                    />
                  </div>
                  <span className={cn("text-xs font-medium", getScoreColor(metric.score))}>
                    {metric.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Recommendations */}
          {overallScore < 90 && (
            <div className="p-3 bg-blue-50 rounded-md text-sm">
              <p className="font-medium text-blue-700 mb-1">Improvement Recommendations</p>
              <ul className="list-disc pl-5 text-blue-600 space-y-1">
                {overallScore < 75 && (
                  <li>Run the data consistency check to identify mismatched fields</li>
                )}
                {overallScore < 60 && (
                  <li>Verify API connections to all platforms</li>
                )}
                {sortedMetrics.find(m => m.score < 80) && (
                  <li>Review and update contact matching rules</li>
                )}
                {sortedMetrics.find(m => m.name.toLowerCase().includes('field') && m.score < 70) && (
                  <li>Run field coverage analysis and populate missing required fields</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}