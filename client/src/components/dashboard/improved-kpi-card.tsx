import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

interface TrendProps {
  value: number;
  label: string;
}

interface ImprovedKpiCardProps {
  title: string;
  value: number | string;
  subValue?: string;
  trend?: TrendProps;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export function ImprovedKpiCard({ 
  title, 
  value, 
  subValue, 
  trend, 
  icon,
  isLoading = false
}: ImprovedKpiCardProps) {
  // Format numeric value for display
  const displayValue = typeof value === 'number' 
    ? formatNumber(value) 
    : value;
  
  // Determine trend display
  const hasTrend = trend !== undefined;
  const isTrendPositive = hasTrend && trend.value >= 0;
  
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">{displayValue}</h2>
          
          {subValue && (
            <p className="text-xs text-muted-foreground">{subValue}</p>
          )}
        </div>
        
        {hasTrend && (
          <div className="flex items-center text-xs font-medium">
            <div className={`flex items-center ${isTrendPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isTrendPositive ? (
                <ArrowUpIcon className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownIcon className="h-3 w-3 mr-1" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
            <div className="text-muted-foreground ml-1">
              {trend.label}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}