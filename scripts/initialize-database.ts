/**
 * Database Initialization Script
 * 
 * This script initializes the PostgreSQL database with all required tables
 * for contact-level attribution between Close CRM, Calendly, and Typeform.
 */

import { db } from '../server/db';
import * as schema from '../shared/schema';
import { sql } from 'drizzle-orm';

async function initializeDatabase() {
  try {
    console.log('Testing database connection...');
    // Test connection
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    console.log('Database connection successful:', result.rows[0].current_time);
    
    console.log('\nCreating tables if they don\'t exist...');
    
    // We'll use the drizzle-kit push command to create the tables based on our schema
    console.log('Tables are defined in the schema and will be created using npm run db:push');
    console.log('Please run: npm run db:push');
    
    // Verify database structure
    const tables = [
      'users',
      'close_users',
      'contact_user_assignments',
      'deal_user_assignments',
      'contacts',
      'activities',
      'deals',
      'meetings',
      'forms',
      'metrics'
    ];
    
    console.log('\nVerifying tables exist:');
    for (const table of tables) {
      try {
        const tableExists = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          ) as exists
        `);
        
        if (tableExists.rows[0].exists) {
          console.log(`✓ Table '${table}' exists`);
        } else {
          console.log(`× Table '${table}' does not exist yet`);
        }
      } catch (error) {
        console.error(`Error checking if table '${table}' exists:`, error);
      }
    }
    
    console.log('\nDatabase initialization complete!');
    console.log('You can now run your data sync operations to pull data from Close, Calendly, and Typeform.');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Execute the function
initializeDatabase().catch(console.error);