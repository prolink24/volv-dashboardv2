/**
 * Fix Cash Collected Values
 * 
 * This script corrects the inflated cash_collected values for won deals,
 * ensuring accurate financial data when filtering by date range.
 */

import chalk from 'chalk';
import { db } from './server/db';
import { deals } from './shared/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';

async function fixCashCollectedValues() {
  console.log(chalk.blue('=== Fixing Cash Collected Values ===\n'));

  // Step 1: Get all won deals with cash_collected values
  console.log(chalk.blue('Step 1: Finding deals with inflated cash_collected values...'));

  const dealsWithCashCollected = await db.select({
    id: deals.id,
    closeId: deals.closeId,
    title: deals.title,
    value: deals.value,
    status: deals.status,
    cashCollected: deals.cashCollected
  })
  .from(deals)
  .where(
    and(
      eq(deals.status, 'won'),
      isNotNull(deals.cashCollected)
    )
  );

  console.log(`Found ${dealsWithCashCollected.length} won deals with cash_collected values`);

  // Step 2: Identify deals with inflated cash_collected values
  const inflatedDeals = dealsWithCashCollected.filter(deal => {
    let dealValue = 0;
    let cashCollected = 0;

    // Parse the values safely
    if (deal.value) {
      try {
        dealValue = typeof deal.value === 'string' ? parseFloat(deal.value) : deal.value;
      } catch (e) {
        dealValue = 0;
      }
    }

    if (deal.cashCollected) {
      try {
        cashCollected = typeof deal.cashCollected === 'string' ? 
          parseFloat(deal.cashCollected) : deal.cashCollected;
      } catch (e) {
        cashCollected = 0;
      }
    }

    // Consider it inflated if cash_collected is more than 2x the deal value
    // (allowing for some reasonable buffer)
    return cashCollected > (dealValue * 2) && dealValue > 0;
  });

  console.log(`Identified ${inflatedDeals.length} deals with inflated cash_collected values`);

  // Step 3: Update the deals to correct cash_collected values
  console.log(chalk.blue('\nStep 3: Updating deals with correct cash_collected values...'));

  let updatedCount = 0;
  let errorCount = 0;

  for (const deal of inflatedDeals) {
    try {
      let dealValue = 0;
      
      // Parse the value safely
      if (deal.value) {
        dealValue = typeof deal.value === 'string' ? parseFloat(deal.value) : deal.value;
      }

      // Set cash_collected to exactly match the deal value
      await db.update(deals)
        .set({ 
          cashCollected: dealValue.toString()
        })
        .where(eq(deals.id, deal.id));

      updatedCount++;
      console.log(chalk.green(`✅ Fixed deal #${deal.id}: ${deal.title || 'Untitled'}`));
      console.log(`   Before: $${deal.cashCollected}, After: $${dealValue}`);
    } catch (error) {
      errorCount++;
      console.log(chalk.red(`❌ Error fixing deal #${deal.id}: ${error.message}`));
    }
  }

  // Step 4: Verify the fixes
  console.log(chalk.blue('\nStep 4: Verifying the fixes...'));

  // Verify each deal individually to avoid SQL parameter size limitations
  const verifiedDeals = [];
  for (const deal of inflatedDeals) {
    const result = await db.select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      cashCollected: deals.cashCollected
    })
    .from(deals)
    .where(eq(deals.id, deal.id));
    
    if (result.length > 0) {
      verifiedDeals.push(result[0]);
    }
  }

  let correctCount = 0;
  for (const deal of verifiedDeals) {
    let dealValue = typeof deal.value === 'string' ? parseFloat(deal.value) : (deal.value || 0);
    let cashCollected = typeof deal.cashCollected === 'string' ? 
      parseFloat(deal.cashCollected) : (deal.cashCollected || 0);
    
    // Allow for small rounding differences
    if (Math.abs(dealValue - cashCollected) < 1) {
      correctCount++;
    } else {
      console.log(chalk.yellow(`⚠️ Deal #${deal.id} still has incorrect values:`));
      console.log(`   Value: $${dealValue}, Cash Collected: $${cashCollected}`);
    }
  }

  console.log(chalk.blue('\n=== Summary ==='));
  console.log(`Total won deals with cash_collected: ${dealsWithCashCollected.length}`);
  console.log(`Deals with inflated values: ${inflatedDeals.length}`);
  console.log(`Successfully updated: ${updatedCount}`);
  console.log(`Verified correct: ${correctCount}/${inflatedDeals.length}`);
  console.log(`Errors encountered: ${errorCount}`);

  if (correctCount === inflatedDeals.length) {
    console.log(chalk.green('\n✅ All deals fixed successfully!'));
  } else {
    console.log(chalk.yellow(`\n⚠️ Some deals may still have incorrect values (${inflatedDeals.length - correctCount})`));
  }
}

// Run the fix
fixCashCollectedValues()
  .then(() => {
    console.log('Fix completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running fix:', error);
    process.exit(1);
  });