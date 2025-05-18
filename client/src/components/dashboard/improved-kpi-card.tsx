import React from 'react';
import { cn } from '@/lib/utils';
import { HelpCircle, TrendingDown, TrendingUp } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ImprovedKPICardProps {
  title: string;
  value?: string;
  previousValue?: number;
  currentValue?: number;
  icon?: React.ReactNode;
  formatter?: (value: number) => string;
  help?: string;
  isLoading?: boolean;
}

/**
 * KPI Card Component
 * 
 * Displays a key performance indicator with trend indicator when previous value is available
 */
export function ImprovedKPICard({
  title,
  value,
  previousValue,
  currentValue,
  icon,
  formatter = (val) => val.toString(),
  help,
  isLoading = false,
}: ImprovedKPICardProps) {
  // Calculate percentage change when both values are available
  const percentChange = React.useMemo(() => {
    if (previousValue === undefined || currentValue === undefined || previousValue === 0) {
      return null;
    }
    return ((currentValue - previousValue) / previousValue) * 100;
  }, [previousValue, currentValue]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1">
          {title}
          {help && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{help}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-6 w-24 animate-pulse rounded-md bg-muted"></div>
            <div className="h-4 w-12 animate-pulse rounded-md bg-muted"></div>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value || (currentValue !== undefined ? formatter(currentValue) : 'N/A')}</div>
            {percentChange !== null && (
              <div className="flex items-center gap-1 mt-1 text-xs">
                {percentChange > 0 ? (
                  <TrendingUp className={cn("h-3.5 w-3.5 text-emerald-500")} />
                ) : percentChange < 0 ? (
                  <TrendingDown className={cn("h-3.5 w-3.5 text-rose-500")} />
                ) : null}
                <span
                  className={cn(
                    percentChange > 0 && "text-emerald-500",
                    percentChange < 0 && "text-rose-500",
                    percentChange === 0 && "text-muted-foreground"
                  )}
                >
                  {Math.abs(percentChange).toFixed(1)}% {percentChange > 0 ? 'increase' : percentChange < 0 ? 'decrease' : 'no change'} from previous period
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}