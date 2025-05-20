/**
 * Fix Unknown Contact Names
 * 
 * This script updates contacts with "Unknown Contact" names
 * by extracting better names from their email addresses.
 */

import { db } from './server/db';
import { contacts } from './shared/schema';
import { eq, and, like } from 'drizzle-orm';
import chalk from 'chalk';

// Logger functions for better readability
const log = {
  info: (message: string) => console.log(chalk.blue(`[INFO] ${message}`)),
  success: (message: string) => console.log(chalk.green(`[SUCCESS] ${message}`)),
  warning: (message: string) => console.log(chalk.yellow(`[WARNING] ${message}`)),
  error: (message: string) => console.log(chalk.red(`[ERROR] ${message}`)),
};

// Helper function to extract a name from an email address
function extractNameFromEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return 'Unknown Contact';
  }

  // Extract the part before @ symbol
  const namePart = email.split('@')[0];
  
  if (!namePart) {
    return 'Unknown Contact';
  }

  // Replace dots, underscores, dashes, and numbers with spaces
  const withSpaces = namePart.replace(/[._\-0-9]/g, ' ');
  
  // Capitalize each word
  const capitalized = withSpaces
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return capitalized || 'Unknown Contact';
}

async function fixUnknownContacts() {
  console.log(chalk.blue(''));
  console.log(chalk.blue('=== FIX UNKNOWN CONTACT NAMES ==='));
  console.log(chalk.blue(''));

  // Get contacts with "Unknown Contact" names
  const unknownContacts = await db.select()
    .from(contacts)
    .where(like(contacts.name, 'Unknown Contact%'));
  
  log.info(`Found ${unknownContacts.length} contacts with "Unknown Contact" names`);

  if (unknownContacts.length === 0) {
    log.success('No unknown contacts found. All contacts have proper names.');
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const contact of unknownContacts) {
    const email = contact.email;
    
    if (!email) {
      log.warning(`Skipping contact ID ${contact.id}: No email address found`);
      skipped++;
      continue;
    }

    const extractedName = extractNameFromEmail(email);
    
    if (extractedName === 'Unknown Contact') {
      log.warning(`Skipping contact ID ${contact.id}: Could not extract name from ${email}`);
      skipped++;
      continue;
    }

    // Update the contact name
    try {
      await db.update(contacts)
        .set({ name: extractedName })
        .where(eq(contacts.id, contact.id));
      
      log.success(`Updated contact: ${email} → ${extractedName}`);
      updated++;
    } catch (error) {
      log.error(`Error updating contact ${contact.id} (${email}): ${error}`);
      skipped++;
    }
  }

  console.log(chalk.gray('────────────────────────────────────────────────────────────────────────────────'));
  log.success(`Fixed ${updated} unknown contact names`);
  if (skipped > 0) {
    log.warning(`Skipped ${skipped} contacts that could not be updated`);
  }
}

// Run the script
fixUnknownContacts().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});