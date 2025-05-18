import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  MinusIcon,
  DollarSign,
  Users,
  Briefcase,
  Calendar,
  MessageSquare,
  PercentIcon
} from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

// Props for the KPI card component
interface ImprovedKpiCardProps {
  title: string;
  value: number;
  previousValue?: number;
  change?: number;
  type?: 'number' | 'currency' | 'percent';
  icon?: 'users' | 'dollar' | 'deals' | 'meetings' | 'activities' | 'percent';
  loading?: boolean;
}

/**
 * Improved KPI Card Component
 * 
 * Displays a metric with optional trend indicator showing change
 * from previous period
 */
export function ImprovedKpiCard({
  title,
  value,
  previousValue,
  change,
  type = 'number',
  icon = 'users',
  loading = false,
}: ImprovedKpiCardProps) {
  // Format the value based on its type
  const formattedValue = 
    type === 'currency' ? formatCurrency(value) : 
    type === 'percent' ? formatPercent(value) :
    formatNumber(value);
  
  // Determine the icon to display
  const IconComponent = 
    icon === 'users' ? Users :
    icon === 'dollar' ? DollarSign :
    icon === 'deals' ? Briefcase :
    icon === 'meetings' ? Calendar :
    icon === 'activities' ? MessageSquare :
    icon === 'percent' ? PercentIcon :
    Users;
  
  // Determine trend display
  let TrendComponent = MinusIcon;
  let trendColor = 'text-gray-500';
  let formattedChange = '0%';
  
  if (change !== undefined) {
    TrendComponent = change > 0 ? TrendingUp : change < 0 ? TrendingDown : MinusIcon;
    trendColor = change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-gray-500';
    formattedChange = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  }
  
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
        <IconComponent className="h-4 w-4 text-gray-600" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-10 w-full animate-pulse bg-gray-200 rounded"></div>
        ) : (
          <>
            <div className="text-2xl font-bold">{formattedValue}</div>
            {previousValue !== undefined && (
              <div className="flex items-center mt-1">
                <TrendComponent className={`h-4 w-4 mr-1 ${trendColor}`} />
                <span className={`text-xs ${trendColor}`}>{formattedChange}</span>
                <span className="text-xs text-gray-500 ml-1">vs previous period</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}