/**
 * Fix All Deal Assignments and Cash Collected Values
 * 
 * This script implements a comprehensive fix for all won deals by:
 * 1. Setting cash_collected values equal to deal values for all won deals
 * 2. Creating primary assignments in the junction table for all won deals
 */

import { db } from "./server/db";
import { deals, dealToUserAssignments, closeUsers } from "./shared/schema";
import { eq, and, isNull } from "drizzle-orm";

async function fixAllDealAssignments() {
  console.log("Starting comprehensive deal assignment fix...");
  
  // Get Deal Maker's internal user ID
  const dealMaker = await db.select()
    .from(closeUsers)
    .where(eq(closeUsers.closeId, 'user_xZPRj0Npd3RjWlWiYLAx0XzFFRiR5yzCKkpwieZVoqY'))
    .limit(1);
  
  if (dealMaker.length === 0) {
    console.error("Error: Deal Maker user not found in database");
    return;
  }
  
  const dealMakerId = dealMaker[0].id;
  console.log(`Found Deal Maker (Morgan Clark) with internal ID: ${dealMakerId}`);
  
  // Step 1: Fix cash_collected values for all won deals
  console.log("\nStep 1: Setting cash_collected values for all won deals...");
  
  const wonDealsWithoutCashCollected = await db.select({
    id: deals.id,
    value: deals.value
  })
  .from(deals)
  .where(
    and(
      eq(deals.status, 'won'),
      isNull(deals.cashCollected)
    )
  );
  
  console.log(`Found ${wonDealsWithoutCashCollected.length} won deals missing cash_collected values`);
  
  let cashFixCount = 0;
  for (const deal of wonDealsWithoutCashCollected) {
    await db.update(deals)
      .set({ cashCollected: deal.value })
      .where(eq(deals.id, deal.id));
    cashFixCount++;
    
    // Log progress every 50 deals
    if (cashFixCount % 50 === 0) {
      console.log(`  - Updated cash_collected for ${cashFixCount} deals`);
    }
  }
  
  console.log(`Completed: Updated cash_collected values for ${cashFixCount} deals`);
  
  // Step 2: Find won deals with incorrect cash_collected values (100x too large)
  console.log("\nStep 2: Fixing inflated cash_collected values...");
  
  const wonDealsWithInflatedValues = await db.select({
    id: deals.id,
    value: deals.value,
    cashCollected: deals.cashCollected
  })
  .from(deals)
  .where(eq(deals.status, 'won'));
  
  let inflatedFixCount = 0;
  for (const deal of wonDealsWithInflatedValues) {
    if (!deal.cashCollected) continue; // Skip nulls as we've already fixed them
    
    const cashCollectedNum = Number(deal.cashCollected);
    const valueNum = Number(deal.value);
    
    // If cash_collected is 100x the value, fix it
    if (cashCollectedNum > valueNum * 10) {
      await db.update(deals)
        .set({ cashCollected: deal.value })
        .where(eq(deals.id, deal.id));
      inflatedFixCount++;
    }
  }
  
  console.log(`Completed: Fixed ${inflatedFixCount} deals with inflated cash_collected values`);
  
  // Step 3: Create primary assignments for all won deals missing them
  console.log("\nStep 3: Creating primary user assignments for won deals...");
  
  const wonDeals = await db.select({
    id: deals.id,
    assignedTo: deals.assignedTo
  })
  .from(deals)
  .where(eq(deals.status, 'won'));
  
  console.log(`Found ${wonDeals.length} won deals to check for proper primary assignments`);
  
  let assignmentsCreated = 0;
  for (const deal of wonDeals) {
    // Check if deal already has a primary assignment
    const existingAssignments = await db.select()
      .from(dealToUserAssignments)
      .where(
        and(
          eq(dealToUserAssignments.dealId, deal.id),
          eq(dealToUserAssignments.assignmentType, 'primary')
        )
      );
    
    if (existingAssignments.length === 0) {
      // No primary assignment exists, create one
      
      // Try to find the user associated with the deal
      let userId = dealMakerId; // Default to Deal Maker
      
      if (deal.assignedTo) {
        const assignedUser = await db.select()
          .from(closeUsers)
          .where(eq(closeUsers.closeId, deal.assignedTo))
          .limit(1);
        
        if (assignedUser.length > 0) {
          userId = assignedUser[0].id;
        }
      }
      
      // Create the primary assignment
      await db.insert(dealToUserAssignments)
        .values({
          dealId: deal.id,
          closeUserId: userId,
          assignmentType: 'primary',
          assignmentDate: new Date()
        });
      
      assignmentsCreated++;
      
      // Log progress every 50 assignments
      if (assignmentsCreated % 50 === 0) {
        console.log(`  - Created ${assignmentsCreated} primary assignments`);
      }
    }
  }
  
  console.log(`Completed: Created ${assignmentsCreated} primary assignments for won deals`);
  
  console.log("\nAll fixes completed successfully!");
  console.log("The Cash Collected by Rep metric should now work properly for all users and dates.");
}

// Run the function
fixAllDealAssignments()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch(err => {
    console.error("Script failed:", err);
    process.exit(1);
  });