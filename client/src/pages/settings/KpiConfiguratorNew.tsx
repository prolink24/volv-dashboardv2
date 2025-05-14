import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  File, 
  Plus, 
  Wand2, 
  Code, 
  Calculator, 
  Gauge, 
  Sparkles, 
  Settings,
  HelpCircle,
  BookOpen,
  Edit,
  Trash2,
  Copy,
  Check,
  Filter,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SimpleTooltips from "@/components/kpi/SimpleTooltips";
import { 
  useKpiFormulas, 
  useCreateKpiFormula, 
  useUpdateKpiFormula,
  useDeleteKpiFormula,
  getAvailableFields,
  getFormulaCategories,
  getDashboardTypes
} from "@/hooks/use-kpi-configuration";
import type { KpiFormula, KpiFormulaInput } from "@/hooks/use-kpi-configuration";

/**
 * Visual Formula Builder for KPI Configuration
 * 
 * This revolutionary new way to configure KPIs makes it easy for non-technical
 * users to create powerful formulas through an intuitive visual interface.
 */

const KpiConfiguratorNew: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("formulas");
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterDashboard, setFilterDashboard] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form state for creating/editing KPI formulas
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentFormula, setCurrentFormula] = useState<KpiFormula | null>(null);
  const [formulaInput, setFormulaInput] = useState<KpiFormulaInput>({
    name: "",
    description: "",
    formula: "",
    category: "sales",
    dashboardTypes: ["sales"]
  });
  
  // Fetch formulas and function info
  const { data: formulas = [], isLoading, error } = useKpiFormulas();
  const createFormulaMutation = useCreateKpiFormula();
  const updateFormulaMutation = useUpdateKpiFormula();
  const deleteFormulaMutation = useDeleteKpiFormula();
  
  // All available categories and dashboard types
  const categories = getFormulaCategories();
  const dashboardTypes = getDashboardTypes();
  const availableFields = getAvailableFields();
  
  // Filter formulas based on search query and filters
  const filteredFormulas = formulas.filter(formula => {
    let matches = true;
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matches = matches && (
        formula.name.toLowerCase().includes(query) ||
        (formula.description || "").toLowerCase().includes(query) ||
        formula.formula.toLowerCase().includes(query)
      );
    }
    
    // Filter by category
    if (filterCategory) {
      matches = matches && formula.category === filterCategory;
    }
    
    // Filter by dashboard type
    if (filterDashboard) {
      matches = matches && formula.dashboardTypes.includes(filterDashboard);
    }
    
    return matches;
  });
  
  // Handle form input changes
  const handleInputChange = (field: keyof KpiFormulaInput, value: any) => {
    setFormulaInput(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle dashboard types selection
  const toggleDashboardType = (type: string) => {
    setFormulaInput(prev => {
      const currentTypes = [...prev.dashboardTypes];
      const index = currentTypes.indexOf(type);
      
      if (index > -1) {
        currentTypes.splice(index, 1);
      } else {
        currentTypes.push(type);
      }
      
      return {
        ...prev,
        dashboardTypes: currentTypes
      };
    });
  };
  
  // Create or update formula
  const handleSaveFormula = async () => {
    try {
      if (isEditMode && currentFormula) {
        // Update existing formula
        await updateFormulaMutation.mutateAsync({
          id: currentFormula.id,
          data: formulaInput
        });
        toast({
          title: "Formula Updated",
          description: `"${formulaInput.name}" has been updated successfully.`
        });
      } else {
        // Create new formula
        await createFormulaMutation.mutateAsync(formulaInput);
        toast({
          title: "Formula Created",
          description: `"${formulaInput.name}" has been created successfully.`
        });
      }
      
      // Reset form and switch to formulas tab
      resetForm();
      setActiveTab("formulas");
    } catch (error) {
      console.error("Error saving formula:", error);
      toast({
        title: "Error",
        description: "Failed to save the formula. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Delete formula
  const handleDeleteFormula = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      try {
        await deleteFormulaMutation.mutateAsync(id);
        toast({
          title: "Formula Deleted",
          description: `"${name}" has been deleted successfully.`
        });
      } catch (error) {
        console.error("Error deleting formula:", error);
        toast({
          title: "Error",
          description: "Failed to delete the formula. Please try again.",
          variant: "destructive"
        });
      }
    }
  };
  
  // Edit formula
  const handleEditFormula = (formula: KpiFormula) => {
    setCurrentFormula(formula);
    setFormulaInput({
      name: formula.name,
      description: formula.description || "",
      formula: formula.formula,
      category: formula.category,
      dashboardTypes: [...formula.dashboardTypes],
      visualBlocks: formula.visualBlocks
    });
    setIsEditMode(true);
    setActiveTab("builder");
  };
  
  // Clone formula
  const handleCloneFormula = (formula: KpiFormula) => {
    setFormulaInput({
      name: `${formula.name} (Copy)`,
      description: formula.description || "",
      formula: formula.formula,
      category: formula.category,
      dashboardTypes: [...formula.dashboardTypes],
      visualBlocks: formula.visualBlocks
    });
    setIsEditMode(false);
    setCurrentFormula(null);
    setActiveTab("builder");
  };
  
  // Start creating a new formula
  const handleCreateFormula = () => {
    resetForm();
    setActiveTab("builder");
    toast({
      title: "Creating new formula",
      description: "Enter the details for your new KPI formula"
    });
  };
  
  // Use a template as a starting point
  const handleTemplateSelect = (formula: KpiFormula) => {
    setFormulaInput({
      name: formula.name,
      description: formula.description || "",
      formula: formula.formula,
      category: formula.category,
      dashboardTypes: [...formula.dashboardTypes],
      visualBlocks: formula.visualBlocks
    });
    setIsEditMode(false);
    setCurrentFormula(null);
    setActiveTab("builder");
    toast({
      title: `Template "${formula.name}" selected`,
      description: "You can now customize this template for your needs"
    });
  };
  
  // Reset form
  const resetForm = () => {
    setFormulaInput({
      name: "",
      description: "",
      formula: "",
      category: "sales",
      dashboardTypes: ["sales"]
    });
    setIsEditMode(false);
    setCurrentFormula(null);
  };
  
  // Handle the tooltips dialog close
  const handleTooltipsClose = () => {
    setIsTutorialOpen(false);
    toast({
      title: "Tips closed",
      description: "You can access tips anytime by clicking on the Tutorials button"
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">KPI Configurator</h1>
          <p className="text-muted-foreground">
            Create powerful KPI formulas for all your dashboards
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsTutorialOpen(true)}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Tutorials
          </Button>
          <Button onClick={handleCreateFormula}>
            <Plus className="mr-2 h-4 w-4" />
            Create Formula
          </Button>
        </div>
      </div>

      <Tabs defaultValue="formulas" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="formulas">
            <File className="mr-2 h-4 w-4" />
            KPI Formulas
          </TabsTrigger>
          <TabsTrigger value="builder">
            <Calculator className="mr-2 h-4 w-4" />
            {isEditMode ? "Edit Formula" : "Create Formula"}
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Wand2 className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Formulas Tab - Shows all KPI formulas */}
        <TabsContent value="formulas" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>KPI Formulas</CardTitle>
                  <CardDescription>
                    View and manage all formulas across dashboards
                  </CardDescription>
                </div>
                <Button onClick={handleCreateFormula}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Formula
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search formulas..."
                    className="pl-10"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    <Filter className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Select value={filterCategory || ""} onValueChange={(v) => setFilterCategory(v || null)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterDashboard || ""} onValueChange={(v) => setFilterDashboard(v || null)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by dashboard" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All dashboards</SelectItem>
                      {dashboardTypes.map(dashboard => (
                        <SelectItem key={dashboard.id} value={dashboard.id}>
                          {dashboard.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {isLoading ? (
                <div className="text-center p-8">
                  <p>Loading formulas...</p>
                </div>
              ) : error ? (
                <div className="text-center p-8 text-red-500">
                  <p>Error loading formulas. Please try again.</p>
                </div>
              ) : filteredFormulas.length === 0 ? (
                <div className="text-center p-8">
                  <p className="text-muted-foreground">No formulas found matching your filters.</p>
                  <Button className="mt-4" onClick={handleCreateFormula}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Formula
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredFormulas.map(formula => (
                    <Card key={formula.id} className="relative overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold truncate">{formula.name}</h3>
                              <Badge variant="outline" className="capitalize">
                                {formula.category}
                              </Badge>
                            </div>
                            {formula.description && (
                              <p className="text-muted-foreground text-sm mb-3">{formula.description}</p>
                            )}
                            <div className="bg-muted p-3 rounded-md flex items-center overflow-x-auto mb-3">
                              <code className="text-sm whitespace-pre-wrap">
                                {formula.formula}
                              </code>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {formula.dashboardTypes.map(dashType => (
                                <Badge key={dashType} variant="secondary">
                                  {dashboardTypes.find(d => d.id === dashType)?.name || dashType}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="ml-4 flex flex-col gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditFormula(formula)}>
                              <Edit className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleCloneFormula(formula)}>
                              <Copy className="mr-1 h-3 w-3" />
                              Clone
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteFormula(formula.id, formula.name)}>
                              <Trash2 className="mr-1 h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Builder Tab - Create/Edit Formula */}
        <TabsContent value="builder" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="mr-2 h-5 w-5" />
                {isEditMode ? `Edit Formula: ${currentFormula?.name}` : "Create New Formula"}
              </CardTitle>
              <CardDescription>
                {isEditMode ? "Update your KPI formula details" : "Define a new KPI formula for your dashboards"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label htmlFor="formula-name" className="text-sm font-medium">Formula Name</label>
                  <Input 
                    id="formula-name"
                    value={formulaInput.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="e.g., Conversion Rate"
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="formula-description" className="text-sm font-medium">Description</label>
                  <Textarea 
                    id="formula-description"
                    value={formulaInput.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Describe what this KPI measures"
                    rows={2}
                  />
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="formula-category" className="text-sm font-medium">Category</label>
                  <Select value={formulaInput.category} onValueChange={(v) => handleInputChange("category", v)}>
                    <SelectTrigger id="formula-category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Dashboard Types</label>
                  <div className="flex flex-wrap gap-2">
                    {dashboardTypes.map(dashType => (
                      <div key={dashType.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`dashboard-${dashType.id}`}
                          checked={formulaInput.dashboardTypes.includes(dashType.id)}
                          onCheckedChange={() => toggleDashboardType(dashType.id)}
                        />
                        <label 
                          htmlFor={`dashboard-${dashType.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {dashType.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="formula-definition" className="text-sm font-medium">Formula Definition</label>
                  <Textarea 
                    id="formula-definition"
                    value={formulaInput.formula}
                    onChange={(e) => handleInputChange("formula", e.target.value)}
                    placeholder="e.g., (deals_won / meetings_completed) * 100"
                    rows={3}
                    className="font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Available Fields</label>
                  <div className="bg-muted p-3 rounded-md max-h-60 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {availableFields.map(field => (
                        <div 
                          key={field.id} 
                          className="p-2 bg-card rounded border cursor-pointer hover:bg-accent"
                          onClick={() => {
                            handleInputChange("formula", formulaInput.formula + " " + field.id);
                          }}
                        >
                          <div className="font-medium text-sm">{field.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {field.fieldType} | {field.source}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => {
                  resetForm();
                  setActiveTab("formulas");
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveFormula}
                disabled={!formulaInput.name || !formulaInput.formula || formulaInput.dashboardTypes.length === 0}
              >
                {isEditMode ? "Update Formula" : "Save Formula"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {formulas.filter(f => f.category !== "custom").map(template => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline" className="capitalize">
                      {template.category}
                    </Badge>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="bg-muted p-2 rounded-md">
                    <code className="text-sm">{template.formula}</code>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.dashboardTypes.map(dashType => (
                      <Badge key={dashType} variant="secondary" className="text-xs">
                        {dashboardTypes.find(d => d.id === dashType)?.name || dashType}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="ghost" size="sm" onClick={() => handleCloneFormula(template)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Clone
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    Use Template
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>KPI Configurator Settings</CardTitle>
              <CardDescription>
                Customize your experience with the KPI configurator
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Dashboard KPI Display</h3>
                <div className="grid gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="show-all-kpis" defaultChecked />
                    <label htmlFor="show-all-kpis" className="text-sm">Show all available KPIs on dashboards</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="enable-dashboard-kpi-customization" defaultChecked />
                    <label htmlFor="enable-dashboard-kpi-customization" className="text-sm">Allow dashboard-specific KPI customizations</label>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Formula Builder</h3>
                <div className="grid gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="auto-save" defaultChecked />
                    <label htmlFor="auto-save" className="text-sm">Auto-save formula drafts</label>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="formula-format" className="text-sm font-medium">Default Formula Format</label>
                    <Select defaultValue="visual">
                      <SelectTrigger id="formula-format">
                        <SelectValue placeholder="Select a format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visual">Visual Builder</SelectItem>
                        <SelectItem value="text">Text Formula</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <SimpleTooltips 
        isOpen={isTutorialOpen}
        onClose={handleTooltipsClose}
      />
    </div>
  );
};

export default KpiConfiguratorNew;