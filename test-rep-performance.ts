/**
 * Rep Performance and Cash Collected Test Script
 * 
 * This script specifically tests the consistency of Cash Collected metrics and Rep Performance
 * with date filtering to ensure they match the enhanced revenue calculation.
 */

import { db } from "./server/db";
import { calculateRevenue, RevenueCalculationMode } from "./server/services/revenue-calculation";
import { deals } from "./shared/schema";
import { sql, and, gte, lte, eq, isNotNull } from "drizzle-orm";

async function testRepPerformance() {
  console.log("=== Rep Performance and Cash Collected Test ===\n");
  
  // Define test date range (First half of 2025)
  const startDate = new Date("2025-01-01T00:00:00.000Z");
  const endDate = new Date("2025-06-30T23:59:59.999Z");
  
  console.log(`Testing date range: ${startDate.toISOString()} to ${endDate.toISOString()}\n`);
  
  // 1. Get all reps with cash collected values in April 2025
  console.log("1. Testing rep-specific cash collected with direct database query:");
  const repsQuery = await db.select({
    userId: deals.assignedTo,
    dealId: deals.id,
    value: deals.value,
    cashCollected: deals.cashCollected
  })
  .from(deals)
  .where(and(
    isNotNull(deals.closeDate),
    gte(deals.closeDate, sql`${startDate}`),
    lte(deals.closeDate, sql`${endDate}`),
    isNotNull(deals.assignedTo)
  ));
  
  // Group by rep and aggregate values
  const repStats = repsQuery.reduce((result, deal) => {
    const userId = deal.userId || 'unassigned';
    
    if (!result[userId]) {
      result[userId] = { 
        userId, 
        totalDeals: 0, 
        totalValue: 0, 
        totalCashCollected: 0 
      };
    }
    
    result[userId].totalDeals += 1;
    
    try {
      const value = parseFloat(String(deal.value || '0')) || 0;
      result[userId].totalValue += value;
      
      const cashCollected = deal.cashCollected 
        ? parseFloat(String(deal.cashCollected || '0')) || 0
        : value; // Assume cash collected equals value for won deals if not specified
        
      result[userId].totalCashCollected += cashCollected;
    } catch (e) {
      console.error(`Error parsing deal values for user ${userId}:`, e);
    }
    
    return result;
  }, {});
  
  console.log(`Found ${Object.keys(repStats).length} reps with deals in April 2025`);
  
  if (Object.keys(repStats).length > 0) {
    console.log("\nTop 3 reps by cash collected:");
    const topReps = Object.values(repStats)
      .sort((a, b) => (b as any).totalCashCollected - (a as any).totalCashCollected)
      .slice(0, 3);
      
    topReps.forEach((rep: any) => {
      console.log(`  Rep ${rep.userId}: $${rep.totalCashCollected.toFixed(2)} cash collected from ${rep.totalDeals} deals`);
    });
  }
  
  // 2. Use revenue calculation service to get the same data for comparison
  console.log("\n2. Testing rep-specific cash collected with revenue calculation service:");
  
  // Get a list of unique rep IDs
  const repIds = Object.keys(repStats);
  let serviceResults = {};
  
  // Run the revenue calculation service for each rep
  for (const repId of repIds.slice(0, 3)) { // Limit to top 3 for brevity
    const repResult = await calculateRevenue({
      startDate,
      endDate,
      userId: repId,
      calculationMode: RevenueCalculationMode.CLOSE_DATE
    });
    
    serviceResults[repId] = repResult;
    
    console.log(`Rep ${repId} via service: $${repResult.totalCashCollected.toFixed(2)} cash collected from ${repResult.totalDeals} deals`);
  }
  
  // 3. Verify consistency
  console.log("\n3. Verifying consistency of cash collected metrics:");
  
  let allConsistent = true;
  for (const repId of Object.keys(serviceResults)) {
    const directValue = repStats[repId]?.totalCashCollected || 0;
    const serviceValue = serviceResults[repId]?.totalCashCollected || 0;
    
    // Allow for small floating point differences
    const isConsistent = Math.abs(directValue - serviceValue) < 0.01;
    
    console.log(`Rep ${repId}: ${isConsistent ? "✅ PASS" : "❌ FAIL"}`);
    
    if (!isConsistent) {
      console.log(`  Direct query: $${directValue.toFixed(2)}`);
      console.log(`  Calculation service: $${serviceValue.toFixed(2)}`);
      console.log(`  Difference: $${Math.abs(directValue - serviceValue).toFixed(2)}`);
      allConsistent = false;
    }
  }
  
  console.log(`\nOverall consistency check: ${allConsistent ? "✅ PASS" : "❌ FAIL"}`);
  console.log("\n=== Test Complete ===");
}

// Run the test
testRepPerformance()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Error in rep performance test:", error);
    process.exit(1);
  });