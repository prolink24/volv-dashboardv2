import { relations } from "drizzle-orm";
import { 
  pgTable, 
  serial, 
  text, 
  timestamp, 
  boolean, 
  jsonb,
  uuid
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// KPI Categories table
export const kpiCategories = pgTable("kpi_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define relations for KPI Categories (will be filled after formulas declaration)
// We declare it initially as a null value to avoid TypeScript errors
let kpiCategoriesRelations: any = null;

// Define schema for KPI Formulas - declare first to avoid circular refs
export const kpiFormulas = pgTable("kpi_formulas", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  formula: text("formula").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  customizable: boolean("customizable").default(true).notNull(),
  category: text("category").notNull(),
  requiredFields: jsonb("required_fields").$type<string[]>().default([]),
  inputFields: jsonb("input_fields").$type<{
    id: string;
    name: string;
    type: "number" | "string" | "boolean" | "date" | "select";
    source: "close" | "calendly" | "typeform" | "custom";
    fieldPath?: string;
    options?: string[];
    value: any;
  }[]>().default([]),
  source: text("source").notNull(),
  categoryId: text("category_id").references(() => kpiCategories.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define relations for KPI Formulas
export const kpiFormulasRelations = relations(kpiFormulas, ({ one }) => ({
  category: one(kpiCategories, {
    fields: [kpiFormulas.categoryId],
    references: [kpiCategories.id],
  }),
}));

// Now define the kpiCategoriesRelations
export const kpiCategoriesRelationsDefinition = relations(kpiCategories, ({ many }) => ({
  kpis: many(kpiFormulas),
}));

// Assign to our previously declared variable
kpiCategoriesRelations = kpiCategoriesRelationsDefinition;
// Also export it to be accessible
export { kpiCategoriesRelations };

// Custom Fields table
export const customFields = pgTable("custom_fields", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  fieldType: text("field_type").notNull(),
  source: text("source").notNull(),
  path: text("path"),
  description: text("description"),
  options: jsonb("options").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Custom Field Mappings table
export const customFieldMappings = pgTable("custom_field_mappings", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceField: text("source_field").notNull(),
  targetField: text("target_field").notNull(),
  sourceSystem: text("source_system").notNull(),
  targetSystem: text("target_system").notNull(),
  transformationRule: text("transformation_rule"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Create Zod schemas for input validation
export const insertKpiCategorySchema = createInsertSchema(kpiCategories, {
  description: z.string().optional(),
});

export const insertKpiFormulaSchema = createInsertSchema(kpiFormulas, {
  description: z.string().optional(),
  requiredFields: z.array(z.string()).optional(),
  inputFields: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["number", "string", "boolean", "date", "select"]),
      source: z.enum(["close", "calendly", "typeform", "custom"]),
      fieldPath: z.string().optional(),
      options: z.array(z.string()).optional(),
      value: z.any(),
    })
  ).optional(),
});

export const insertCustomFieldSchema = createInsertSchema(customFields, {
  description: z.string().optional(),
  path: z.string().optional(),
  options: z.array(z.string()).optional(),
});

export const insertCustomFieldMappingSchema = createInsertSchema(customFieldMappings, {
  transformationRule: z.string().optional(),
});

// TypeScript types for insert operations
export type InsertKpiCategory = z.infer<typeof insertKpiCategorySchema>;
export type InsertKpiFormula = z.infer<typeof insertKpiFormulaSchema>;
export type InsertCustomField = z.infer<typeof insertCustomFieldSchema>;
export type InsertCustomFieldMapping = z.infer<typeof insertCustomFieldMappingSchema>;

// TypeScript types for select operations
export type KpiCategory = typeof kpiCategories.$inferSelect;
export type KpiFormula = typeof kpiFormulas.$inferSelect;
export type CustomField = typeof customFields.$inferSelect;
export type CustomFieldMapping = typeof customFieldMappings.$inferSelect;