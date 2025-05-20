import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency, getInitials, cn } from "@/lib/utils";

interface SalesTeamMember {
  name?: string;
  id: string;
  role: string;
  deals: number;
  meetings: number;
  activities: number;
  performance: number;
  closed?: number;
  cashCollected?: number;
  contractedValue?: number;
  calls?: number;
  closingRate?: number;
  // Optional fields that might not be available yet
  call1?: number;
  call2?: number;
  call2Sits?: number;
  adminMissingPercent?: number;
}

interface Meeting {
  id: number;
  contactId: number;
  calendlyEventId?: string;
  type?: string;
  title?: string;
  startTime: string;
  endTime: string;
  status?: string;
  assignedTo?: string;
  [key: string]: any;
}

interface PerformanceTableProps {
  data: SalesTeamMember[];
  meetings?: Meeting[];
  className?: string;
}

const PerformanceTable = ({ data, meetings = [], className }: PerformanceTableProps) => {
  // Count Calendly calls for each user
  const userCallsMap = new Map<string, number>();
  
  // Process meetings to count calls by user
  if (meetings && meetings.length > 0) {
    meetings.forEach(meeting => {
      if (meeting.assignedTo) {
        const userId = meeting.assignedTo;
        userCallsMap.set(userId, (userCallsMap.get(userId) || 0) + 1);
      }
    });
  }
  const getClosingRateBadge = (rate: number) => {
    let variant: "default" | "destructive" | "secondary" | "outline" = "default";
    
    if (rate >= 80) {
      variant = "secondary"; // Using secondary instead of success
    } else if (rate >= 40) {
      variant = "outline"; // Using outline instead of warning
    } else if (rate >= 0) {
      variant = "destructive";
    }
    
    return (
      <Badge variant={variant}>
        {rate.toFixed(1)}%
      </Badge>
    );
  };
  
  const getAvatarColor = (name: string | undefined) => {
    const colors = [
      "bg-blue-100 text-blue-700",
      "bg-green-100 text-green-700",
      "bg-purple-100 text-purple-700",
      "bg-orange-100 text-orange-700",
      "bg-red-100 text-red-700",
    ];
    
    if (!name) {
      // Default color for undefined or empty names
      return colors[0];
    }
    
    // Simple hash function to consistently assign colors
    const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };
  
  return (
    <Card className={className}>
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-base">Team Performance</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Closed</TableHead>
                <TableHead>Cash Collected</TableHead>
                <TableHead>Contracted Value</TableHead>
                <TableHead>Calls</TableHead>
                <TableHead>NOC1 (↓)</TableHead>
                <TableHead>NOC2 (↓)</TableHead>
                <TableHead>Call 2 Sits</TableHead>
                <TableHead>Closing Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <Avatar className={cn("h-8 w-8", getAvatarColor(member.name))}>
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div className="ml-3">
                        <div className="text-sm font-medium">{member.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{member.closed || 0}</TableCell>
                  <TableCell>{formatCurrency(member.cashCollected || 0)}</TableCell>
                  <TableCell>{formatCurrency(member.contractedValue || 0)}</TableCell>
                  <TableCell>{userCallsMap.get(member.id) || member.calls || 0}</TableCell>
                  <TableCell>{member.call1 || 0}</TableCell>
                  <TableCell>{member.call2 || 0}</TableCell>
                  <TableCell>{member.call2Sits || 0}</TableCell>
                  <TableCell>{getClosingRateBadge(member.closingRate || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceTable;
