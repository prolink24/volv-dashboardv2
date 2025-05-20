/**
 * Fix Specific Typeform Contacts
 * 
 * This script focuses on fixing a specific set of Typeform contacts that
 * need to be linked with Close CRM.
 */

import dotenv from 'dotenv';
import chalk from 'chalk';
import { db } from './server/db';
import { eq, isNull, inArray } from 'drizzle-orm';
import { contacts } from './shared/schema';
import * as contactMatchingService from './server/services/contact-matching';

dotenv.config();

// Utility for logging
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
 * Main function to fix specific typeform contacts
 */
async function fixSpecificTypeformContacts() {
  log.section('Fix Specific Typeform Contacts');
  
  // List of emails from the screenshot that need fixing
  const targetEmails = [
    'tom@atlasridge.io',
    'axel@caucelcapital.com',
    'nick@stowecap.co',
    'dimitri@vortexcapital.io',
    'vlad@light3capital.com',
    'admin@amaranthcp.com',
    'alex@lightuscapital.com',
    'ali@spikecapital.io'
  ];
  
  log.info(`Fixing ${targetEmails.length} specific Typeform contacts`);
  hr();
  
  // Get all the contacts with these emails
  const targetContacts = await db.select()
    .from(contacts)
    .where(inArray(contacts.email, targetEmails));
  
  log.info(`Found ${targetContacts.length} contacts to process`);
  
  if (targetContacts.length === 0) {
    log.warning('No matching contacts found. Please verify the email addresses.');
    return;
  }
  
  // Process each contact
  let matched = 0;
  let created = 0;
  let failed = 0;
  const errors: string[] = [];
  
  for (const contact of targetContacts) {
    log.info(`Processing contact: ${contact.email}`);
    
    try {
      // Step 1: Search for the contact in Close CRM
      const searchResult = await contactMatchingService.findContactInCloseCRM(contact.email);
      
      if (!searchResult.success) {
        log.error(`Error searching Close CRM: ${searchResult.error}`);
        failed++;
        errors.push(`${contact.email}: ${searchResult.error}`);
        continue;
      }
      
      if (searchResult.contact) {
        // Match found in Close CRM
        log.success(`Found matching contact in Close CRM for ${contact.email}`);
        
        // Update our local contact with Close CRM details
        await db.update(contacts)
          .set({
            closeId: searchResult.contact.id,
            name: searchResult.contact.display_name || contact.name,
            company: searchResult.contact.organization_name || contact.company,
            sourcesCount: contact.sourcesCount ? contact.sourcesCount + 1 : 2
          })
          .where(eq(contacts.id, contact.id));
        
        log.success(`Updated local record for ${contact.email}`);
        matched++;
      } else {
        // No match in Close CRM, create a new contact there
        log.info(`No matching contact found in Close CRM for ${contact.email}. Creating new contact...`);
        
        const createResult = await contactMatchingService.createContactInCloseCRM({
          name: contact.name || 'Unknown Contact',
          email: contact.email,
          company: contact.company || 'Unknown Company',
          title: contact.title || '',
          phone: contact.phone || '',
          source: 'Typeform submission'
        });
        
        if (!createResult.success) {
          log.error(`Failed to create contact in Close CRM: ${createResult.error}`);
          failed++;
          errors.push(`${contact.email}: ${createResult.error}`);
          continue;
        }
        
        // Update our local contact with the new Close CRM ID
        await db.update(contacts)
          .set({
            closeId: createResult.contact.id,
            sourcesCount: contact.sourcesCount ? contact.sourcesCount + 1 : 2
          })
          .where(eq(contacts.id, contact.id));
        
        log.success(`Created and linked new contact in Close CRM for ${contact.email}`);
        created++;
      }
    } catch (error: any) {
      log.error(`Unexpected error processing ${contact.email}: ${error.message}`);
      failed++;
      errors.push(`${contact.email}: ${error.message}`);
    }
    
    hr();
  }
  
  // Display results
  log.section('Results');
  log.info(`Total contacts processed: ${targetContacts.length}`);
  log.success(`Matched with existing Close CRM leads: ${matched}`);
  log.success(`Created new Close CRM leads: ${created}`);
  log.warning(`Failed to process: ${failed}`);
  
  if (errors.length > 0) {
    log.section('Errors');
    errors.forEach(error => log.error(error));
  }
}

// Run the script
fixSpecificTypeformContacts().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});