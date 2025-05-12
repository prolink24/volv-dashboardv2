import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Mock form submissions data
const mockForms = [
  {
    id: 1,
    contactName: "Joshua Fuchs",
    contactEmail: "joshua@globalfarm.com",
    formName: "Investment Strategy Questionnaire",
    submittedAt: "2025-04-01T10:30:00",
    answers: {
      "Investment Experience": "5-10 years",
      "Risk Tolerance": "Moderate",
      "Investment Amount": "$250,000",
      "Investment Goals": "Retirement and growth",
    },
  },
  {
    id: 2,
    contactName: "Victor Aguirre",
    contactEmail: "victor.aguirre747@gmail.com",
    formName: "New Client Intake Form",
    submittedAt: "2025-03-30T14:45:00",
    answers: {
      "Annual Income": "$120,000",
      "Current Investments": "Stocks and Bonds",
      "Financial Goals": "Save for retirement",
      "Retirement Age": "65",
    },
  },
  {
    id: 3,
    contactName: "Zach Gordon",
    contactEmail: "zgordon5@yahoo.com",
    formName: "Investment Strategy Questionnaire",
    submittedAt: "2025-03-25T09:15:00",
    answers: {
      "Investment Experience": "2-5 years",
      "Risk Tolerance": "Aggressive",
      "Investment Amount": "$100,000",
      "Investment Goals": "Growth and income",
    },
  },
  {
    id: 4,
    contactName: "Dan Lee Vogler",
    contactEmail: "dan.vogler@averysecm.com",
    formName: "Financial Planning Survey",
    submittedAt: "2025-03-20T16:20:00",
    answers: {
      "Current Age": "42",
      "Retirement Goals": "Travel and leisure",
      "Current Savings": "$350,000",
      "Monthly Contribution": "$2,000",
    },
  },
  {
    id: 5,
    contactName: "Darrin Stallings",
    contactEmail: "darrinstall1992@gmail.com",
    formName: "New Client Intake Form",
    submittedAt: "2025-03-18T11:10:00",
    answers: {
      "Annual Income": "$85,000",
      "Current Investments": "401k only",
      "Financial Goals": "Buy a house",
      "Retirement Age": "70",
    },
  },
];

const Forms = () => {
  const { toast } = useToast();
  const [selectedForm, setSelectedForm] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [viewForm, setViewForm] = useState<any | null>(null);
  const limit = 10;
  
  // Filter forms based on selected form type
  const filteredForms = selectedForm === "all"
    ? mockForms
    : mockForms.filter(form => form.formName === selectedForm);
  
  const totalPages = Math.ceil(filteredForms.length / limit);
  const displayedForms = filteredForms.slice((page - 1) * limit, page * limit);
  
  // Get unique form names for filter
  const formNames = Array.from(new Set(mockForms.map(form => form.formName)));
  
  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Form Submissions</h1>
          <p className="text-muted-foreground">
            View and analyze all form submissions from Typeform
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button
            onClick={() => {
              toast({
                title: "Sync with Typeform",
                description: "Starting data sync with Typeform",
              });
              
              // This would trigger the API call to sync Typeform data
              fetch("/api/sync/typeform", {
                method: "POST",
                credentials: "include",
              })
                .then((res) => res.json())
                .then(() => {
                  toast({
                    title: "Sync Complete",
                    description: "Successfully synced data with Typeform",
                  });
                })
                .catch((error) => {
                  toast({
                    title: "Sync Failed",
                    description: error.message || "Failed to sync with Typeform",
                    variant: "destructive",
                  });
                });
            }}
          >
            Sync with Typeform
          </Button>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Form Filters</CardTitle>
          <CardDescription>Filter form submissions by form type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Form Type</label>
              <Select value={selectedForm} onValueChange={setSelectedForm}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select form type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Forms</SelectItem>
                  {formNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
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
                  <TableHead>Form</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Key Information</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedForms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{form.contactName}</div>
                        <div className="text-sm text-muted-foreground">{form.contactEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {form.formName}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(form.submittedAt)}</TableCell>
                    <TableCell>
                      <div className="max-w-[300px] truncate">
                        {Object.entries(form.answers).slice(0, 2).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="font-medium">{key}:</span> {value as string}
                          </div>
                        ))}
                        {Object.keys(form.answers).length > 2 && (
                          <div className="text-sm text-muted-foreground">
                            + {Object.keys(form.answers).length - 2} more fields
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setViewForm(form)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                
                {displayedForms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      No form submissions found matching your filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {filteredForms.length > 0 && (
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
      
      <Dialog open={!!viewForm} onOpenChange={() => setViewForm(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Form Submission Details</DialogTitle>
            <DialogDescription>
              {viewForm?.formName} submitted by {viewForm?.contactName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <h3 className="font-semibold">Contact Information</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Name:</div>
              <div className="text-sm">{viewForm?.contactName}</div>
              <div className="text-sm text-muted-foreground">Email:</div>
              <div className="text-sm">{viewForm?.contactEmail}</div>
            </div>
            
            <h3 className="font-semibold mt-4">Submission Details</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Form:</div>
              <div className="text-sm">{viewForm?.formName}</div>
              <div className="text-sm text-muted-foreground">Date Submitted:</div>
              <div className="text-sm">{formatDate(viewForm?.submittedAt)}</div>
            </div>
            
            <h3 className="font-semibold mt-4">Form Answers</h3>
            <div className="grid grid-cols-2 gap-2">
              {viewForm && Object.entries(viewForm.answers).map(([key, value]) => (
                <React.Fragment key={key}>
                  <div className="text-sm font-medium">{key}:</div>
                  <div className="text-sm">{value as string}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Forms;
