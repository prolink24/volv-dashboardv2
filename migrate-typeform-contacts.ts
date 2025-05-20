/**
 * Migrate and Match Typeform Contacts
 * 
 * This script:
 * 1. Updates the database schema to support external system IDs
 * 2. Finds all typeform contacts without Close CRM IDs
 * 3. Matches them with existing Close CRM records or creates new ones
 */

import dotenv from 'dotenv';
import chalk from 'chalk';
import { db } from './server/db';
import { eq, isNull, sql } from 'drizzle-orm';
import { contacts } from './shared/schema';
import * as contactMatchingService from './server/services/contact-matching';

dotenv.config();

// Utility for logging with colors
const log = {
  info: (msg: string) => console.log(chalk.blue(`[INFO] ${msg}`)),
  success: (msg: string) => console.log(chalk.green(`[SUCCESS] ${msg}`)),
  warning: (msg: string) => console.log(chalk.yellow(`[WARNING] ${msg}`)),
  error: (msg: string) => console.log(chalk.red(`[ERROR] ${msg}`)),
  section: (msg: string) => console.log(chalk.cyan(`\n=== ${msg.toUpperCase()} ===\n`))
};

function hr() {
  console.log(chalk.gray('─'.repeat(80)));
}

/**
 * Main migration function
 */
async function migrateTypeformContacts() {
  log.section('Typeform Contact Migration and Matching');
  
  // Step 1: Check for unlinked typeform contacts
  log.info('Checking for unlinked Typeform contacts...');
  
  const unlinkedContacts = await db.select()
    .from(contacts)
    .where(eq(contacts.leadSource, 'typeform'))
    .where(isNull(contacts.closeId));
  
  log.info(`Found ${unlinkedContacts.length} Typeform contacts without Close CRM IDs`);
  
  if (unlinkedContacts.length === 0) {
    log.success('All Typeform contacts are already linked to Close CRM. No migration needed.');
    return;
  }
  
  // Step 2: Run the matching process
  log.info('Starting contact matching process...');
  hr();
  
  const matchResult = await contactMatchingService.matchTypeformContactsToCloseCRM();
  
  if (!matchResult.success) {
    log.error('Contact matching process failed!');
    if (matchResult.errors.length > 0) {
      log.error('Errors:');
      matchResult.errors.forEach(error => log.error(`- ${error}`));
    }
    return;
  }
  
  // Step 3: Display results
  hr();
  log.section('Results');
  log.info(`Total contacts processed: ${matchResult.processed}`);
  log.success(`Matched with existing Close CRM leads: ${matchResult.matched}`);
  log.success(`Created new Close CRM leads: ${matchResult.created}`);
  log.warning(`Failed to process: ${matchResult.failed}`);
  
  if (matchResult.errors.length > 0) {
    log.section('Errors');
    matchResult.errors.forEach(error => log.error(`- ${error}`));
  }
  
  // Step 4: Verify results
  log.section('Verification');
  
  // Count remaining unlinked contacts
  const remainingUnlinked = await db.select({ count: sql`count(${contacts.id})` })
    .from(contacts)
    .where(eq(contacts.leadSource, 'typeform'))
    .where(isNull(contacts.closeId));
  
  const remainingCount = Number(remainingUnlinked[0]?.count) || 0;
  
  if (remainingCount === 0) {
    log.success('All Typeform contacts are now linked to Close CRM!');
  } else {
    log.warning(`There are still ${remainingCount} Typeform contacts without Close CRM IDs.`);
    log.info('You may need to run this script again or investigate these specific contacts.');
  }
  
  // Count multi-source contacts
  const multiSourceContacts = await db.select({ count: sql`count(${contacts.id})` })
    .from(contacts)
    .where(sql`${contacts.sources_count} > 1`);
  
  const multiSourceCount = Number(multiSourceContacts[0]?.count) || 0;
  const totalContacts = await db.select({ count: sql`count(${contacts.id})` }).from(contacts);
  const totalCount = Number(totalContacts[0]?.count) || 0;
  
  const multiSourceRate = totalCount > 0 ? Math.round((multiSourceCount / totalCount) * 100) : 0;
  
  log.info(`Multi-source contacts: ${multiSourceCount}/${totalCount} (${multiSourceRate}%)`);
  
  hr();
  log.success('Migration and matching process completed!');
}

// Run the migration script
migrateTypeformContacts().catch(error => {
  log.error(`Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});