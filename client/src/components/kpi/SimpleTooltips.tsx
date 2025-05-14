import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ArrowRight, Lightbulb } from "lucide-react";

/**
 * A simpler tutorial system for the KPI Configurator
 * 
 * This component provides users with tips for using the KPI Configurator
 */

interface SimpleTooltipsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TipItem {
  id: string;
  title: string;
  description: string;
  category: string;
}

const SimpleTooltips: React.FC<SimpleTooltipsProps> = ({
  isOpen,
  onClose
}) => {
  const tips: TipItem[] = [
    {
      id: "formula-basics",
      title: "Formula Basics",
      description: "Use fields from your data sources together with operators like +, -, *, / to create simple calculations.",
      category: "basic"
    },
    {
      id: "percentage-calc",
      title: "Creating Percentages",
      description: "To calculate a percentage, divide one value by another and multiply by 100. For example: (deals_won / total_deals) * 100",
      category: "basic"
    },
    {
      id: "multi-dashboard",
      title: "Multi-Dashboard Support",
      description: "Assign your KPIs to specific dashboard types to make them available across Sales, Marketing, Setter, and Admin views.",
      category: "basic"
    },
    {
      id: "templates",
      title: "Using Templates",
      description: "Don't start from scratch! Use our templates for common KPIs like conversion rates, average deal sizes, and more.",
      category: "basic"
    },
    {
      id: "function-power",
      title: "Powerful Functions",
      description: "Use functions like COUNT(), SUM(), and AVERAGE() to analyze your data in more sophisticated ways.",
      category: "advanced"
    },
    {
      id: "version-control",
      title: "Version History",
      description: "All your formulas have automatic version history. You can always go back to a previous version if needed.",
      category: "advanced"
    },
    {
      id: "cross-platform",
      title: "Cross-Platform Data",
      description: "Create KPIs that combine data from Close CRM, Calendly, and other integrated sources for true multi-platform attribution.",
      category: "advanced"
    },
    {
      id: "time-periods",
      title: "Time Period Functions",
      description: "Use time-based functions like THIS_MONTH(), LAST_QUARTER(), or YEAR_TO_DATE() to analyze trends over specific periods.",
      category: "advanced"
    },
    {
      id: "filtering",
      title: "Data Filtering",
      description: "Apply filters to your KPIs using WHERE() conditions to focus on specific segments of your data.",
      category: "advanced"
    },
    {
      id: "clone-formulas",
      title: "Clone Existing Formulas",
      description: "Use the Clone button to create variations of existing formulas without starting from scratch.",
      category: "basic"
    }
  ];

  // Filter tips by category
  const basicTips = tips.filter(tip => tip.category === "basic");
  const advancedTips = tips.filter(tip => tip.category === "advanced");
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            KPI Formula Builder Tips
          </DialogTitle>
          <DialogDescription>
            Learn how to create powerful KPI formulas with these helpful tips
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center">
              <BookOpen className="mr-2 h-4 w-4 text-blue-500" />
              Getting Started Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {basicTips.map(tip => (
                <Card key={tip.id} className="relative overflow-hidden border-blue-100">
                  <div className="absolute inset-0 bg-blue-50/50 pointer-events-none" />
                  <CardContent className="p-4 relative">
                    <h3 className="font-medium text-base mb-2">{tip.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {tip.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center">
              <ArrowRight className="mr-2 h-4 w-4 text-purple-500" />
              Advanced Techniques
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {advancedTips.map(tip => (
                <Card key={tip.id} className="relative overflow-hidden border-purple-100">
                  <div className="absolute inset-0 bg-purple-50/50 pointer-events-none" />
                  <CardContent className="p-4 relative">
                    <h3 className="font-medium text-base mb-2">{tip.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {tip.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex justify-end w-full">
            <Button onClick={onClose}>
              Got it
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleTooltips;