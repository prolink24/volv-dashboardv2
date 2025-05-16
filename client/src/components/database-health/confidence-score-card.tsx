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

interface ConfidenceScoreCardProps {
  title: string;
  description: string;
  score: number;
  maxScore: number;
  distribution?: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
}

export function ConfidenceScoreCard({
  title,
  description,
  score,
  maxScore,
  distribution
}: ConfidenceScoreCardProps) {
  const percentage = Math.min(Math.round((score / maxScore) * 100), 100);
  
  const getColorClass = (percent: number) => {
    if (percent >= 90) return "bg-green-500";
    if (percent >= 70) return "bg-yellow-500";
    return "bg-red-500";
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
          Score: {score} / {maxScore} ({percentage}%)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress 
          value={percentage} 
          className="h-2" 
          indicatorClassName={getColorClass(percentage)} 
        />
        
        {distribution && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span>High confidence</span>
              <span>{Math.round(distribution.highConfidence * 100)}%</span>
            </div>
            <Progress 
              value={distribution.highConfidence * 100} 
              className="h-1" 
              indicatorClassName="bg-green-500" 
            />
            
            <div className="flex justify-between text-xs">
              <span>Medium confidence</span>
              <span>{Math.round(distribution.mediumConfidence * 100)}%</span>
            </div>
            <Progress 
              value={distribution.mediumConfidence * 100} 
              className="h-1" 
              indicatorClassName="bg-yellow-500" 
            />
            
            <div className="flex justify-between text-xs">
              <span>Low confidence</span>
              <span>{Math.round(distribution.lowConfidence * 100)}%</span>
            </div>
            <Progress 
              value={distribution.lowConfidence * 100} 
              className="h-1" 
              indicatorClassName="bg-red-500" 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}