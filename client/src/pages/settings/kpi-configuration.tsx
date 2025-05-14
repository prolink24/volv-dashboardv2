import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Activity, 
  Calculator, 
  Calendar, 
  ChevronDown, 
  ChevronRight, 
  Code, 
  CreditCard, 
  Database, 
  Download, 
  Edit, 
  Eye, 
  FileQuestion, 
  Filter, 
  Info, 
  Layers, 
  Lock, 
  Pencil, 
  Plus, 
  Save, 
  Settings, 
  Users,
  AlertCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useKpiConfiguration } from "@/hooks/use-kpi-configuration";
import { KpiCategory as KpiCategoryType, KpiFormula as KpiFormulaType, CustomField as CustomFieldType } from "@shared/schema/kpi-configuration";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage, Form } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Use the imported types as our interfaces
type KpiFormula = KpiFormulaType;
type CustomField = CustomFieldType;
type KpiCategory = KpiCategoryType;

// Create schema for KPI formula editing
const KpiFormulaSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  formula: z.string().min(1, "Formula is required"),
  enabled: z.boolean(),
  category: z.enum(['sales', 'marketing', 'admin', 'setter', 'compliance', 'attribution']),
  requiredFields: z.array(z.string()),
  inputFields: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['number', 'string', 'boolean', 'date', 'select']),
      source: z.enum(['close', 'calendly', 'typeform', 'custom']),
      fieldPath: z.string().optional(),
      value: z.any(),
    })
  ).optional(),
});

// Create schema for custom field editing
const CustomFieldSchema = z.object({
  name: z.string().min(1, "Name is required"),
  fieldType: z.enum(['text', 'number', 'date', 'select', 'boolean']),
  source: z.enum(['close', 'calendly', 'typeform', 'custom']),
  path: z.string().optional(),
  description: z.string().optional(),
  options: z.array(z.string()).optional(),
});

