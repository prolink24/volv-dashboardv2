import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface MissingAdmin {
  id: number;
  name: string;
  email: string;
  eventType: string;
  callDateTime: string;
}

interface AdminGroupProps {
  assignedTo: string;
  count: number;
  contacts: MissingAdmin[];
}

interface AdminListProps {
  data: AdminGroupProps[];
  className?: string;
}

const AdminList = ({ data, className }: AdminListProps) => {
  const [expanded, setExpanded] = useState<string[]>([data[0]?.assignedTo || ""]);
  
  const handleAccordionChange = (value: string[]) => {
    setExpanded(value);
  };
  
  const getEventTypeBadge = (eventType: string) => {
    let variant: "default" | "outline" | "secondary" | "success" | "warning" = "default";
    
    if (eventType.toLowerCase().includes("triage")) {
      variant = "default";
    } else if (eventType.toLowerCase().includes("strategy")) {
      variant = "success";
    } else if (eventType.toLowerCase().includes("follow")) {
      variant = "warning";
    }
    
    return (
      <Badge variant={variant}>
        {eventType}
      </Badge>
    );
  };
  
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-100 text-blue-700",
      "bg-green-100 text-green-700",
      "bg-purple-100 text-purple-700",
      "bg-orange-100 text-orange-700",
      "bg-red-100 text-red-700",
    ];
    
    // Simple hash function to consistently assign colors
    const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };
  
  return (
    <Card className={className}>
      <CardHeader className="py-4 px-4 border-b flex flex-row justify-between items-center">
        <CardTitle className="text-base">Missing Admins</CardTitle>
        <Button size="sm" className="bg-primary/10 hover:bg-primary/20 text-primary">
          <UserPlus className="h-4 w-4 mr-2" />
          <span>Assign</span>
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        <Accordion
          type="multiple"
          value={expanded}
          onValueChange={handleAccordionChange}
          className="space-y-4"
        >
          {data.map((group) => (
            <AccordionItem key={group.assignedTo} value={group.assignedTo} className="border rounded-md">
              <AccordionTrigger className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <Avatar className={getAvatarColor(group.assignedTo)}>
                    <AvatarFallback>{getInitials(group.assignedTo)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{group.assignedTo}</span>
                  <Badge variant="outline" className="ml-2 bg-slate-100 dark:bg-slate-800">
                    {group.count}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0 py-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Event Type</TableHead>
                        <TableHead>Call Date & Time</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.contacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell>{contact.name}</TableCell>
                          <TableCell>{contact.email}</TableCell>
                          <TableCell>{getEventTypeBadge(contact.eventType)}</TableCell>
                          <TableCell>{contact.callDateTime}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="bg-primary/10 text-primary text-xs h-7">
                              Close Jo
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default AdminList;
