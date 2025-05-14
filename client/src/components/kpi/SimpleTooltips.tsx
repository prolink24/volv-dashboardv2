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
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            KPI Formula Builder Tips
          </DialogTitle>
          <DialogDescription>
            Learn how to create powerful KPI formulas with these helpful tips
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          {tips.map(tip => (
            <Card key={tip.id} className="relative">
              <CardContent className="p-4">
                <h3 className="font-medium text-base mb-2">{tip.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {tip.description}
                </p>
              </CardContent>
            </Card>
          ))}
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