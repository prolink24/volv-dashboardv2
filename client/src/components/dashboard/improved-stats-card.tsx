import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
    <Card className={cn('overflow-hidden h-full', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="font-medium text-sm">{title}</h3>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-[80px]" />
            {description && <Skeleton className="h-4 w-[120px]" />}
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">
              {typeof statValue === 'number' ? statValue.toLocaleString() : statValue}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}