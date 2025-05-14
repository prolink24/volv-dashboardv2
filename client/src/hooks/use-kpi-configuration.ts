import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

// Legacy hook for backward compatibility with KpiConfigurator component
export function useKpiConfiguration() {
  const { data: formulas = [], isLoading, error } = useKpiFormulas();
  
  return {
    formulas,
    isLoading,
    error,
    addFormula: useCreateKpiFormula().mutateAsync,
    updateFormula: useUpdateKpiFormula().mutateAsync,
    deleteFormula: useDeleteKpiFormula().mutateAsync,
    getFields: getAvailableFields,
    getFunctions: getAvailableFunctions,
    getCategories: getFormulaCategories,
    getDashboardTypes: getDashboardTypes
  };
}

// KPI types
export interface KpiFormula {
  id: string;
  name: string;
  description?: string;
  formula: string;
  visualBlocks?: any; // Can be structured according to your block system
  category: string;
  dashboardTypes: string[]; // sales, marketing, setter, etc.
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface KpiFormulaInput {
  name: string;
  description?: string;
  formula: string; 
  visualBlocks?: any;
  category: string;
  dashboardTypes: string[];
}

// Fetch all KPI formulas
export function useKpiFormulas() {
  return useQuery({
    queryKey: ['/api/kpi/formulas'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/kpi/formulas');
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch KPI formulas');
        }
        return data.formulas as KpiFormula[];
      } catch (error) {
        console.error('Error fetching KPI formulas:', error);
        // If API fails, return example data
        return getDashboardKpis();
      }
    }
  });
}

// Fetch KPI formulas for a specific dashboard type
export function useKpiFormulasByDashboard(dashboardType: string) {
  const { data: allFormulas, isLoading, error } = useKpiFormulas();
  
  const dashboardFormulas = allFormulas?.filter(formula => 
    formula.dashboardTypes.includes(dashboardType)
  ) || [];
  
  return { 
    data: dashboardFormulas,
    isLoading,
    error
  };
}

