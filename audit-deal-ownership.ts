/**
 * Audit Deal Ownership
 * 
 * This script audits the ownership of specific deals by:
 * 1. Checking our local database records
 * 2. Making direct API calls to Close CRM to check the original owner
 * 3. Showing a comparison between our system and Close CRM
 * 
 * This helps determine who should rightfully own these deals rather than
 * automatically assigning them.
 */

import axios from 'axios';
import { db } from "./server/db";
import { deals } from "./shared/schema";
import { eq } from "drizzle-orm";

// Get Close CRM API key from environment
const CLOSE_API_KEY = process.env.CLOSE_API_KEY;

// Helper for API requests
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

async function auditDealOwnership() {
  console.log("\n=== Auditing Deal Ownership ===\n");
  
  // 1. Get a list of deal IDs to check
  const dealIds = [493, 496, 508, 509, 3376];
  
  console.log(`Auditing ${dealIds.length} deals...\n`);
  
  for (const dealId of dealIds) {
    console.log(`Checking Deal ID: ${dealId}`);
    
    // 2. Get deal from our database
    const dealFromDb = await db.select()
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);
    
    if (dealFromDb.length === 0) {
      console.log(`  ❌ Deal ${dealId} not found in our database`);
      continue;
    }
    
    const localDeal = dealFromDb[0];
    
    console.log(`  Local DB Record:`);
    console.log(`    Value: $${localDeal.value || 0}`);
    console.log(`    Status: ${localDeal.status || 'Unknown'}`);
    console.log(`    Close Date: ${localDeal.closeDate || 'No close date'}`);
    console.log(`    Assigned To: ${localDeal.assignedTo || 'Unassigned'}`);
    console.log(`    Close CRM ID: ${localDeal.closeId || 'No Close ID'}`);
    
    // 3. If we have a Close ID, check against the Close API
    if (localDeal.closeId) {
      try {
        console.log(`  Checking Close CRM API...`);
        const response = await closeApi.get(`/opportunity/${localDeal.closeId}/`);
        
        if (response.data) {
          const closeDeal = response.data;
          console.log(`  Close CRM Record:`);
          console.log(`    Lead: ${closeDeal.lead_name || 'Unknown'}`);
          console.log(`    Value: ${closeDeal.value_formatted || '$0'}`);
          console.log(`    Status: ${closeDeal.status_label || 'Unknown'}`);
          console.log(`    Created By: ${closeDeal.created_by_name || 'Unknown'}`);
          console.log(`    Assigned To: ${closeDeal.user_name || 'Unassigned'}`);
          console.log(`    Close User ID: ${closeDeal.user_id || 'None'}`);
          
          // 4. Compare the assignments
          if (localDeal.assignedTo !== closeDeal.user_id) {
            console.log(`  ⚠️ DISCREPANCY: User assignment doesn't match!`);
            console.log(`    Our DB: ${localDeal.assignedTo || 'Unassigned'}`);
            console.log(`    Close: ${closeDeal.user_id || 'Unassigned'} (${closeDeal.user_name || 'Unknown'})`);
            
            // 5. Suggest the correct assignment
            console.log(`  Suggested action: Update our database to match Close CRM's assignment`);
          } else {
            console.log(`  ✅ Assignments match between our DB and Close CRM`);
          }
        }
      } catch (error) {
        console.error(`  Error checking Close CRM: ${error.message}`);
        
        if (error.response) {
          console.error(`  Status: ${error.response.status}`);
          console.error(`  Detail: ${JSON.stringify(error.response.data)}`);
        }
      }
    } else {
      console.log(`  ⚠️ No Close CRM ID available, cannot verify against Close CRM`);
    }
    
    console.log("\n---\n");
  }
  
  console.log("=== Audit Complete ===");
}

// Run the audit
auditDealOwnership()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Error executing audit:", error);
    process.exit(1);
  });