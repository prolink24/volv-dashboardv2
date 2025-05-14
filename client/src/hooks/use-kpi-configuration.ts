import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { KpiCategory, KpiFormula, CustomField } from "@shared/schema/kpi-configuration";

export function useKpiConfiguration() {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Fetch KPI configuration
  const {
    data: kpiCategories = [],
    isLoading: isLoadingKpis,
    error: kpisError,
  } = useQuery<KpiCategory[]>({
    queryKey: ["/api/settings/kpi-configuration"],
    select: (data) => {
      // Sort categories and formulas for consistent display
      return data.sort((a, b) => a.name.localeCompare(b.name)).map(category => ({
        ...category,
        kpis: category.kpis.sort((a, b) => a.name.localeCompare(b.name))
      }));
    }
  });

  // Fetch available fields for KPI formulas
  const {
    data: availableFieldsData = { fields: [], customFields: [] },
    isLoading: isLoadingFields,
    error: fieldsError,
  } = useQuery<{ fields: any[], customFields: CustomField[] }>({
    queryKey: ["/api/settings/available-fields"],
  });

  // Update KPI formula mutation
  const updateKpiFormulaMutation = useMutation({
    mutationFn: async (data: KpiFormula) => {
      return apiRequest("/api/settings/kpi-formula", {
        method: "PUT",
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "KPI Formula Updated",
        description: "The formula has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/kpi-configuration"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update the KPI formula.",
        variant: "destructive",
      });
    },
  });

  // Create or update custom field mutation
  const updateCustomFieldMutation = useMutation({
    mutationFn: async (data: CustomField) => {
      return apiRequest("/api/settings/custom-field", {
        method: "PUT",
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Custom Field Saved",
        description: "The custom field has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/available-fields"] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save the custom field.",
        variant: "destructive",
      });
    },
  });

  // Export configuration
  const exportConfigMutation = useMutation({
    mutationFn: async (options: { includeFormulas: boolean; includeFields: boolean; includeMappings: boolean }) => {
      return apiRequest("/api/settings/export", {
        method: "POST",
        data: options,
      });
    },
    onSuccess: (data) => {
      // Create a JSON file and trigger download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kpi-config-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "Configuration has been exported successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export configuration.",
        variant: "destructive",
      });
    },
  });

  // Import configuration
  const importConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/settings/import", {
        method: "POST",
        data,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Import Successful",
        description: `Imported ${data.imported.categories} categories, ${data.imported.formulas} formulas, ${data.imported.fields} fields, and ${data.imported.mappings} mappings.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/kpi-configuration"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/available-fields"] });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import configuration.",
        variant: "destructive",
      });
    },
  });

  // Helper function to update a KPI formula
  const updateKpiFormula = (formula: KpiFormula) => {
    updateKpiFormulaMutation.mutate(formula);
  };

  // Helper function to toggle KPI enabled status
  const toggleKpiEnabled = (kpi: KpiFormula) => {
    updateKpiFormulaMutation.mutate({
      ...kpi,
      enabled: !kpi.enabled
    });
  };

  // Helper function to save a custom field
  const saveCustomField = (field: CustomField) => {
    updateCustomFieldMutation.mutate(field);
  };

  // Helper function to export configuration
  const exportConfiguration = (options: { includeFormulas: boolean; includeFields: boolean; includeMappings: boolean }) => {
    exportConfigMutation.mutate(options);
  };

  // Helper function to import configuration
  const importConfiguration = (data: any) => {
    importConfigMutation.mutate(data);
  };

  // Helper function to find a KPI formula by ID
  const findKpiFormula = (id: string): KpiFormula | undefined => {
    for (const category of kpiCategories) {
      const formula = category.kpis.find(kpi => kpi.id === id);
      if (formula) return formula;
    }
    return undefined;
  };

  return {
    kpiCategories,
    isLoadingKpis,
    kpisError,
    availableFields: availableFieldsData.fields,
    customFields: availableFieldsData.customFields,
    isLoadingFields,
    fieldsError,
    activeCategory,
    setActiveCategory,
    updateKpiFormula,
    toggleKpiEnabled,
    saveCustomField,
    exportConfiguration,
    importConfiguration,
    findKpiFormula,
    isUpdatingFormula: updateKpiFormulaMutation.isPending,
    isSavingField: updateCustomFieldMutation.isPending,
    isExporting: exportConfigMutation.isPending,
    isImporting: importConfigMutation.isPending,
  };
}