// Create a new KPI formula
export function useCreateKpiFormula() {
  return useMutation({
    mutationFn: async (formulaData: KpiFormulaInput) => {
      const response = await fetch('/api/kpi/formulas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formulaData)
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to create KPI formula');
      }
      
      return data.formula as KpiFormula;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kpi/formulas'] });
      toast({
        title: 'KPI Formula Created',
        description: 'Your formula has been successfully created.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Creating Formula',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Update an existing KPI formula
export function useUpdateKpiFormula() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<KpiFormulaInput> }) => {
      const response = await fetch(`/api/kpi/formulas/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const responseData = await response.json();
      if (!responseData.success) {
        throw new Error(responseData.message || 'Failed to update KPI formula');
      }
      
      return responseData.formula as KpiFormula;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kpi/formulas'] });
      toast({
        title: 'KPI Formula Updated',
        description: 'Your formula has been successfully updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Updating Formula',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Delete a KPI formula
export function useDeleteKpiFormula() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/kpi/formulas/${id}`, {
        method: 'DELETE'
      });
      
      const responseData = await response.json();
      if (!responseData.success) {
        throw new Error(responseData.message || 'Failed to delete KPI formula');
      }
      
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kpi/formulas'] });
      toast({
        title: 'KPI Formula Deleted',
        description: 'Your formula has been successfully deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Deleting Formula',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Gets all available KPI formulas from all dashboards
// This is a fallback until the API is fully implemented
function getDashboardKpis(): KpiFormula[] {
  return [
    // Sales Dashboard KPIs
    {
      id: "sales-conversion-rate",
      name: "Conversion Rate",
      description: "Percentage of meetings that convert to deals",
      formula: "(deals_won / meetings_completed) * 100",
      category: "sales",
      dashboardTypes: ["sales", "admin"],
      createdAt: new Date("2025-03-01"),
      updatedAt: new Date("2025-03-01")
    },
    {
      id: "sales-avg-deal-value",
      name: "Average Deal Value",
      description: "Average value of closed deals",
      formula: "sum(deal_values) / count(deals_won)",
      category: "sales",
      dashboardTypes: ["sales", "admin"],
      createdAt: new Date("2025-03-01"),
      updatedAt: new Date("2025-03-01")
    },
    {
      id: "sales-deal-velocity",
      name: "Deal Velocity",
      description: "Average days from first contact to closed deal",
      formula: "avg(deal_close_date - first_contact_date)",
      category: "sales",
      dashboardTypes: ["sales", "admin", "compliance"],
      createdAt: new Date("2025-03-01"),
      updatedAt: new Date("2025-03-01")
    },
    {
      id: "sales-win-rate",
      name: "Win Rate",
      description: "Percentage of deals won vs total deals",
      formula: "(deals_won / (deals_won + deals_lost)) * 100",
      category: "sales",
      dashboardTypes: ["sales", "admin"],
      createdAt: new Date("2025-03-01"),
      updatedAt: new Date("2025-03-01")
    },
    
    // Marketing Dashboard KPIs
    {
      id: "marketing-lead-conversion",
      name: "Lead Conversion Rate",
      description: "Percentage of leads that convert to opportunities",
      formula: "(opportunities_created / leads_generated) * 100",
      category: "marketing",
      dashboardTypes: ["marketing", "admin"],
      createdAt: new Date("2025-03-01"),
      updatedAt: new Date("2025-03-01")
    },
    {
      id: "marketing-cost-per-lead",
      name: "Cost Per Lead",
      description: "Marketing spend divided by number of leads generated",
      formula: "marketing_spend / leads_generated",
      category: "marketing",
      dashboardTypes: ["marketing", "admin"],
      createdAt: new Date("2025-03-01"),
      updatedAt: new Date("2025-03-01")
    },
    {
      id: "marketing-channel-performance",
      name: "Channel Performance",
      description: "Conversion rate by marketing channel",
      formula: "sum((channel_leads_converted / channel_leads_total) * 100) / count(channels)",
      category: "marketing",
      dashboardTypes: ["marketing", "admin"],
      createdAt: new Date("2025-03-01"),
      updatedAt: new Date("2025-03-01")
    },
    
    // Setter Dashboard KPIs
    {
      id: "setter-meeting-set-rate",
      name: "Meeting Set Rate",
      description: "Percentage of contacts that result in meetings set",
      formula: "(meetings_set / contacts_reached) * 100",
      category: "setter",
      dashboardTypes: ["setter", "admin"],
      createdAt: new Date("2025-03-01"),
      updatedAt: new Date("2025-03-01")
    },
    {
      id: "setter-meeting-show-rate",
      name: "Meeting Show Rate",
      description: "Percentage of scheduled meetings that actually occur",
      formula: "(meetings_occurred / meetings_scheduled) * 100",
      category: "setter",
      dashboardTypes: ["setter", "admin"],
      createdAt: new Date("2025-03-01"),
      updatedAt: new Date("2025-03-01")
    },
    {
      id: "setter-contact-to-meeting",
      name: "Contact to Meeting Ratio",
      description: "Number of contacts needed to set one meeting",
      formula: "contacts_reached / meetings_set",
      category: "setter",
      dashboardTypes: ["setter", "admin"],
      createdAt: new Date("2025-03-01"),
      updatedAt: new Date("2025-03-01")
    },
    
    // Compliance Dashboard KPIs
    {
      id: "compliance-data-completeness",
      name: "Data Completeness",
      description: "Percentage of required fields completed across contacts",
      formula: "(completed_fields / total_required_fields) * 100",
      category: "compliance",
      dashboardTypes: ["compliance", "admin"],
      createdAt: new Date("2025-03-01"),
      updatedAt: new Date("2025-03-01")
    },
    {
      id: "compliance-field-coverage",
      name: "Field Coverage",
      description: "Field mapping success percentage across contacts",
      formula: "field_coverage",
      category: "compliance",
      dashboardTypes: ["compliance", "admin"],
      createdAt: new Date("2025-03-01"),
      updatedAt: new Date("2025-03-01")
    },
    {
      id: "compliance-attribution-accuracy",
      name: "Attribution Accuracy",
      description: "Percentage of contacts with high certainty matching",
      formula: "attribution_accuracy",
      category: "compliance",
      dashboardTypes: ["compliance", "admin"],
      createdAt: new Date("2025-03-01"),
      updatedAt: new Date("2025-03-01")
    },
    
    // Admin Dashboard KPIs (cross-functional)
    {
      id: "admin-multi-source-rate",
      name: "Multi-Source Rate",
      description: "Percentage of contacts with multiple data sources",
      formula: "multi_source_rate",
      category: "admin",
      dashboardTypes: ["admin", "compliance"],
      createdAt: new Date("2025-03-01"),
      updatedAt: new Date("2025-03-01")
    },
    {
      id: "admin-deal-attribution-rate",
      name: "Deal Attribution Rate",
      description: "Percentage of deals with proper attribution",
      formula: "deal_attribution_rate",
      category: "admin",
      dashboardTypes: ["admin", "sales", "compliance"],
      createdAt: new Date("2025-03-01"),
      updatedAt: new Date("2025-03-01")
    }
  ];
}

// Field availability for KPI formulas
export function getAvailableFields() {
  return [
    // Contact-level fields
    { id: "contacts_total", name: "Total Contacts", fieldType: "number", source: "crm" },
    { id: "first_contact_date", name: "First Contact Date", fieldType: "date", source: "crm" },
    { id: "last_contact_date", name: "Last Contact Date", fieldType: "date", source: "crm" },
    { id: "contacts_reached", name: "Contacts Reached", fieldType: "number", source: "crm" },
    { id: "completed_fields", name: "Completed Fields", fieldType: "number", source: "system" },
    { id: "total_required_fields", name: "Total Required Fields", fieldType: "number", source: "system" },
    
    // Meeting-related fields
    { id: "meetings_scheduled", name: "Meetings Scheduled", fieldType: "number", source: "calendly" },
    { id: "meetings_occurred", name: "Meetings Occurred", fieldType: "number", source: "calendly" },
    { id: "meetings_set", name: "Meetings Set", fieldType: "number", source: "calendly" },
    { id: "meetings_completed", name: "Meetings Completed", fieldType: "number", source: "calendly" },
    
    // Deal-related fields
    { id: "deals_total", name: "Total Deals", fieldType: "number", source: "crm" },
    { id: "deals_won", name: "Deals Won", fieldType: "number", source: "crm" },
    { id: "deals_lost", name: "Deals Lost", fieldType: "number", source: "crm" },
    { id: "deal_values", name: "Deal Values", fieldType: "number_array", source: "crm" },
    { id: "deal_close_date", name: "Deal Close Date", fieldType: "date", source: "crm" },
    
    // Marketing-related fields
    { id: "leads_generated", name: "Leads Generated", fieldType: "number", source: "crm" },
    { id: "opportunities_created", name: "Opportunities Created", fieldType: "number", source: "crm" },
    { id: "marketing_spend", name: "Marketing Spend", fieldType: "number", source: "crm" },
    { id: "channel_leads_total", name: "Channel Leads Total", fieldType: "number", source: "crm" },
    { id: "channel_leads_converted", name: "Channel Leads Converted", fieldType: "number", source: "crm" },
    { id: "channels", name: "Marketing Channels", fieldType: "string_array", source: "crm" },
    
    // Attribution metrics
    { id: "field_coverage", name: "Field Coverage", fieldType: "number", source: "attribution" },
    { id: "attribution_accuracy", name: "Attribution Accuracy", fieldType: "number", source: "attribution" },
    { id: "multi_source_rate", name: "Multi-Source Rate", fieldType: "number", source: "attribution" },
    { id: "deal_attribution_rate", name: "Deal Attribution Rate", fieldType: "number", source: "attribution" }
  ];
}

// Available functions for KPI formulas
export function getAvailableFunctions() {
  return [
    { 
      id: "sum", 
      name: "Sum", 
      description: "Calculate sum of values",
      paramCount: 1,
      category: "math"
    },
    { 
      id: "avg", 
      name: "Average", 
      description: "Calculate average of values",
      paramCount: 1,
      category: "math"
    },
    { 
      id: "count", 
      name: "Count", 
      description: "Count number of items",
      paramCount: 1,
      category: "math"
    },
    { 
      id: "max", 
      name: "Maximum", 
      description: "Find maximum value",
      paramCount: 1,
      category: "math"
    },
    { 
      id: "min", 
      name: "Minimum", 
      description: "Find minimum value",
      paramCount: 1,
      category: "math"
    },
    { 
      id: "if", 
      name: "If-Then-Else", 
      description: "Conditional logic",
      paramCount: 3,
      category: "logic"
    },
    { 
      id: "filter", 
      name: "Filter", 
      description: "Filter values based on condition",
      paramCount: 2,
      category: "data"
    },
    { 
      id: "date_diff", 
      name: "Date Difference", 
      description: "Calculate difference between dates in days",
      paramCount: 2,
      category: "date"
    }
  ];
}

// Get categories for formulas
export function getFormulaCategories() {
  return [
    "sales",
    "marketing",
    "setter",
    "compliance",
    "admin",
    "custom"
  ];
}

// Get dashboard types
export function getDashboardTypes() {
  return [
    { id: "sales", name: "Sales Dashboard" },
    { id: "marketing", name: "Marketing Dashboard" },
    { id: "setter", name: "Setter Dashboard" },
    { id: "compliance", name: "Compliance Dashboard" },
    { id: "admin", name: "Admin Dashboard" }
  ];
}