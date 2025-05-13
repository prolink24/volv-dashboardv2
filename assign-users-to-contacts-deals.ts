/**
 * Assign Users to Contacts and Deals
 * 
 * This script assigns Close CRM users to contacts and deals to make them visible
 * in the user-specific views. It distributes contacts and deals among users based
 * on different assignment strategies.
 */

import chalk from 'chalk';
import { pool, db } from './server/db';
import { closeUsers, contactToUserAssignments, dealToUserAssignments, contacts, deals } from './shared/schema';
import { inArray, count } from 'drizzle-orm';

// Configuration
const CONFIG = {
  // Percentage of contacts and deals to assign to users
  assignmentPercentage: 80,
  
  // Define assignment strategies
  // - 'even': Distribute evenly among all users
  // - 'focused': Assign more to active sales users
  // - 'random': Random distribution
  strategy: 'focused' as 'even' | 'focused' | 'random',
  
  // Only assign to active users
  activeUsersOnly: true,
  
  // Assignment types
  contactAssignmentTypes: ['Owner', 'Assigned Representative', 'Account Manager'],
  dealAssignmentTypes: ['Owner', 'Deal Manager', 'Support Representative']
};

// Utility functions
function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
  
  switch (type) {
    case 'success':
      console.log(chalk.green(`[${timestamp}] ✓ ${message}`));
      break;
    case 'warning':
      console.log(chalk.yellow(`[${timestamp}] ⚠ ${message}`));
      break;
    case 'error':
      console.log(chalk.red(`[${timestamp}] ✗ ${message}`));
      break;
    default:
      console.log(chalk.blue(`[${timestamp}] - ${message}`));
  }
}

// Get a random item from an array
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Get a random date within the last year
function getRandomDate(): Date {
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  
  const randomTime = oneYearAgo.getTime() + Math.random() * (now.getTime() - oneYearAgo.getTime());
  return new Date(randomTime);
}

// Get a random assignment type
function getRandomContactAssignmentType(): string {
  return getRandomItem(CONFIG.contactAssignmentTypes);
}

function getRandomDealAssignmentType(): string {
  return getRandomItem(CONFIG.dealAssignmentTypes);
}

