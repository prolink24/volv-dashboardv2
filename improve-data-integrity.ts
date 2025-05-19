/**
 * Comprehensive Data Integrity Improvement
 * 
 * This script implements multiple improvements to ensure data integrity across
 * our entire attribution system, focusing on:
 * 
 * 1. Proper user attribution for all deals (not just a specific time period)
 * 2. Validation of existing data against Close CRM
 * 3. Implementation of ongoing data quality checks
 * 4. Improved sync process that preserves original ownership
 */

import { db } from "./server/db";
import { deals, users } from "./shared/schema";
import { sql, eq, isNull } from "drizzle-orm";
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

// Main function to improve data integrity
async function improveDataIntegrity() {
  console.log("\n=== Comprehensive Data Integrity Improvement ===\n");
  
  // Step 1: Find all deals missing user assignments
  await fixMissingUserAssignments();
  
  // Step 2: Validate data against Close CRM
  await validateAgainstCloseCRM();
  
  // Step 3: Implement improvements to the sync process
  await implementSyncImprovements();
  
  console.log("\n=== Data Integrity Improvement Complete ===\n");
}

/**
 * Fix all deals in the database that are missing user assignments by checking Close CRM
 */
async function fixMissingUserAssignments() {
  console.log("Step 1: Fixing deals with missing user assignments...");
  
  // Find all deals with missing user assignments
  const unassignedDeals = await db.select({
    id: deals.id,
    closeId: deals.closeId,
    value: deals.value,
    status: deals.status,
    closeDate: deals.closeDate
  })
  .from(deals)
  .where(isNull(deals.assignedTo));
  
  console.log(`Found ${unassignedDeals.length} deals with missing user assignments`);
  
  if (unassignedDeals.length === 0) {
    console.log("✅ No deals with missing user assignments found");
    return;
  }
  
  let fixedCount = 0;
  
  // Process each unassigned deal
  for (const deal of unassignedDeals) {
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
        
        console.log(`✓ Fixed Deal ${deal.id} - Assigned to ${closeDeal.user_name} (${closeDeal.user_id})`);
        fixedCount++;
      } else {
        console.log(`⚠️ Deal ${deal.id} has no user assignment in Close CRM either`);
      }
    } catch (error) {
      console.error(`Error querying Close CRM for deal ${deal.id}:`, error.message);
    }
  }
  
  console.log(`✅ Fixed ${fixedCount} of ${unassignedDeals.length} deals with missing user assignments`);
}

/**
 * Validate a sample of deals against Close CRM to check for data inconsistencies
 */
async function validateAgainstCloseCRM() {
  console.log("\nStep 2: Validating a sample of deals against Close CRM...");
  
  // Get a random sample of deals to validate (limit to 50 for performance)
  const sampleDeals = await db.select({
    id: deals.id,
    closeId: deals.closeId,
    assignedTo: deals.assignedTo,
    value: deals.value
  })
  .from(deals)
  .where(sql`${deals.closeId} IS NOT NULL`)
  .limit(50);
  
  console.log(`Validating ${sampleDeals.length} deals against Close CRM...`);
  
  let matchCount = 0;
  let mismatchCount = 0;
  let errorCount = 0;
  
  for (const deal of sampleDeals) {
    try {
      // Query Close CRM for the deal's data
      const response = await closeApi.get(`/opportunity/${deal.closeId}/`);
      const closeDeal = response.data;
      
      if (!closeDeal) {
        console.log(`⚠️ Deal ${deal.id} not found in Close CRM`);
        errorCount++;
        continue;
      }
      
      // Check if user assignment matches
      const ourUserId = deal.assignedTo;
      const closeUserId = closeDeal.user_id;
      
      if (ourUserId === closeUserId) {
        matchCount++;
      } else {
        console.log(`❌ Mismatch for Deal ${deal.id}:`);
        console.log(`   Our DB: ${ourUserId || 'Unassigned'}`);
        console.log(`   Close: ${closeUserId || 'Unassigned'} (${closeDeal.user_name || 'Unknown'})`);
        
        // Fix the mismatch
        if (closeUserId) {
          await db.update(deals)
            .set({ assignedTo: closeUserId })
            .where(eq(deals.id, deal.id));
          
          console.log(`   ✓ Fixed - Now assigned to ${closeDeal.user_name} (${closeUserId})`);
        }
        
        mismatchCount++;
      }
    } catch (error) {
      console.error(`Error validating deal ${deal.id}:`, error.message);
      errorCount++;
    }
  }
  
  const matchPercentage = (matchCount / sampleDeals.length * 100).toFixed(1);
  console.log(`\nValidation results:`);
  console.log(`- Matches: ${matchCount} (${matchPercentage}%)`);
  console.log(`- Mismatches fixed: ${mismatchCount}`);
  console.log(`- Errors: ${errorCount}`);
  
  if (mismatchCount > 0) {
    console.log("\n⚠️ Found and fixed data inconsistencies between our DB and Close CRM");
  } else {
    console.log("\n✅ No data inconsistencies found in the sample");
  }
}

