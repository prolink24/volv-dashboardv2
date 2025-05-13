/**
 * Assign Deals to Users
 * 
 * This script assigns deals to Close CRM users to properly test the user-specific
 * views and metrics in the contact attribution system.
 */

import chalk from 'chalk';
import { db, pool } from './server/db';
import { deals, closeUsers, dealToUserAssignments } from './shared/schema';
import { eq, desc, sql, countDistinct, count, not, inArray, and } from 'drizzle-orm';

async function main() {
  console.log(chalk.blue('Starting deal assignment process'));
  
  try {
    // Step 1: Count deals and users
    const dealsCount = await db.select({
      count: count()
    }).from(deals);
    
    const usersCount = await db.select({
      count: count()
    }).from(closeUsers).where(eq(closeUsers.status, 'active'));
    
    console.log(chalk.green(`Found ${dealsCount[0].count} deals and ${usersCount[0].count} active Close users`));
    
    // Step 2: Get all active users
    const users = await db.select().from(closeUsers).where(eq(closeUsers.status, 'active'));
    
    if (users.length === 0) {
      console.log(chalk.red('No active users found. Please run sync first.'));
      return;
    }
    
    // Step 3: Get existing assignments
    const existingAssignments = await db.select({
      count: count()
    }).from(dealToUserAssignments);
    
    console.log(chalk.yellow(`Found ${existingAssignments[0].count} existing deal assignments`));
    
    // Step 4: Get assigned deal IDs
    const assignedDealIds = (await db.select({
      dealId: dealToUserAssignments.dealId
    }).from(dealToUserAssignments)).map(row => row.dealId);
    
    // Step 5: Get unassigned deals (limited to 1000 to prevent overload)
    let unassignedDeals;
    
    if (assignedDealIds.length > 0) {
      // If we have existing assignments, exclude those deals
      unassignedDeals = await db.select({
        id: deals.id,
        title: deals.title,
        status: deals.status
      })
      .from(deals)
      .where(
        and(
          sql`${deals.id} NOT IN (${assignedDealIds.join(',')})`
        )
      )
      .limit(1000);
    } else {
      // If no existing assignments, just get the first 1000 deals
      unassignedDeals = await db.select({
        id: deals.id,
        title: deals.title,
        status: deals.status
      })
      .from(deals)
      .limit(1000);
    }
    
    console.log(chalk.green(`Found ${unassignedDeals.length} unassigned deals to process`));
    
    // Step 6: Prepare assignments (80% of unassigned deals)
    const dealsToAssign = unassignedDeals.slice(0, Math.floor(unassignedDeals.length * 0.8));
    console.log(chalk.blue(`Will assign ${dealsToAssign.length} deals to users`));
    
    // Step 7: Create assignments
    const assignments = [];
    const assignmentTypes = ['Owner', 'Deal Manager', 'Support Representative'];
    
    for (const deal of dealsToAssign) {
      // Select a random user
      const randomUser = users[Math.floor(Math.random() * users.length)];
      
      // Select a random assignment type
      const randomType = assignmentTypes[Math.floor(Math.random() * assignmentTypes.length)];
      
      // Create assignment
      assignments.push({
        dealId: deal.id,
        closeUserId: randomUser.id,
        assignmentType: randomType,
        assignmentDate: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)), // Random date in last 30 days
        sourceData: JSON.stringify({
          assignmentMethod: 'automatic',
          assignedAt: new Date().toISOString()
        })
      });
    }
    
    // Step 8: Insert assignments in batches
    console.log(chalk.blue('Inserting deal assignments...'));
    
    const BATCH_SIZE = 100;
    for (let i = 0; i < assignments.length; i += BATCH_SIZE) {
      const batch = assignments.slice(i, i + BATCH_SIZE);
      await db.insert(dealToUserAssignments).values(batch);
      console.log(chalk.green(`Inserted ${Math.min(i + BATCH_SIZE, assignments.length)} of ${assignments.length} assignments`));
    }
    
    // Step 9: Verify final count
    const finalAssignments = await db.select({
      count: count()
    }).from(dealToUserAssignments);
    
    console.log(chalk.green(`Successfully assigned deals to users!`));
    console.log(chalk.green(`Total assignments: ${finalAssignments[0].count} (${finalAssignments[0].count - existingAssignments[0].count} new)`));
    
    // Step 10: Show assignment distribution
    console.log(chalk.blue('\nAssignment distribution by user:'));
    
    for (const user of users) {
      const userAssignments = await db.select({
        count: count()
      })
      .from(dealToUserAssignments)
      .where(eq(dealToUserAssignments.closeUserId, user.id));
      
      console.log(chalk.yellow(`${user.first_name} ${user.last_name} (${user.email}): ${userAssignments[0].count} deals`));
    }
    
    // Step 11: Distribution by assignment type
    console.log(chalk.blue('\nAssignment distribution by type:'));
    
    for (const type of assignmentTypes) {
      const typeAssignments = await db.select({
        count: count()
      })
      .from(dealToUserAssignments)
      .where(eq(dealToUserAssignments.assignmentType, type));
      
      console.log(chalk.yellow(`${type}: ${typeAssignments[0].count} deals`));
    }
    
  } catch (error) {
    console.error(chalk.red('Error assigning deals:'), error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);