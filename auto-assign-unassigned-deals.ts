/**
 * Auto-Assign Unassigned Deals
 * 
 * This maintenance script automatically checks for any unassigned deals
 * in the system and assigns them to a default user to prevent discrepancies
 * between total revenue and rep-specific metrics.
 * 
 * Run this script periodically to ensure all deals have user assignments.
 */

import { db } from "./server/db";
import { deals, users } from "./shared/schema";
import { sql, and, isNull, gte, lte, eq } from "drizzle-orm";

async function autoAssignUnassignedDeals() {
  console.log("\n=== Auto-Assign Unassigned Deals ===\n");
  
  // 1. Get the default user to assign deals to
  // Morgan Clark is used as the default as per previous assignment
  const defaultUserId = "user_M9kjbrFrKwHxYHmpahZFAvC1HlneJ4cmVgqNbiT51zW";
  const defaultUserName = "Morgan Clark";
  
  console.log(`Using default assignee: ${defaultUserName} (${defaultUserId})`);
  
  // 2. Get all unassigned deals
  const unassignedDeals = await db.select({
    id: deals.id,
    value: deals.value,
    status: deals.status,
    closeDate: deals.closeDate
  })
  .from(deals)
  .where(isNull(deals.assignedTo));
  
  console.log(`\nFound ${unassignedDeals.length} unassigned deals in the system`);
  
  if (unassignedDeals.length === 0) {
    console.log("No unassigned deals found. All deals are already assigned to users.");
    return;
  }
  
  // 3. Display the unassigned deals
  console.log("\nUnassigned deals to be assigned:");
  let totalValue = 0;
  
  unassignedDeals.forEach(deal => {
    const dealValue = typeof deal.value === 'string' ? parseFloat(deal.value) : (deal.value || 0);
    totalValue += dealValue;
    
    const closeDate = deal.closeDate ? new Date(deal.closeDate).toISOString().split('T')[0] : 'No close date';
    console.log(`- Deal ID ${deal.id}: $${dealValue.toFixed(2)} (Status: ${deal.status}, Close Date: ${closeDate})`);
  });
  
  console.log(`\nTotal unassigned value: $${totalValue.toFixed(2)}`);
  
  // 4. Assign all deals to the default user
  console.log(`\nAssigning ${unassignedDeals.length} deals to ${defaultUserName}...`);
  
  let assignedCount = 0;
  
  for (const deal of unassignedDeals) {
    try {
      await db.update(deals)
        .set({ assignedTo: defaultUserId })
        .where(eq(deals.id, deal.id));
      
      assignedCount++;
      console.log(`✓ Assigned deal ${deal.id} to ${defaultUserName}`);
    } catch (error) {
      console.error(`Error assigning deal ${deal.id}:`, error.message);
    }
  }
  
  console.log(`\nSuccessfully assigned ${assignedCount} of ${unassignedDeals.length} deals to ${defaultUserName}`);
  
  // 5. Verify all deals now have assignments
  const remainingUnassigned = await db.select({ count: sql`count(*)` })
    .from(deals)
    .where(isNull(deals.assignedTo));
  
  const unassignedCount = Number(remainingUnassigned[0].count);
  
  if (unassignedCount === 0) {
    console.log("\n✅ SUCCESS: All deals now have user assignments!");
  } else {
    console.log(`\n⚠️ WARNING: ${unassignedCount} deals still remain unassigned.`);
  }
  
  console.log("\n=== Assignment Complete ===");
}

// When run directly
if (require.main === module) {
  autoAssignUnassignedDeals()
    .then(() => {
      console.log("Script completed successfully");
      process.exit(0);
    })
    .catch(error => {
      console.error("Error executing script:", error);
      process.exit(1);
    });
}

// Export for use in other scripts
export { autoAssignUnassignedDeals };