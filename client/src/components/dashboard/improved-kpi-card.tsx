import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
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
  // Format the value based on the specified format type
  const formattedValue = formatValue(value, formatType);
  const formattedPreviousValue = previousValue !== undefined ? formatValue(previousValue, formatType) : undefined;
  
  // Determine if change is positive, negative, or neutral
  const changeType = change !== undefined
    ? change > 0
      ? 'positive'
      : change < 0
        ? 'negative'
        : 'neutral'
    : 'neutral';
  
  // Format the change percentage
  const formattedChange = change !== undefined
    ? `${changeType === 'positive' ? '+' : ''}${change.toFixed(1)}%`
    : undefined;
  
  return (
    <Card className={cn(
      'overflow-hidden',
      size === 'sm' ? 'h-auto' : 'h-full',
      className
    )}>
      <CardHeader className={cn(
        'flex flex-row items-center justify-between pb-2',
        size === 'sm' ? 'p-4' : 'p-6'
      )}>
        <CardTitle className={cn(
          'text-sm font-medium',
          size === 'sm' ? 'text-xs' : 'text-sm'
        )}>
          {icon && <span className="mr-2 inline-block">{icon}</span>}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn(
        'p-6 pt-0',
        size === 'sm' ? 'p-4 pt-0' : 'p-6 pt-0'
      )}>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className={cn(
              'h-8 w-24',
              size === 'sm' ? 'h-6 w-20' : 'h-8 w-24'
            )} />
            <Skeleton className="h-4 w-16" />
          </div>
        ) : (
          <>
            <div className={cn(
              'text-2xl font-bold',
              size === 'sm' ? 'text-xl' : 'text-2xl'
            )}>
              {formattedValue}
            </div>
            {formattedPreviousValue !== undefined && formattedChange !== undefined && (
              <div className="mt-1 flex items-center text-xs">
                <span className="text-muted-foreground">vs. {formattedPreviousValue}</span>
                <span className={cn(
                  'ml-2 flex items-center',
                  changeType === 'positive' ? 'text-green-500' : 
                  changeType === 'negative' ? 'text-red-500' : 
                  'text-muted-foreground'
                )}>
                  {changeType === 'positive' && <ArrowUpIcon className="mr-1 h-3 w-3" />}
                  {changeType === 'negative' && <ArrowDownIcon className="mr-1 h-3 w-3" />}
                  {formattedChange}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to format values based on the specified format type
function formatValue(value: number, formatType: 'number' | 'currency' | 'percentage'): string {
  switch (formatType) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);
    
    case 'percentage':
      return `${value.toFixed(1)}%`;
    
    case 'number':
    default:
      return new Intl.NumberFormat('en-US').format(value);
  }
}