/**
 * Fix Cash Collected Values
 * 
 * This script corrects the inflated cash_collected values for won deals,
 * ensuring accurate financial data when filtering by date range.
 */

import { db } from "./server/db";
import { deals } from "./shared/schema";
import { sql, eq } from "drizzle-orm";

async function fixCashCollectedValues() {
  try {
    console.log("Starting fix for inflated cash_collected values...");
    
    // Find all deals with potentially inflated cash_collected values (where cash_collected is much higher than deal value)
    const dealsWithInflatedValues = await db.select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      cash_collected: deals.cashCollected,
      close_date: deals.closeDate,
      status: deals.status
    }).from(deals)
      .where(sql`status = 'won' AND cash_collected IS NOT NULL AND cash_collected != '0' AND cash_collected != ''`);
    
    console.log(`Found ${dealsWithInflatedValues.length} won deals to check for inflated cash_collected values`);
    
    // Filter for deals where cash_collected is significantly higher than value (at least 10x)
    const inflatedDeals = dealsWithInflatedValues.filter(deal => {
      if (!deal.value || !deal.cash_collected) return false;
      
      const valueNum = parseFloat(String(deal.value));
      const cashCollectedNum = parseFloat(String(deal.cash_collected));
      
      return !isNaN(valueNum) && 
             !isNaN(cashCollectedNum) && 
             cashCollectedNum > valueNum * 10;  // Threshold: cash_collected is 10x+ higher than value
    });
    
    console.log(`Found ${inflatedDeals.length} deals with inflated cash_collected values`);
    
    // Log the deals with inflated values for verification
    if (inflatedDeals.length > 0) {
      console.log("Deals with inflated cash_collected values:");
      inflatedDeals.forEach(deal => {
        console.log(`ID: ${deal.id}, Title: ${deal.title}, Value: ${deal.value}, Cash Collected: ${deal.cash_collected}, Close Date: ${deal.close_date}`);
      });
    }
    
    // Fix inflated values - set cash_collected to the actual deal value
    const updatePromises = inflatedDeals.map(deal => {
      // Use the deal value as the correct cash_collected value
      const correctedCashCollected = deal.value || "0";
      
      return db.update(deals)
        .set({
          cashCollected: correctedCashCollected
        })
        .where(eq(deals.id, deal.id));
    });
    
    // Execute all updates in parallel
    await Promise.all(updatePromises);
    
    console.log(`Updated cash_collected values for ${inflatedDeals.length} deals`);
    
    // Specifically check April 2025 deals
    const aprilDeals = await db.select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      cash_collected: deals.cashCollected,
      close_date: deals.closeDate
    }).from(deals)
      .where(sql`close_date >= '2025-04-01' AND close_date <= '2025-04-30' AND status = 'won'`);
    
    console.log(`\nApril 2025 deals after fix:`);
    aprilDeals.forEach(deal => {
      console.log(`ID: ${deal.id}, Title: ${deal.title}, Value: ${deal.value}, Cash Collected: ${deal.cash_collected}, Close Date: ${deal.close_date}`);
    });
    
    console.log("\nFix completed successfully");
  } catch (error) {
    console.error("Error fixing cash_collected values:", error);
  }
}

// Run the function
fixCashCollectedValues()
  .then(() => console.log("Script completed successfully"))
  .catch(err => console.error("Script failed:", err));