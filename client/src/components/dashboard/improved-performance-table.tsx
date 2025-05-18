import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SalesTeamMember } from '@/hooks/use-dashboard-data';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

interface ImprovedPerformanceTableProps {
  salesTeam: SalesTeamMember[];
}

/**
 * Improved Performance Table Component
 * 
 * Displays detailed performance metrics for each sales team member
 */
export function ImprovedPerformanceTable({ salesTeam }: ImprovedPerformanceTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Team Member</TableHead>
            <TableHead className="text-right">Contacts</TableHead>
            <TableHead className="text-right">Deals</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Cash Collected</TableHead>
            <TableHead className="text-right">Meetings</TableHead>
            <TableHead className="text-right">Activities</TableHead>
            <TableHead className="text-right">Conversion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {salesTeam.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.name}</TableCell>
              <TableCell className="text-right">{formatNumber(member.totalContacts)}</TableCell>
              <TableCell className="text-right">{formatNumber(member.totalDeals)}</TableCell>
              <TableCell className="text-right">{formatCurrency(member.totalRevenue)}</TableCell>
              <TableCell className="text-right">{formatCurrency(member.totalCashCollected)}</TableCell>
              <TableCell className="text-right">{formatNumber(member.totalMeetings)}</TableCell>
              <TableCell className="text-right">{formatNumber(member.totalActivities)}</TableCell>
              <TableCell className="text-right">{formatPercent(member.conversionRate)}</TableCell>
            </TableRow>
          ))}
          {salesTeam.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No team members found for the selected period.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}