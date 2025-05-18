import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export interface ImprovedStatsCardProps {
  title: string;
  statValue: string | number;
  description?: string;
  icon?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function ImprovedStatsCard({
  title,
  statValue,
  description,
  icon,
  isLoading = false,
  className,
}: ImprovedStatsCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {icon && <div className="text-muted-foreground">{icon}</div>}
            </div>
            
            <div className="mt-2 flex items-baseline">
              <p className="text-2xl font-semibold">
                {typeof statValue === 'number' 
                  ? new Intl.NumberFormat().format(statValue) 
                  : statValue}
              </p>
            </div>
            
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}