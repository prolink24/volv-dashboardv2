import React from 'react';
import { cn, formatCurrency, formatNumber, formatPercentage, getTrendDirection } from '@/lib/utils';

// Interface for KPI card props
export interface ImprovedKPICardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  change?: number;
  prefix?: string;
  suffix?: string;
  isLoading?: boolean;
  formatType?: 'currency' | 'number' | 'percentage' | 'plain';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  className?: string;
}

export function ImprovedKPICard({
  title,
  value,
  previousValue,
  change,
  prefix = '',
  suffix = '',
  isLoading = false,
  formatType = 'number',
  size = 'md',
  icon,
  className,
}: ImprovedKPICardProps) {
  // Format the value based on the format type
  const formattedValue = React.useMemo(() => {
    if (formatType === 'currency') {
      return formatCurrency(value);
    } else if (formatType === 'number') {
      return formatNumber(value);
    } else if (formatType === 'percentage') {
      return formatPercentage(value);
    } else {
      return `${prefix}${value}${suffix}`;
    }
  }, [value, formatType, prefix, suffix]);

  // Get the trend direction (up, down, or neutral)
  const trendDirection = getTrendDirection(change || 0);
  
  // Display the change as a percentage if it exists
  const changeDisplay = change !== undefined ? `${change >= 0 ? '+' : ''}${change.toFixed(1)}%` : null;

  return (
    <div 
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden',
        size === 'sm' ? 'p-4' : size === 'md' ? 'p-5' : 'p-6',
        className
      )}
    >
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h3 className={cn(
            'font-medium',
            size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'
          )}>
            {title}
          </h3>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            {changeDisplay && <div className="h-4 mt-2 bg-muted rounded w-1/4"></div>}
          </div>
        ) : (
          <>
            <div className={cn(
              'font-bold',
              size === 'sm' ? 'text-xl' : size === 'md' ? 'text-2xl' : 'text-3xl'
            )}>
              {formattedValue}
            </div>
            
            {changeDisplay && (
              <div className="flex items-center space-x-1">
                <span className={cn(
                  'text-xs font-medium',
                  trendDirection === 'up' ? 'text-green-600' : 
                  trendDirection === 'down' ? 'text-red-600' : 
                  'text-gray-500'
                )}>
                  {changeDisplay}
                </span>
                <span className="text-xs text-muted-foreground">vs previous period</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}