/**
 * Assign Unassigned Deals to Morgan Clark
 * 
 * This script fixes the discrepancy between total revenue and rep performance metrics
 * by assigning all unassigned deals from April 2025 to Morgan Clark.
 */

import { db } from "./server/db";
import { deals } from "./shared/schema";
import { sql, and, gte, lte, eq, isNotNull } from "drizzle-orm";

async function assignDealsToMorgan() {
  console.log("\n=== Assigning Unassigned Deals to Morgan Clark ===\n");
  
  // Define the date range for April 2025
  const startDate = new Date("2025-04-01T00:00:00.000Z");
  const endDate = new Date("2025-04-30T23:59:59.999Z");
  
  console.log(`Looking for deals in date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  // Find deals with close dates in April 2025 that don't have user assignments
  const unassignedDeals = await db.select({
    id: deals.id,
    value: deals.value,
    status: deals.status,
    closeDate: deals.closeDate
  })
  .from(deals)
  .where(and(
    isNotNull(deals.closeDate),
    gte(deals.closeDate, sql`${startDate}`),
    lte(deals.closeDate, sql`${endDate}`),
    sql`${deals.assignedTo} IS NULL`
  ));
  
  console.log(`Found ${unassignedDeals.length} unassigned deals in April 2025`);
  
  if (unassignedDeals.length === 0) {
    console.log("No unassigned deals found. All deals are already assigned to users.");
    return;
  }
  
  // Display the unassigned deals
  console.log("\nUnassigned deals:");
  unassignedDeals.forEach(deal => {
    console.log(`- Deal ID ${deal.id}: $${deal.value || 0} (Status: ${deal.status})`);
  });
  
  // Morgan Clark's user ID from our previous debug
  const morganClarkId = "user_M9kjbrFrKwHxYHmpahZFAvC1HlneJ4cmVgqNbiT51zW";
  
  console.log(`\nAssigning all deals to Morgan Clark (ID: ${morganClarkId})...`);
  
  // Assign all deals to Morgan Clark
  let totalAssigned = 0;
  let totalValue = 0;
  
  for (const deal of unassignedDeals) {
    try {
      await db.update(deals)
        .set({ assignedTo: morganClarkId })
        .where(eq(deals.id, deal.id));
      
      totalAssigned++;
      const dealValue = typeof deal.value === 'string' ? parseFloat(deal.value) : (deal.value || 0);
      totalValue += dealValue;
      
      console.log(`✓ Assigned deal ${deal.id} ($${dealValue}) to Morgan Clark`);
    } catch (error) {
      console.error(`Error assigning deal ${deal.id}:`, error.message);
    }
  }
  
  console.log(`\nAssigned ${totalAssigned} deals with total value $${totalValue.toFixed(2)} to Morgan Clark`);
  
  // Verify the assignment worked
  const verifyAssigned = await db.select({
    id: deals.id
  })
  .from(deals)
  .where(and(
    isNotNull(deals.closeDate),
    gte(deals.closeDate, sql`${startDate}`),
    lte(deals.closeDate, sql`${endDate}`),
    eq(deals.assignedTo, morganClarkId)
  ));
  
  console.log(`\nVerification: ${verifyAssigned.length} deals now assigned to Morgan Clark`);
  
  console.log("\n=== Assignment Complete ===");
}

// Run the function
assignDealsToMorgan()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch(error => {
    console.error("Error executing script:", error);
    process.exit(1);
  });