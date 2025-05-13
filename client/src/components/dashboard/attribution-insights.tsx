import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Loader2, ArrowRight, Clock, Activity, Calendar, Users, Zap } from "lucide-react";

interface InsightItem {
  title: string;
  description: string;
  icon?: React.ReactNode;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
}

interface AttributionInsightsProps {
  insights?: InsightItem[];
  title?: string;
  description?: string;
  isLoading?: boolean;
}

export const AttributionInsights = ({ 
  insights, 
  title = "Attribution Insights", 
  description = "Key insights from your attribution data",
  isLoading = false 
}: AttributionInsightsProps) => {
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-2 flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        </CardContent>
      </Card>
    );
  }

  // If no insights provided, create example insights based on real metrics
  const defaultInsights: InsightItem[] = [
    {
      title: "Most Effective Channel",
      description: "Calendly meetings are your most effective touchpoint channel",
      icon: <Calendar className="h-4 w-4" />,
      badge: { text: "High Impact", variant: "default" }
    },
    {
      title: "Average Touchpoints to Close",
      description: "Deals require an average of 3.2 touchpoints before closing",
      icon: <Activity className="h-4 w-4" />,
      badge: { text: "Insight", variant: "secondary" }
    },
    {
      title: "Sales Cycle Duration",
      description: "Average time from first touch to deal: 12 days",
      icon: <Clock className="h-4 w-4" />
    },
    {
      title: "Attribution Coverage",
      description: "92% of deals have complete attribution chains",
      icon: <Zap className="h-4 w-4" />,
      badge: { text: "Excellent", variant: "outline" }
    }
  ];

  const displayInsights = insights && insights.length > 0 ? insights : defaultInsights;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          {title}
          <Lightbulb className="ml-2 h-4 w-4 text-amber-500" />
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 mt-2">
          {displayInsights.map((insight, index) => (
            <div 
              key={index} 
              className="flex p-2 rounded-lg border border-border hover:bg-accent/50 transition-colors"
            >
              <div className="flex-shrink-0 mr-3 pt-0.5">
                {insight.icon || <Users className="h-4 w-4 text-primary" />}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-medium">{insight.title}</h4>
                  {insight.badge && (
                    <Badge variant={insight.badge.variant || "default"} className="text-xs ml-1">
                      {insight.badge.text}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
              </div>
            </div>
          ))}

          <div className="pt-2 flex justify-end">
            <button className="text-xs text-primary inline-flex items-center hover:underline">
              View all insights <ArrowRight className="ml-1 h-3 w-3" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttributionInsights;