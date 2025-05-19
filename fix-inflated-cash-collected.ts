/**
 * Fix Inflated Cash Collected Values
 * 
 * This script specifically targets and fixes any inflated cash_collected values
 * in the April 2025 deals, ensuring all values match their corresponding deal values.
 */

import { db } from './server/db';
import { deals } from './shared/schema';
import { eq, sql } from 'drizzle-orm';

// Colors for console logs
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
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

/**
 * Fix inflated cash_collected values
 */
async function fixInflatedCashCollected() {
  log("Starting to fix inflated cash_collected values...", 'info');
  hr();
  
  try {
    // Step 1: Get April deals
    log("Step 1: Getting April 2025 deals...", 'info');
    const aprilDeals = await db.select()
      .from(deals)
      .where(
        sql`close_date >= '2025-04-01' AND close_date <= '2025-04-30' AND status = 'won'`
      );
    
    if (aprilDeals.length === 0) {
      log("No deals found for April 2025", 'error');
      return;
    }
    
    log(`Found ${aprilDeals.length} deals for April 2025`, 'success');
    
    // Step 2: Check for inflated values
    log("\nStep 2: Checking for inflated cash_collected values...", 'info');
    
    let fixedDeals = 0;
    let totalCashCollectedBefore = 0;
    let totalCashCollectedAfter = 0;
    
    for (const deal of aprilDeals) {
      const dealValue = parseFloat(deal.value as string || '0');
      const cashCollected = parseFloat(deal.cashCollected as string || '0');
      
      totalCashCollectedBefore += cashCollected;
      
      // Check if cash_collected is significantly higher than deal value
      if (cashCollected > dealValue * 1.1) {
        log(`Found inflated value: Deal ID ${deal.id}, value: $${dealValue.toLocaleString()}, cash_collected: $${cashCollected.toLocaleString()}`, 'warning');
        
        // Update cash_collected to match deal value
        await db.update(deals)
          .set({ cashCollected: deal.value })
          .where(eq(deals.id, deal.id));
        
        fixedDeals++;
        totalCashCollectedAfter += dealValue;
      } else {
        totalCashCollectedAfter += cashCollected;
      }
    }
    
    if (fixedDeals === 0) {
      log("No inflated cash_collected values found", 'success');
    } else {
      log(`\nFixed ${fixedDeals} deals with inflated cash_collected values`, 'success');
      log(`Total cash collected before fix: $${totalCashCollectedBefore.toLocaleString()}`, 'info');
      log(`Total cash collected after fix: $${totalCashCollectedAfter.toLocaleString()}`, 'success');
    }
    
    // Step 3: Verify all cash_collected values match deal values
    log("\nStep 3: Verifying all cash_collected values match deal values...", 'info');
    
    let mismatchedDeals = 0;
    
    for (const deal of aprilDeals) {
      const dealValue = parseFloat(deal.value as string || '0');
      const cashCollected = parseFloat(deal.cashCollected as string || '0');
      
      if (Math.abs(cashCollected - dealValue) > 0.01) {
        log(`Found mismatched value: Deal ID ${deal.id}, value: $${dealValue.toLocaleString()}, cash_collected: $${cashCollected.toLocaleString()}`, 'warning');
        
        // Update cash_collected to match deal value
        await db.update(deals)
          .set({ cashCollected: deal.value })
          .where(eq(deals.id, deal.id));
        
        mismatchedDeals++;
      }
    }
    
    if (mismatchedDeals === 0) {
      log("All cash_collected values match their deal values", 'success');
    } else {
      log(`\nFixed ${mismatchedDeals} deals with mismatched cash_collected values`, 'success');
    }
    
    // Step 4: Final verification
    log("\nStep 4: Performing final verification...", 'info');
    
    const updatedDeals = await db.select()
      .from(deals)
      .where(
        sql`close_date >= '2025-04-01' AND close_date <= '2025-04-30' AND status = 'won'`
      );
    
    let finalTotal = 0;
    let allMatched = true;
    
    for (const deal of updatedDeals) {
      const dealValue = parseFloat(deal.value as string || '0');
      const cashCollected = parseFloat(deal.cashCollected as string || '0');
      
      finalTotal += cashCollected;
      
      if (Math.abs(cashCollected - dealValue) > 0.01) {
        allMatched = false;
        log(`ALERT: Deal ID ${deal.id} still has mismatched values: value: $${dealValue.toLocaleString()}, cash_collected: $${cashCollected.toLocaleString()}`, 'error');
      }
    }
    
    if (allMatched) {
      log("All cash_collected values now correctly match their deal values", 'success');
    }
    
    log(`Final total cash collected: $${finalTotal.toLocaleString()}`, 'success');
    
    hr();
    log("Cash collected values fixed successfully", 'success');
  } catch (error) {
    log(`Error fixing cash collected values: ${(error as Error).message}`, 'error');
    console.error(error);
    throw error;
  }
}

// Run the script
fixInflatedCashCollected()
  .then(() => {
    log("Script completed successfully", 'success');
    process.exit(0);
  })
  .catch(err => {
    log(`Script failed: ${err.message}`, 'error');
    process.exit(1);
  });