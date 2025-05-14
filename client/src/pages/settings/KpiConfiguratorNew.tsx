import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  BookOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SimpleTooltips from "@/components/kpi/SimpleTooltips";

/**
 * Visual Formula Builder for KPI Configuration
 * 
 * This revolutionary new way to configure KPIs makes it easy for non-technical
 * users to create powerful formulas through an intuitive visual interface.
 */

const KpiConfiguratorNew: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("builder");
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  
  // For demonstration purposes until the API endpoints are connected
  const formulaTemplates = [
    {
      id: "conversion-rate",
      name: "Conversion Rate",
      description: "Percentage of meetings that convert to deals",
      category: "sales",
      formula: "(deals / meetings) * 100"
    },
    {
      id: "avg-deal-value",
      name: "Average Deal Value",
      description: "Average value of all deals",
      category: "sales",
      formula: "sum(deal_values) / count(deals)"
    },
    {
      id: "meeting-show-rate",
      name: "Meeting Show Rate",
      description: "Percentage of scheduled meetings that occur",
      category: "marketing",
      formula: "(meetings_occurred / meetings_scheduled) * 100"
    }
  ];

  const handleCreateFormula = () => {
    toast({
      title: "Creating new formula",
      description: "The visual formula builder is being prepared"
    });
  };

  const handleTemplateSelect = (template: any) => {
    toast({
      title: `Template "${template.name}" selected`,
      description: "Loading template into the visual builder"
    });
  };

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
            Create powerful KPI formulas with our visual formula builder
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

      <Tabs defaultValue="builder" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="builder">
            <Calculator className="mr-2 h-4 w-4" />
            Visual Builder
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Wand2 className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="formulas">
            <File className="mr-2 h-4 w-4" />
            My Formulas
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="mr-2 h-5 w-5" />
                Visual Formula Builder
              </CardTitle>
              <CardDescription>
                Drag and drop elements to build your formula visually
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-12 border border-dashed rounded-md flex flex-col items-center justify-center text-center space-y-4">
                <Sparkles className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium">Start Building Your Formula</h3>
                <p className="text-muted-foreground max-w-md">
                  Create powerful KPI formulas by dragging fields, operators, and functions onto the canvas. No coding required!
                </p>
                <Button onClick={handleCreateFormula} size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Start Building
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {formulaTemplates.map(template => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="bg-muted p-2 rounded-md">
                    <code className="text-sm">{template.formula}</code>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="ghost" size="sm">Preview</Button>
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

        <TabsContent value="formulas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Formulas</CardTitle>
              <CardDescription>
                View and manage your saved formulas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-12 border border-dashed rounded-md flex flex-col items-center justify-center text-center space-y-4">
                <File className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium">No Formulas Yet</h3>
                <p className="text-muted-foreground max-w-md">
                  You haven't created any formulas yet. Start by creating a new formula or using a template.
                </p>
                <Button onClick={handleCreateFormula}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Formula
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>KPI Configurator Settings</CardTitle>
              <CardDescription>
                Customize your experience with the visual formula builder
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">General Settings</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label htmlFor="autosave" className="text-sm font-medium">Auto-save Interval (minutes)</label>
                    <Input 
                      id="autosave"
                      type="number" 
                      min="1" 
                      max="60" 
                      defaultValue="5"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Display Settings</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label htmlFor="grid-size" className="text-sm font-medium">Grid Size</label>
                    <Input 
                      id="grid-size"
                      type="number" 
                      min="5" 
                      max="50" 
                      defaultValue="10"
                    />
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