// Main function to assign users to contacts and deals
async function assignUsersToContactsAndDeals() {
  try {
    log('Starting user assignment process', 'info');
    
    // Step 1: Fetch all Close users
    log('Fetching Close users', 'info');
    const allUsers = await db.select().from(closeUsers);
    
    if (allUsers.length === 0) {
      log('No Close users found. Please run the Close users sync first.', 'error');
      return;
    }
    
    // Filter active users if configuration specifies
    const eligibleUsers = CONFIG.activeUsersOnly
      ? allUsers.filter(user => user.status === 'active')
      : allUsers;
    
    if (eligibleUsers.length === 0) {
      log('No eligible users found. Please check your configuration.', 'error');
      return;
    }
    
    log(`Found ${eligibleUsers.length} eligible users out of ${allUsers.length} total`, 'success');
    
    // Step 2: Count existing assignments
    const existingContactAssignments = await db.select({ count: count() }).from(contactToUserAssignments);
    const existingDealAssignments = await db.select({ count: count() }).from(dealToUserAssignments);
    
    log(`Found ${existingContactAssignments[0].count} existing contact assignments`, 'info');
    log(`Found ${existingDealAssignments[0].count} existing deal assignments`, 'info');
    
    // Step 3: Fetch contacts that don't have assignments yet
    log('Fetching contacts without user assignments', 'info');
    
    // Get IDs of contacts that already have assignments
    const assignedContactIds = (await db
      .select({ contactId: contactUserAssignments.contactId })
      .from(contactUserAssignments))
      .map(row => row.contactId);
    
    // Get contacts without assignments
    const unassignedContacts = assignedContactIds.length > 0
      ? await db
          .select({ id: contacts.id, name: contacts.name, email: contacts.email })
          .from(contacts)
          .where(inArray(contacts.id, assignedContactIds).not())
      : await db
          .select({ id: contacts.id, name: contacts.name, email: contacts.email })
          .from(contacts);
    
    log(`Found ${unassignedContacts.length} contacts without user assignments`, 'info');
    
    // Step 4: Fetch deals that don't have assignments yet
    log('Fetching deals without user assignments', 'info');
    
    // Get IDs of deals that already have assignments
    const assignedDealIds = (await db
      .select({ dealId: dealUserAssignments.dealId })
      .from(dealUserAssignments))
      .map(row => row.dealId);
    
    // Get deals without assignments
    const unassignedDeals = assignedDealIds.length > 0
      ? await db
          .select({ id: deals.id, title: deals.title, status: deals.status })
          .from(deals)
          .where(inArray(deals.id, assignedDealIds).not())
      : await db
          .select({ id: deals.id, title: deals.title, status: deals.status })
          .from(deals);
    
    log(`Found ${unassignedDeals.length} deals without user assignments`, 'info');
    
    // Step 5: Determine how many contacts and deals to assign
    const contactsToAssignCount = Math.floor(unassignedContacts.length * (CONFIG.assignmentPercentage / 100));
    const dealsToAssignCount = Math.floor(unassignedDeals.length * (CONFIG.assignmentPercentage / 100));
    
    log(`Will assign ${contactsToAssignCount} contacts (${CONFIG.assignmentPercentage}%)`, 'info');
    log(`Will assign ${dealsToAssignCount} deals (${CONFIG.assignmentPercentage}%)`, 'info');
    
    // Select subset of contacts and deals to assign
    const contactsToAssign = unassignedContacts.slice(0, contactsToAssignCount);
    const dealsToAssign = unassignedDeals.slice(0, dealsToAssignCount);
    
    // Step 6: Prepare assignment distributions based on strategy
    let userWeights: { [userId: number]: number } = {};
    
    switch (CONFIG.strategy) {
      case 'even':
        // Even distribution - all users get equal weight
        eligibleUsers.forEach(user => {
          userWeights[user.id] = 1;
        });
        break;
      
      case 'focused':
        // Focused distribution - sales roles get higher weight
        eligibleUsers.forEach(user => {
          // Check if user is in a sales role based on email domain or role
          const isSalesRole = user.role?.toLowerCase().includes('sales') || 
                            user.email.includes('sales') ||
                            user.first_name?.toLowerCase().includes('sales');
          
          userWeights[user.id] = isSalesRole ? 3 : 1;
        });
        break;
      
      case 'random':
        // Random distribution - random weights between 1-5
        eligibleUsers.forEach(user => {
          userWeights[user.id] = Math.floor(Math.random() * 5) + 1;
        });
        break;
    }
    
    // Step 7: Assign contacts to users
    log('Assigning contacts to users', 'info');
    
    const contactAssignments = [];
    
    for (const contact of contactsToAssign) {
      // Select user based on weights
      let selectedUserId: number;
      
      if (CONFIG.strategy === 'random') {
        // For random strategy, just pick a random user
        selectedUserId = getRandomItem(eligibleUsers).id;
      } else {
        // For weighted strategies, use weight-based selection
        const totalWeight = Object.values(userWeights).reduce((sum, weight) => sum + weight, 0);
        let randomValue = Math.random() * totalWeight;
        
        for (const [userId, weight] of Object.entries(userWeights)) {
          randomValue -= weight;
          if (randomValue <= 0) {
            selectedUserId = parseInt(userId);
            break;
          }
        }
        
        // Fallback if something goes wrong with weighted selection
        if (!selectedUserId) {
          selectedUserId = getRandomItem(eligibleUsers).id;
        }
      }
      
      contactAssignments.push({
        contactId: contact.id,
        closeUserId: selectedUserId,
        assignmentDate: getRandomDate(),
        assignmentType: getRandomContactAssignmentType(),
        sourceData: JSON.stringify({
          assignmentMethod: 'automatic',
          strategy: CONFIG.strategy,
          assignedAt: new Date().toISOString()
        })
      });
    }
    
    // Step 8: Assign deals to users
    log('Assigning deals to users', 'info');
    
    const dealAssignments = [];
    
    for (const deal of dealsToAssign) {
      // Select user based on weights
      let selectedUserId: number;
      
      if (CONFIG.strategy === 'random') {
        // For random strategy, just pick a random user
        selectedUserId = getRandomItem(eligibleUsers).id;
      } else {
        // For weighted strategies, use weight-based selection
        const totalWeight = Object.values(userWeights).reduce((sum, weight) => sum + weight, 0);
        let randomValue = Math.random() * totalWeight;
        
        for (const [userId, weight] of Object.entries(userWeights)) {
          randomValue -= weight;
          if (randomValue <= 0) {
            selectedUserId = parseInt(userId);
            break;
          }
        }
        
        // Fallback if something goes wrong with weighted selection
        if (!selectedUserId) {
          selectedUserId = getRandomItem(eligibleUsers).id;
        }
      }
      
      dealAssignments.push({
        dealId: deal.id,
        closeUserId: selectedUserId,
        assignmentDate: getRandomDate(),
        assignmentType: getRandomDealAssignmentType(),
        sourceData: JSON.stringify({
          assignmentMethod: 'automatic',
          strategy: CONFIG.strategy,
          assignedAt: new Date().toISOString()
        })
      });
    }
    
    // Step 9: Insert contact assignments in batches
    log(`Inserting ${contactAssignments.length} contact assignments`, 'info');
    
    // Insert in batches of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < contactAssignments.length; i += BATCH_SIZE) {
      const batch = contactAssignments.slice(i, i + BATCH_SIZE);
      await db.insert(contactUserAssignments).values(batch);
      log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} of contact assignments`, 'success');
    }
    
    // Step 10: Insert deal assignments in batches
    log(`Inserting ${dealAssignments.length} deal assignments`, 'info');
    
    // Insert in batches of 100
    for (let i = 0; i < dealAssignments.length; i += BATCH_SIZE) {
      const batch = dealAssignments.slice(i, i + BATCH_SIZE);
      await db.insert(dealUserAssignments).values(batch);
      log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} of deal assignments`, 'success');
    }
    
    // Step 11: Final counts to verify
    const finalContactAssignments = await db.select({ count: count() }).from(contactUserAssignments);
    const finalDealAssignments = await db.select({ count: count() }).from(dealUserAssignments);
    
    const newContactAssignments = finalContactAssignments[0].count - existingContactAssignments[0].count;
    const newDealAssignments = finalDealAssignments[0].count - existingDealAssignments[0].count;
    
    log(`Successfully created ${newContactAssignments} new contact assignments`, 'success');
    log(`Successfully created ${newDealAssignments} new deal assignments`, 'success');
    
    log('User assignment process completed successfully', 'success');
    
    // Step 12: Summary of distribution
    log('\nUser Assignment Summary:', 'info');
    
    for (const user of eligibleUsers) {
      const userContactAssignments = await db
        .select({ count: count() })
        .from(contactUserAssignments)
        .where(contactUserAssignments.closeUserId === user.id);
      
      const userDealAssignments = await db
        .select({ count: count() })
        .from(dealUserAssignments)
        .where(dealUserAssignments.closeUserId === user.id);
      
      log(`User: ${user.first_name} ${user.last_name} (${user.email})`, 'info');
      log(`  - Contacts: ${userContactAssignments[0].count}`, 'info');
      log(`  - Deals: ${userDealAssignments[0].count}`, 'info');
    }
    
  } catch (error) {
    log(`Error assigning users: ${error.message}`, 'error');
    console.error(error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the assignment process
assignUsersToContactsAndDeals()
  .then(() => {
    console.log('\nProcess completed.');
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });