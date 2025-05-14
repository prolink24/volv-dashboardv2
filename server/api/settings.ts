import { Router } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { 
  kpiFormulas, 
  kpiCategories, 
  customFields, 
  customFieldMappings 
} from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/settings/kpi-configuration - Get all KPI formulas organized by category
router.get("/kpi-configuration", async (req, res) => {
  try {
    // Fetch all KPI categories with their formulas
    const result = await db.query.kpiCategories.findMany({
      with: {
        kpis: true,
      },
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching KPI configuration:", error);
    res.status(500).json({ error: "Failed to fetch KPI configuration" });
  }
});

// PUT /api/settings/kpi-formula - Update a KPI formula
router.put("/kpi-formula", async (req, res) => {
  try {
    const formula = req.body;
    
    if (!formula || !formula.id) {
      return res.status(400).json({ error: "Invalid formula data" });
    }
    
    // Check if the formula is customizable
    const existingFormula = await db.query.kpiFormulas.findFirst({
      where: eq(kpiFormulas.id, formula.id),
    });
    
    if (!existingFormula) {
      return res.status(404).json({ error: "Formula not found" });
    }
    
    if (!existingFormula.customizable) {
      return res.status(403).json({ error: "This formula cannot be modified" });
    }
    
    // Update the formula
    const [updatedFormula] = await db
      .update(kpiFormulas)
      .set({
        name: formula.name,
        description: formula.description,
        formula: formula.formula,
        enabled: formula.enabled,
        category: formula.category,
        requiredFields: formula.requiredFields,
        inputFields: formula.inputFields,
      })
      .where(eq(kpiFormulas.id, formula.id))
      .returning();
      
    // Clear the KPI calculation cache
    // TODO: Implement cache clearing for KPI calculations
    
    res.json(updatedFormula);
  } catch (error) {
    console.error("Error updating KPI formula:", error);
    res.status(500).json({ error: "Failed to update KPI formula" });
  }
});

// GET /api/settings/available-fields - Get all available fields for KPI formulas
router.get("/available-fields", async (req, res) => {
  try {
    // Get all standard fields
    const fields = [
      // Close CRM standard fields
      {
        id: "close_lead_name",
        name: "Contact Name",
        fieldType: "text",
        source: "close",
        path: "display_name",
        description: "The contact's name in Close CRM"
      },
      {
        id: "close_lead_email",
        name: "Contact Email",
        fieldType: "text",
        source: "close",
        path: "contacts[0].email",
        description: "The contact's primary email address"
      },
      {
        id: "close_lead_phone",
        name: "Contact Phone",
        fieldType: "text",
        source: "close",
        path: "contacts[0].phone",
        description: "The contact's primary phone number"
      },
      {
        id: "close_lead_status",
        name: "Contact Status",
        fieldType: "select",
        source: "close",
        path: "status_label",
        description: "The contact's status in Close CRM"
      },
      {
        id: "close_lead_created_at",
        name: "Contact Created Date",
        fieldType: "date",
        source: "close",
        path: "date_created",
        description: "When the contact was created in Close CRM"
      },
      // Calendly standard fields
      {
        id: "calendly_invitee_name",
        name: "Calendly Name",
        fieldType: "text",
        source: "calendly",
        path: "name",
        description: "The invitee's name from Calendly"
      },
      {
        id: "calendly_invitee_email",
        name: "Calendly Email",
        fieldType: "text",
        source: "calendly",
        path: "email",
        description: "The invitee's email from Calendly"
      },
      {
        id: "calendly_event_type",
        name: "Meeting Type",
        fieldType: "text",
        source: "calendly",
        path: "event_type.name",
        description: "The type of meeting scheduled"
      },
      {
        id: "calendly_event_date",
        name: "Meeting Date",
        fieldType: "date",
        source: "calendly",
        path: "start_time",
        description: "When the meeting was scheduled"
      },
      // Calculated fields
      {
        id: "calc_meeting_count",
        name: "Meeting Count",
        fieldType: "number",
        source: "calculated",
        description: "Total number of meetings for this contact"
      },
      {
        id: "calc_activity_count",
        name: "Activity Count",
        fieldType: "number",
        source: "calculated",
        description: "Total number of activities for this contact"
      },
      {
        id: "calc_deal_count",
        name: "Deal Count",
        fieldType: "number",
        source: "calculated",
        description: "Total number of deals associated with this contact"
      },
      {
        id: "calc_deal_value",
        name: "Total Deal Value",
        fieldType: "number",
        source: "calculated",
        description: "Sum of all deal values for this contact"
      },
      {
        id: "calc_days_to_conversion",
        name: "Days to Conversion",
        fieldType: "number",
        source: "calculated",
        description: "Days from first touch to closed deal"
      },
      {
        id: "calc_first_touch_source",
        name: "First Touch Source",
        fieldType: "text",
        source: "calculated",
        description: "Source of the first interaction with this contact"
      },
      {
        id: "calc_last_touch_source",
        name: "Last Touch Source",
        fieldType: "text",
        source: "calculated",
        description: "Source of the most recent interaction with this contact"
      },
    ];
    
    // Get custom fields from the database
    const dbCustomFields = await db.select().from(customFields);
    
    res.json({
      fields,
      customFields: dbCustomFields,
    });
  } catch (error) {
    console.error("Error fetching available fields:", error);
    res.status(500).json({ error: "Failed to fetch available fields" });
  }
});

// PUT /api/settings/custom-field - Create or update a custom field
router.put("/custom-field", async (req, res) => {
  try {
    const field = req.body;
    
    if (!field || !field.name || !field.fieldType) {
      return res.status(400).json({ error: "Invalid field data" });
    }
    
    // Check if the field already exists
    let existingField = null;
    if (field.id) {
      existingField = await db.query.customFields.findFirst({
        where: eq(customFields.id, field.id),
      });
    }
    
    let result;
    if (existingField) {
      // Update existing field
      [result] = await db
        .update(customFields)
        .set({
          name: field.name,
          fieldType: field.fieldType,
          source: field.source,
          path: field.path,
          description: field.description,
          options: field.options,
        })
        .where(eq(customFields.id, field.id))
        .returning();
    } else {
      // Create new field
      [result] = await db
        .insert(customFields)
        .values({
          name: field.name,
          fieldType: field.fieldType,
          source: field.source,
          path: field.path,
          description: field.description,
          options: field.options,
        })
        .returning();
    }
    
    res.json(result);
  } catch (error) {
    console.error("Error saving custom field:", error);
    res.status(500).json({ error: "Failed to save custom field" });
  }
});

// POST /api/settings/export - Export KPI configuration
router.post("/export", async (req, res) => {
  try {
    const { includeFormulas, includeFields, includeMappings } = req.body;
    
    const exportData: any = {};
    
    if (includeFormulas) {
      exportData.categories = await db.query.kpiCategories.findMany({
        with: {
          kpis: true,
        },
      });
    }
    
    if (includeFields) {
      exportData.customFields = await db.select().from(customFields);
    }
    
    if (includeMappings) {
      exportData.fieldMappings = await db.select().from(customFieldMappings);
    }
    
    res.json(exportData);
  } catch (error) {
    console.error("Error exporting configuration:", error);
    res.status(500).json({ error: "Failed to export configuration" });
  }
});

// POST /api/settings/import - Import KPI configuration
router.post("/import", async (req, res) => {
  try {
    const importData = req.body;
    
    if (!importData) {
      return res.status(400).json({ error: "Invalid import data" });
    }
    
    const results: any = {
      categories: 0,
      formulas: 0,
      fields: 0,
      mappings: 0,
    };
    
    // Import categories and formulas
    if (importData.categories && importData.categories.length > 0) {
      for (const category of importData.categories) {
        // Check if category exists
        const existingCategory = await db.query.kpiCategories.findFirst({
          where: eq(kpiCategories.id, category.id),
        });
        
        if (existingCategory) {
          // Update category
          await db
            .update(kpiCategories)
            .set({
              name: category.name,
              description: category.description,
            })
            .where(eq(kpiCategories.id, category.id));
        } else {
          // Create category
          await db
            .insert(kpiCategories)
            .values({
              id: category.id,
              name: category.name,
              description: category.description,
            });
        }
        
        results.categories++;
        
        // Import formulas for this category
        if (category.kpis && category.kpis.length > 0) {
          for (const formula of category.kpis) {
            // Only import customizable formulas
            if (formula.customizable) {
              // Check if formula exists
              const existingFormula = await db.query.kpiFormulas.findFirst({
                where: eq(kpiFormulas.id, formula.id),
              });
              
              if (existingFormula) {
                // Update formula
                await db
                  .update(kpiFormulas)
                  .set({
                    name: formula.name,
                    description: formula.description,
                    formula: formula.formula,
                    enabled: formula.enabled,
                    category: formula.category,
                    requiredFields: formula.requiredFields,
                    inputFields: formula.inputFields,
                  })
                  .where(eq(kpiFormulas.id, formula.id));
              } else {
                // Create formula
                await db
                  .insert(kpiFormulas)
                  .values({
                    id: formula.id,
                    name: formula.name,
                    description: formula.description,
                    formula: formula.formula,
                    enabled: formula.enabled,
                    customizable: formula.customizable,
                    category: formula.category,
                    requiredFields: formula.requiredFields,
                    inputFields: formula.inputFields,
                    categoryId: category.id,
                  });
              }
              
              results.formulas++;
            }
          }
        }
      }
    }
    
    // Import custom fields
    if (importData.customFields && importData.customFields.length > 0) {
      for (const field of importData.customFields) {
        // Check if field exists
        const existingField = await db.query.customFields.findFirst({
          where: eq(customFields.id, field.id),
        });
        
        if (existingField) {
          // Update field
          await db
            .update(customFields)
            .set({
              name: field.name,
              fieldType: field.fieldType,
              source: field.source,
              path: field.path,
              description: field.description,
              options: field.options,
            })
            .where(eq(customFields.id, field.id));
        } else {
          // Create field
          await db
            .insert(customFields)
            .values({
              id: field.id,
              name: field.name,
              fieldType: field.fieldType,
              source: field.source,
              path: field.path,
              description: field.description,
              options: field.options,
            });
        }
        
        results.fields++;
      }
    }
    
    // Import field mappings
    if (importData.fieldMappings && importData.fieldMappings.length > 0) {
      for (const mapping of importData.fieldMappings) {
        // Check if mapping exists
        const existingMapping = await db.query.customFieldMappings.findFirst({
          where: eq(customFieldMappings.id, mapping.id),
        });
        
        if (existingMapping) {
          // Update mapping
          await db
            .update(customFieldMappings)
            .set({
              sourceField: mapping.sourceField,
              targetField: mapping.targetField,
              sourceSystem: mapping.sourceSystem,
              targetSystem: mapping.targetSystem,
              transformationRule: mapping.transformationRule,
            })
            .where(eq(customFieldMappings.id, mapping.id));
        } else {
          // Create mapping
          await db
            .insert(customFieldMappings)
            .values({
              id: mapping.id,
              sourceField: mapping.sourceField,
              targetField: mapping.targetField,
              sourceSystem: mapping.sourceSystem,
              targetSystem: mapping.targetSystem,
              transformationRule: mapping.transformationRule,
            });
        }
        
        results.mappings++;
      }
    }
    
    // Clear the KPI calculation cache
    // TODO: Implement cache clearing for KPI calculations
    
    res.json({
      success: true,
      imported: results,
    });
  } catch (error) {
    console.error("Error importing configuration:", error);
    res.status(500).json({ error: "Failed to import configuration" });
  }
});

export default router;