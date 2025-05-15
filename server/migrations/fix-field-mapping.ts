/**
 * Field Mapping Migration Script
 * 
 * This script fixes field mapping issues in the database schema:
 * 1. Adds missing columns like assignee_timezone to meetings table
 * 2. Renames any mismatched columns to match our schema
 * 3. Ensures all custom fields from Close CRM are properly captured
 */
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { meetings, deals, contacts, activities } from '@shared/schema';

async function runMigrations() {
  console.log('Starting field mapping migrations...');
  
  try {
    // Fix 1: Add missing assignee_timezone column to meetings table if it doesn't exist
    console.log('Checking for missing assignee_timezone column...');
    
    // Check if column exists first
    const columnCheckResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'meetings' AND column_name = 'assignee_timezone'
    `);
    
    if (columnCheckResult.rows.length === 0) {
      console.log('Creating missing assignee_timezone column...');
      
      await db.execute(sql`
        ALTER TABLE meetings 
        ADD COLUMN assignee_timezone TEXT
      `);
      
      console.log('Successfully added assignee_timezone column');
    } else {
      console.log('assignee_timezone column already exists');
    }
    
    // Fix 2: Map Close CRM custom fields for financial data
    console.log('Ensuring financial fields are properly mapped...');
    
    // Check for deals with financial data in metadata but not in specific columns
    const dealsWithFinancialData = await db.execute(sql`
      SELECT id, metadata 
      FROM deals 
      WHERE metadata IS NOT NULL 
        AND (cash_collected IS NULL OR contracted_value IS NULL)
      LIMIT 100
    `);
    
    console.log(`Found ${dealsWithFinancialData.rows.length} deals with unmapped financial data`);
    
    for (const deal of dealsWithFinancialData.rows) {
      const metadata = deal.metadata as Record<string, any>;
      
      // Extract financial data from metadata
      let cashCollected = null;
      let contractedValue = null;
      
      // Look for common cash_collected field patterns
      if (metadata.cash_collected !== undefined) {
        cashCollected = metadata.cash_collected;
      } else if (metadata.cashCollected !== undefined) {
        cashCollected = metadata.cashCollected;
      } else if (metadata.cash_amount !== undefined) {
        cashCollected = metadata.cash_amount;
      } else if (metadata.amount_collected !== undefined) {
        cashCollected = metadata.amount_collected;
      }
      
      // Look for common contracted_value field patterns
      if (metadata.contracted_value !== undefined) {
        contractedValue = metadata.contracted_value;
      } else if (metadata.contractedValue !== undefined) {
        contractedValue = metadata.contractedValue;
      } else if (metadata.contract_value !== undefined) {
        contractedValue = metadata.contract_value;
      } else if (metadata.deal_value !== undefined) {
        contractedValue = metadata.deal_value;
      }
      
      // Update deal if financial data was found
      if (cashCollected !== null || contractedValue !== null) {
        const updateValues: Record<string, any> = {};
        
        if (cashCollected !== null) {
          updateValues.cash_collected = String(cashCollected);
        }
        
        if (contractedValue !== null) {
          updateValues.contracted_value = String(contractedValue);
        }
        
        await db.update(deals)
          .set(updateValues)
          .where(sql`id = ${deal.id}`);
          
        console.log(`Updated financial data for deal ${deal.id}`);
      }
    }
    
    // Fix 3: Fix any incorrect "field_coverage" column names (should be "fieldCoverage")
    console.log('Checking for field_coverage column name inconsistencies...');
    
    const tableColumnMappings = [
      { table: 'contacts', oldColumn: 'field_coverage', newColumn: 'fieldCoverage' },
      { table: 'activities', oldColumn: 'field_coverage', newColumn: 'fieldCoverage' },
      { table: 'deals', oldColumn: 'field_coverage', newColumn: 'fieldCoverage' },
      { table: 'meetings', oldColumn: 'field_coverage', newColumn: 'fieldCoverage' },
      { table: 'forms', oldColumn: 'field_coverage', newColumn: 'fieldCoverage' }
    ];
    
    for (const mapping of tableColumnMappings) {
      const columnCheckResult = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${mapping.table} AND column_name = ${mapping.oldColumn}
      `);
      
      if (columnCheckResult.rows.length > 0) {
        console.log(`Renaming ${mapping.table}.${mapping.oldColumn} to ${mapping.newColumn}...`);
        
        await db.execute(sql`
          ALTER TABLE ${sql.raw(mapping.table)} 
          RENAME COLUMN ${sql.raw(mapping.oldColumn)} TO ${sql.raw(mapping.newColumn)}
        `);
        
        console.log(`Successfully renamed column in ${mapping.table}`);
      }
    }
    
    console.log('Field mapping migrations completed successfully!');
  } catch (error) {
    console.error('Error running field mapping migrations:', error);
  }
}

runMigrations()
  .then(() => console.log('Done'))
  .catch(console.error);