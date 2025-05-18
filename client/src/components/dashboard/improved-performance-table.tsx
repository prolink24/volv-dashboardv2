import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import { useDashboard } from '@/providers/dashboard-provider';
import { SalesTeamMember } from '@/providers/dashboard-provider';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowDownIcon, 
  ArrowUpIcon, 
  TrendingUpIcon, 
  DollarSignIcon,
  UsersIcon,
  CalendarIcon,
  PhoneCallIcon
} from 'lucide-react';

interface ImprovedPerformanceTableProps {
  salesTeam: SalesTeamMember[];
}

export function ImprovedPerformanceTable({ salesTeam }: ImprovedPerformanceTableProps) {
  // Sort the sales team by performance (highest first)
  const sortedTeam = [...salesTeam].sort((a, b) => b.performance - a.performance);
  
  return (
    <div className="rounded-md border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Team Member</TableHead>
            <TableHead className="text-right">Deals</TableHead>
            <TableHead className="text-right">Meetings</TableHead>
            <TableHead className="text-right">Activities</TableHead>
            <TableHead className="text-right">Closing Rate</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Cash Collected</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTeam.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                No team member data available for the selected period.
              </TableCell>
            </TableRow>
          ) : (
            sortedTeam.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{member.name}</span>
                    <span className="text-xs text-muted-foreground">{member.role}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end">
                    <Badge variant={member.deals > 5 ? "success" : member.deals > 0 ? "default" : "secondary"} className="mr-2">
                      {member.deals}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {member.closed} closed
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end">
                    <CalendarIcon className="h-4 w-4 mr-1 text-blue-500" />
                    {formatNumber(member.meetings)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end">
                    <PhoneCallIcon className="h-4 w-4 mr-1 text-green-500" />
                    {formatNumber(member.activities)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end">
                    {member.closingRate > 50 ? (
                      <ArrowUpIcon className="h-4 w-4 mr-1 text-emerald-500" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4 mr-1 text-rose-500" />
                    )}
                    {formatPercent(member.closingRate)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end">
                    <TrendingUpIcon className="h-4 w-4 mr-1 text-emerald-500" />
                    {formatCurrency(member.revenue)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end">
                    <DollarSignIcon className="h-4 w-4 mr-1 text-emerald-500" />
                    {formatCurrency(member.cashCollected)}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}