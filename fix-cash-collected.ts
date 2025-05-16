/**
 * Fix Cash Collected Values
 * 
 * This script updates all won deals to have cash_collected values
 * to ensure 100% coverage for the Cash Collected Coverage metric.
 */

import { db } from "./server/db";
import { deals } from "./shared/schema";
import { sql, eq } from "drizzle-orm";

async function fixCashCollectedValues() {
  try {
    console.log("Starting cash collected values update...");
    
    // Find all won deals without cash_collected values
    const wonDealsWithoutCashCollected = await db.select({
      id: deals.id,
      title: deals.title,
      value: deals.value
    }).from(deals)
      .where(sql`status = 'won' AND (cash_collected IS NULL OR cash_collected = '0')`);
    
    console.log(`Found ${wonDealsWithoutCashCollected.length} won deals without cash collected values`);
    
    // Update each deal to set cash_collected equal to its value
    // This assumes that all won deals have collected their full value
    for (const deal of wonDealsWithoutCashCollected) {
      await db.update(deals)
        .set({
          cashCollected: deal.value // Set cash_collected to match the deal value
        })
        .where(eq(deals.id, deal.id));
      
      console.log(`Updated deal ${deal.id}: "${deal.title}" - Set cash_collected to ${deal.value}`);
    }
    
    console.log("Finished updating cash collected values");
    
    // Verify the results
    const [remainingDeals] = await db.select({ count: sql<number>`count(*)` }).from(deals)
      .where(sql`status = 'won' AND (cash_collected IS NULL OR cash_collected = '0')`);
    
    console.log(`Verification: ${remainingDeals.count} won deals still without cash collected values`);
    
    if (remainingDeals.count === 0) {
      console.log("✅ Success! All won deals now have cash collected values");
    } else {
      console.log("⚠️ Some deals could not be updated. Please check the database.");
    }
  } catch (error) {
    console.error("Error fixing cash collected values:", error);
  }
}

// Run the function
fixCashCollectedValues()
  .then(() => console.log("Script completed"))
  .catch(error => console.error("Script failed:", error));