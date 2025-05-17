import { pool } from './db';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  try {
    console.log("Starting database migration...");
    
    // Read migration SQL file
    const migrationSql = fs.readFileSync(
      path.join(__dirname, './migrations/add_booking_fields.sql'), 
      'utf8'
    );
    
    console.log("Executing migration SQL:", migrationSql);
    
    // Connect to database and execute migration
    const client = await pool.connect();
    try {
      await client.query(migrationSql);
      console.log("Migration successfully applied!");
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error applying migration:", error);
  }
}

// Run the migration
applyMigration();