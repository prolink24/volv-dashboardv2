import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change?: number;
  className?: string;
  loading?: boolean;
}

export function ImprovedKPICard({ title, value, icon, change, className, loading = false }: KPICardProps) {
  // Determine trend direction and color
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const isNeutral = change === 0 || change === undefined;
  
  // Apply appropriate color based on trend
  const trendColor = isPositive ? 'text-emerald-500' : isNegative ? 'text-rose-500' : 'text-gray-500';
  
  return (
    <Card className={cn('overflow-hidden shadow-md', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="rounded-full p-2 bg-muted">{icon}</div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-3/4 bg-gray-200 animate-pulse rounded"></div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            
            {!isNeutral && (
              <div className="flex items-center mt-2">
                {isPositive ? <ArrowUpIcon className="h-4 w-4 mr-1 text-emerald-500" /> : <ArrowDownIcon className="h-4 w-4 mr-1 text-rose-500" />}
                <p className={cn("text-xs font-medium", trendColor)}>
                  {Math.abs(change || 0)}% from previous period
                </p>
              </div>
            )}
            
            {isNeutral && (
              <div className="flex items-center mt-2">
                <p className="text-xs font-medium text-gray-500">
                  No change from previous period
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}