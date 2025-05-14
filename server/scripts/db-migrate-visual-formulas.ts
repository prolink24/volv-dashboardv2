import { db } from '../db';
import { sql } from 'drizzle-orm';
import { 
  formulaBlockPositions, 
  formulaBlocks, 
  blockConnections, 
  formulaVersions, 
  fieldSuggestions, 
  formulaTemplates, 
  formulaFunctions 
} from '@shared/schema/visual-formula';

/**
 * Migration script to create tables for the visual formula builder
 * 
 * This script creates all the necessary database tables for the KPI Configurator's
 * visual formula building system.
 */

async function main() {
  console.log('Starting database migration for Visual Formula Builder...');
  try {
    // Create formula_block_positions table
    console.log('Creating formula_block_positions table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "formula_block_positions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "block_id" text NOT NULL,
        "formula_id" text REFERENCES "kpi_formulas" ("id") ON DELETE CASCADE,
        "x" integer NOT NULL,
        "y" integer NOT NULL,
        "width" integer NOT NULL DEFAULT 120,
        "height" integer NOT NULL DEFAULT 80,
        "z_index" integer NOT NULL DEFAULT 1,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
      
      CREATE INDEX IF NOT EXISTS "formula_block_positions_formula_id_idx" ON "formula_block_positions" ("formula_id");
      CREATE INDEX IF NOT EXISTS "formula_block_positions_block_id_idx" ON "formula_block_positions" ("block_id");
    `);

    // Create formula_blocks table
    console.log('Creating formula_blocks table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "formula_blocks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "block_id" text NOT NULL UNIQUE,
        "formula_id" text REFERENCES "kpi_formulas" ("id") ON DELETE CASCADE,
        "block_type" text NOT NULL,
        "block_data" jsonb NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
      
      CREATE INDEX IF NOT EXISTS "formula_blocks_formula_id_idx" ON "formula_blocks" ("formula_id");
      CREATE INDEX IF NOT EXISTS "formula_blocks_block_id_idx" ON "formula_blocks" ("block_id");
    `);

    // Create block_connections table
    console.log('Creating block_connections table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "block_connections" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "formula_id" text REFERENCES "kpi_formulas" ("id") ON DELETE CASCADE,
        "source_block_id" text NOT NULL,
        "target_block_id" text NOT NULL,
        "source_port" text NOT NULL,
        "target_port" text NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
      
      CREATE INDEX IF NOT EXISTS "block_connections_formula_id_idx" ON "block_connections" ("formula_id");
      CREATE INDEX IF NOT EXISTS "block_connections_source_block_id_idx" ON "block_connections" ("source_block_id");
      CREATE INDEX IF NOT EXISTS "block_connections_target_block_id_idx" ON "block_connections" ("target_block_id");
    `);

    // Create formula_versions table
    console.log('Creating formula_versions table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "formula_versions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "formula_id" text REFERENCES "kpi_formulas" ("id") ON DELETE CASCADE,
        "version_number" integer NOT NULL,
        "formula" text NOT NULL,
        "visual_blocks" jsonb NOT NULL,
        "connections" jsonb NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "created_by" text,
        "comment" text
      );
      
      CREATE INDEX IF NOT EXISTS "formula_versions_formula_id_idx" ON "formula_versions" ("formula_id");
      CREATE INDEX IF NOT EXISTS "formula_versions_version_number_idx" ON "formula_versions" ("version_number");
    `);

    // Create field_suggestions table
    console.log('Creating field_suggestions table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "field_suggestions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "field_id" text NOT NULL,
        "usage_count" integer NOT NULL DEFAULT 0,
        "last_used" timestamp DEFAULT now(),
        "suggested_with" jsonb DEFAULT '[]'::jsonb,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
      
      CREATE INDEX IF NOT EXISTS "field_suggestions_field_id_idx" ON "field_suggestions" ("field_id");
      CREATE INDEX IF NOT EXISTS "field_suggestions_usage_count_idx" ON "field_suggestions" ("usage_count");
    `);

    // Create formula_templates table
    console.log('Creating formula_templates table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "formula_templates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "description" text,
        "category" text NOT NULL,
        "difficulty" text NOT NULL DEFAULT 'beginner',
        "formula" text NOT NULL,
        "visual_blocks" jsonb NOT NULL,
        "connections" jsonb NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "created_by" text,
        "tags" jsonb DEFAULT '[]'::jsonb
      );
      
      CREATE INDEX IF NOT EXISTS "formula_templates_category_idx" ON "formula_templates" ("category");
      CREATE INDEX IF NOT EXISTS "formula_templates_difficulty_idx" ON "formula_templates" ("difficulty");
    `);

    // Create formula_functions table
    console.log('Creating formula_functions table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "formula_functions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL UNIQUE,
        "description" text NOT NULL,
        "category" text NOT NULL,
        "param_count" integer NOT NULL,
        "param_types" jsonb DEFAULT '[]'::jsonb,
        "return_type" text NOT NULL,
        "example" text,
        "implementation" text,
        "is_custom" boolean DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
      
      CREATE INDEX IF NOT EXISTS "formula_functions_name_idx" ON "formula_functions" ("name");
      CREATE INDEX IF NOT EXISTS "formula_functions_category_idx" ON "formula_functions" ("category");
    `);

    // Seed formula_functions with some common functions
    console.log('Seeding formula_functions with common functions...');
    await db.execute(sql`
      INSERT INTO "formula_functions" 
        ("name", "description", "category", "param_count", "param_types", "return_type", "example")
      VALUES
        ('sum', 'Sum all values in a collection', 'math', 1, '["array"]', 'number', 'sum(deals.value)'),
        ('average', 'Calculate the average of values', 'math', 1, '["array"]', 'number', 'average(meetings.duration)'),
        ('count', 'Count the number of items', 'math', 1, '["array"]', 'number', 'count(contacts)'),
        ('min', 'Find the minimum value', 'math', 1, '["array"]', 'number', 'min(deals.value)'),
        ('max', 'Find the maximum value', 'math', 1, '["array"]', 'number', 'max(meetings.duration)'),
        ('if', 'Conditional logic', 'logic', 3, '["boolean", "any", "any"]', 'any', 'if(count(deals) > 10, "High", "Low")'),
        ('formatPercent', 'Format as percentage', 'format', 1, '["number"]', 'string', 'formatPercent(conversionRate)'),
        ('formatCurrency', 'Format as currency', 'format', 1, '["number"]', 'string', 'formatCurrency(revenue)')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Seed formula_templates with some common templates
    console.log('Seeding formula_templates with common templates...');
    await db.execute(sql`
      INSERT INTO "formula_templates" 
        ("name", "description", "category", "difficulty", "formula", "visual_blocks", "connections")
      VALUES
        (
          'Conversion Rate', 
          'Calculate the percentage of one value relative to another', 
          'sales', 
          'beginner',
          '(count(deals) / count(meetings)) * 100',
          '[{"id":"field-1","type":"field","fieldId":"close_deals_count","fieldName":"deals","x":100,"y":100},{"id":"field-2","type":"field","fieldId":"calendly_meetings_count","fieldName":"meetings","x":100,"y":200},{"id":"operator-1","type":"operator","operator":"/","label":"Division","x":300,"y":150},{"id":"constant-1","type":"constant","value":100,"dataType":"number","x":300,"y":250},{"id":"operator-2","type":"operator","operator":"*","label":"Multiplication","x":500,"y":200}]',
          '[{"sourceBlockId":"field-1","targetBlockId":"operator-1","sourcePort":"output","targetPort":"input1"},{"sourceBlockId":"field-2","targetBlockId":"operator-1","sourcePort":"output","targetPort":"input2"},{"sourceBlockId":"operator-1","targetBlockId":"operator-2","sourcePort":"output","targetPort":"input1"},{"sourceBlockId":"constant-1","targetBlockId":"operator-2","sourcePort":"output","targetPort":"input2"}]'
        ),
        (
          'Average Deal Value', 
          'Calculate the average value of all deals', 
          'sales', 
          'beginner',
          'sum(deals.value) / count(deals)',
          '[{"id":"field-1","type":"field","fieldId":"close_deals_value","fieldName":"deals.value","x":100,"y":100},{"id":"field-2","type":"field","fieldId":"close_deals_count","fieldName":"deals","x":100,"y":200},{"id":"function-1","type":"function","functionName":"sum","paramCount":1,"description":"Sum all values","x":300,"y":100},{"id":"operator-1","type":"operator","operator":"/","label":"Division","x":500,"y":150}]',
          '[{"sourceBlockId":"field-1","targetBlockId":"function-1","sourcePort":"output","targetPort":"input1"},{"sourceBlockId":"function-1","targetBlockId":"operator-1","sourcePort":"output","targetPort":"input1"},{"sourceBlockId":"field-2","targetBlockId":"operator-1","sourcePort":"output","targetPort":"input2"}]'
        ),
        (
          'Meeting Utilization', 
          'Calculate what percentage of scheduled meetings actually occurred', 
          'marketing', 
          'intermediate',
          '(meetings.shows / meetings) * 100',
          '[{"id":"field-1","type":"field","fieldId":"calendly_meetings_shows","fieldName":"meetings.shows","x":100,"y":100},{"id":"field-2","type":"field","fieldId":"calendly_meetings_count","fieldName":"meetings","x":100,"y":200},{"id":"operator-1","type":"operator","operator":"/","label":"Division","x":300,"y":150},{"id":"constant-1","type":"constant","value":100,"dataType":"number","x":300,"y":250},{"id":"operator-2","type":"operator","operator":"*","label":"Multiplication","x":500,"y":200}]',
          '[{"sourceBlockId":"field-1","targetBlockId":"operator-1","sourcePort":"output","targetPort":"input1"},{"sourceBlockId":"field-2","targetBlockId":"operator-1","sourcePort":"output","targetPort":"input2"},{"sourceBlockId":"operator-1","targetBlockId":"operator-2","sourcePort":"output","targetPort":"input1"},{"sourceBlockId":"constant-1","targetBlockId":"operator-2","sourcePort":"output","targetPort":"input2"}]'
        )
      ON CONFLICT DO NOTHING;
    `);

    console.log('Database migration for Visual Formula Builder completed successfully!');
    
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

main().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});