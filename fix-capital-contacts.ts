/**
 * Fix Capital Contacts
 * 
 * This script specifically targets the capital firms' contacts shown in the screenshots,
 * providing them with proper company names and linking them to Close CRM if needed.
 */

import dotenv from 'dotenv';
import chalk from 'chalk';
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
 * Main function to fix the capital contacts
 */
async function fixCapitalContacts() {
  log.section('Fix Capital Contacts');
  
  // Step 1: Update specific capital contacts with proper company names
  log.info('Updating capital contacts with proper company names');
  
  const updateResult = await contactMatchingService.updateCapitalContacts();
  
  log.success(`Updated ${updateResult.updated} contacts with proper company names`);
  
  if (updateResult.errors.length > 0) {
    log.warning('Encountered some errors:');
    updateResult.errors.forEach(error => log.warning(`- ${error}`));
  }
  
  hr();
  
  // Step 2: Get the emails that were just updated
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
  
  // Step 3: Get the contacts by email
  const updatedContacts = await contactMatchingService.getContactsByEmail(targetEmails);
  
  log.info(`Found ${updatedContacts.length} contacts to check for Close CRM integration`);
  
  // Step 4: Process these contacts to ensure Close CRM integration
  if (updatedContacts.length > 0) {
    log.info('Checking if these contacts exist in Close CRM');
    
    const batchResult = await contactMatchingService.processBatch(updatedContacts, {
      createIfNotFound: true,
      updateSourceCount: true
    });
    
    log.success(`Integration results:`);
    log.success(`- Matched with existing Close CRM leads: ${batchResult.matched}`);
    log.success(`- Created new Close CRM leads: ${batchResult.created}`);
    
    if (batchResult.failed > 0) {
      log.warning(`- Failed to process: ${batchResult.failed}`);
      batchResult.errors.forEach(error => log.warning(`  - ${error}`));
    }
  }
  
  log.section('Summary');
  log.success('Capital contacts have been updated with proper company names');
  log.success('Contacts have been checked and integrated with Close CRM');
  log.info('These contacts should now appear properly in the attribution system');
}

// Run the script
fixCapitalContacts().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});