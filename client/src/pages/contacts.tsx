import { useState } from "react";
import { useContactsData } from "@/hooks/use-contacts-data";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const getInitials = (name: string = "") => {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

const Contacts = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  
  const { data, isLoading, isError } = useContactsData({
    limit,
    offset: (page - 1) * limit,
    search: search.length > 2 ? search : undefined,
  });
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.length > 2 || search.length === 0) {
      setPage(1); // Reset to first page on new search
    }
  };
  
  const totalPages = data ? Math.ceil(data.totalCount / limit) : 0;
  
  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
            {data && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                {data.totalCount.toLocaleString()} total
              </div>
            )}
          </div>
          <p className="text-muted-foreground">
            View and manage your contacts across all integrated systems
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <form onSubmit={handleSearch} className="relative w-full md:w-auto">
            <Input
              type="search"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full md:w-[300px]"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </form>
          
          <Button
            onClick={() => {
              toast({
                title: "Creating new contact",
                description: "This feature is not implemented yet.",
              });
            }}
          >
            Add Contact
          </Button>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full mb-2"></div>
              <p>Loading contacts...</p>
            </div>
          ) : isError ? (
            <div className="p-6 text-center">
              <p>Error loading contacts. Please try again.</p>
              <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : data?.contacts.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-muted-foreground">No contacts found</p>
              {search && (
                <p className="mt-2">
                  No results for "<span className="font-medium">{search}</span>"
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 bg-primary/10 text-primary">
                              <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{contact.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>{contact.company || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              contact.status === "lead"
                                ? "default"
                                : contact.status === "qualified"
                                ? "secondary"
                                : contact.status === "opportunity"
                                ? "outline"
                                : contact.status === "customer"
                                ? "success"
                                : "destructive"
                            }
                          >
                            {contact.status || "lead"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {contact.leadSource || "unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {contact.lastActivityDate
                            ? formatDate(contact.lastActivityDate.toString())
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedContactId(contact.id)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="py-4 px-2">
                {data && (
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {(page - 1) * limit + 1}-{Math.min(page * limit, data.totalCount)} of {data.totalCount.toLocaleString()} contacts
                    </div>
                    <div className="text-sm">
                      Page {page} of {totalPages}
                    </div>
                  </div>
                )}
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
                    
                    {totalPages > 5 && page < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    
                    {totalPages > 5 && page < totalPages && (
                      <PaginationItem>
                        <PaginationLink
                          isActive={page === totalPages}
                          onClick={() => setPage(totalPages)}
                        >
                          {totalPages}
                        </PaginationLink>
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
            </>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={!!selectedContactId} onOpenChange={() => setSelectedContactId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Contact Details</DialogTitle>
            <DialogDescription>
              View contact information and history
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <p className="text-center text-muted-foreground">
              This would show detailed contact information and attribution data
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Contacts;
