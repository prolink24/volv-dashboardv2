/**
 * Fix Critical Deal Ownership
 * 
 * This optimized script targets only the most critical deals that need ownership correction,
 * focusing on deals with high values or those in important time periods.
 */

import { db } from "./server/db";
import { deals } from "./shared/schema";
import { eq, isNull, and, gte, lte } from "drizzle-orm";
import axios from 'axios';

// Close CRM API integration
const CLOSE_API_KEY = process.env.CLOSE_API_KEY;
const closeApi = axios.create({
  baseURL: 'https://api.close.com/api/v1',
  auth: {
    username: CLOSE_API_KEY || '',
    password: ''
  },
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

async function fixCriticalDealOwnership() {
  console.log("\n=== Critical Deal Ownership Fix ===\n");
  
  // Focus only on high-value deals that are missing user assignments
  // This prevents timeouts while fixing the most important data
  const criticalDeals = await db.select({
    id: deals.id,
    closeId: deals.closeId,
    value: deals.value,
    status: deals.status,
    closeDate: deals.closeDate
  })
  .from(deals)
  .where(
    and(
      isNull(deals.assignedTo),
      deals.value > 0,
      gte(deals.closeDate, new Date('2024-11-01')),
      lte(deals.closeDate, new Date('2025-05-31'))
    )
  )
  .limit(100); // Process in smaller batches
  
  console.log(`Found ${criticalDeals.length} critical deals with missing user assignments`);
  
  if (criticalDeals.length === 0) {
    console.log("✅ No critical deals with missing user assignments found");
    return;
  }
  
  console.log("Processing critical deals...");
  
  let fixedCount = 0;
  let errorCount = 0;
  
  // Process each critical deal
  for (const deal of criticalDeals) {
    if (!deal.closeId) {
      console.log(`⚠️ Deal ${deal.id} has no Close ID, cannot verify against Close CRM`);
      continue;
    }
    
    try {
      // Query Close CRM for the deal's actual owner
      const response = await closeApi.get(`/opportunity/${deal.closeId}/`);
      const closeDeal = response.data;
      
      if (closeDeal && closeDeal.user_id) {
        // Update our database with the correct owner
        await db.update(deals)
          .set({ assignedTo: closeDeal.user_id })
          .where(eq(deals.id, deal.id));
        
        console.log(`✓ Fixed Deal ${deal.id} - Value: $${deal.value}, Assigned to ${closeDeal.user_name} (${closeDeal.user_id})`);
        fixedCount++;
      } else {
        console.log(`⚠️ Deal ${deal.id} has no user assignment in Close CRM either`);
      }
    } catch (error) {
      console.error(`Error querying Close CRM for deal ${deal.id}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n✅ Fixed ${fixedCount} of ${criticalDeals.length} critical deals`);
  console.log(`⚠️ Encountered ${errorCount} errors during processing`);
  
  // Add a database trigger to ensure this doesn't happen again
  try {
    await db.execute(`
      -- Create a trigger function to enforce user assignment on deals
      CREATE OR REPLACE FUNCTION enforce_deal_assignment()
      RETURNS TRIGGER AS $$
      BEGIN
        -- If no user is assigned, use created_by if available
        IF NEW.assigned_to IS NULL AND NEW.created_by IS NOT NULL THEN
          NEW.assigned_to = NEW.created_by;
        END IF;
        
        -- Return the potentially modified record
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Drop the trigger if it exists
      DROP TRIGGER IF EXISTS deal_assignment_trigger ON deals;
      
      -- Create the trigger
      CREATE TRIGGER deal_assignment_trigger
      BEFORE INSERT OR UPDATE ON deals
      FOR EACH ROW
      EXECUTE FUNCTION enforce_deal_assignment();
    `);
    
    console.log("✅ Created database trigger to enforce data integrity going forward");
  } catch (error) {
    console.error("Error creating database trigger:", error.message);
  }
  
  console.log("\n=== Critical Deal Ownership Fix Complete ===");
  console.log(`\nRecommended next steps:
1. Add validation in the Close CRM sync process
2. Run incremental fixes for remaining deals
3. Implement monitoring to detect unassigned deals
4. Add user assignment validation in API endpoints

To check if the most recent issue is fixed, verify the April 2025 deals now
have proper ownership by checking the dashboard metrics.`);
}

// Run the fix
fixCriticalDealOwnership()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch(error => {
    console.error("Error executing script:", error);
    process.exit(1);
  });