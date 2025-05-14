import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  ChevronLeft,
  Code, 
  CreditCard, 
  Database, 
  Download, 
  Edit,
  Eye, 
  ExternalLink,
  FileQuestion, 
  Filter, 
  Gauge,
  History,
  Info, 
  Layers,
  Lock, 
  MousePointerClick,
  Pencil, 
  Plus, 
  Save, 
  Settings,
  Trash,
  Users,
  Wand2,
  AlertCircle,
  X,
  Search,
  Sparkles,
  ArrowRight,
  Check,
  Play,
  Pause,
  Copy,
  LayoutGrid,
  SlidersHorizontal,
  Star
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
import { useDroppable } from "@dnd-kit/core";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { useDraggable } from "@dnd-kit/core";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Resizable } from "re-resizable";

// Define types for our blocks in the visual formula builder
interface FormulaBlockBase {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  connections: {
    inputs: string[];
    outputs: string[];
  };
}

interface FieldBlock extends FormulaBlockBase {
  type: 'field';
  fieldId: string;
  fieldName: string;
  fieldType: string;
  fieldSource: string;
}

interface OperatorBlock extends FormulaBlockBase {
  type: 'operator';
  operator: '+' | '-' | '*' | '/' | '%' | '>' | '<' | '>=' | '<=' | '==' | '!=' | '&&' | '||';
  label: string;
}

interface FunctionBlock extends FormulaBlockBase {
  type: 'function';
  functionName: string;
  paramCount: number;
  description: string;
}

interface ConstantBlock extends FormulaBlockBase {
  type: 'constant';
  value: string | number | boolean;
  dataType: 'string' | 'number' | 'boolean';
}

interface GroupBlock extends FormulaBlockBase {
  type: 'group';
  blocks: FormulaBlock[];
  label: string;
}

type FormulaBlock = FieldBlock | OperatorBlock | FunctionBlock | ConstantBlock | GroupBlock;

// Sample functions for the function library
const functionLibrary = [
  { 
    name: 'sum', 
    description: 'Sum all values',
    paramCount: 1,
    category: 'math',
    examples: ['sum(deals)', 'sum(meetings)']
  },
  { 
    name: 'average', 
    description: 'Calculate average',
    paramCount: 1,
    category: 'math',
    examples: ['average(dealValues)', 'average(callDurations)']
  },
  { 
    name: 'count', 
    description: 'Count items',
    paramCount: 1,
    category: 'math',
    examples: ['count(contacts)', 'count(activities)']
  },
  { 
    name: 'min', 
    description: 'Find minimum value',
    paramCount: 1,
    category: 'math',
    examples: ['min(dealValues)', 'min(responseTime)']
  },
  { 
    name: 'max', 
    description: 'Find maximum value',
    paramCount: 1,
    category: 'math',
    examples: ['max(dealValues)', 'max(meetingDurations)']
  },
  { 
    name: 'if', 
    description: 'Conditional logic',
    paramCount: 3,
    category: 'logic',
    examples: ['if(meetings > 5, "High Activity", "Low Activity")']
  },
  { 
    name: 'dateRange', 
    description: 'Filter by date range',
    paramCount: 3,
    category: 'date',
    examples: ['dateRange(activities, "last30days")']
  },
  { 
    name: 'formatPercent', 
    description: 'Format as percentage',
    paramCount: 1,
    category: 'format',
    examples: ['formatPercent(conversionRate)']
  },
  { 
    name: 'formatCurrency', 
    description: 'Format as currency',
    paramCount: 1,
    category: 'format',
    examples: ['formatCurrency(totalRevenue)']
  }
];

// Sample operators for the operator library
const operatorLibrary = [
  { symbol: '+', label: 'Add', category: 'math' },
  { symbol: '-', label: 'Subtract', category: 'math' },
  { symbol: '*', label: 'Multiply', category: 'math' },
  { symbol: '/', label: 'Divide', category: 'math' },
  { symbol: '%', label: 'Modulo', category: 'math' },
  { symbol: '>', label: 'Greater Than', category: 'comparison' },
  { symbol: '<', label: 'Less Than', category: 'comparison' },
  { symbol: '>=', label: 'Greater Than or Equal', category: 'comparison' },
  { symbol: '<=', label: 'Less Than or Equal', category: 'comparison' },
  { symbol: '==', label: 'Equal To', category: 'comparison' },
  { symbol: '!=', label: 'Not Equal To', category: 'comparison' },
  { symbol: '&&', label: 'AND', category: 'logical' },
  { symbol: '||', label: 'OR', category: 'logical' }
];

