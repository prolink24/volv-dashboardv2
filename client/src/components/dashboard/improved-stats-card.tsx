import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ImprovedStatsCardProps {
  title: string;
  statValue: string | number;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  isLoading?: boolean;
}

export function ImprovedStatsCard({
  title,
  statValue,
  description,
  icon,
  className,
  isLoading = false
}: ImprovedStatsCardProps) {
  // Format the stat value if it's a number
  const formattedValue = typeof statValue === 'number' 
    ? new Intl.NumberFormat('en-US').format(statValue)
    : statValue;
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
            <div className="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
            {description && (
              <div className="h-3 bg-gray-200 rounded animate-pulse w-32"></div>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
              {icon && <div className="text-muted-foreground">{icon}</div>}
            </div>
            
            <div className="text-xl font-bold">{formattedValue}</div>
            
            {description && (
              <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}