const KpiConfigurationPage = () => {
  const [activeTab, setActiveTab] = useState("formulas");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedKpi, setSelectedKpi] = useState<KpiFormula | null>(null);
  const [editMode, setEditMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use our custom KPI configuration hook
  const {
    kpiCategories,
    isLoadingKpis: isLoading,
    kpisError: error,
    availableFields,
    customFields,
    isLoadingFields: isFieldsLoading,
    updateKpiFormula,
    toggleKpiEnabled,
    saveCustomField
  } = useKpiConfiguration();

  // We're now using the hook's mutation functions: updateKpiFormula, toggleKpiEnabled, saveCustomField

  // Using availableFields and customFields directly from the hook now

  // KPI formula editing form
  const formulaForm = useForm<z.infer<typeof KpiFormulaSchema>>({
    resolver: zodResolver(KpiFormulaSchema),
    defaultValues: {
      name: "",
      description: "",
      formula: "",
      enabled: true,
      category: "sales",
      requiredFields: [],
      inputFields: []
    }
  });

  // Custom field editing form
  const customFieldForm = useForm<z.infer<typeof CustomFieldSchema>>({
    resolver: zodResolver(CustomFieldSchema),
    defaultValues: {
      name: "",
      fieldType: "text",
      source: "custom",
      path: "",
      description: "",
      options: []
    }
  });

  // Handle formula form submission
  const onFormulaSubmit = (data: z.infer<typeof KpiFormulaSchema>) => {
    if (!selectedKpi) return;
    
    const updatedFormula: KpiFormula = {
      ...selectedKpi,
      ...data,
    };
    
    // Use the hook's function to update the formula
    updateKpiFormula(updatedFormula);
  };

  // Handle custom field form submission
  const onCustomFieldSubmit = (data: z.infer<typeof CustomFieldSchema>) => {
    // Use the hook's function to save the custom field
    saveCustomField(data as CustomField);
  };

  // Reset formula form when selected KPI changes
  useEffect(() => {
    if (selectedKpi) {
      formulaForm.reset({
        name: selectedKpi.name,
        description: selectedKpi.description,
        formula: selectedKpi.formula,
        enabled: selectedKpi.enabled,
        category: selectedKpi.category,
        requiredFields: selectedKpi.requiredFields,
        inputFields: selectedKpi.inputFields
      });
    }
  }, [selectedKpi, formulaForm]);

  // Function to toggle KPI enabled state - using the hook's toggle function
  const handleToggleKpi = (kpi: KpiFormula) => {
    toggleKpiEnabled(kpi);
  };

  // Function to render the formula editor
  const renderFormulaEditor = () => {
    if (!selectedKpi) {
      return (
        <div className="flex items-center justify-center h-[600px] bg-muted/20 rounded-md">
          <div className="text-center p-4">
            <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No Formula Selected</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Select a KPI formula from the list to view or edit its details.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{selectedKpi.name}</h2>
            <p className="text-muted-foreground">{selectedKpi.description}</p>
          </div>
          <div className="flex gap-2">
            {!editMode && (
              <Button 
                variant="outline" 
                onClick={() => setEditMode(true)}
                disabled={!selectedKpi.customizable}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {editMode && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setEditMode(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="button"
                  onClick={() => formulaForm.handleSubmit(onFormulaSubmit)()}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </>
            )}
          </div>
        </div>

        <Separator />

        {editMode ? (
          <Form {...formulaForm}>
            <form onSubmit={formulaForm.handleSubmit(onFormulaSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={formulaForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formula Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={formulaForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="setter">Setter</SelectItem>
                          <SelectItem value="compliance">Compliance</SelectItem>
                          <SelectItem value="attribution">Attribution</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={formulaForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={formulaForm.control}
                  name="formula"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Formula Expression</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          className="min-h-[120px] font-mono"
                          placeholder="e.g., (totalCalls / totalDeals) * 100"
                        />
                      </FormControl>
                      <FormDescription>
                        Use field identifiers in your formula. Available fields are listed below.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={formulaForm.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Enabled
                        </FormLabel>
                        <FormDescription>
                          Show this KPI in dashboards and reports
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <h3 className="text-lg font-medium">Required Fields</h3>
              <div className="grid grid-cols-2 gap-2">
                {availableFields.map((field) => (
                  <div 
                    key={field.id}
                    className="flex items-center p-2 rounded-md border hover:bg-accent/50"
                  >
                    <Checkbox
                      id={`field-${field.id}`}
                      checked={formulaForm.watch('requiredFields').includes(field.id)}
                      onCheckedChange={(checked) => {
                        const currentFields = formulaForm.watch('requiredFields');
                        if (checked) {
                          formulaForm.setValue('requiredFields', [...currentFields, field.id]);
                        } else {
                          formulaForm.setValue(
                            'requiredFields',
                            currentFields.filter(id => id !== field.id)
                          );
                        }
                      }}
                    />
                    <Label
                      htmlFor={`field-${field.id}`}
                      className="ml-2 flex-1 cursor-pointer"
                    >
                      {field.name}
                      <span className="text-xs ml-2 text-muted-foreground">
                        ({field.source})
                      </span>
                    </Label>
                    <Badge variant="outline" className="ml-auto">
                      {field.fieldType}
                    </Badge>
                  </div>
                ))}
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Category</h3>
                <p>{selectedKpi.category.charAt(0).toUpperCase() + selectedKpi.category.slice(1)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                <div className="flex items-center mt-1">
                  {selectedKpi.enabled ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Disabled
                    </Badge>
                  )}
                  <Switch 
                    className="ml-2" 
                    checked={selectedKpi.enabled}
                    onCheckedChange={() => handleToggleKpi(selectedKpi)}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Formula</h3>
              <Card>
                <CardContent className="p-4">
                  <code className="text-sm font-mono whitespace-pre-wrap break-all">
                    {selectedKpi.formula}
                  </code>
                </CardContent>
              </Card>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Required Fields</h3>
              <div className="grid grid-cols-2 gap-2">
                {selectedKpi?.requiredFields ? selectedKpi.requiredFields.map((fieldId) => {
                  const field = availableFields?.find(f => f.id === fieldId);
                  return field ? (
                    <div key={field.id} className="flex items-center p-2 rounded-md border">
                      <span className="text-sm">{field.name}</span>
                      <span className="text-xs ml-2 text-muted-foreground">
                        ({field.source})
                      </span>
                      <Badge variant="outline" className="ml-auto">
                        {field.fieldType}
                      </Badge>
                    </div>
                  ) : null;
                }) : <div className="text-sm text-muted-foreground p-2">No required fields</div>}
              </div>
            </div>

            {selectedKpi && !selectedKpi.customizable && (
              <div className="flex items-center p-4 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                <Lock className="h-5 w-5 mr-2" />
                <p className="text-sm">
                  This is a system KPI and cannot be modified. It is used for core dashboard functionality.
                </p>
              </div>
            )}

            <div className="mt-8">
              <h3 className="text-lg font-medium mb-2">Formula Preview</h3>
              <Card>
                <CardContent className="p-4">
                  <div className="p-4 bg-muted rounded-md">
                    <h4 className="font-medium mb-2">Sample Calculation</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      This shows how the KPI value would be calculated with sample data.
                    </p>
                    <code className="text-sm font-mono">
                      {selectedKpi.formula} = VALUE
                    </code>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Function to render custom fields editor
  const renderCustomFieldsEditor = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Custom Fields</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Custom Field
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>Create New Custom Field</DialogTitle>
                <DialogDescription>
                  Define a new custom field to use in KPI calculations
                </DialogDescription>
              </DialogHeader>
              <Form {...customFieldForm}>
                <form onSubmit={customFieldForm.handleSubmit(onCustomFieldSubmit)} className="space-y-4">
                  <FormField
                    control={customFieldForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Field Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={customFieldForm.control}
                      name="fieldType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Field Type</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select field type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="select">Select</SelectItem>
                              <SelectItem value="boolean">Boolean</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={customFieldForm.control}
                      name="source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data Source</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select data source" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="close">Close CRM</SelectItem>
                              <SelectItem value="calendly">Calendly</SelectItem>
                              <SelectItem value="typeform">Typeform</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {customFieldForm.watch('source') !== 'custom' && (
                    <FormField
                      control={customFieldForm.control}
                      name="path"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Field Path</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="e.g. lead.custom.field_name or invitee.questions.123"
                            />
                          </FormControl>
                          <FormDescription>
                            The path to the field in the source system's API response
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={customFieldForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {customFieldForm.watch('fieldType') === 'select' && (
                    <div>
                      <FormLabel>Options</FormLabel>
                      <div className="space-y-2 mt-2">
                        {customFieldForm.watch('options')?.map((option, index) => (
                          <div key={index} className="flex gap-2">
                            <Input 
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...(customFieldForm.watch('options') || [])];
                                newOptions[index] = e.target.value;
                                customFieldForm.setValue('options', newOptions);
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const newOptions = [...(customFieldForm.watch('options') || [])];
                                newOptions.splice(index, 1);
                                customFieldForm.setValue('options', newOptions);
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4"
                              >
                                <path d="M18 6L6 18" />
                                <path d="M6 6l12 12" />
                              </svg>
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const currentOptions = customFieldForm.watch('options') || [];
                            customFieldForm.setValue('options', [...currentOptions, '']);
                          }}
                          className="w-full"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Option
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <DialogFooter>
                    <Button type="submit">Save Field</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Separator />

        <div className="grid md:grid-cols-2 gap-4">
          {customFields && customFields.length > 0 ? customFields.map((field) => (
            <Card key={field.id} className="group relative">
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-md">{field.name}</CardTitle>
                  <Badge variant={field.source === 'custom' ? 'default' : 'outline'}>
                    {field.source}
                  </Badge>
                </div>
                <CardDescription>
                  {field.description || 'No description provided'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>{' '}
                    <span className="font-medium">{field.fieldType}</span>
                  </div>
                  {field.path && (
                    <div>
                      <span className="text-muted-foreground">Path:</span>{' '}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">{field.path}</code>
                    </div>
                  )}
                </div>
                {field.fieldType === 'select' && field.options && field.options.length > 0 && (
                  <div className="mt-2">
                    <span className="text-sm text-muted-foreground">Options:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {field.options.map((option, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {option}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit field</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          )) : null}
        </div>

        {customFields && customFields.length === 0 && (
          <div className="flex items-center justify-center h-[400px] bg-muted/20 rounded-md">
            <div className="text-center p-4">
              <Database className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No Custom Fields</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create custom fields to use in your KPI calculations.
              </p>
              <Button className="mt-4" onClick={() => {
                document.querySelector('[role="dialog"] button')?.click();
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Custom Field
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Function to render the import/export tab
  const renderImportExport = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Import/Export Configuration</h2>
        </div>

        <Separator />

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Export Configuration
              </CardTitle>
              <CardDescription>
                Export all KPI formulas and custom fields for backup or to move to another environment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="export-formulas" />
                  <Label htmlFor="export-formulas">KPI Formulas</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="export-fields" />
                  <Label htmlFor="export-fields">Custom Fields</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="export-mappings" />
                  <Label htmlFor="export-mappings">Field Mappings</Label>
                </div>
                <Button className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Export as JSON
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Import Configuration
              </CardTitle>
              <CardDescription>
                Import KPI configurations from a JSON file.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="config-file">Configuration File</Label>
                  <Input id="config-file" type="file" accept=".json" />
                </div>
                <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm">
                  <Info className="h-4 w-4 inline mr-2" />
                  Importing will overwrite existing configurations with the same IDs.
                </div>
                <Button className="w-full">
                  <Calculator className="mr-2 h-4 w-4" />
                  Import Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <h1 className="text-3xl font-bold">KPI Configuration</h1>
        <div className="grid gap-6">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-4 gap-4">
            <div className="h-[500px] bg-muted rounded animate-pulse col-span-1" />
            <div className="h-[500px] bg-muted rounded animate-pulse col-span-3" />
          </div>
        </div>
      </div>
    );
  }

  // If error, show error state
  if (error) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <h1 className="text-3xl font-bold">KPI Configuration</h1>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Error Loading KPI Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "An unknown error occurred while loading the KPI configuration."}
            </p>
            <Button
              className="mt-4"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/settings/kpi-configuration'] })}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main render
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">KPI Configuration</h1>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Code className="h-4 w-4" />
                Formula Reference
              </Button>
            </TooltipTrigger>
            <TooltipContent className="w-80">
              <div className="space-y-2 p-2">
                <h4 className="font-semibold">Formula Syntax</h4>
                <p className="text-sm">Use these operators in your formulas:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><code>+</code> Addition</div>
                  <div><code>-</code> Subtraction</div>
                  <div><code>*</code> Multiplication</div>
                  <div><code>/</code> Division</div>
                  <div><code>%</code> Percentage</div>
                  <div><code>SUM()</code> Sum</div>
                  <div><code>AVG()</code> Average</div>
                  <div><code>COUNT()</code> Count</div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="formulas" className="gap-2">
            <Calculator className="h-4 w-4" />
            KPI Formulas
          </TabsTrigger>
          <TabsTrigger value="fields" className="gap-2">
            <Database className="h-4 w-4" />
            Custom Fields
          </TabsTrigger>
          <TabsTrigger value="import-export" className="gap-2">
            <Download className="h-4 w-4" />
            Import/Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formulas" className="space-y-4">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="md:col-span-1 space-y-4">
              <div className="flex items-center">
                <h2 className="text-lg font-semibold">Categories</h2>
                <div className="ml-auto">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Filter className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Filter KPIs</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="space-y-1">
                <Button 
                  variant={selectedCategory === null ? "default" : "ghost"} 
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory(null)}
                >
                  All Categories
                </Button>
                {kpiCategories ? kpiCategories.map((category: KpiCategory) => (
                  <Button 
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "ghost"} 
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </Button>
                )) : <div className="text-sm text-muted-foreground p-2">No categories available</div>}
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-2">KPI Formulas</h3>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-1">
                    {kpiCategories ? kpiCategories.flatMap((category: KpiCategory) => 
                      selectedCategory && category.id !== selectedCategory
                        ? []
                        : (category.kpis ?? []).map((kpi: KpiFormula) => (
                            <Button 
                              key={kpi?.id}
                              variant={selectedKpi?.id === kpi?.id ? "secondary" : "ghost"} 
                              className={cn(
                                "w-full justify-between pl-6 pr-2",
                                !kpi?.enabled && "text-muted-foreground"
                              )}
                              onClick={() => setSelectedKpi(kpi)}
                            >
                              <span className="truncate text-left">{kpi?.name || "Unnamed KPI"}</span>
                              {!kpi?.customizable && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Lock className="h-3 w-3 ml-2 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>System KPI (not editable)</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </Button>
                          ))
                    ) : <div className="p-4 text-sm text-muted-foreground">No KPI formulas available</div>}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="md:col-span-3">
              {renderFormulaEditor()}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fields">
          {renderCustomFieldsEditor()}
        </TabsContent>

        <TabsContent value="import-export">
          {renderImportExport()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KpiConfigurationPage;