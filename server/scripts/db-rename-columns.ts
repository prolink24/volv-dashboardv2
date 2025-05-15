/**
 * Database Column Renaming Script
 * 
 * This script updates database column names to match the camelCase naming convention
 * in our schema files. The renames are done through direct SQL to avoid the interactive
 * nature of drizzle-kit push.
 */

import { pool } from "../db";

async function renameFieldCoverageColumns() {
  console.log("Starting column rename migration...");
  
  try {
    // Start a transaction to ensure all renames happen together
    await pool.query('BEGIN');
    
    // Rename field_coverage to fieldCoverage in contacts table
    await pool.query(`
      ALTER TABLE contacts 
      RENAME COLUMN field_coverage TO fieldCoverage;
    `);
    console.log("✓ Renamed field_coverage to fieldCoverage in contacts table");
    
    // Rename required_fields_complete to requiredFieldsComplete in contacts table
    await pool.query(`
      ALTER TABLE contacts 
      RENAME COLUMN required_fields_complete TO requiredFieldsComplete;
    `);
    console.log("✓ Renamed required_fields_complete to requiredFieldsComplete in contacts table");
    
    // Rename field_coverage to fieldCoverage in activities table
    await pool.query(`
      ALTER TABLE activities 
      RENAME COLUMN field_coverage TO fieldCoverage;
    `);
    console.log("✓ Renamed field_coverage to fieldCoverage in activities table");
    
    // Rename field_coverage to fieldCoverage in deals table
    await pool.query(`
      ALTER TABLE deals 
      RENAME COLUMN field_coverage TO fieldCoverage;
    `);
    console.log("✓ Renamed field_coverage to fieldCoverage in deals table");
    
    // Rename field_coverage to fieldCoverage in meetings table if it exists
    try {
      await pool.query(`
        ALTER TABLE meetings 
        RENAME COLUMN field_coverage TO fieldCoverage;
      `);
      console.log("✓ Renamed field_coverage to fieldCoverage in meetings table");
    } catch (error) {
      console.log("Field not found in meetings table, skipping");
    }
    
    // Rename field_coverage to fieldCoverage in forms table if it exists
    try {
      await pool.query(`
        ALTER TABLE forms 
        RENAME COLUMN field_coverage TO fieldCoverage;
      `);
      console.log("✓ Renamed field_coverage to fieldCoverage in forms table");
    } catch (error) {
      console.log("Field not found in forms table, skipping");
    }
    
    // Commit the transaction
    await pool.query('COMMIT');
    console.log("Migration completed successfully!");
    
  } catch (error) {
    // Roll back the transaction in case of error
    await pool.query('ROLLBACK');
    console.error("Migration failed:", error);
    throw error;
  } finally {
    // End process
    process.exit(0);
  }
}

// Run the migration
renameFieldCoverageColumns();