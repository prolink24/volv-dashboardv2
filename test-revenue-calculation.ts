/**
 * Revenue Calculation Test Script
 * 
 * This script tests the consistency of revenue calculation with different date filtering methods
 * to ensure values match when using the enhanced calculation logic.
 */

import { db } from "./server/db";
import { calculateRevenue, RevenueCalculationMode } from "./server/services/revenue-calculation";
import { deals } from "./shared/schema";
import { sql, and, gte, lte, eq, isNotNull } from "drizzle-orm";

async function testRevenueCalculation() {
  console.log("=== Revenue Calculation Consistency Test ===\n");
  
  // Define a test date range (April 2025)
  const startDate = new Date("2025-04-01T00:00:00.000Z");
  const endDate = new Date("2025-04-30T23:59:59.999Z");
  
  console.log(`Testing date range: ${startDate.toISOString()} to ${endDate.toISOString()}\n`);
  
  // 1. Test direct database query with created_date filter
  console.log("1. Testing direct database query with created_date filter:");
  const createdDateDeals = await db.select({
    value: deals.value
  })
  .from(deals)
  .where(and(
    gte(deals.createdAt, sql`${startDate}`),
    lte(deals.createdAt, sql`${endDate}`)
  ));
  
  const createdDateTotal = createdDateDeals.reduce((sum, deal) => {
    try {
      return sum + (parseFloat(String(deal.value || '0')) || 0);
    } catch (e) {
      return sum;
    }
  }, 0);
  
  console.log(`Found ${createdDateDeals.length} deals created in April 2025`);
  console.log(`Total value using created_date filter: $${createdDateTotal.toFixed(2)}\n`);
  
  // 2. Test direct database query with close_date filter
  console.log("2. Testing direct database query with close_date filter:");
  const closeDateDeals = await db.select({
    value: deals.value
  })
  .from(deals)
  .where(and(
    isNotNull(deals.closeDate),
    gte(deals.closeDate, sql`${startDate}`),
    lte(deals.closeDate, sql`${endDate}`)
  ));
  
  const closeDateTotal = closeDateDeals.reduce((sum, deal) => {
    try {
      return sum + (parseFloat(String(deal.value || '0')) || 0);
    } catch (e) {
      return sum;
    }
  }, 0);
  
  console.log(`Found ${closeDateDeals.length} deals closed/won in April 2025`);
  console.log(`Total value using close_date filter: $${closeDateTotal.toFixed(2)}\n`);
  
  // 3. Test using the consistent revenue calculation service with created_date mode
  console.log("3. Testing revenue calculation service with created_date mode:");
  const createdDateResult = await calculateRevenue({
    startDate,
    endDate,
    calculationMode: RevenueCalculationMode.CREATED_DATE
  });
  
  console.log(`Found ${createdDateResult.totalDeals} deals with consistent revenue calculation`);
  console.log(`Total revenue: $${createdDateResult.totalRevenue.toFixed(2)}`);
  console.log(`Total cash collected: $${createdDateResult.totalCashCollected.toFixed(2)}\n`);
  
  // 4. Test using the consistent revenue calculation service with close_date mode
  console.log("4. Testing revenue calculation service with close_date mode:");
  const closeDateResult = await calculateRevenue({
    startDate,
    endDate,
    calculationMode: RevenueCalculationMode.CLOSE_DATE
  });
  
  console.log(`Found ${closeDateResult.totalDeals} deals with consistent revenue calculation`);
  console.log(`Total revenue: $${closeDateResult.totalRevenue.toFixed(2)}`);
  console.log(`Total cash collected: $${closeDateResult.totalCashCollected.toFixed(2)}\n`);
  
  // 5. Verify consistency between direct query and calculation service
  console.log("5. Verifying consistency between direct queries and calculation service:");
  
  const createdDateConsistency = Math.abs(createdDateTotal - createdDateResult.totalRevenue) < 0.01;
  const closeDateConsistency = Math.abs(closeDateTotal - closeDateResult.totalRevenue) < 0.01;
  
  console.log(`Created date consistency: ${createdDateConsistency ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Close date consistency: ${closeDateConsistency ? "✅ PASS" : "❌ FAIL"}`);
  
  if (!createdDateConsistency) {
    console.log(`  Direct query: $${createdDateTotal.toFixed(2)}`);
    console.log(`  Calculation service: $${createdDateResult.totalRevenue.toFixed(2)}`);
    console.log(`  Difference: $${Math.abs(createdDateTotal - createdDateResult.totalRevenue).toFixed(2)}`);
  }
  
  if (!closeDateConsistency) {
    console.log(`  Direct query: $${closeDateTotal.toFixed(2)}`);
    console.log(`  Calculation service: $${closeDateResult.totalRevenue.toFixed(2)}`);
    console.log(`  Difference: $${Math.abs(closeDateTotal - closeDateResult.totalRevenue).toFixed(2)}`);
  }
  
  console.log("\n=== Test Complete ===");
}

// Run the test
testRevenueCalculation()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Error in revenue calculation test:", error);
    process.exit(1);
  });