// Draggable component for formula blocks
const DraggableBlock = ({ block, onClick, isSelected }: { 
  block: FormulaBlock; 
  onClick: () => void;
  isSelected: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
    data: { block }
  });

  let blockContent;
  let blockColor;

  switch (block.type) {
    case 'field':
      blockColor = 'bg-blue-100 border-blue-300 hover:bg-blue-200';
      blockContent = (
        <>
          <div className="font-medium">{(block as FieldBlock).fieldName}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Database className="h-3 w-3" />
            {(block as FieldBlock).fieldSource}
          </div>
        </>
      );
      break;
    case 'operator':
      blockColor = 'bg-amber-100 border-amber-300 hover:bg-amber-200';
      blockContent = (
        <>
          <div className="font-medium text-center text-xl">{(block as OperatorBlock).operator}</div>
          <div className="text-xs text-center text-muted-foreground mt-1">
            {(block as OperatorBlock).label}
          </div>
        </>
      );
      break;
    case 'function':
      blockColor = 'bg-purple-100 border-purple-300 hover:bg-purple-200';
      blockContent = (
        <>
          <div className="font-medium">{(block as FunctionBlock).functionName}()</div>
          <div className="text-xs text-muted-foreground mt-1">
            {(block as FunctionBlock).description}
          </div>
        </>
      );
      break;
    case 'constant':
      blockColor = 'bg-green-100 border-green-300 hover:bg-green-200';
      blockContent = (
        <>
          <div className="font-medium">{(block as ConstantBlock).value.toString()}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {(block as ConstantBlock).dataType}
          </div>
        </>
      );
      break;
    case 'group':
      blockColor = 'bg-gray-100 border-gray-300 hover:bg-gray-200';
      blockContent = (
        <>
          <div className="font-medium">{(block as GroupBlock).label}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Group of {(block as GroupBlock).blocks.length} blocks
          </div>
        </>
      );
      break;
  }

  const style = {
    transform: CSS.Translate.toString(transform),
    top: block.y,
    left: block.x,
    width: block.width,
    height: block.height,
    position: 'absolute' as 'absolute',
    zIndex: isDragging ? 100 : isSelected ? 50 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "p-3 rounded-md border cursor-grab active:cursor-grabbing transition-all",
        blockColor,
        isSelected && "ring-2 ring-primary",
        isDragging && "opacity-50"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {blockContent}
      {isSelected && (
        <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-0.5">
          <X className="h-3 w-3" />
        </div>
      )}
    </div>
  );
};

// Droppable area for the formula canvas
const DroppableCanvas = ({ children, onDrop }: { 
  children: React.ReactNode;
  onDrop: (id: string, x: number, y: number) => void 
}) => {
  const { setNodeRef } = useDroppable({
    id: 'canvas',
  });

  return (
    <div 
      ref={setNodeRef} 
      className="h-full w-full relative overflow-hidden bg-gray-50 rounded-md border"
      style={{ minHeight: '500px' }}
    >
      {children}
    </div>
  );
};

// Component to connect blocks visually (connection lines)
const BlockConnections = ({ blocks, selectedBlock }: { 
  blocks: FormulaBlock[];
  selectedBlock: FormulaBlock | null;
}) => {
  // This would render SVG lines between connected blocks
  // For simplicity, we're not implementing the full connection rendering logic
  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
      {/* Connection lines would go here */}
    </svg>
  );
};

