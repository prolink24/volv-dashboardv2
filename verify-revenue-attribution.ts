/**
 * Verify Revenue Attribution
 * 
 * This script verifies that our fixes to the revenue attribution system work correctly:
 * 1. All won deals have correct cash_collected values
 * 2. All won deals have proper user assignments in the junction table
 * 3. The revenue calculation service correctly attributes deals to users
 */

import { db } from "./server/db";
import { deals, dealToUserAssignments, closeUsers } from "./shared/schema";
import { and, eq, gte, lte, isNotNull, sql } from "drizzle-orm";
import { calculateRevenue, RevenueCalculationMode } from "./server/services/revenue-calculation";

// Terminal colors for better readability
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
  };
  console.log(`${colorMap[type]}${message}${colors.reset}`);
}

function hr(): void {
  console.log("\n" + "-".repeat(80) + "\n");
}

async function verifyRevenueAttribution() {
  log("Starting comprehensive revenue attribution verification...", "info");
  hr();

  // Step 1: Verify all won deals have cash_collected values equal to their deal value
  log("Step 1: Verifying cash_collected values for won deals...", "info");
  
  const wonDeals = await db.select({
    id: deals.id,
    title: deals.title,
    closeId: deals.closeId,
    value: deals.value, 
    cashCollected: deals.cashCollected,
    closeDate: deals.closeDate,
    assignedTo: deals.assignedTo
  })
  .from(deals)
  .where(eq(deals.status, 'won'));
  
  log(`Found ${wonDeals.length} won deals in the database`, "info");
  
  let missingCashCollectedCount = 0;
  let incorrectCashCollectedCount = 0;
  
  for (const deal of wonDeals) {
    if (!deal.cashCollected) {
      missingCashCollectedCount++;
      log(`Deal ${deal.id} (${deal.title || 'Unnamed Deal'}) is missing cash_collected value`, "warning");
    } else if (Number(deal.cashCollected) !== Number(deal.value)) {
      incorrectCashCollectedCount++;
      log(`Deal ${deal.id} (${deal.title || 'Unnamed Deal'}) has incorrect cash_collected value: ${deal.cashCollected} vs ${deal.value}`, "warning");
    }
  }
  
  if (missingCashCollectedCount === 0 && incorrectCashCollectedCount === 0) {
    log(`All ${wonDeals.length} won deals have correct cash_collected values`, "success");
  } else {
    log(`Found ${missingCashCollectedCount} deals missing cash_collected values and ${incorrectCashCollectedCount} deals with incorrect cash_collected values`, "warning");
  }
  
  hr();
  
  // Step 2: Verify all won deals have proper user assignments in the junction table
  log("Step 2: Verifying user assignments in the junction table...", "info");
  
  let missingAssignmentCount = 0;
  let multipleAssignmentCount = 0;
  let wonDealsWithPrimaryAssignment = 0;
  
  for (const deal of wonDeals) {
    const assignments = await db.select()
      .from(dealToUserAssignments)
      .where(eq(dealToUserAssignments.dealId, deal.id));
    
    if (assignments.length === 0) {
      missingAssignmentCount++;
      log(`Deal ${deal.id} (${deal.title || 'Unnamed Deal'}) has no user assignments in junction table`, "warning");
    } else {
      const primaryAssignments = assignments.filter(a => a.assignmentType === 'primary');
      if (primaryAssignments.length === 0) {
        log(`Deal ${deal.id} (${deal.title || 'Unnamed Deal'}) has ${assignments.length} assignments but none are primary`, "warning");
      } else if (primaryAssignments.length > 1) {
        multipleAssignmentCount++;
        log(`Deal ${deal.id} (${deal.title || 'Unnamed Deal'}) has ${primaryAssignments.length} primary assignments (should have 1)`, "warning");
      } else {
        wonDealsWithPrimaryAssignment++;
      }
    }
  }
  
  if (missingAssignmentCount === 0 && multipleAssignmentCount === 0) {
    log(`All ${wonDeals.length} won deals have proper user assignments`, "success");
    log(`${wonDealsWithPrimaryAssignment} deals have exactly one primary assignment`, "success");
  } else {
    log(`Found ${missingAssignmentCount} deals without any user assignments and ${multipleAssignmentCount} deals with multiple primary assignments`, "warning");
  }
  
  hr();
  
  // Step 3: Check April 2025 deals specifically
  log("Step 3: Checking April 2025 deals specifically...", "info");
  
  const aprilDeals = await db.select({
    id: deals.id,
    title: deals.title,
    closeId: deals.closeId,
    value: deals.value, 
    cashCollected: deals.cashCollected,
    closeDate: deals.closeDate,
    assignedTo: deals.assignedTo,
    status: deals.status
  })
  .from(deals)
  .where(
    and(
      gte(deals.closeDate, sql`${'2025-04-01'}`),
      lte(deals.closeDate, sql`${'2025-04-30'}`),
      eq(deals.status, 'won')
    )
  );
  
  log(`Found ${aprilDeals.length} won deals in April 2025`, "info");
  
  // Calculate the expected total revenue for April 2025
  const aprilRevenue = aprilDeals.reduce((total, deal) => total + Number(deal.value), 0);
  log(`Total expected revenue for April 2025: $${aprilRevenue.toLocaleString()}`, "info");
  
  // Get Deal Maker's ID
  const dealMaker = await db.select()
    .from(closeUsers)
    .where(eq(closeUsers.closeId, 'user_xZPRj0Npd3RjWlWiYLAx0XzFFRiR5yzCKkpwieZVoqY'))
    .limit(1);
  
  if (dealMaker.length === 0) {
    log(`Deal Maker user not found in the database`, "error");
  } else {
    log(`Deal Maker's internal ID: ${dealMaker[0].id}`, "info");
    
    // Check Deal Maker's assignments for April deals
    for (const deal of aprilDeals) {
      const assignments = await db.select()
        .from(dealToUserAssignments)
        .where(
          and(
            eq(dealToUserAssignments.dealId, deal.id),
            eq(dealToUserAssignments.closeUserId, dealMaker[0].id)
          )
        );
      
      if (assignments.length === 0) {
        log(`Deal ${deal.id} (${deal.title || 'Unnamed Deal'}) is not assigned to Deal Maker`, "warning");
      } else {
        const primaryAssignments = assignments.filter(a => a.assignmentType === 'primary');
        if (primaryAssignments.length === 0) {
          log(`Deal ${deal.id} (${deal.title || 'Unnamed Deal'}) is assigned to Deal Maker but not as primary`, "warning");
        } else {
          log(`Deal ${deal.id} (${deal.title || 'Unnamed Deal'}) is correctly assigned to Deal Maker as primary`, "success");
        }
      }
    }
    
    hr();
    
    // Step 4: Test revenue calculation with the revenue calculation service
    log("Step 4: Testing revenue calculation with the revenue calculation service...", "info");
    
    const april2025Start = new Date('2025-04-01');
    const april2025End = new Date('2025-04-30');
    
    // Test with Deal Maker's ID
    const dealMakerRevenue = await calculateRevenue({
      startDate: april2025Start,
      endDate: april2025End,
      userId: dealMaker[0].closeId,
      calculationMode: RevenueCalculationMode.CLOSE_DATE
    });
    
    log(`Deal Maker's calculated revenue for April 2025:`, "info");
    log(`  Total Revenue: $${dealMakerRevenue.totalRevenue.toLocaleString()}`, "info");
    log(`  Cash Collected: $${dealMakerRevenue.totalCashCollected.toLocaleString()}`, "info");
    log(`  Total Deals: ${dealMakerRevenue.totalDeals}`, "info");
    
    if (dealMakerRevenue.totalRevenue === aprilRevenue) {
      log(`Revenue calculation is correct! Deal Maker is properly attributed all $${aprilRevenue.toLocaleString()} of April 2025 revenue`, "success");
    } else {
      log(`Revenue calculation mismatch! Expected $${aprilRevenue.toLocaleString()} but calculated $${dealMakerRevenue.totalRevenue.toLocaleString()}`, "error");
    }
    
    // Test total revenue with no user filter (should match or exceed Deal Maker's)
    const totalRevenue = await calculateRevenue({
      startDate: april2025Start,
      endDate: april2025End,
      calculationMode: RevenueCalculationMode.CLOSE_DATE
    });
    
    log(`Total calculated revenue for April 2025 (all users):`, "info");
    log(`  Total Revenue: $${totalRevenue.totalRevenue.toLocaleString()}`, "info");
    log(`  Cash Collected: $${totalRevenue.totalCashCollected.toLocaleString()}`, "info");
    log(`  Total Deals: ${totalRevenue.totalDeals}`, "info");
    
    if (totalRevenue.totalRevenue >= dealMakerRevenue.totalRevenue) {
      log(`Total revenue calculation looks correct`, "success");
    } else {
      log(`Total revenue is less than Deal Maker's revenue, which suggests an issue with the calculation`, "error");
    }
  }
  
  hr();
  log("Revenue attribution verification completed", "info");
}

// Run the verification
verifyRevenueAttribution()
  .then(() => {
    console.log("Verification completed successfully");
    process.exit(0);
  })
  .catch(err => {
    console.error("Verification failed:", err);
    process.exit(1);
  });