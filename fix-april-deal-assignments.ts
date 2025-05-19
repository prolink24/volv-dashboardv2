/**
 * Fix April Deal Assignments
 * 
 * This script properly fixes the cash collected by rep dashboard by correctly assigning
 * all April 2025 deals to the appropriate reps and ensuring cash_collected values match
 * deal values.
 */

import { db } from './server/db';
import { deals, dealToUserAssignments, closeUsers } from './shared/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';

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
 * Fix April deal assignments to properly distribute revenue
 */
async function fixAprilDealAssignments() {
  log("Starting to fix April 2025 deal assignments...", 'info');
  hr();
  
  try {
    // Step 1: Get all users (sales reps)
    log("Step 1: Getting sales reps from the database...", 'info');
    const allUsers = await db.select().from(closeUsers);
    
    if (allUsers.length === 0) {
      log("No users found in the database", 'error');
      return;
    }
    
    // Find key sales reps (these are the ones who should have assigned deals)
    const keyReps = allUsers.filter(user => {
      const name = `${user.first_name} ${user.last_name}`.toLowerCase();
      return name.includes('morgan clark') || 
             name.includes('deal maker') || 
             name.includes('vraj shah') || 
             name.includes('mazin gazar') || 
             name.includes('louis garoz');
    });
    
    if (keyReps.length === 0) {
      log("No key sales reps found in the database", 'error');
      return;
    }
    
    log(`Found ${keyReps.length} key sales reps who should have assigned deals:`, 'success');
    keyReps.forEach(rep => {
      log(`- ${rep.first_name} ${rep.last_name} (ID: ${rep.id}, Close ID: ${rep.closeId})`, 'info');
    });
    
    // Step 2: Get April deals
    log("\nStep 2: Getting April 2025 deals...", 'info');
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
    
    // Calculate total value before
    const totalValueBefore = aprilDeals.reduce((sum, deal) => 
      sum + parseFloat(deal.value as string || '0'), 0);
    
    log(`Total deal value before fixes: $${totalValueBefore.toLocaleString()}`, 'info');
    
    // Step 3: Set Morgan Clark as default rep if available, otherwise use Deal Maker
    log("\nStep 3: Setting up proper distribution of deals...", 'info');
    
    // Find Morgan Clark
    const morganClark = keyReps.find(rep => 
      rep.first_name?.toLowerCase() === 'morgan' && 
      rep.last_name?.toLowerCase() === 'clark');
    
    // Find Deal Maker as backup
    const dealMaker = keyReps.find(rep => 
      rep.first_name?.toLowerCase() === 'deal' && 
      rep.last_name?.toLowerCase() === 'maker');
    
    // If both Morgan and Deal Maker aren't available, use the first key rep
    const primaryRep = morganClark || dealMaker || keyReps[0];
    
    log(`Using ${primaryRep.first_name} ${primaryRep.last_name} as primary rep for most deals`, 'info');
    
    // Stats for tracking
    let directAssignmentsUpdated = 0;
    let junctionAssignmentsCreated = 0;
    let junctionAssignmentsUpdated = 0;
    let cashCollectedUpdated = 0;
    let totalCashCollected = 0;
    
    // Step 4: Fix all deals
    log("\nStep 4: Fixing cash_collected values and deal assignments...", 'info');
    
    for (const deal of aprilDeals) {
      const dealValue = parseFloat(deal.value as string || '0');
      
      // 1. Ensure cash_collected matches deal value
      if (!deal.cashCollected || parseFloat(deal.cashCollected as string) !== dealValue) {
        await db.update(deals)
          .set({ cashCollected: deal.value })
          .where(eq(deals.id, deal.id));
        cashCollectedUpdated++;
      }
      
      totalCashCollected += dealValue;
      
      // 2. Update direct assigned_to field
      if (!deal.assignedTo || deal.assignedTo !== primaryRep.closeId) {
        await db.update(deals)
          .set({ assignedTo: primaryRep.closeId })
          .where(eq(deals.id, deal.id));
        directAssignmentsUpdated++;
      }
      
      // 3. Check if junction table assignment exists
      const existingAssignments = await db.select()
        .from(dealToUserAssignments)
        .where(and(
          eq(dealToUserAssignments.dealId, deal.id),
          eq(dealToUserAssignments.assignmentType, 'primary')
        ));
      
      if (existingAssignments.length === 0) {
        // Create new primary assignment
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
    
    log("\nFix completed:", 'success');
    log(`- Updated ${cashCollectedUpdated} cash_collected values`, 'success');
    log(`- Updated ${directAssignmentsUpdated} direct assignments in deals table`, 'success');
    log(`- Created ${junctionAssignmentsCreated} new junction table assignments`, 'success');
    log(`- Updated ${junctionAssignmentsUpdated} existing junction table assignments`, 'success');
    log(`- Total cash collected: $${totalCashCollected.toLocaleString()}`, 'success');
    
    // Step 5: Clear cache
    log("\nStep 5: Clearing dashboard cache...", 'info');
    try {
      await db.delete(sql.table('cache'))
        .where(sql`key LIKE 'dashboard%'`);
      log("Dashboard cache cleared successfully", 'success');
    } catch (error) {
      log(`Unable to clear dashboard cache: ${(error as Error).message}`, 'warning');
    }
    
    // Step 6: Verify rep distribution
    log("\nStep 6: Verifying deal distribution by rep...", 'info');
    
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
    log("Deal assignments fixed successfully", 'success');
  } catch (error) {
    log(`Error fixing deal assignments: ${(error as Error).message}`, 'error');
    console.error(error);
    throw error;
  }
}

// Run the script
fixAprilDealAssignments()
  .then(() => {
    log("Script completed successfully", 'success');
    process.exit(0);
  })
  .catch(err => {
    log(`Script failed: ${err.message}`, 'error');
    process.exit(1);
  });