// Formula result preview component
const FormulaPreview = ({ formula, sampleData }: { 
  formula: string;
  sampleData: any;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Simulate formula evaluation
  useEffect(() => {
    if (!formula) return;
    
    setIsLoading(true);
    
    // Simulate async evaluation
    const timer = setTimeout(() => {
      try {
        // This would be replaced with actual formula evaluation
        const randomResult = Math.round(Math.random() * 100);
        setResult(randomResult);
        setError(null);
      } catch (err) {
        setError("Error evaluating formula");
        setResult(null);
      } finally {
        setIsLoading(false);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [formula]);

  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle className="text-sm font-medium flex items-center">
          <Gauge className="h-4 w-4 mr-2" />
          Formula Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {isLoading ? (
          <div className="animate-pulse h-8 bg-muted rounded"></div>
        ) : error ? (
          <div className="text-sm text-destructive flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" /> {error}
          </div>
        ) : result !== null ? (
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{result}</div>
            <Badge variant="outline">Sample Result</Badge>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No preview available
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Field browser component for discoverable fields
const FieldBrowser = ({ fields, onFieldSelected }: {
  fields: any[];
  onFieldSelected: (field: any) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  const filteredFields = useMemo(() => {
    return fields.filter(field => {
      const matchesSearch = searchTerm === "" || 
        field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSource = !filterSource || field.source === filterSource;
      const matchesType = !filterType || field.fieldType === filterType;
      
      return matchesSearch && matchesSource && matchesType;
    });
  }, [fields, searchTerm, filterSource, filterType]);

  const sources = useMemo(() => {
    const sourceSet = new Set<string>();
    fields.forEach(field => sourceSet.add(field.source));
    return Array.from(sourceSet);
  }, [fields]);

  const types = useMemo(() => {
    const typeSet = new Set<string>();
    fields.forEach(field => typeSet.add(field.fieldType));
    return Array.from(typeSet);
  }, [fields]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search fields..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="flex gap-2">
        <Select value={filterSource || ""} onValueChange={(v) => setFilterSource(v || null)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All sources</SelectItem>
            {sources.map(source => (
              <SelectItem key={source} value={source}>
                {source.charAt(0).toUpperCase() + source.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={filterType || ""} onValueChange={(v) => setFilterType(v || null)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All types</SelectItem>
            {types.map(type => (
              <SelectItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <ScrollArea className="h-[300px]">
        <div className="grid grid-cols-1 gap-2 pr-4">
          {filteredFields.map(field => (
            <div
              key={field.id}
              className="p-2 border rounded-md hover:bg-blue-50 cursor-pointer transition-colors"
              onClick={() => onFieldSelected(field)}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{field.name}</div>
                <Badge variant="outline">{field.fieldType}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center">
                <Database className="h-3 w-3 mr-1" />
                {field.source}
                {field.usageCount && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                    Used {field.usageCount}x
                  </span>
                )}
              </div>
              {field.description && (
                <div className="text-xs mt-1 text-muted-foreground">
                  {field.description}
                </div>
              )}
            </div>
          ))}
          {filteredFields.length === 0 && (
            <div className="text-center p-4 text-muted-foreground">
              No fields match your criteria
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Function library component
const FunctionLibrary = ({ onFunctionSelected }: {
  onFunctionSelected: (func: any) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  
  const filteredFunctions = useMemo(() => {
    return functionLibrary.filter(func => {
      const matchesSearch = searchTerm === "" || 
        func.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        func.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !filterCategory || func.category === filterCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, filterCategory]);

  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    functionLibrary.forEach(func => categorySet.add(func.category));
    return Array.from(categorySet);
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search functions..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <Select value={filterCategory || ""} onValueChange={(v) => setFilterCategory(v || null)}>
        <SelectTrigger>
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
      
      <ScrollArea className="h-[300px]">
        <div className="grid grid-cols-1 gap-2 pr-4">
          {filteredFunctions.map(func => (
            <div
              key={func.name}
              className="p-2 border rounded-md hover:bg-purple-50 cursor-pointer transition-colors"
              onClick={() => onFunctionSelected(func)}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{func.name}()</div>
                <Badge variant="outline">{func.category}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {func.description}
              </div>
              {func.examples && func.examples.length > 0 && (
                <div className="text-xs mt-2 font-mono bg-gray-100 p-1 rounded">
                  {func.examples[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

// Operator library component
const OperatorLibrary = ({ onOperatorSelected }: {
  onOperatorSelected: (operator: any) => void;
}) => {
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  
  const filteredOperators = useMemo(() => {
    return operatorLibrary.filter(op => {
      return !filterCategory || op.category === filterCategory;
    });
  }, [filterCategory]);

  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    operatorLibrary.forEach(op => categorySet.add(op.category));
    return Array.from(categorySet);
  }, []);

  return (
    <div className="space-y-3">
      <Select value={filterCategory || ""} onValueChange={(v) => setFilterCategory(v || null)}>
        <SelectTrigger>
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
      
      <div className="grid grid-cols-3 gap-2">
        {filteredOperators.map(op => (
          <Button
            key={op.symbol}
            variant="outline"
            className="h-auto py-3 hover:bg-amber-50"
            onClick={() => onOperatorSelected(op)}
          >
            <div className="flex flex-col items-center">
              <div className="text-xl font-medium">{op.symbol}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {op.label}
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};

// Constant creator component
const ConstantCreator = ({ onConstantCreated }: {
  onConstantCreated: (constant: { value: any, type: 'string' | 'number' | 'boolean' }) => void;
}) => {
  const [type, setType] = useState<'string' | 'number' | 'boolean'>('number');
  const [stringValue, setStringValue] = useState("");
  const [numberValue, setNumberValue] = useState(0);
  const [booleanValue, setBooleanValue] = useState(false);

  const handleCreate = () => {
    let value;
    switch (type) {
      case 'string':
        value = stringValue;
        break;
      case 'number':
        value = numberValue;
        break;
      case 'boolean':
        value = booleanValue;
        break;
    }
    
    onConstantCreated({ value, type });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Constant Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="string">Text</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="boolean">True/False</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label>Value</Label>
        {type === 'string' && (
          <Input 
            value={stringValue} 
            onChange={(e) => setStringValue(e.target.value)} 
            placeholder="Enter text value"
          />
        )}
        {type === 'number' && (
          <Input 
            type="number" 
            value={numberValue} 
            onChange={(e) => setNumberValue(parseFloat(e.target.value))} 
          />
        )}
        {type === 'boolean' && (
          <div className="flex items-center space-x-2">
            <Switch 
              checked={booleanValue} 
              onCheckedChange={setBooleanValue} 
              id="boolean-value"
            />
            <Label htmlFor="boolean-value">
              {booleanValue ? "True" : "False"}
            </Label>
          </div>
        )}
      </div>
      
      <Button onClick={handleCreate} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Constant
      </Button>
    </div>
  );
};

// Formula history component
const FormulaHistory = ({ history, onHistoryItemSelected }: {
  history: { timestamp: Date; formula: string; }[];
  onHistoryItemSelected: (formula: string) => void;
}) => {
  if (history.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        No history available
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-2 pr-4">
        {history.map((item, index) => (
          <div
            key={index}
            className="p-2 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => onHistoryItemSelected(item.formula)}
          >
            <div className="text-xs text-muted-foreground">
              {item.timestamp.toLocaleString()}
            </div>
            <div className="font-mono text-sm mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
              {item.formula}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

// Template gallery component
const TemplateGallery = ({ templates, onTemplateSelected }: {
  templates: { 
    id: string; 
    name: string; 
    description: string; 
    formula: string;
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  }[];
  onTemplateSelected: (template: any) => void;
}) => {
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<string | null>(null);
  
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesCategory = !filterCategory || template.category === filterCategory;
      const matchesDifficulty = !filterDifficulty || template.difficulty === filterDifficulty;
      
      return matchesCategory && matchesDifficulty;
    });
  }, [templates, filterCategory, filterDifficulty]);

  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    templates.forEach(template => categorySet.add(template.category));
    return Array.from(categorySet);
  }, [templates]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select value={filterCategory || ""} onValueChange={(v) => setFilterCategory(v || null)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All categories" />
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
        
        <Select 
          value={filterDifficulty || ""} 
          onValueChange={(v) => setFilterDifficulty(v || null)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All difficulties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All difficulties</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <ScrollArea className="h-[400px]">
        <div className="grid grid-cols-2 gap-3 pr-4">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="p-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
                  {template.difficulty === 'beginner' && (
                    <Badge variant="outline" className="bg-green-100 text-green-800">Beginner</Badge>
                  )}
                  {template.difficulty === 'intermediate' && (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">Intermediate</Badge>
                  )}
                  {template.difficulty === 'advanced' && (
                    <Badge variant="outline" className="bg-purple-100 text-purple-800">Advanced</Badge>
                  )}
                </div>
                <CardDescription className="text-xs mt-1">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-xs font-mono bg-gray-100 p-1.5 rounded overflow-hidden text-ellipsis whitespace-nowrap">
                  {template.formula}
                </div>
              </CardContent>
              <CardFooter className="p-3 pt-0 flex justify-end">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onTemplateSelected(template)}
                >
                  Use Template
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </CardFooter>
            </Card>
          ))}
          {filteredTemplates.length === 0 && (
            <div className="col-span-2 text-center p-4 text-muted-foreground">
              No templates match your criteria
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Formula validation component
const FormulaValidator = ({ formula, onValidationResults }: {
  formula: string;
  onValidationResults: (results: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    performanceImpact: 'low' | 'medium' | 'high';
  }) => void;
}) => {
  const [isChecking, setIsChecking] = useState(false);
  
  const runValidation = useCallback(() => {
    if (!formula) return;
    
    setIsChecking(true);
    
    // Simulate async validation
    setTimeout(() => {
      // This would be replaced with actual validation logic
      const result = {
        isValid: Math.random() > 0.3, // 70% chance of valid
        errors: [] as string[],
        warnings: [] as string[],
        performanceImpact: 'low' as 'low' | 'medium' | 'high'
      };
      
      if (!result.isValid) {
        result.errors.push("Syntax error in formula expression");
      }
      
      // Add some random warnings
      if (Math.random() > 0.5) {
        result.warnings.push("Formula contains expensive operations");
        result.performanceImpact = 'medium';
      }
      
      onValidationResults(result);
      setIsChecking(false);
    }, 800);
  }, [formula, onValidationResults]);
  
  useEffect(() => {
    const timer = setTimeout(runValidation, 1000);
    return () => clearTimeout(timer);
  }, [formula, runValidation]);
  
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isChecking || !formula}
      onClick={runValidation}
    >
      {isChecking ? (
        <>Validating...</>
      ) : (
        <>
          <Check className="mr-1 h-4 w-4" />
          Validate Formula
        </>
      )}
    </Button>
  );
};

// AI formula generator component
const AIFormulaGenerator = ({ onFormulaGenerated }: {
  onFormulaGenerated: (formula: string) => void;
}) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const generateFormula = () => {
    if (!prompt) return;
    
    setIsGenerating(true);
    
    // Simulate AI generation
    setTimeout(() => {
      // This would be replaced with actual AI formula generation
      const generatedFormulas = [
        "count(meetings) / count(contacts) * 100",
        "sum(deals.value) / count(deals)",
        "average(meetings.duration) / 60"
      ];
      
      const randomFormula = generatedFormulas[Math.floor(Math.random() * generatedFormulas.length)];
      onFormulaGenerated(randomFormula);
      setIsGenerating(false);
      setPrompt("");
    }, 1500);
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center text-sm text-muted-foreground mb-2">
        <Sparkles className="h-4 w-4 mr-1 text-yellow-500" />
        Describe the KPI you want to create in plain language
      </div>
      
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g., Calculate the average deal value per sales rep"
        className="min-h-[100px] resize-none"
      />
      
      <Button
        onClick={generateFormula}
        disabled={!prompt || isGenerating}
        className="w-full"
      >
        {isGenerating ? (
          <>Generating Formula...</>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Generate Formula
          </>
        )}
      </Button>
      
      <div className="text-xs text-muted-foreground">
        Example prompts:
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Calculate conversion rate from meetings to deals</li>
          <li>Show the percentage of contacts that have scheduled a meeting</li>
          <li>Compute the average time between first contact and closing a deal</li>
        </ul>
      </div>
    </div>
  );
};

// Main KPI configurator component
const KpiConfigurator = () => {
  // State for the visual formula builder
  const [blocks, setBlocks] = useState<FormulaBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [connections, setConnections] = useState<{from: string, to: string, port: string}[]>([]);
  const [generatedFormula, setGeneratedFormula] = useState("");
  const [formulaName, setFormulaName] = useState("");
  const [formulaDescription, setFormulaDescription] = useState("");
  const [formulaCategory, setFormulaCategory] = useState("sales");
  const [isFormulaEnabled, setIsFormulaEnabled] = useState(true);
  const [validationResults, setValidationResults] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    performanceImpact: 'low' | 'medium' | 'high';
  } | null>(null);
  
  // State for canvas and panels
  const [activeTab, setActiveTab] = useState<string>("fields");
  const [showMinimap, setShowMinimap] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editorMode, setEditorMode] = useState<'visual' | 'text'>('visual');
  const [leftPanelSize, setLeftPanelSize] = useState({ width: 280 });
  const [rightPanelSize, setRightPanelSize] = useState({ width: 280 });
  
  // Sample data for demonstration
  const [formulaHistory] = useState([
    { timestamp: new Date(Date.now() - 3600000), formula: "count(meetings) / count(contacts) * 100" },
    { timestamp: new Date(Date.now() - 7200000), formula: "sum(deals.value) / count(deals)" },
    { timestamp: new Date(Date.now() - 10800000), formula: "average(meetings.duration) / 60" }
  ]);
  
  const [templateGallery] = useState([
    {
      id: "1",
      name: "Conversion Rate",
      description: "Calculate conversion rate from meetings to deals",
      formula: "count(deals) / count(meetings) * 100",
      category: "sales",
      difficulty: "beginner" as const
    },
    {
      id: "2",
      name: "Average Deal Value",
      description: "Calculate average deal value",
      formula: "sum(deals.value) / count(deals)",
      category: "sales",
      difficulty: "beginner" as const
    },
    {
      id: "3",
      name: "Meeting Efficiency",
      description: "Calculate average meeting duration in minutes",
      formula: "average(meetings.duration) / 60",
      category: "marketing",
      difficulty: "beginner" as const
    },
    {
      id: "4",
      name: "Activity Per Contact",
      description: "Calculate average number of activities per contact",
      formula: "count(activities) / count(contacts)",
      category: "sales",
      difficulty: "intermediate" as const
    },
    {
      id: "5",
      name: "Time to Close",
      description: "Calculate average days from first meeting to deal close",
      formula: "average(dateRange(deals.closed_date - contacts.first_meeting))",
      category: "sales",
      difficulty: "advanced" as const
    },
    {
      id: "6",
      name: "Marketing Attribution",
      description: "Calculate percentage of deals from marketing campaigns",
      formula: "count(filter(deals, 'source = marketing')) / count(deals) * 100",
      category: "marketing",
      difficulty: "intermediate" as const
    }
  ]);
  
  // Sample list of available fields
  const [availableFields] = useState([
    { id: "1", name: "meetings", fieldType: "number", source: "calendly", description: "Total number of meetings" },
    { id: "2", name: "contacts", fieldType: "number", source: "close", description: "Total number of contacts" },
    { id: "3", name: "deals", fieldType: "number", source: "close", description: "Total number of deals" },
    { id: "4", name: "activities", fieldType: "number", source: "close", description: "Total number of activities" },
    { id: "5", name: "meetings.duration", fieldType: "number", source: "calendly", description: "Meeting duration in seconds" },
    { id: "6", name: "deals.value", fieldType: "number", source: "close", description: "Deal monetary value" },
    { id: "7", name: "contacts.first_meeting", fieldType: "date", source: "calendly", description: "Date of first meeting" },
    { id: "8", name: "deals.closed_date", fieldType: "date", source: "close", description: "Date when deal was closed" }
  ]);
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // Handlers for block operations
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    if (over.id === 'canvas') {
      // Update the block position
      setBlocks(blocks.map(block => {
        if (block.id === active.id) {
          return {
            ...block,
            x: event.delta.x + block.x,
            y: event.delta.y + block.y
          };
        }
        return block;
      }));
    }
  };
  
  const handleFieldSelected = useCallback((field: any) => {
    const newBlock: FieldBlock = {
      id: `field-${Date.now()}`,
      type: 'field',
      fieldId: field.id,
      fieldName: field.name,
      fieldType: field.fieldType,
      fieldSource: field.source,
      x: 100,
      y: 100,
      width: 140,
      height: 80,
      connections: {
        inputs: [],
        outputs: []
      }
    };
    
    setBlocks(prev => [...prev, newBlock]);
  }, []);
  
  const handleFunctionSelected = useCallback((func: any) => {
    const newBlock: FunctionBlock = {
      id: `function-${Date.now()}`,
      type: 'function',
      functionName: func.name,
      description: func.description,
      paramCount: func.paramCount,
      x: 100,
      y: 100,
      width: 140,
      height: 80,
      connections: {
        inputs: [],
        outputs: []
      }
    };
    
    setBlocks(prev => [...prev, newBlock]);
  }, []);
  
  const handleOperatorSelected = useCallback((operator: any) => {
    const newBlock: OperatorBlock = {
      id: `operator-${Date.now()}`,
      type: 'operator',
      operator: operator.symbol as any,
      label: operator.label,
      x: 100,
      y: 100,
      width: 80,
      height: 80,
      connections: {
        inputs: [],
        outputs: []
      }
    };
    
    setBlocks(prev => [...prev, newBlock]);
  }, []);
  
  const handleConstantCreated = useCallback((constant: any) => {
    const newBlock: ConstantBlock = {
      id: `constant-${Date.now()}`,
      type: 'constant',
      value: constant.value,
      dataType: constant.type,
      x: 100,
      y: 100,
      width: 100,
      height: 80,
      connections: {
        inputs: [],
        outputs: []
      }
    };
    
    setBlocks(prev => [...prev, newBlock]);
  }, []);
  
  const handleHistoryItemSelected = useCallback((formula: string) => {
    setGeneratedFormula(formula);
    setEditorMode('text');
  }, []);
  
  const handleTemplateSelected = useCallback((template: any) => {
    setGeneratedFormula(template.formula);
    setFormulaName(template.name);
    setFormulaDescription(template.description);
    setFormulaCategory(template.category);
    setEditorMode('text');
  }, []);
  
  const handleAIFormulaGenerated = useCallback((formula: string) => {
    setGeneratedFormula(formula);
    setEditorMode('text');
  }, []);
  
  const handleBlockSelected = useCallback((blockId: string) => {
    setSelectedBlockId(blockId === selectedBlockId ? null : blockId);
  }, [selectedBlockId]);
  
  const handleDeleteSelectedBlock = useCallback(() => {
    if (!selectedBlockId) return;
    
    setBlocks(prev => prev.filter(block => block.id !== selectedBlockId));
    setSelectedBlockId(null);
    
    // Clean up any connections involving this block
    setConnections(prev => prev.filter(
      conn => conn.from !== selectedBlockId && conn.to !== selectedBlockId
    ));
  }, [selectedBlockId]);
  
  const selectedBlock = useMemo(() => {
    if (!selectedBlockId) return null;
    return blocks.find(block => block.id === selectedBlockId) || null;
  }, [blocks, selectedBlockId]);
  
  // Generate text formula from blocks (simplified implementation)
  useEffect(() => {
    // This would be replaced with actual formula generation logic
    if (blocks.length === 0) {
      setGeneratedFormula("");
      return;
    }
    
    // Generate a sample formula for demonstration
    const fieldBlocks = blocks.filter(b => b.type === 'field') as FieldBlock[];
    const operatorBlocks = blocks.filter(b => b.type === 'operator') as OperatorBlock[];
    const functionBlocks = blocks.filter(b => b.type === 'function') as FunctionBlock[];
    
    let formula = "";
    
    if (functionBlocks.length > 0) {
      const func = functionBlocks[0];
      if (fieldBlocks.length > 0) {
        formula = `${func.functionName}(${fieldBlocks.map(f => f.fieldName).join(', ')})`;
      } else {
        formula = `${func.functionName}()`;
      }
    } else if (fieldBlocks.length >= 2 && operatorBlocks.length > 0) {
      formula = `${fieldBlocks[0].fieldName} ${operatorBlocks[0].operator} ${fieldBlocks[1].fieldName}`;
      
      if (operatorBlocks.length > 1 && fieldBlocks.length > 2) {
        formula += ` ${operatorBlocks[1].operator} ${fieldBlocks[2].fieldName}`;
      }
    } else if (fieldBlocks.length > 0) {
      formula = fieldBlocks[0].fieldName;
    }
    
    setGeneratedFormula(formula);
  }, [blocks, connections]);
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">KPI Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your KPI formulas with the advanced visual editor
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <FormulaValidator 
            formula={generatedFormula} 
            onValidationResults={setValidationResults} 
          />
          
          <Button variant="outline" size="sm" onClick={() => setShowHistory(prev => !prev)}>
            <History className="mr-1 h-4 w-4" />
            History
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => setShowMinimap(prev => !prev)}>
            <LayoutGrid className="mr-1 h-4 w-4" />
            Minimap
          </Button>
          
          <div className="border-l h-6 mx-1" />
          
          <Button 
            variant={editorMode === 'visual' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setEditorMode('visual')}
          >
            <Layers className="mr-1 h-4 w-4" />
            Visual
          </Button>
          
          <Button 
            variant={editorMode === 'text' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setEditorMode('text')}
          >
            <Code className="mr-1 h-4 w-4" />
            Text
          </Button>
        </div>
      </div>
      
      <div className="flex space-x-4 mb-4">
        <div className="space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="formula-name">Formula Name</Label>
              <Input
                id="formula-name"
                value={formulaName}
                onChange={(e) => setFormulaName(e.target.value)}
                placeholder="e.g., Conversion Rate"
              />
            </div>
            
            <div>
              <Label htmlFor="formula-category">Category</Label>
              <Select value={formulaCategory} onValueChange={setFormulaCategory}>
                <SelectTrigger id="formula-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="setter">Setter</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="formula-description">Description</Label>
            <Textarea
              id="formula-description"
              value={formulaDescription}
              onChange={(e) => setFormulaDescription(e.target.value)}
              placeholder="Describe what this KPI measures and how it should be interpreted"
              className="resize-none"
            />
          </div>
        </div>
        
        <div className="w-[200px] flex flex-col justify-between">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Status</Label>
            <div className="flex items-center justify-between">
              <span className="text-sm">Enabled</span>
              <Switch
                checked={isFormulaEnabled}
                onCheckedChange={setIsFormulaEnabled}
              />
            </div>
          </div>
          
          {validationResults && (
            <Card>
              <CardContent className="p-3">
                {validationResults.isValid ? (
                  <div className="flex items-center text-sm text-green-600">
                    <Check className="h-4 w-4 mr-1" />
                    Formula is valid
                  </div>
                ) : (
                  <div>
                    {validationResults.errors.map((error, i) => (
                      <div key={i} className="flex items-center text-sm text-destructive mb-1">
                        <X className="h-4 w-4 mr-1 flex-shrink-0" />
                        {error}
                      </div>
                    ))}
                  </div>
                )}
                
                {validationResults.warnings.length > 0 && (
                  <div className="mt-2">
                    {validationResults.warnings.map((warning, i) => (
                      <div key={i} className="flex items-center text-sm text-amber-600 mb-1">
                        <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                        {warning}
                      </div>
                    ))}
                  </div>
                )}
                
                {validationResults.isValid && (
                  <div className="mt-2 flex items-center text-sm">
                    <span className="mr-2">Performance:</span>
                    {validationResults.performanceImpact === 'low' && (
                      <Badge variant="outline" className="bg-green-100 text-green-800">Low Impact</Badge>
                    )}
                    {validationResults.performanceImpact === 'medium' && (
                      <Badge variant="outline" className="bg-amber-100 text-amber-800">Medium Impact</Badge>
                    )}
                    {validationResults.performanceImpact === 'high' && (
                      <Badge variant="outline" className="bg-red-100 text-red-800">High Impact</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          <div className="mt-auto pt-4">
            <Button className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Save Formula
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex border rounded-md overflow-hidden h-[600px]">
        {/* Left Panel - Fields & Functions */}
        <Resizable
          size={leftPanelSize}
          onResizeStop={(e, direction, ref, d) => {
            setLeftPanelSize({
              width: leftPanelSize.width + d.width
            });
          }}
          enable={{ right: true }}
          minWidth={200}
          maxWidth={400}
        >
          <div className="h-full border-r">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="border-b px-3">
                <TabsList className="w-full">
                  <TabsTrigger value="fields" className="flex-1">
                    <Database className="h-4 w-4 mr-2" />
                    Fields
                  </TabsTrigger>
                  <TabsTrigger value="functions" className="flex-1">
                    <Calculator className="h-4 w-4 mr-2" />
                    Functions
                  </TabsTrigger>
                  <TabsTrigger value="operators" className="flex-1">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Operators
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="fields" className="flex-1 p-3 overflow-hidden">
                <FieldBrowser fields={availableFields} onFieldSelected={handleFieldSelected} />
              </TabsContent>
              
              <TabsContent value="functions" className="flex-1 p-3 overflow-hidden">
                <FunctionLibrary onFunctionSelected={handleFunctionSelected} />
              </TabsContent>
              
              <TabsContent value="operators" className="flex-1 p-3 overflow-hidden">
                <OperatorLibrary onOperatorSelected={handleOperatorSelected} />
              </TabsContent>
              
              <TabsContent value="constants" className="flex-1 p-3 overflow-hidden">
                <ConstantCreator onConstantCreated={handleConstantCreated} />
              </TabsContent>
              
              <TabsContent value="templates" className="flex-1 p-3 overflow-hidden">
                <TemplateGallery 
                  templates={templateGallery} 
                  onTemplateSelected={handleTemplateSelected}
                />
              </TabsContent>
              
              <TabsContent value="ai" className="flex-1 p-3 overflow-hidden">
                <AIFormulaGenerator onFormulaGenerated={handleAIFormulaGenerated} />
              </TabsContent>
            </Tabs>
          </div>
        </Resizable>
        
        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          {editorMode === 'visual' ? (
            <DndContext 
              sensors={sensors}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToWindowEdges]}
            >
              <div className="flex-1 relative overflow-hidden">
                <DroppableCanvas onDrop={() => {}}>
                  {blocks.map(block => (
                    <DraggableBlock
                      key={block.id}
                      block={block}
                      onClick={() => handleBlockSelected(block.id)}
                      isSelected={selectedBlockId === block.id}
                    />
                  ))}
                  <BlockConnections blocks={blocks} selectedBlock={selectedBlock} />
                </DroppableCanvas>
                
                <div className="absolute bottom-3 right-3 z-10 space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBlocks([])}
                    disabled={blocks.length === 0}
                  >
                    <Trash className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteSelectedBlock}
                    disabled={!selectedBlockId}
                  >
                    <Trash className="h-4 w-4 mr-1" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            </DndContext>
          ) : (
            <div className="flex-1 p-3">
              <Label htmlFor="formula-text">Formula Text</Label>
              <Textarea
                id="formula-text"
                value={generatedFormula}
                onChange={(e) => setGeneratedFormula(e.target.value)}
                className="font-mono h-[calc(100%-2rem)] resize-none"
                placeholder="Enter your formula here..."
              />
            </div>
          )}
          
          <div className="border-t p-3 flex justify-between items-center bg-muted/30">
            <div className="flex items-center">
              <Button variant="outline" size="sm" asChild>
                <label>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={editorMode === 'text'}
                    onChange={() => setEditorMode(editorMode === 'visual' ? 'text' : 'visual')}
                  />
                  {editorMode === 'visual' ? (
                    <>
                      <Code className="h-4 w-4 mr-1" />
                      Show Formula Text
                    </>
                  ) : (
                    <>
                      <Layers className="h-4 w-4 mr-1" />
                      Edit Visually
                    </>
                  )}
                </label>
              </Button>
              
              <div className="ml-2 border-l pl-2 font-mono text-sm text-muted-foreground">
                {generatedFormula || "No formula created yet"}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("constants")}>
                <Plus className="h-4 w-4 mr-1" />
                Constant
              </Button>
              
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("templates")}>
                <Star className="h-4 w-4 mr-1" />
                Templates
              </Button>
              
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("ai")}>
                <Sparkles className="h-4 w-4 mr-1" />
                AI Generate
              </Button>
            </div>
          </div>
        </div>
        
        {/* Right Panel - Preview & Properties */}
        <Resizable
          size={rightPanelSize}
          onResizeStop={(e, direction, ref, d) => {
            setRightPanelSize({
              width: rightPanelSize.width + d.width
            });
          }}
          enable={{ left: true }}
          minWidth={200}
          maxWidth={400}
        >
          <div className="h-full border-l">
            <Tabs defaultValue="preview" className="h-full flex flex-col">
              <div className="border-b px-3">
                <TabsList className="w-full">
                  <TabsTrigger value="preview" className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="properties" className="flex-1">
                    <Settings className="h-4 w-4 mr-2" />
                    Properties
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="preview" className="flex-1 p-3 overflow-auto">
                <FormulaPreview formula={generatedFormula} sampleData={{}} />
                
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Sample Data</h3>
                  <div className="space-y-2">
                    <div className="bg-muted p-2 rounded-md text-xs">
                      <div className="flex justify-between">
                        <span>meetings:</span>
                        <span className="font-medium">156</span>
                      </div>
                    </div>
                    <div className="bg-muted p-2 rounded-md text-xs">
                      <div className="flex justify-between">
                        <span>contacts:</span>
                        <span className="font-medium">423</span>
                      </div>
                    </div>
                    <div className="bg-muted p-2 rounded-md text-xs">
                      <div className="flex justify-between">
                        <span>deals:</span>
                        <span className="font-medium">37</span>
                      </div>
                    </div>
                    <div className="bg-muted p-2 rounded-md text-xs">
                      <div className="flex justify-between">
                        <span>deals.value (sum):</span>
                        <span className="font-medium">$128,500</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Formula Breakdown</h3>
                  <div className="space-y-2">
                    {generatedFormula ? (
                      <div className="border rounded-md overflow-hidden">
                        <div className="bg-muted p-2 text-xs font-medium">
                          Execution Steps
                        </div>
                        <div className="p-2 text-xs">
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Get count of meetings: 156</li>
                            <li>Get count of contacts: 423</li>
                            <li>Divide: 156 / 423 = 0.368</li>
                            <li>Multiply by 100: 0.368 * 100 = 36.8</li>
                            <li>Final result: 36.8%</li>
                          </ol>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Create a formula to see execution steps
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="properties" className="flex-1 p-3 overflow-auto">
                {selectedBlock ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Block Properties</h3>
                    
                    <div>
                      <Label>Block Type</Label>
                      <div className="text-sm mt-1">{selectedBlock.type.charAt(0).toUpperCase() + selectedBlock.type.slice(1)}</div>
                    </div>
                    
                    {selectedBlock.type === 'field' && (
                      <>
                        <div>
                          <Label>Field Name</Label>
                          <Input 
                            value={(selectedBlock as FieldBlock).fieldName} 
                            readOnly 
                          />
                        </div>
                        <div>
                          <Label>Field Source</Label>
                          <Input 
                            value={(selectedBlock as FieldBlock).fieldSource} 
                            readOnly 
                          />
                        </div>
                      </>
                    )}
                    
                    {selectedBlock.type === 'operator' && (
                      <>
                        <div>
                          <Label>Operator</Label>
                          <Input 
                            value={(selectedBlock as OperatorBlock).operator} 
                            readOnly 
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Input 
                            value={(selectedBlock as OperatorBlock).label} 
                            readOnly 
                          />
                        </div>
                      </>
                    )}
                    
                    {selectedBlock.type === 'function' && (
                      <>
                        <div>
                          <Label>Function Name</Label>
                          <Input 
                            value={(selectedBlock as FunctionBlock).functionName} 
                            readOnly 
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Input 
                            value={(selectedBlock as FunctionBlock).description} 
                            readOnly 
                          />
                        </div>
                        <div>
                          <Label>Parameter Count</Label>
                          <Input 
                            value={(selectedBlock as FunctionBlock).paramCount.toString()} 
                            readOnly 
                          />
                        </div>
                      </>
                    )}
                    
                    {selectedBlock.type === 'constant' && (
                      <>
                        <div>
                          <Label>Value</Label>
                          <Input 
                            value={(selectedBlock as ConstantBlock).value.toString()} 
                            onChange={(e) => {
                              // Update constant value
                              setBlocks(blocks.map(block => {
                                if (block.id === selectedBlock.id) {
                                  return {
                                    ...block,
                                    value: e.target.value
                                  } as ConstantBlock;
                                }
                                return block;
                              }));
                            }}
                          />
                        </div>
                        <div>
                          <Label>Data Type</Label>
                          <Input 
                            value={(selectedBlock as ConstantBlock).dataType} 
                            readOnly 
                          />
                        </div>
                      </>
                    )}
                    
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-medium mb-2">Block Position</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>X Position</Label>
                          <Input 
                            type="number"
                            value={selectedBlock.x}
                            onChange={(e) => {
                              // Update block position
                              setBlocks(blocks.map(block => {
                                if (block.id === selectedBlock.id) {
                                  return {
                                    ...block,
                                    x: parseInt(e.target.value) || 0
                                  };
                                }
                                return block;
                              }));
                            }}
                          />
                        </div>
                        <div>
                          <Label>Y Position</Label>
                          <Input 
                            type="number"
                            value={selectedBlock.y}
                            onChange={(e) => {
                              // Update block position
                              setBlocks(blocks.map(block => {
                                if (block.id === selectedBlock.id) {
                                  return {
                                    ...block,
                                    y: parseInt(e.target.value) || 0
                                  };
                                }
                                return block;
                              }));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      variant="destructive"
                      onClick={handleDeleteSelectedBlock}
                      className="w-full"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete Block
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <MousePointerClick className="h-12 w-12 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium">No Block Selected</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select a block in the canvas to view and edit its properties
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </Resizable>
      </div>
    </div>
  );
};

export default KpiConfigurator;