import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Check, Info, Sparkles, Lightbulb, BookOpen, FileCheck, HelpCircle } from "lucide-react";

/**
 * Interactive Tutorial System for KPI Configurator
 * 
 * This component provides a step-by-step guided tutorial for users to learn
 * how to use the visual formula builder effectively.
 */

export enum TutorialLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string; // CSS selector for the element to highlight
  position?: 'top' | 'right' | 'bottom' | 'left';
  action?: 'click' | 'drag' | 'input' | 'observe';
  actionDescription?: string;
  completionCriteria?: () => boolean;
  image?: string;
  tip?: string;
}

interface TutorialData {
  id: string;
  name: string;
  description: string;
  level: TutorialLevel;
  steps: TutorialStep[];
  estimatedTime: number; // in minutes
}

interface TutorialSystemProps {
  isOpen: boolean;
  onClose: () => void;
  onTutorialSelect: (tutorialId: string) => void;
}

interface TutorialPlayerProps {
  tutorial: TutorialData;
  currentStepIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onComplete: () => void;
  onExit: () => void;
}

interface TutorialProgressProps {
  totalSteps: number;
  currentStep: number;
}

// Available tutorials
const availableTutorials: TutorialData[] = [
  {
    id: 'basic-formula-creation',
    name: 'Creating Your First Formula',
    description: 'Learn the basics of creating a KPI formula using the visual editor',
    level: TutorialLevel.BEGINNER,
    estimatedTime: 5,
    steps: [
      {
        id: 'intro',
        title: 'Welcome to the KPI Configurator',
        description: "This tutorial will guide you through creating your first KPI formula using the visual formula builder. You'll learn how to add fields, operations, and see your formula in action.",
        position: 'bottom',
        tip: 'The visual formula builder makes it easy to create complex KPI formulas without writing code!'
      },
      {
        id: 'select-field',
        title: 'Add Your First Field',
        description: 'Start by selecting a field from the Fields panel. Fields represent the data points you can use in your formula.',
        targetElement: '.field-panel',
        action: 'click',
        actionDescription: 'Click on a field in the Fields panel',
        position: 'right',
        tip: 'Popular fields appear at the top of the list. Try using "contacts" or "meetings" to start with.'
      },
      {
        id: 'add-operator',
        title: 'Add an Operator',
        description: 'Now that you have a field, add an operator to perform a calculation. Operators like +, -, *, / let you perform math operations.',
        targetElement: '.operator-panel',
        action: 'click',
        actionDescription: 'Click on an operator in the Operators panel',
        position: 'right',
        tip: 'For percentage calculations, use the division operator (/) and then multiply by 100.'
      },
      {
        id: 'add-second-field',
        title: 'Add Another Field',
        description: 'Add a second field to complete your formula expression.',
        targetElement: '.field-panel',
        action: 'click',
        actionDescription: 'Click on another field in the Fields panel',
        position: 'right',
        tip: 'Try choosing related fields that make sense together, like "meetings" and "contacts".'
      },
      {
        id: 'connect-blocks',
        title: 'Connect the Blocks',
        description: 'Connect your blocks by dragging from one block to another. This establishes the relationship between your components.',
        action: 'drag',
        actionDescription: 'Drag from output port of one block to input port of another',
        position: 'bottom',
        tip: 'The connections determine the order of operations in your formula.'
      },
      {
        id: 'preview-formula',
        title: 'Preview Your Formula',
        description: 'Check the preview panel to see your formula in action with real data values.',
        targetElement: '.preview-panel',
        action: 'observe',
        position: 'left',
        tip: 'The preview shows you what your formula will return when run against your actual data.'
      },
      {
        id: 'save-formula',
        title: 'Save Your Formula',
        description: 'Give your formula a name and description, then save it to use in your dashboards.',
        targetElement: '.save-button',
        action: 'click',
        actionDescription: 'Click the Save button',
        position: 'top',
        tip: 'Use a descriptive name that clearly indicates what the KPI measures, like "Meeting Conversion Rate".'
      },
      {
        id: 'completion',
        title: 'Congratulations!',
        description: "You've successfully created your first KPI formula. It will now be available in your dashboards and reports.",
        position: 'bottom',
        tip: 'Try creating a formula for conversion rate: count(deals) / count(meetings) * 100'
      }
    ]
  },
  {
    id: 'functions-tutorial',
    name: 'Using Functions in Formulas',
    description: 'Learn how to use functions to create more powerful calculations',
    level: TutorialLevel.INTERMEDIATE,
    estimatedTime: 8,
    steps: [
      {
        id: 'intro-functions',
        title: 'Advanced Formulas with Functions',
        description: "Functions let you perform complex calculations beyond basic arithmetic. In this tutorial, you'll learn how to use functions in your KPI formulas.",
        position: 'bottom',
        tip: 'Functions can transform, aggregate, and analyze your data in powerful ways.'
      },
      {
        id: 'select-function',
        title: 'Add a Function',
        description: 'Select a function from the Functions panel. Functions perform specialized calculations like sum, average, or count.',
        targetElement: '.function-panel',
        action: 'click',
        actionDescription: 'Click on a function in the Functions panel',
        position: 'right',
        tip: 'The "count" function is great for counting items, while "sum" adds up values and "average" calculates the mean.'
      },
      // Additional steps would continue here...
    ]
  },
  {
    id: 'template-usage',
    name: 'Using Formula Templates',
    description: 'Save time by starting with pre-built formula templates',
    level: TutorialLevel.BEGINNER,
    estimatedTime: 3,
    steps: [
      {
        id: 'intro-templates',
        title: 'Formula Templates',
        description: "Templates provide pre-built formulas for common KPIs. This tutorial shows how to use and customize templates.",
        position: 'bottom',
        tip: "Templates can save you time and ensure you're using industry-standard calculations."
      },
      // Additional steps would continue here...
    ]
  }
];

