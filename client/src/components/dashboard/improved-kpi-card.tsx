import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowDownIcon, ArrowUpIcon, HelpCircleIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  percentChange?: number | null;
  previousValue?: number | string;
  valuePrefix?: string;
  valueSuffix?: string;
  tooltip?: string;
  isLoading?: boolean;
  variant?: 'default' | 'revenue' | 'contacts' | 'meetings';
}

/**
 * Improved KPI Card component for dashboard
 * 
 * Displays a single KPI with title, value, and trend indicator
 */
export function ImprovedKPICard({
  title,
  value,
  icon,
  percentChange,
  previousValue,
  valuePrefix = '',
  valueSuffix = '',
  tooltip,
  isLoading = false,
  variant = 'default'
}: KPICardProps) {
  // Format the value based on variant and type
  const formattedValue = isLoading ? '' : formatValue(value, variant);
  const formattedPrevValue = previousValue !== undefined ? formatValue(previousValue, variant) : undefined;
  
  // Determine variant-specific styling
  const variantClasses = {
    default: 'bg-card',
    revenue: 'bg-card border-green-100 dark:border-green-900/20',
    contacts: 'bg-card border-blue-100 dark:border-blue-900/20',
    meetings: 'bg-card border-purple-100 dark:border-purple-900/20',
  };
  
  // Determine trend direction styling
  const getTrendClass = (change: number | null | undefined) => {
    if (change === null || change === undefined) return 'text-muted-foreground';
    return change >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500';
  };
  
  return (
    <Card className={cn("overflow-hidden", variantClasses[variant])}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <HelpCircleIcon className="h-3.5 w-3.5 text-muted-foreground/70" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          {percentChange !== null && percentChange !== undefined && (
            <div className={cn("flex items-center text-xs font-medium", getTrendClass(percentChange))}>
              {percentChange >= 0 ? (
                <ArrowUpIcon className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownIcon className="h-3 w-3 mr-1" />
              )}
              {Math.abs(percentChange).toFixed(1)}%
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          {isLoading ? (
            <Skeleton className="h-9 w-24" />
          ) : (
            <div className="flex items-baseline">
              <span className="text-2xl font-bold">
                {valuePrefix}{formattedValue}{valueSuffix}
              </span>
            </div>
          )}
          
          {!isLoading && formattedPrevValue !== undefined && percentChange !== null && percentChange !== undefined && (
            <p className="text-xs text-muted-foreground">
              vs. {valuePrefix}{formattedPrevValue}{valueSuffix} previous period
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to format values based on variant
function formatValue(value: number | string, variant: 'default' | 'revenue' | 'contacts' | 'meetings'): string {
  if (typeof value === 'string') return value;
  
  switch (variant) {
    case 'revenue':
      return formatCurrency(value);
    case 'contacts':
    case 'meetings':
      return formatNumber(value);
    default:
      return value.toString();
  }
}