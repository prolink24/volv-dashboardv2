import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-9 bg-muted rounded w-2/3 mb-2"></div>
            {description && <div className="h-4 bg-muted rounded w-full"></div>}
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{statValue}</div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}