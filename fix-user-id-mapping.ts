/**
 * Fix User ID Mapping
 * 
 * This script fixes the issue with Close CRM user IDs vs. internal user IDs.
 * - Creates proper mapping between Close CRM user IDs and internal user IDs
 * - Updates the April 2025 deals with internal user IDs instead of Close CRM user IDs
 * - Clears the dashboard cache to ensure fresh data is displayed
 */

import { db } from "./server/db";
import { deals, closeUsers, users } from "./shared/schema";
import { eq, and, gte, lte, isNotNull } from "drizzle-orm";
import { sql } from "drizzle-orm";

async function fixUserIdMapping() {
  console.log("\n=== Fixing User ID Mapping ===\n");
  
  // Step 1: Get all April 2025 deals
  console.log("Step 1: Getting April 2025 deals from database...");
  
  const aprilDeals = await db.select({
    id: deals.id,
    closeId: deals.closeId,
    title: deals.title,
    value: deals.value,
    assignedTo: deals.assignedTo,
    closeDate: deals.closeDate
  })
  .from(deals)
  .where(and(
    gte(deals.closeDate, '2025-04-01'),
    lte(deals.closeDate, '2025-04-30')
  ));
  
  console.log(`Found ${aprilDeals.length} April 2025 deals`);
  
  // Step 2: Get all Close users and create mapping to internal users
  console.log("\nStep 2: Getting Close users and creating mapping...");
  
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
  
  // Create mapping of Close user IDs to internal IDs
  const closeUserIdToInternalId = new Map();
  allCloseUsers.forEach(user => {
    closeUserIdToInternalId.set(user.closeId, user.id);
  });
  
  // If we don't have Close users, create them
  if (allCloseUsers.length === 0) {
    console.log("No Close users found in database, creating them...");
    
    // Define default Close users from our script
    const defaultCloseUsers = [
      {
        closeId: "user_4zThXqqroqp8Dd0Kf8UiRFzuQ3388TbFVnlSwPhsyhj",
        first_name: "Bryann",
        last_name: "Cabral",
        email: "bryann@example.com",
        role: "sales_rep"
      },
      {
        closeId: "user_x3Y2s4QwY7IcAf5hrbzRd4Qq9Nc8oRUYoKRElsLkEoy",
        first_name: "Josh",
        last_name: "Sweetnam",
        email: "josh@example.com",
        role: "sales_rep"
      },
      {
        closeId: "user_xZPRj0Npd3RjWlWiYLAx0XzFFRiR5yzCKkpwieZVoqY",
        first_name: "Deal",
        last_name: "Maker",
        email: "dealmaker@example.com",
        role: "sales_rep"
      }
    ];
    
    // Insert them into the database
    for (const user of defaultCloseUsers) {
      const result = await db.insert(closeUsers).values({
        closeId: user.closeId,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        status: 'active',
        sourceData: {}
      }).returning({ id: closeUsers.id });
      
      if (result && result.length > 0) {
        closeUserIdToInternalId.set(user.closeId, result[0].id);
        console.log(`Created Close user: ${user.first_name} ${user.last_name} (${user.closeId}) with internal ID: ${result[0].id}`);
      }
    }
  }
  
  // Step 3: Update the April deals with internal user IDs
  console.log("\nStep 3: Updating April deals with internal user IDs...");
  
  const updates = [];
  for (const deal of aprilDeals) {
    const closeUserId = deal.assignedTo;
    
    // Skip deals without assignment
    if (!closeUserId) {
      console.log(`Deal ${deal.id} (${deal.closeId}) has no user assigned, skipping...`);
      continue;
    }
    
    // Get the internal user ID
    const internalUserId = closeUserIdToInternalId.get(closeUserId);
    
    if (!internalUserId) {
      console.log(`No internal user found for Close user ID: ${closeUserId}, creating one...`);
      
      // Create a generic user if not found
      const defaultUser = {
        closeId: closeUserId,
        first_name: "Unknown",
        last_name: "User",
        email: `user-${closeUserId.substring(0, 8)}@example.com`,
        role: "sales_rep"
      };
      
      const result = await db.insert(closeUsers).values({
        closeId: defaultUser.closeId,
        first_name: defaultUser.first_name,
        last_name: defaultUser.last_name,
        email: defaultUser.email,
        role: defaultUser.role,
        status: 'active',
        sourceData: {}
      }).returning({ id: closeUsers.id });
      
      if (result && result.length > 0) {
        closeUserIdToInternalId.set(defaultUser.closeId, result[0].id);
        console.log(`Created Close user for: ${defaultUser.closeId} with internal ID: ${result[0].id}`);
      }
    }
    
    // Get the internal ID (might have been created in the previous step)
    const updatedInternalUserId = closeUserIdToInternalId.get(closeUserId);
    
    if (updatedInternalUserId) {
      // Update the deal with the internal user ID (as a string because that's how it's defined)
      await db.update(deals)
        .set({ assignedTo: String(updatedInternalUserId) })
        .where(eq(deals.id, deal.id));
      
      console.log(`✅ Updated Deal ${deal.id} (${deal.closeId}): Changed assigned from ${closeUserId} to internal ID ${updatedInternalUserId}`);
      
      updates.push({
        dealId: deal.id,
        oldValue: closeUserId,
        newValue: String(updatedInternalUserId)
      });
    } else {
      console.log(`❌ Failed to update Deal ${deal.id} (${deal.closeId}): Could not find or create internal user ID for ${closeUserId}`);
    }
  }
  
  // Step 4: Verify the updates
  console.log("\nStep 4: Verifying updates...");
  
  const updatedDeals = await db.select({
    id: deals.id,
    closeId: deals.closeId,
    assignedTo: deals.assignedTo
  })
  .from(deals)
  .where(and(
    gte(deals.closeDate, '2025-04-01'),
    lte(deals.closeDate, '2025-04-30')
  ));
  
  for (const deal of updatedDeals) {
    const assignedTo = deal.assignedTo;
    
    if (!assignedTo) {
      console.log(`Deal ${deal.id} (${deal.closeId}) still has no user assigned!`);
      continue;
    }
    
    // Check if the assigned ID is numeric (internal ID)
    const isInternalId = !isNaN(Number(assignedTo)) && assignedTo.indexOf('user_') === -1;
    console.log(`Deal ${deal.id} (${deal.closeId}): Assigned to ${assignedTo} (${isInternalId ? 'Internal ID' : 'Still Close ID!'})`);
  }
  
  // Step 5: Clear dashboard cache
  console.log("\nStep 5: Clearing dashboard cache...");
  try {
    // The cache might be stored in memory or in a database table
    // First try database approach
    try {
      const result = await db.execute(sql.raw(`DELETE FROM cache WHERE key LIKE '%dashboard%' OR key LIKE '%attribution%'`));
      console.log(`Cleared cache entries from database`);
    } catch (error) {
      console.log(`No cache table in database or other SQL error: ${error.message}`);
    }
    
    console.log("Dashboard cache has been cleared or was not found in database");
  } catch (error) {
    console.error(`Error clearing cache: ${error}`);
  }
  
  return {
    success: true,
    message: `Updated ${updates.length} deals with internal user IDs`,
    updates
  };
}

// Run the fix
fixUserIdMapping()
  .then(result => {
    console.log("\n=== Fix Complete ===");
    console.log(`Result: ${result.message}`);
    process.exit(0);
  })
  .catch(error => {
    console.error("Error in fix script:", error);
    process.exit(1);
  });