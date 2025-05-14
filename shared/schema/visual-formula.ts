import { relations } from "drizzle-orm";
import { 
  pgTable, 
  serial, 
  text, 
  timestamp, 
  boolean, 
  jsonb,
  uuid,
  integer,
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { kpiFormulas } from "./kpi-configuration";

/**
 * Schema for the Visual Formula Builder
 * 
 * This extends the existing KPI configuration schema with support for
 * visual formula building, block-based formulas, and version tracking.
 */

// Formula Block Positions table - stores position and size of each block in the canvas
export const formulaBlockPositions = pgTable("formula_block_positions", {
  id: uuid("id").defaultRandom().primaryKey(),
  blockId: text("block_id").notNull(),
  formulaId: text("formula_id").references(() => kpiFormulas.id, { onDelete: "cascade" }),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  width: integer("width").notNull().default(120),
  height: integer("height").notNull().default(80),
  zIndex: integer("z_index").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    formulaIdx: index("formula_block_positions_formula_id_idx").on(table.formulaId),
    blockIdx: index("formula_block_positions_block_id_idx").on(table.blockId)
  };
});

// Formula Blocks table - stores the actual blocks used in the visual formula builder
export const formulaBlocks = pgTable("formula_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  blockId: text("block_id").notNull().unique(),
  formulaId: text("formula_id").references(() => kpiFormulas.id, { onDelete: "cascade" }),
  blockType: text("block_type").notNull(), // 'field', 'operator', 'function', 'constant', 'group'
  blockData: jsonb("block_data").notNull(), // Store block-specific data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    formulaIdx: index("formula_blocks_formula_id_idx").on(table.formulaId),
    blockIdIdx: index("formula_blocks_block_id_idx").on(table.blockId)
  };
});

// Block Connections table - stores connections between blocks in the formula
export const blockConnections = pgTable("block_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  formulaId: text("formula_id").references(() => kpiFormulas.id, { onDelete: "cascade" }),
  sourceBlockId: text("source_block_id").notNull(),
  targetBlockId: text("target_block_id").notNull(),
  sourcePort: text("source_port").notNull(),
  targetPort: text("target_port").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    formulaIdx: index("block_connections_formula_id_idx").on(table.formulaId),
    sourceBlockIdx: index("block_connections_source_block_id_idx").on(table.sourceBlockId),
    targetBlockIdx: index("block_connections_target_block_id_idx").on(table.targetBlockId)
  };
});

// Formula Versions table - tracks versions of formulas for history and version control
export const formulaVersions = pgTable("formula_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  formulaId: text("formula_id").references(() => kpiFormulas.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  formula: text("formula").notNull(),
  visualBlocks: jsonb("visual_blocks").notNull(),
  connections: jsonb("connections").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  comment: text("comment"),
}, (table) => {
  return {
    formulaIdx: index("formula_versions_formula_id_idx").on(table.formulaId),
    versionIdx: index("formula_versions_version_number_idx").on(table.versionNumber)
  };
});

// Smart Field Suggestions table - stores frequently used fields and suggestions
export const fieldSuggestions = pgTable("field_suggestions", {
  id: uuid("id").defaultRandom().primaryKey(),
  fieldId: text("field_id").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  lastUsed: timestamp("last_used").defaultNow(),
  suggestedWith: jsonb("suggested_with").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    fieldIdx: index("field_suggestions_field_id_idx").on(table.fieldId),
    usageIdx: index("field_suggestions_usage_count_idx").on(table.usageCount)
  };
});

// Formula Templates table - stores reusable formula templates
export const formulaTemplates = pgTable("formula_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull().default("beginner"),
  formula: text("formula").notNull(),
  visualBlocks: jsonb("visual_blocks").notNull(),
  connections: jsonb("connections").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  tags: jsonb("tags").$type<string[]>().default([]),
}, (table) => {
  return {
    categoryIdx: index("formula_templates_category_idx").on(table.category),
    difficultyIdx: index("formula_templates_difficulty_idx").on(table.difficulty)
  };
});

// Formula Function Library table - stores available functions for the formula builder
export const formulaFunctions = pgTable("formula_functions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  paramCount: integer("param_count").notNull(),
  paramTypes: jsonb("param_types").$type<string[]>().default([]),
  returnType: text("return_type").notNull(),
  example: text("example"),
  implementation: text("implementation"),
  isCustom: boolean("is_custom").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    nameIdx: index("formula_functions_name_idx").on(table.name),
    categoryIdx: index("formula_functions_category_idx").on(table.category)
  };
});

// Create Zod schemas for input validation
export const insertFormulaBlockPositionSchema = createInsertSchema(formulaBlockPositions);
export const insertFormulaBlockSchema = createInsertSchema(formulaBlocks);
export const insertBlockConnectionSchema = createInsertSchema(blockConnections);
export const insertFormulaVersionSchema = createInsertSchema(formulaVersions);
export const insertFieldSuggestionSchema = createInsertSchema(fieldSuggestions);
export const insertFormulaTemplateSchema = createInsertSchema(formulaTemplates);
export const insertFormulaFunctionSchema = createInsertSchema(formulaFunctions);

// TypeScript types for insert operations
export type InsertFormulaBlockPosition = z.infer<typeof insertFormulaBlockPositionSchema>;
export type InsertFormulaBlock = z.infer<typeof insertFormulaBlockSchema>;
export type InsertBlockConnection = z.infer<typeof insertBlockConnectionSchema>;
export type InsertFormulaVersion = z.infer<typeof insertFormulaVersionSchema>;
export type InsertFieldSuggestion = z.infer<typeof insertFieldSuggestionSchema>;
export type InsertFormulaTemplate = z.infer<typeof insertFormulaTemplateSchema>;
export type InsertFormulaFunction = z.infer<typeof insertFormulaFunctionSchema>;

// TypeScript types for select operations
export type FormulaBlockPosition = typeof formulaBlockPositions.$inferSelect;
export type FormulaBlock = typeof formulaBlocks.$inferSelect;
export type BlockConnection = typeof blockConnections.$inferSelect;
export type FormulaVersion = typeof formulaVersions.$inferSelect;
export type FieldSuggestion = typeof fieldSuggestions.$inferSelect;
export type FormulaTemplate = typeof formulaTemplates.$inferSelect;
export type FormulaFunction = typeof formulaFunctions.$inferSelect;

// Block data type definitions for client-side usage
export type FieldBlockData = {
  fieldId: string;
  fieldName: string;
  fieldType: string;
  fieldSource: string;
};

export type OperatorBlockData = {
  operator: '+' | '-' | '*' | '/' | '%' | '>' | '<' | '>=' | '<=' | '==' | '!=' | '&&' | '||';
  label: string;
};

export type FunctionBlockData = {
  functionName: string;
  paramCount: number;
  description: string;
};

export type ConstantBlockData = {
  value: string | number | boolean;
  dataType: 'string' | 'number' | 'boolean';
};

export type GroupBlockData = {
  blocks: string[]; // References to other block IDs
  label: string;
};

export type BlockData = FieldBlockData | OperatorBlockData | FunctionBlockData | ConstantBlockData | GroupBlockData;