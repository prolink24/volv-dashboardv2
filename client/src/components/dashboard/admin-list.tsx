import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface AdminListProps {
  data: {
    assignedTo: string;
    count: number;
    contacts: {
      id: number;
      name: string;
      email: string;
      eventType: string;
      callDateTime: string;
    }[];
  }[];
  className?: string;
}

const AdminList = ({ data, className = "" }: AdminListProps) => {
  const { toast } = useToast();

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return dateStr;
    }
  };

  const handleAssign = (contactId: number, contactName: string) => {
    // Mock API call to assign contact to user
    toast({
      title: "Admin Assigned",
      description: `${contactName} has been assigned to an admin.`,
    });
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Missing admins list is being exported to CSV",
    });
  };

  if (data.length === 0) {
    return (
      <div className={`bg-card rounded-lg shadow-sm border border-border p-6 ${className}`}>
        <div className="text-center py-8">
          <h3 className="text-base font-medium mb-2">No Missing Admins</h3>
          <p className="text-muted-foreground">All contacts have been assigned to admins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-lg shadow-sm border border-border ${className}`}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-base font-medium">Missing Admin Assignments</h3>
        <Button size="sm" variant="outline" onClick={handleExport}>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 mr-1" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
          Export List
        </Button>
      </div>
      
      <div className="divide-y divide-border">
        {data.map((item, index) => (
          <div key={index} className="p-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <span className="font-medium">{item.assignedTo}</span>
                <span className="ml-2 text-sm text-muted-foreground">
                  {item.count} contacts missing admin
                </span>
              </div>
            </div>
            
            <div className="space-y-3 mt-3">
              {item.contacts.map((contact) => (
                <div 
                  key={contact.id} 
                  className="grid grid-cols-1 md:grid-cols-5 gap-2 p-2 rounded-md hover:bg-muted"
                >
                  <div className="md:col-span-2">
                    <div className="font-medium">{contact.name}</div>
                    <div className="text-sm text-muted-foreground truncate">{contact.email}</div>
                  </div>
                  <div>
                    <div className="text-sm">{contact.eventType}</div>
                  </div>
                  <div>
                    <div className="text-sm">{formatDate(contact.callDateTime)}</div>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      size="sm" 
                      onClick={() => handleAssign(contact.id, contact.name)}
                    >
                      Assign Admin
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminList;