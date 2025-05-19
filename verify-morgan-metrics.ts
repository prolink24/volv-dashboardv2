/**
 * Morgan Clark Metrics Verification
 * 
 * This script directly queries the database to verify that all previously
 * unassigned deals from April 2025 are now properly assigned to Morgan Clark
 * and that the revenue totals match.
 */

import { db } from "./server/db";
import { deals } from "./shared/schema";
import { sql, and, gte, lte, eq, isNotNull } from "drizzle-orm";

async function verifyMorganMetrics() {
  console.log("\n=== Morgan Clark Metrics Verification ===\n");
  
  // Define date range for April 2025
  const startDate = new Date("2025-04-01T00:00:00.000Z");
  const endDate = new Date("2025-04-30T23:59:59.999Z");
  
  // Morgan Clark's user ID
  const morganClarkId = "user_M9kjbrFrKwHxYHmpahZFAvC1HlneJ4cmVgqNbiT51zW";
  
  console.log(`Looking for deals in date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  // 1. Get all April 2025 deals
  const allDeals = await db.select({
    id: deals.id,
    value: deals.value,
    cashCollected: deals.cashCollected,
    status: deals.status,
    assignedTo: deals.assignedTo,
    closeDate: deals.closeDate
  })
  .from(deals)
  .where(and(
    isNotNull(deals.closeDate),
    gte(deals.closeDate, sql`${startDate}`),
    lte(deals.closeDate, sql`${endDate}`)
  ));
  
  console.log(`Total deals in April 2025: ${allDeals.length}`);
  
  // 2. Get deals specifically assigned to Morgan Clark
  const morganDeals = await db.select({
    id: deals.id,
    value: deals.value,
    cashCollected: deals.cashCollected,
    status: deals.status
  })
  .from(deals)
  .where(and(
    isNotNull(deals.closeDate),
    gte(deals.closeDate, sql`${startDate}`),
    lte(deals.closeDate, sql`${endDate}`),
    eq(deals.assignedTo, morganClarkId)
  ));
  
  console.log(`Deals assigned to Morgan Clark: ${morganDeals.length} of ${allDeals.length}`);
  
  // 3. Calculate total revenue values
  const totalRevenue = allDeals.reduce((sum, deal) => {
    const value = typeof deal.value === 'string' ? parseFloat(deal.value) : (deal.value || 0);
    return sum + value;
  }, 0);
  
  const morganRevenue = morganDeals.reduce((sum, deal) => {
    const value = typeof deal.value === 'string' ? parseFloat(deal.value) : (deal.value || 0);
    return sum + value;
  }, 0);
  
  console.log(`\nTotal revenue in April 2025: $${totalRevenue.toFixed(2)}`);
  console.log(`Morgan Clark's revenue: $${morganRevenue.toFixed(2)}`);
  console.log(`Percentage of total: ${((morganRevenue / totalRevenue) * 100).toFixed(2)}%`);
  
  // 4. List out Morgan's deals to confirm specific assignments
  console.log("\nMorgan Clark's deals:");
  morganDeals.forEach(deal => {
    const value = typeof deal.value === 'string' ? parseFloat(deal.value) : (deal.value || 0);
    console.log(`- Deal ID ${deal.id}: $${value.toFixed(2)} (Status: ${deal.status})`);
  });
  
  // 5. Verify if any deals remain unassigned
  const unassignedDeals = allDeals.filter(deal => !deal.assignedTo);
  
  if (unassignedDeals.length > 0) {
    console.log(`\nWARNING: ${unassignedDeals.length} deals still have no user assignment!`);
    
    unassignedDeals.forEach(deal => {
      const value = typeof deal.value === 'string' ? parseFloat(deal.value) : (deal.value || 0);
      console.log(`- Deal ID ${deal.id}: $${value.toFixed(2)} (Status: ${deal.status})`);
    });
  } else {
    console.log("\n✅ SUCCESS: All April 2025 deals have user assignments!");
  }
  
  // 6. Final verification
  const expectedTotal = 210000.00; // The known target for April 2025
  const success = Math.abs(morganRevenue - expectedTotal) < 0.01;
  
  console.log(`\nVerification against expected $210,000: ${success ? "✅ MATCH" : "❌ MISMATCH"}`);
  
  if (!success) {
    console.log(`Difference: $${Math.abs(morganRevenue - expectedTotal).toFixed(2)}`);
  }
  
  console.log("\n=== Verification Complete ===");
}

// Run the verification
verifyMorganMetrics()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Error executing verification:", error);
    process.exit(1);
  });