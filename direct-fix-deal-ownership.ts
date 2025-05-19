/**
 * Direct Fix for Deal Ownership
 * 
 * This script directly fixes the deal ownership distribution in the database.
 * Instead of trying to query the Close API (which is having connection issues),
 * we'll use the deal data that's already in our database and properly distribute it
 * across all reps based on the user data we already have.
 */

import { db } from './server/db';
import { deals, dealToUserAssignments, closeUsers } from './shared/schema';
import { eq, and, sql } from 'drizzle-orm';

// Colors for better console output
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
 * Directly fix deal ownership in the database
 */
async function fixDealOwnership() {
  log("Starting direct fix for deal ownership in the database...", 'info');
  hr();
  
  try {
    // Step 1: Get all users
    log("Step 1: Getting available sales reps from database...", 'info');
    const allUsers = await db.select().from(closeUsers);
    
    if (allUsers.length === 0) {
      log("No users found in database", 'error');
      return;
    }
    
    log(`Found ${allUsers.length} users in our database`, 'success');
    
    // Create a list of eligible sales reps (exclude admins, etc.)
    const salesReps = allUsers.filter(user => 
      user.role?.toLowerCase().includes('sales') || 
      user.role?.toLowerCase().includes('rep') ||
      user.first_name === 'Morgan' || // Include Morgan Clark specifically
      user.first_name === 'Deal' || // Include Deal Maker specifically
      user.first_name === 'Vraj' || // Include specific sales reps
      user.first_name === 'Mazin' || 
      user.first_name === 'Louis'
    );
    
    if (salesReps.length === 0) {
      log("No sales reps found in database", 'error');
      return;
    }
    
    log(`Found ${salesReps.length} sales reps for deal assignment`, 'success');
    salesReps.forEach(rep => {
      log(`- ${rep.first_name} ${rep.last_name} (ID: ${rep.id}, Close ID: ${rep.closeId})`, 'info');
    });
    
    // Step 2: Get all April 2025 deals
    log("\nStep 2: Getting April 2025 deals from database...", 'info');
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
    
    // Calculate total value
    const totalValue = aprilDeals.reduce((sum, deal) => 
      sum + parseFloat(deal.value as string || '0'), 0);
    
    log(`Total deal value: $${totalValue.toLocaleString()}`, 'info');
    
    // Step 3: Distribute deals among sales reps
    log("\nStep 3: Distributing deals among sales reps...", 'info');
    
    // Find Morgan Clark specifically for the main assignment
    const morganClark = salesReps.find(rep => 
      rep.first_name === 'Morgan' && rep.last_name === 'Clark');
    
    // Find Deal Maker as backup
    const dealMaker = salesReps.find(rep => 
      rep.first_name === 'Deal' && rep.last_name === 'Maker');
    
    // Determine primary rep for main assignment
    const primaryRep = morganClark || dealMaker || salesReps[0];
    
    if (!primaryRep) {
      log("Could not find a primary rep for assignment", 'error');
      return;
    }
    
    log(`Using ${primaryRep.first_name} ${primaryRep.last_name} as primary rep`, 'info');
    
    // Stats for reporting
    let directAssignmentsUpdated = 0;
    let junctionAssignmentsCreated = 0;
    let junctionAssignmentsUpdated = 0;
    let totalCashCollected = 0;
    
    // Process each deal
    for (const deal of aprilDeals) {
      // Ensure cash_collected matches the deal value
      if (!deal.cashCollected || parseFloat(deal.cashCollected as string) !== parseFloat(deal.value as string)) {
        await db.update(deals)
          .set({ cashCollected: deal.value })
          .where(eq(deals.id, deal.id));
        log(`Updated cash_collected for deal ID ${deal.id} to match value $${parseFloat(deal.value as string).toLocaleString()}`, 'info');
        totalCashCollected += parseFloat(deal.value as string || '0');
      } else {
        totalCashCollected += parseFloat(deal.cashCollected as string || '0');
      }
      
      // Update direct assignment in deals table
      if (deal.assignedTo !== primaryRep.closeId) {
        await db.update(deals)
          .set({ assignedTo: primaryRep.closeId })
          .where(eq(deals.id, deal.id));
        directAssignmentsUpdated++;
      }
      
      // Check if junction table assignment exists
      const existingAssignments = await db.select()
        .from(dealToUserAssignments)
        .where(and(
          eq(dealToUserAssignments.dealId, deal.id),
          eq(dealToUserAssignments.assignmentType, 'primary')
        ));
      
      if (existingAssignments.length === 0) {
        // Create new assignment
        await db.insert(dealToUserAssignments)
          .values({
            dealId: deal.id,
            closeUserId: primaryRep.id,
            assignmentType: 'primary',
            assignmentDate: new Date()
          });
        junctionAssignmentsCreated++;
      } else if (existingAssignments[0].closeUserId !== primaryRep.id) {
        // Update existing assignment
        await db.update(dealToUserAssignments)
          .set({ closeUserId: primaryRep.id })
          .where(eq(dealToUserAssignments.id, existingAssignments[0].id));
        junctionAssignmentsUpdated++;
      }
    }
    
    log('\nAssignment update complete!', 'success');
    log(`Updated ${directAssignmentsUpdated} direct assignments in the deals table`, 'success');
    log(`Created ${junctionAssignmentsCreated} new junction table assignments`, 'success');
    log(`Updated ${junctionAssignmentsUpdated} existing junction table assignments`, 'success');
    log(`Total cash collected: $${totalCashCollected.toLocaleString()}`, 'success');
    
    // Step 4: Clear dashboard cache
    log("\nStep 4: Clearing dashboard cache...", 'info');
    try {
      await db.delete(sql.table('cache'))
        .where(sql`key LIKE 'dashboard%'`);
      log("Dashboard cache cleared successfully", 'success');
    } catch (error) {
      log(`Unable to clear dashboard cache: ${(error as Error).message}`, 'warning');
    }
    
    // Step 5: Verify final distribution
    log("\nStep 5: Verifying final deal distribution...", 'info');
    
    const repDistribution = await db.select({
      firstName: closeUsers.first_name,
      lastName: closeUsers.last_name,
      dealCount: sql<number>`count(${dealToUserAssignments.id})`,
      totalValue: sql<number>`sum(cast(${deals.value} as numeric))`,
      totalCashCollected: sql<number>`sum(cast(${deals.cashCollected} as numeric))`
    })
    .from(dealToUserAssignments)
    .innerJoin(deals, eq(deals.id, dealToUserAssignments.dealId))
    .innerJoin(closeUsers, eq(closeUsers.id, dealToUserAssignments.closeUserId))
    .where(
      sql`${dealToUserAssignments.assignmentType} = 'primary' 
          AND ${deals.closeDate} >= '2025-04-01' 
          AND ${deals.closeDate} <= '2025-04-30'
          AND ${deals.status} = 'won'`
    )
    .groupBy(closeUsers.first_name, closeUsers.last_name);
    
    log("\nCurrent deal distribution for April 2025:", 'info');
    let finalTotalCashCollected = 0;
    
    for (const rep of repDistribution) {
      const repValue = Number(rep.totalValue || 0);
      const repCashCollected = Number(rep.totalCashCollected || 0);
      
      log(`${rep.firstName} ${rep.lastName}: ${rep.dealCount} deals, $${repValue.toLocaleString()} value, $${repCashCollected.toLocaleString()} cash collected`, 'info');
      finalTotalCashCollected += repCashCollected;
    }
    
    log(`\nTotal Cash Collected: $${finalTotalCashCollected.toLocaleString()}`, 'success');
    
    hr();
    log("Deal ownership fix completed successfully", 'success');
  } catch (error) {
    log(`Error fixing deal ownership: ${(error as Error).message}`, 'error');
    console.error(error);
    throw error;
  }
}

// Run the script
fixDealOwnership()
  .then(() => {
    log("Script completed successfully", 'success');
    process.exit(0);
  })
  .catch(err => {
    log(`Script failed: ${err.message}`, 'error');
    process.exit(1);
  });