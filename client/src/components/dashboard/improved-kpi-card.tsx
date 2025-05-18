import React from 'react';
import { cn, formatCurrency, formatNumber, formatPercent, getTrendClass } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export interface ImprovedKPICardProps {
  title: string;
  value: number;
  previousValue?: number;
  change?: number;
  formatType?: 'number' | 'currency' | 'percentage';
  icon?: React.ReactNode;
  className?: string;
  isLoading?: boolean;
  size?: 'default' | 'sm';
}

export function ImprovedKPICard({
  title,
  value,
  previousValue,
  change,
  formatType = 'number',
  icon,
  className,
  isLoading = false,
  size = 'default',
}: ImprovedKPICardProps) {
  const formattedValue = formatValue(value, formatType);
  const calculatedChange = change ?? (
    previousValue !== undefined 
      ? ((value - previousValue) / (previousValue || 1)) * 100 
      : 0
  );
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className={cn(
        'flex flex-col p-6',
        size === 'sm' && 'p-4'
      )}>
        <div className="flex items-center justify-between space-x-2">
          <p className={cn(
            "text-sm font-medium text-muted-foreground",
            size === 'sm' && 'text-xs'
          )}>
            {title}
          </p>
          {icon && (
            <div className="h-4 w-4 text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
        
        {isLoading ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <>
            <div className={cn(
              "mt-3 text-2xl font-bold",
              size === 'sm' ? 'text-xl mt-2' : 'text-3xl'
            )}>
              {formattedValue}
            </div>
            
            {(previousValue !== undefined || change !== undefined) && (
              <div className="mt-2 flex items-center">
                {calculatedChange > 0 ? (
                  <ArrowUpIcon className="h-4 w-4 text-green-500" />
                ) : calculatedChange < 0 ? (
                  <ArrowDownIcon className="h-4 w-4 text-red-500" />
                ) : (
                  <MinusIcon className="h-4 w-4 text-gray-500" />
                )}
                
                <span 
                  className={cn(
                    "ml-1 text-sm",
                    getTrendClass(calculatedChange)
                  )}
                >
                  {Math.abs(calculatedChange).toFixed(1)}% {calculatedChange > 0 ? 'increase' : calculatedChange < 0 ? 'decrease' : ''}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function formatValue(value: number, formatType: 'number' | 'currency' | 'percentage'): string {
  switch (formatType) {
    case 'currency':
      return formatCurrency(value);
    case 'percentage':
      return formatPercent(value);
    case 'number':
    default:
      return formatNumber(value);
  }
}