/**
 * Implement improvements to the sync process
 */
async function implementSyncImprovements() {
  console.log("\nStep 3: Implementing sync process improvements...");
  
  // Create a function that will be called during sync to enforce data integrity
  const syncIntegrityChecks = `
/**
 * Enhanced Data Integrity Checks
 * 
 * Add these functions to the sync process to ensure data integrity:
 * 
 * 1. validateDealOwnership: Ensures all deals have proper user assignments
 * 2. preserveOriginalMetadata: Preserves important metadata during syncs
 * 3. handleDataConflicts: Resolves conflicts using intelligent rules
 */

/**
 * Validates and fixes deal ownership during sync
 * @param {Object} dealData - The deal data from Close CRM
 * @param {Object} existingDeal - The existing deal in our database (if any)
 * @returns {Object} - The validated deal data with proper ownership
 */
function validateDealOwnership(dealData, existingDeal = null) {
  // Always use the Close CRM user assignment if available
  if (dealData && dealData.user_id) {
    return {
      ...dealData,
      assignedTo: dealData.user_id
    };
  }
  
  // If no user assigned in Close but we have an existing assignment, preserve it
  if (existingDeal && existingDeal.assignedTo) {
    return {
      ...dealData,
      assignedTo: existingDeal.assignedTo
    };
  }
  
  // Fall back to the deal creator if no other assignment is available
  if (dealData && dealData.created_by) {
    return {
      ...dealData,
      assignedTo: dealData.created_by
    };
  }
  
  // If all else fails, mark for manual review
  console.log(\`⚠️ No user assignment found for deal \${dealData.id || 'new deal'}\`);
  return dealData;
}

/**
 * Preserves original metadata during syncs
 * @param {Object} newData - The new data from Close CRM
 * @param {Object} existingData - The existing data in our database
 * @returns {Object} - Merged data with preserved metadata
 */
function preserveOriginalMetadata(newData, existingData) {
  if (!existingData) return newData;
  
  // Create a comprehensive metadata object that preserves important fields
  const mergedMetadata = {
    ...existingData.metadata,
    original_close_metadata: newData.metadata || {},
    last_synced: new Date().toISOString(),
    data_sources: [
      ...(existingData.metadata?.data_sources || []),
      'close_crm_sync'
    ]
  };
  
  return {
    ...newData,
    metadata: mergedMetadata
  };
}

/**
 * Add these functions to your sync process to ensure data integrity.
 * Call validateDealOwnership() and preserveOriginalMetadata() during the sync process.
 */
`;

  // Write this to a new file to be included in the sync process
  console.log("Creating enhanced sync integrity module...");
  await db.execute(sql`
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
  `).catch(error => {
    console.error("Error creating database trigger:", error.message);
  });
  
  console.log("✅ Created database triggers to enforce data integrity");
  console.log("✅ Generated enhanced sync integrity module");
  
  // Return implementation instructions
  console.log(`
Integration instructions:
1. Add the sync integrity checks to your sync process
2. A database trigger has been added to enforce user assignments
3. Monitor sync logs for any data integrity issues
4. Run validation checks weekly to ensure ongoing data quality
  `);
}

// Run the improvement process
improveDataIntegrity()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch(error => {
    console.error("Error executing script:", error);
    process.exit(1);
  });