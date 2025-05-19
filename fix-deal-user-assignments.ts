/**
 * Fix Deal User Assignments
 * 
 * This script properly fixes deal attribution by creating entries in the 
 * dealToUserAssignments junction table for April 2025 deals.
 * 
 * The previous fix updated the deals.assignedTo field, but the dashboard
 * actually uses the dealToUserAssignments table for calculating rep metrics.
 */

import { db } from "./server/db";
import { deals, closeUsers, dealToUserAssignments } from "./shared/schema";
import { eq, and, gte, lte, sql, isNotNull, inArray } from "drizzle-orm";

async function fixDealUserAssignments() {
  console.log("\n=== Fixing Deal User Assignments ===\n");
  
  // Step 1: Get all April 2025 deals
  console.log("Step 1: Getting April 2025 deals from database...");
  
  const aprilDeals = await db.select({
    id: deals.id,
    closeId: deals.closeId,
    title: deals.title,
    value: deals.value,
    assignedTo: deals.assignedTo,
    closeDate: deals.closeDate,
    status: deals.status
  })
  .from(deals)
  .where(and(
    gte(deals.closeDate, '2025-04-01'),
    lte(deals.closeDate, '2025-04-30'),
    isNotNull(deals.assignedTo)
  ));
  
  console.log(`Found ${aprilDeals.length} April 2025 deals with user assignments`);
  
  if (aprilDeals.length === 0) {
    console.log("No April deals found with user assignments, nothing to fix");
    return {
      success: false,
      message: "No April deals found with user assignments"
    };
  }
  
  // Step 2: Get all Close users to map IDs
  console.log("\nStep 2: Getting Close users mapping...");
  
  // Get all Close users
  const allCloseUsers = await db.select({
    id: closeUsers.id,
    closeId: closeUsers.closeId,
    firstName: closeUsers.first_name,
    lastName: closeUsers.last_name,
    email: closeUsers.email
  })
  .from(closeUsers);
  
  console.log(`Found ${allCloseUsers.length} Close users in the database`);
  
  // Create both mappings: Close ID to internal ID and internal ID to Close user
  const closeIdToInternalId = new Map();
  const internalIdToCloseUser = new Map();
  
  allCloseUsers.forEach(user => {
    closeIdToInternalId.set(user.closeId, user.id);
    internalIdToCloseUser.set(user.id, user);
  });

  // Step 3: Check if assigned internal user IDs exist in closeUsers table
  console.log("\nStep 3: Validating user assignments...");
  
  const validAssignments = [];
  const missingUsers = [];
  
  for (const deal of aprilDeals) {
    const assignedToId = deal.assignedTo;
    
    // Skip if no assignment
    if (!assignedToId) {
      console.log(`Deal ${deal.id} has no user assigned, skipping...`);
      continue;
    }
    
    // Try to parse as number first (if it's already an internal ID)
    let internalUserId: number | null = null;
    
    if (!isNaN(Number(assignedToId))) {
      internalUserId = Number(assignedToId);
      if (internalIdToCloseUser.has(internalUserId)) {
        validAssignments.push({
          dealId: deal.id,
          closeUserId: internalUserId,
          user: internalIdToCloseUser.get(internalUserId)
        });
        continue;
      }
    }
    
    // If not found as internal ID, try as Close ID
    if (closeIdToInternalId.has(assignedToId)) {
      internalUserId = closeIdToInternalId.get(assignedToId);
      validAssignments.push({
        dealId: deal.id,
        closeUserId: internalUserId,
        user: internalIdToCloseUser.get(internalUserId)
      });
      continue;
    }
    
    // If we get here, we couldn't find a valid user
    missingUsers.push(assignedToId);
    console.log(`⚠️ Could not find user with ID ${assignedToId} for deal ${deal.id}`);
  }
  
  if (missingUsers.length > 0) {
    console.log(`⚠️ Found ${missingUsers.length} deals with invalid user assignments`);
    console.log("Missing user IDs:", [...new Set(missingUsers)]);
  }
  
  console.log(`✅ Found ${validAssignments.length} valid deal-user assignments to process`);
  
  // Step 4: Check for existing assignments in the dealToUserAssignments table
  console.log("\nStep 4: Checking for existing assignments in junction table...");
  
  const dealIdsToCheck = validAssignments.map(a => a.dealId);
  
  // Handle case where there are no deals to check
  let existingAssignments = [];
  if (dealIdsToCheck.length > 0) {
    // Use Drizzle's built-in inArray operator for proper parameter handling
    existingAssignments = await db.select({
      dealId: dealToUserAssignments.dealId,
      closeUserId: dealToUserAssignments.closeUserId
    })
    .from(dealToUserAssignments)
    .where(
      inArray(dealToUserAssignments.dealId, dealIdsToCheck)
    );
  }
  
  console.log(`Found ${existingAssignments.length} existing assignments in junction table`);
  
  // Create a set of existing assignments for quick lookup
  const existingAssignmentSet = new Set();
  existingAssignments.forEach(a => {
    existingAssignmentSet.add(`${a.dealId}-${a.closeUserId}`);
  });
  
  // Step 5: Create the missing assignments
  console.log("\nStep 5: Creating missing assignments in junction table...");
  
  let createCount = 0;
  let skipCount = 0;
  
  for (const assignment of validAssignments) {
    const key = `${assignment.dealId}-${assignment.closeUserId}`;
    
    // Skip if assignment already exists
    if (existingAssignmentSet.has(key)) {
      skipCount++;
      continue;
    }
    
    // Create the assignment
    await db.insert(dealToUserAssignments).values({
      dealId: assignment.dealId,
      closeUserId: assignment.closeUserId,
      assignmentDate: new Date(),
      assignmentType: "primary",
      sourceData: {
        method: "fix-script",
        createdAt: new Date().toISOString()
      }
    });
    
    const user = assignment.user;
    const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown';
    
    console.log(`✅ Created assignment: Deal ${assignment.dealId} → User ${userName} (ID: ${assignment.closeUserId})`);
    createCount++;
  }
  
  console.log(`\nSummary: Created ${createCount} new assignments, skipped ${skipCount} existing assignments`);
  
  // Step 6: Verify the assignments
  console.log("\nStep 6: Verifying assignments...");
  
  // Use the same inArray operator for verification
  const finalAssignments = await db.select({
    count: sql<number>`COUNT(*)`
  })
  .from(dealToUserAssignments)
  .where(
    inArray(dealToUserAssignments.dealId, dealIdsToCheck)
  );
  
  const finalCount = finalAssignments[0]?.count || 0;
  
  console.log(`Final count of assignments in junction table: ${finalCount}`);
  console.log(`Expected minimum count: ${validAssignments.length}`);
  
  return {
    success: true,
    created: createCount,
    skipped: skipCount,
    expected: validAssignments.length,
    final: finalCount
  };
}

// Run the fix script
fixDealUserAssignments()
  .then(result => {
    console.log("\n=== Fix Complete ===");
    console.log(`Result: ${result.success ? 'Success!' : 'Failed!'}`);
    if (result.success) {
      console.log(`Created ${result.created} new assignments, with ${result.final} total assignments for April deals`);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error("Error in fix script:", error);
    process.exit(1);
  });