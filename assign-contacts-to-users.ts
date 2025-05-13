/**
 * Assign Contacts to Users
 * 
 * This script assigns contacts to Close CRM users to properly test the user-specific
 * views and metrics in the contact attribution system.
 */

import chalk from 'chalk';
import { db, pool } from './server/db';
import { contacts, closeUsers, contactToUserAssignments } from './shared/schema';
import { eq, desc, sql, countDistinct, count, not, inArray, and } from 'drizzle-orm';

async function main() {
  console.log(chalk.blue('Starting contact assignment process'));
  
  try {
    // Step 1: Count contacts and users
    const contactsCount = await db.select({
      count: count()
    }).from(contacts);
    
    const usersCount = await db.select({
      count: count()
    }).from(closeUsers).where(eq(closeUsers.status, 'active'));
    
    console.log(chalk.green(`Found ${contactsCount[0].count} contacts and ${usersCount[0].count} active Close users`));
    
    // Step 2: Get all active users
    const users = await db.select().from(closeUsers).where(eq(closeUsers.status, 'active'));
    
    if (users.length === 0) {
      console.log(chalk.red('No active users found. Please run sync first.'));
      return;
    }
    
    // Step 3: Get existing assignments
    const existingAssignments = await db.select({
      count: count()
    }).from(contactToUserAssignments);
    
    console.log(chalk.yellow(`Found ${existingAssignments[0].count} existing contact assignments`));
    
    // Step 4: Get assigned contact IDs
    const assignedContactIds = (await db.select({
      contactId: contactToUserAssignments.contactId
    }).from(contactToUserAssignments)).map(row => row.contactId);
    
    // Step 5: Get unassigned contacts (limited to 1000 to prevent overload)
    let unassignedContacts;
    
    if (assignedContactIds.length > 0) {
      // If we have existing assignments, exclude those contacts
      unassignedContacts = await db.select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email
      })
      .from(contacts)
      .where(
        and(
          sql`${contacts.id} NOT IN (${assignedContactIds.join(',')})`
        )
      )
      .limit(1000);
    } else {
      // If no existing assignments, just get the first 1000 contacts
      unassignedContacts = await db.select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email
      })
      .from(contacts)
      .limit(1000);
    }
    
    console.log(chalk.green(`Found ${unassignedContacts.length} unassigned contacts to process`));
    
    // Step 6: Prepare assignments (80% of unassigned contacts)
    const contactsToAssign = unassignedContacts.slice(0, Math.floor(unassignedContacts.length * 0.8));
    console.log(chalk.blue(`Will assign ${contactsToAssign.length} contacts to users`));
    
    // Step 7: Create assignments
    const assignments = [];
    const assignmentTypes = ['Owner', 'Assigned Representative', 'Account Manager'];
    
    for (const contact of contactsToAssign) {
      // Select a random user
      const randomUser = users[Math.floor(Math.random() * users.length)];
      
      // Select a random assignment type
      const randomType = assignmentTypes[Math.floor(Math.random() * assignmentTypes.length)];
      
      // Create assignment
      assignments.push({
        contactId: contact.id,
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
    console.log(chalk.blue('Inserting contact assignments...'));
    
    const BATCH_SIZE = 100;
    for (let i = 0; i < assignments.length; i += BATCH_SIZE) {
      const batch = assignments.slice(i, i + BATCH_SIZE);
      await db.insert(contactToUserAssignments).values(batch);
      console.log(chalk.green(`Inserted ${Math.min(i + BATCH_SIZE, assignments.length)} of ${assignments.length} assignments`));
    }
    
    // Step 9: Verify final count
    const finalAssignments = await db.select({
      count: count()
    }).from(contactToUserAssignments);
    
    console.log(chalk.green(`Successfully assigned contacts to users!`));
    console.log(chalk.green(`Total assignments: ${finalAssignments[0].count} (${finalAssignments[0].count - existingAssignments[0].count} new)`));
    
    // Step 10: Show assignment distribution
    console.log(chalk.blue('\nAssignment distribution by user:'));
    
    for (const user of users) {
      const userAssignments = await db.select({
        count: count()
      })
      .from(contactToUserAssignments)
      .where(eq(contactToUserAssignments.closeUserId, user.id));
      
      console.log(chalk.yellow(`${user.first_name} ${user.last_name} (${user.email}): ${userAssignments[0].count} contacts`));
    }
    
  } catch (error) {
    console.error(chalk.red('Error assigning contacts:'), error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);