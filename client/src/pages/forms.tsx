import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
import {
  AlertCircle,
  RefreshCw,
  Loader2
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface FormSubmission {
  id: number;
  contactId: number;
  contactName: string;
  contactEmail: string;
  formName: string;
  formId: string;
  typeformResponseId: string;
  submittedAt: string;
  answers: Record<string, any>;
  hiddenFields?: Record<string, any>;
  calculatedFields?: Record<string, any>;
  formCategory?: string;
  formTags?: string[];
  completionPercentage?: number;
}

const Forms = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedForm, setSelectedForm] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [viewForm, setViewForm] = useState<FormSubmission | null>(null);
  const limit = 10;
  
  // Fetch form submissions from API
  const { data: formsData, isLoading, isError, error } = useQuery({
    queryKey: ['/api/typeform/submissions'],
    retry: 2
  });

  // Mutate function for syncing typeform data
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/typeform/sync", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error('Failed to sync with Typeform');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate form submissions query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/typeform/submissions'] });
      toast({
        title: "Sync Complete",
        description: "Successfully synced data with Typeform",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync with Typeform",
        variant: "destructive",
      });
    }
  });

  // Default to empty array if no forms data
  const forms: FormSubmission[] = formsData?.forms || [];
  
  // Filter forms based on selected form type
  const filteredForms = selectedForm === "all"
    ? forms
    : forms.filter(form => form.formName === selectedForm);
  
  const totalPages = Math.ceil(filteredForms.length / limit);
  const displayedForms = filteredForms.slice((page - 1) * limit, page * limit);
  
  // Get unique form names for filter
  const formNames = Array.from(new Set(forms.map(form => form.formName)));
  
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
              syncMutation.mutate();
            }}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync with Typeform
              </>
            )}
          </Button>
        </div>
      </div>
      
      {isError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load form submissions: {(error as Error)?.message || "Unknown error"}
          </AlertDescription>
        </Alert>
      )}
      
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
            {forms.length > 0 && (
              <div className="flex items-end">
                <div className="text-sm text-muted-foreground">
                  Total: {forms.length} form submissions from {formNames.length} form types
                </div>
              </div>
            )}
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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading form submissions...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : displayedForms.length > 0 ? (
                  displayedForms.map((form) => (
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
                          {form.answers && Object.entries(form.answers).slice(0, 2).map(([key, value]) => (
                            <div key={key} className="text-sm">
                              <span className="font-medium">{key}:</span> {typeof value === 'string' ? value : JSON.stringify(value)}
                            </div>
                          ))}
                          {form.answers && Object.keys(form.answers).length > 2 && (
                            <div className="text-sm text-muted-foreground">
                              + {Object.keys(form.answers).length - 2} more fields
                            </div>
                          )}
                          {!form.answers && (
                            <div className="text-sm text-muted-foreground">
                              No answer data available
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
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      {forms.length > 0 
                        ? "No form submissions found matching your filters"
                        : "No form submissions found. Click 'Sync with Typeform' to import data."}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form Submission Details</DialogTitle>
            <DialogDescription>
              {viewForm?.formName} submitted by {viewForm?.contactName || "Unknown"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <h3 className="font-semibold">Contact Information</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Name:</div>
              <div className="text-sm">{viewForm?.contactName || "Unknown"}</div>
              <div className="text-sm text-muted-foreground">Email:</div>
              <div className="text-sm">{viewForm?.contactEmail || "Not available"}</div>
            </div>
            
            <h3 className="font-semibold mt-4">Submission Details</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-muted-foreground">Form:</div>
              <div className="text-sm">{viewForm?.formName || "Unknown"}</div>
              <div className="text-sm text-muted-foreground">Form ID:</div>
              <div className="text-sm">{viewForm?.formId || "Not available"}</div>
              <div className="text-sm text-muted-foreground">Date Submitted:</div>
              <div className="text-sm">{viewForm?.submittedAt ? formatDate(viewForm.submittedAt) : "Unknown"}</div>
              {viewForm?.completionPercentage !== undefined && (
                <>
                  <div className="text-sm text-muted-foreground">Completion:</div>
                  <div className="text-sm">{viewForm.completionPercentage}%</div>
                </>
              )}
            </div>
            
            {viewForm?.answers && Object.keys(viewForm.answers).length > 0 && (
              <>
                <h3 className="font-semibold mt-4">Form Answers</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(viewForm.answers).map(([key, value]) => (
                    <div key={key} className="contents">
                      <div className="text-sm font-medium">{key}:</div>
                      <div className="text-sm break-words">
                        {typeof value === 'string' 
                          ? value 
                          : typeof value === 'object' 
                            ? JSON.stringify(value, null, 2) 
                            : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {viewForm?.hiddenFields && Object.keys(viewForm.hiddenFields).length > 0 && (
              <>
                <h3 className="font-semibold mt-4">Hidden Fields</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(viewForm.hiddenFields).map(([key, value]) => (
                    <div key={key} className="contents">
                      <div className="text-sm font-medium">{key}:</div>
                      <div className="text-sm break-words">
                        {typeof value === 'string' 
                          ? value 
                          : typeof value === 'object' 
                            ? JSON.stringify(value, null, 2) 
                            : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Typeform Response ID: {viewForm?.typeformResponseId}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Forms;
