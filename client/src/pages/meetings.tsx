import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Mock data for the meetings page
const mockMeetings = [
  {
    id: 1,
    contactName: "Isaiah Norris",
    contactEmail: "inorris@gmail.com",
    type: "triage",
    title: "Triage Call",
    startTime: "2025-03-31T14:00:00",
    endTime: "2025-03-31T14:30:00",
    status: "scheduled",
    assignedTo: "Mazin Gazar",
  },
  {
    id: 2,
    contactName: "Monell Scott",
    contactEmail: "monell@pacific-investments.co",
    type: "triage",
    title: "Triage Call",
    startTime: "2025-03-30T13:00:00",
    endTime: "2025-03-30T13:30:00",
    status: "scheduled",
    assignedTo: "Mazin Gazar",
  },
  {
    id: 3,
    contactName: "Steve Mills",
    contactEmail: "generalmillsassets@gmail.com",
    type: "strategy",
    title: "Strategy Call",
    startTime: "2025-03-14T16:30:00",
    endTime: "2025-03-14T17:30:00",
    status: "completed",
    assignedTo: "Mazin Gazar",
  },
  {
    id: 4,
    contactName: "Joshua Fuchs",
    contactEmail: "joshua@globalfarm.com",
    type: "triage",
    title: "Triage Call",
    startTime: "2025-04-02T11:00:00",
    endTime: "2025-04-02T11:30:00",
    status: "scheduled",
    assignedTo: "Josh Sweetnam",
  },
  {
    id: 5,
    contactName: "Zach Gordon",
    contactEmail: "zgordon5@yahoo.com",
    type: "strategy",
    title: "Strategy Call",
    startTime: "2025-03-31T12:00:00",
    endTime: "2025-03-31T13:00:00",
    status: "canceled",
    assignedTo: "Josh Sweetnam",
  },
];

const Meetings = () => {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 10;
  
  // Filter meetings based on selected type and status
  const filteredMeetings = mockMeetings.filter(
    (meeting) =>
      (selectedType === "all" || meeting.type === selectedType) &&
      (selectedStatus === "all" || meeting.status === selectedStatus)
  );
  
  const totalPages = Math.ceil(filteredMeetings.length / limit);
  const displayedMeetings = filteredMeetings.slice((page - 1) * limit, page * limit);
  
  const getMeetingTypeBadge = (type: string) => {
    switch (type) {
      case "triage":
        return <Badge>Triage Call</Badge>;
      case "strategy":
        return <Badge variant="success">Strategy Call</Badge>;
      case "solution":
        return <Badge variant="secondary">Solution Call</Badge>;
      case "follow-up":
        return <Badge variant="warning">Follow-Up Call</Badge>;
      default:
        return <Badge variant="outline">Other</Badge>;
    }
  };
  
  const getMeetingStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Scheduled</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>;
      case "canceled":
        return <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Canceled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground">
            View and manage all scheduled meetings from Calendly
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button
            onClick={() => {
              toast({
                title: "Sync with Calendly",
                description: "Starting data sync with Calendly",
              });
              
              // This would trigger the API call to sync Calendly data
              fetch("/api/sync/calendly", {
                method: "POST",
                credentials: "include",
              })
                .then((res) => res.json())
                .then(() => {
                  toast({
                    title: "Sync Complete",
                    description: "Successfully synced data with Calendly",
                  });
                })
                .catch((error) => {
                  toast({
                    title: "Sync Failed",
                    description: error.message || "Failed to sync with Calendly",
                    variant: "destructive",
                  });
                });
            }}
          >
            Sync with Calendly
          </Button>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Meeting Filters</CardTitle>
          <CardDescription>Filter meetings by type and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Meeting Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="triage">Triage Call</SelectItem>
                  <SelectItem value="strategy">Strategy Call</SelectItem>
                  <SelectItem value="solution">Solution Call</SelectItem>
                  <SelectItem value="follow-up">Follow-Up Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedMeetings.map((meeting) => (
                  <TableRow key={meeting.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{meeting.contactName}</div>
                        <div className="text-sm text-muted-foreground">{meeting.contactEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getMeetingTypeBadge(meeting.type)}</TableCell>
                    <TableCell>
                      <div>
                        <div>{formatDateTime(meeting.startTime)}</div>
                        <div className="text-sm text-muted-foreground">
                          Duration: {
                            Math.round(
                              (new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / 
                              (1000 * 60)
                            )
                          } minutes
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getMeetingStatusBadge(meeting.status)}</TableCell>
                    <TableCell>{meeting.assignedTo}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          toast({
                            title: "View Meeting Details",
                            description: "Meeting details would be shown here",
                          });
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                
                {displayedMeetings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      No meetings found matching your filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {filteredMeetings.length > 0 && (
            <div className="py-4 px-2">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={page === i + 1}
                        onClick={() => setPage(i + 1)}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  {totalPages > 5 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default Meetings;
