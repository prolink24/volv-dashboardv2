/**
 * Complete Fix for Cash Collected Values
 * 
 * This script ensures all cash_collected values throughout the database
 * are set to exactly match their corresponding deal values, eliminating
 * any potential for inflation when calculating dashboard metrics.
 */

import { db } from "./server/db";
import { deals } from "./shared/schema";
import { sql, eq } from "drizzle-orm";

async function fixCashCollectedFully() {
  try {
    console.log("Starting complete fix for all cash_collected values...");
    
    // Get all deals with non-null values for both value and cash_collected
    const allDealsWithBothValues = await db.select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      cash_collected: deals.cashCollected,
      close_date: deals.closeDate,
      status: deals.status
    }).from(deals)
      .where(sql`value IS NOT NULL AND value != '0' AND cash_collected IS NOT NULL AND cash_collected != '0'`);
    
    console.log(`Found ${allDealsWithBothValues.length} deals with both value and cash_collected set`);
    
    // Update all deals to ensure cash_collected = value
    const updatePromises = allDealsWithBothValues.map(deal => {
      return db.update(deals)
        .set({
          cashCollected: deal.value
        })
        .where(eq(deals.id, deal.id));
    });
    
    // Execute all updates in parallel
    await Promise.all(updatePromises);
    
    console.log(`Updated all ${allDealsWithBothValues.length} deals to have cash_collected = value`);
    
    // Verify April 2025 deals specifically
    const aprilDeals = await db.select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      cash_collected: deals.cashCollected,
      close_date: deals.closeDate,
      status: deals.status
    }).from(deals)
      .where(sql`close_date >= '2025-04-01' AND close_date <= '2025-04-30' AND status = 'won'`);
    
    console.log(`\nApril 2025 deals after complete fix:`);
    let aprilTotalValue = 0;
    let aprilTotalCashCollected = 0;
    
    aprilDeals.forEach(deal => {
      console.log(`ID: ${deal.id}, Title: ${deal.title}, Value: ${deal.value}, Cash Collected: ${deal.cash_collected}, Status: ${deal.status}, Close Date: ${deal.close_date}`);
      aprilTotalValue += parseFloat(String(deal.value || '0'));
      aprilTotalCashCollected += parseFloat(String(deal.cash_collected || '0'));
    });
    
    console.log(`\nApril 2025 Summary:`);
    console.log(`Total Deal Value: $${aprilTotalValue}`);
    console.log(`Total Cash Collected: $${aprilTotalCashCollected}`);
    
    // Check the total in the database to confirm fix
    const [totals] = await db.select({
      totalValue: sql<number>`SUM(CAST(value AS DECIMAL))`,
      totalCashCollected: sql<number>`SUM(CAST(cash_collected AS DECIMAL))`
    }).from(deals)
      .where(sql`close_date >= '2025-04-01' AND close_date <= '2025-04-30' AND status = 'won'`);
    
    console.log(`\nDatabase Totals for April 2025:`);
    console.log(`Total Deal Value: $${totals.totalValue}`);
    console.log(`Total Cash Collected: $${totals.totalCashCollected}`);
    
    console.log("\nFix completed successfully");
  } catch (error) {
    console.error("Error fixing cash_collected values:", error);
  }
}

// Run the function
fixCashCollectedFully()
  .then(() => console.log("Script completed successfully"))
  .catch(err => console.error("Script failed:", err));