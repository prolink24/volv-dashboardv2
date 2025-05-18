import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImprovedKPICardProps {
  title: string;
  value: number;
  previousValue?: number;
  formatType?: 'number' | 'currency' | 'percentage';
  icon?: React.ReactNode;
  className?: string;
  isLoading?: boolean;
}

export function ImprovedKPICard({
  title,
  value,
  previousValue,
  formatType = 'number',
  icon,
  className,
  isLoading = false
}: ImprovedKPICardProps) {
  // Format the value based on the type
  const formattedValue = formatValue(value, formatType);
  
  // Calculate percentage change if previous value exists
  const percentChange = calculatePercentChange(value, previousValue);
  
  // Determine if the trend is positive (true) or negative (false)
  // For most metrics, up is good. For some metrics like "churn rate", up would be bad,
  // but we're not handling those special cases in this simple component
  const isPositiveTrend = percentChange > 0;
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
            <div className="h-8 bg-gray-200 rounded animate-pulse w-32"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
              {icon && <div className="text-muted-foreground">{icon}</div>}
            </div>
            
            <div className="text-2xl font-bold">{formattedValue}</div>
            
            {percentChange !== null && (
              <div className="flex items-center mt-2">
                <div
                  className={cn(
                    "flex items-center text-xs font-medium",
                    isPositiveTrend ? "text-green-600" : "text-red-600"
                  )}
                >
                  {isPositiveTrend ? (
                    <ArrowUpIcon className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-3 w-3 mr-1" />
                  )}
                  <span>{Math.abs(percentChange).toFixed(1)}%</span>
                </div>
                <span className="text-xs text-muted-foreground ml-1.5">vs previous period</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Helper functions
function formatValue(value: number, formatType: 'number' | 'currency' | 'percentage'): string {
  switch (formatType) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    
    case 'percentage':
      return `${value}%`;
    
    case 'number':
    default:
      return new Intl.NumberFormat('en-US').format(value);
  }
}

function calculatePercentChange(currentValue: number, previousValue?: number): number | null {
  if (previousValue === undefined || previousValue === null || previousValue === 0) {
    return null;
  }
  
  return ((currentValue - previousValue) / previousValue) * 100;
}