// Tutorial selection component
const TutorialSelection: React.FC<{
  onSelect: (tutorial: TutorialData) => void;
}> = ({ onSelect }) => {
  const [filterLevel, setFilterLevel] = useState<TutorialLevel | null>(null);
  
  const filteredTutorials = filterLevel 
    ? availableTutorials.filter(t => t.level === filterLevel)
    : availableTutorials;
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={filterLevel === null ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterLevel(null)}
        >
          All
        </Button>
        <Button
          variant={filterLevel === TutorialLevel.BEGINNER ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterLevel(TutorialLevel.BEGINNER)}
        >
          Beginner
        </Button>
        <Button
          variant={filterLevel === TutorialLevel.INTERMEDIATE ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterLevel(TutorialLevel.INTERMEDIATE)}
        >
          Intermediate
        </Button>
        <Button
          variant={filterLevel === TutorialLevel.ADVANCED ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterLevel(TutorialLevel.ADVANCED)}
        >
          Advanced
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTutorials.map(tutorial => (
          <Card 
            key={tutorial.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onSelect(tutorial)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-lg">{tutorial.name}</h3>
                {tutorial.level === TutorialLevel.BEGINNER && (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Beginner</span>
                )}
                {tutorial.level === TutorialLevel.INTERMEDIATE && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Intermediate</span>
                )}
                {tutorial.level === TutorialLevel.ADVANCED && (
                  <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">Advanced</span>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">{tutorial.description}</p>
              
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span className="flex items-center">
                  <BookOpen className="h-3.5 w-3.5 mr-1" />
                  {tutorial.steps.length} steps
                </span>
                <span className="flex items-center">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  {tutorial.estimatedTime} min
                </span>
              </div>
              
              <Button variant="ghost" size="sm" className="w-full mt-2">
                Start Tutorial
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Tutorial progress indicator
const TutorialProgress: React.FC<TutorialProgressProps> = ({
  totalSteps,
  currentStep
}) => {
  return (
    <div className="flex items-center space-x-1 w-full max-w-md mx-auto mb-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div 
          key={index}
          className={`h-1.5 rounded-full flex-1 transition-all ${
            index < currentStep 
              ? 'bg-primary' 
              : index === currentStep 
                ? 'bg-primary/60' 
                : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
};

// Add a Clock icon since it wasn't imported above
const Clock = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// Tutorial player component
const TutorialPlayer: React.FC<TutorialPlayerProps> = ({
  tutorial,
  currentStepIndex,
  onNext,
  onPrevious,
  onComplete,
  onExit
}) => {
  const currentStep = tutorial.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === tutorial.steps.length - 1;
  
  // Effect to highlight target element
  useEffect(() => {
    if (currentStep.targetElement) {
      const targetElement = document.querySelector(currentStep.targetElement);
      
      if (targetElement) {
        // Add highlight class
        targetElement.classList.add('tutorial-highlight');
        
        // Scroll element into view if needed
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        
        // Remove highlight when done
        return () => {
          targetElement.classList.remove('tutorial-highlight');
        };
      }
    }
  }, [currentStep]);
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-md w-full">
      <TutorialProgress 
        totalSteps={tutorial.steps.length} 
        currentStep={currentStepIndex} 
      />
      
      <div className="mb-4">
        <h3 className="text-lg font-bold">{currentStep.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {currentStep.description}
        </p>
        
        {currentStep.actionDescription && (
          <div className="mt-2 bg-muted p-2 rounded-md text-sm flex items-center">
            <Info className="h-4 w-4 mr-2 text-blue-500" />
            <span>{currentStep.actionDescription}</span>
          </div>
        )}
        
        {currentStep.tip && (
          <div className="mt-3 text-sm flex">
            <Lightbulb className="h-4 w-4 mr-2 text-amber-500 flex-shrink-0 mt-0.5" />
            <span className="text-muted-foreground">{currentStep.tip}</span>
          </div>
        )}
      </div>
      
      <div className="flex justify-between mt-4">
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={onExit}
          >
            Exit Tutorial
          </Button>
        </div>
        
        <div className="flex space-x-2">
          {!isFirstStep && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevious}
            >
              Previous
            </Button>
          )}
          
          {isLastStep ? (
            <Button
              size="sm"
              onClick={onComplete}
            >
              <Check className="mr-1 h-4 w-4" />
              Complete
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onNext}
            >
              Next
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Main tutorial system component
const TutorialSystem: React.FC<TutorialSystemProps> = ({
  isOpen,
  onClose,
  onTutorialSelect
}) => {
  const [mode, setMode] = useState<'selection' | 'playing'>('selection');
  const [selectedTutorial, setSelectedTutorial] = useState<TutorialData | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  const handleTutorialSelect = (tutorial: TutorialData) => {
    setSelectedTutorial(tutorial);
    setCurrentStepIndex(0);
    setMode('playing');
    onTutorialSelect(tutorial.id);
  };
  
  const handleNext = () => {
    if (selectedTutorial && currentStepIndex < selectedTutorial.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };
  
  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };
  
  const handleComplete = () => {
    setMode('selection');
    setSelectedTutorial(null);
    setCurrentStepIndex(0);
    onClose();
  };
  
  const handleExit = () => {
    setMode('selection');
    setSelectedTutorial(null);
    setCurrentStepIndex(0);
    onClose();
  };
  
  const handleDialogClose = () => {
    // Only allow dialog close in selection mode
    if (mode === 'selection') {
      onClose();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className={mode === 'selection' ? '' : 'hidden'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            KPI Formula Builder Tutorials
          </DialogTitle>
          <DialogDescription>
            Learn how to create powerful KPI formulas with our step-by-step tutorials.
            Select a tutorial to get started.
          </DialogDescription>
        </DialogHeader>
        
        <TutorialSelection onSelect={handleTutorialSelect} />
        
        <DialogFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      
      {mode === 'playing' && selectedTutorial && (
        <div className="fixed top-0 left-0 w-full h-0">
          <div className={`fixed ${getPositionClass(selectedTutorial.steps[currentStepIndex].position || 'bottom')}`}>
            <TutorialPlayer
              tutorial={selectedTutorial}
              currentStepIndex={currentStepIndex}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onComplete={handleComplete}
              onExit={handleExit}
            />
          </div>
        </div>
      )}
    </Dialog>
  );
};

// Helper function to get position class
function getPositionClass(position: 'top' | 'right' | 'bottom' | 'left'): string {
  switch (position) {
    case 'top':
      return 'bottom-20 left-1/2 transform -translate-x-1/2 z-50';
    case 'right':
      return 'left-20 top-1/2 transform -translate-y-1/2 z-50';
    case 'bottom':
      return 'top-20 left-1/2 transform -translate-x-1/2 z-50';
    case 'left':
      return 'right-20 top-1/2 transform -translate-y-1/2 z-50';
    default:
      return 'bottom-20 left-1/2 transform -translate-x-1/2 z-50';
  }
}

export default TutorialSystem;