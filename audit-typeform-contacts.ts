/**
 * Typeform Contacts Audit Script
 * 
 * This script performs a comprehensive audit of all Typeform contacts
 * in the system to ensure they're properly linked and have complete data.
 */

import dotenv from 'dotenv';
import chalk from 'chalk';
import { db } from './server/db';
import { eq, isNull, sql, inArray, ne, and, or } from 'drizzle-orm';
import { contacts, forms } from './shared/schema';
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
 * Audit Typeform contacts in the system
 */
async function auditTypeformContacts() {
  log.section('Typeform Contacts Audit');
  
  // Get total contacts count
  const totalContactsResult = await db.select({ count: sql`count(*)` }).from(contacts);
  const totalContacts = Number(totalContactsResult[0]?.count || 0);
  
  // Get typeform contacts count
  const typeformContactsResult = await db.select({ count: sql`count(*)` })
    .from(contacts)
    .where(eq(contacts.leadSource, 'typeform'));
  const typeformContacts = Number(typeformContactsResult[0]?.count || 0);
  
  // Calculate percentage
  const typeformPercentage = totalContacts > 0 
    ? ((typeformContacts / totalContacts) * 100).toFixed(2) 
    : '0.00';
  
  log.info(`Total contacts in system: ${totalContacts}`);
  log.info(`Total Typeform contacts: ${typeformContacts} (${typeformPercentage}%)`);
  hr();
  
  // Check data completeness
  log.section('Data Completeness Check');
  
  // Check for missing names (Unknown Contact)
  const unknownContactsResult = await db.select({ count: sql`count(*)` })
    .from(contacts)
    .where(eq(contacts.leadSource, 'typeform'))
    .where(eq(contacts.name, 'Unknown Contact'));
  const unknownContacts = Number(unknownContactsResult[0]?.count || 0);
  
  // Check for missing company names
  const missingCompanyResult = await db.select({ count: sql`count(*)` })
    .from(contacts)
    .where(eq(contacts.leadSource, 'typeform'))
    .where(or(
      isNull(contacts.company),
      eq(contacts.company, '')
    ));
  const missingCompany = Number(missingCompanyResult[0]?.count || 0);

  // Check for missing Close IDs
  const missingCloseIdResult = await db.select({ count: sql`count(*)` })
    .from(contacts)
    .where(eq(contacts.leadSource, 'typeform'))
    .where(isNull(contacts.closeId));
  const missingCloseId = Number(missingCloseIdResult[0]?.count || 0);
  
  // Calculate percentages
  const unknownPercentage = typeformContacts > 0 
    ? ((unknownContacts / typeformContacts) * 100).toFixed(2) 
    : '0.00';
  const missingCompanyPercentage = typeformContacts > 0 
    ? ((missingCompany / typeformContacts) * 100).toFixed(2) 
    : '0.00';
  const missingCloseIdPercentage = typeformContacts > 0 
    ? ((missingCloseId / typeformContacts) * 100).toFixed(2) 
    : '0.00';
  
  log.info(`Unknown Contact names: ${unknownContacts} (${unknownPercentage}%)`);
  log.info(`Missing company names: ${missingCompany} (${missingCompanyPercentage}%)`);
  log.info(`Missing Close CRM IDs: ${missingCloseId} (${missingCloseIdPercentage}%)`);
  hr();
  
  // Check form submissions
  log.section('Form Submission Check');
  
  // Count total form submissions
  const formSubmissionsResult = await db.select({ count: sql`count(*)` }).from(forms);
  const formSubmissions = Number(formSubmissionsResult[0]?.count || 0);
  
  // Count orphaned form submissions (no contact)
  const orphanedFormsResult = await db.select({ count: sql`count(*)` })
    .from(forms)
    .where(isNull(forms.contactId));
  const orphanedForms = Number(orphanedFormsResult[0]?.count || 0);
  
  // Calculate percentage
  const orphanedFormsPercentage = formSubmissions > 0 
    ? ((orphanedForms / formSubmissions) * 100).toFixed(2) 
    : '0.00';
  
  log.info(`Total form submissions: ${formSubmissions}`);
  log.info(`Orphaned form submissions: ${orphanedForms} (${orphanedFormsPercentage}%)`);
  hr();
  
  // Check multi-source contacts
  log.section('Multi-Source Attribution Check');
  
  // Count contacts with sourcesCount > 1
  const multiSourceResult = await db.select({ count: sql`count(*)` })
    .from(contacts)
    .where(eq(contacts.leadSource, 'typeform'))
    .where(sql`${contacts.sourcesCount} > 1`);
  const multiSource = Number(multiSourceResult[0]?.count || 0);
  
  // Calculate percentage
  const multiSourcePercentage = typeformContacts > 0 
    ? ((multiSource / typeformContacts) * 100).toFixed(2) 
    : '0.00';
  
  log.info(`Multi-source attributed contacts: ${multiSource} (${multiSourcePercentage}%)`);
  hr();
  
  // Check capital firms
  log.section('Capital Firms Check');
  
  // List of capital firm domains
  const capitalDomains = [
    'atlasridge.io',
    'caucelcapital.com',
    'stowecap.co',
    'vortexcapital.io',
    'light3capital.com',
    'amaranthcp.com',
    'lightuscapital.com',
    'spikecapital.io'
  ];
  
  // Extract domains from emails
  const capitalContactsResult = await db.select()
    .from(contacts)
    .where(sql`SUBSTRING(${contacts.email} FROM POSITION('@' IN ${contacts.email}) + 1) IN (${capitalDomains.join(',')})`)
    .limit(50);  // Limiting to 50 to avoid overwhelming the console
  
  log.info(`Found ${capitalContactsResult.length} contacts from capital firms`);
  
  // Display data for these contacts
  if (capitalContactsResult.length > 0) {
    log.info('Capital firm contacts data:');
    
    const capitalStats = {
      total: capitalContactsResult.length,
      withCompany: 0,
      withCloseCrm: 0,
      unknownName: 0
    };
    
    for (const contact of capitalContactsResult) {
      const domain = contact.email.split('@')[1];
      const status = [
        contact.name !== 'Unknown Contact' ? '✓ name' : '✗ name',
        contact.company ? '✓ company' : '✗ company',
        contact.closeId ? '✓ Close ID' : '✗ Close ID'
      ].join(', ');
      
      log.info(`${contact.email} | ${status}`);
      
      if (contact.company) capitalStats.withCompany++;
      if (contact.closeId) capitalStats.withCloseCrm++;
      if (contact.name === 'Unknown Contact') capitalStats.unknownName++;
    }
    
    hr();
    log.info(`Capital firms summary:`);
    log.info(`- With company name: ${capitalStats.withCompany}/${capitalStats.total} (${(capitalStats.withCompany / capitalStats.total * 100).toFixed(2)}%)`);
    log.info(`- With Close CRM ID: ${capitalStats.withCloseCrm}/${capitalStats.total} (${(capitalStats.withCloseCrm / capitalStats.total * 100).toFixed(2)}%)`);
    log.info(`- With unknown name: ${capitalStats.unknownName}/${capitalStats.total} (${(capitalStats.unknownName / capitalStats.total * 100).toFixed(2)}%)`);
  }
  hr();
  
  // Summary and recommendations
  log.section('Audit Summary');
  
  const issues = [];
  if (unknownContacts > 0) issues.push(`${unknownContacts} contacts have "Unknown Contact" as name`);
  if (missingCompany > 0) issues.push(`${missingCompany} contacts are missing company names`);
  if (missingCloseId > 0) issues.push(`${missingCloseId} contacts are not linked to Close CRM`);
  if (orphanedForms > 0) issues.push(`${orphanedForms} form submissions are not linked to any contact`);
  
  if (issues.length > 0) {
    log.warning('The following issues were found:');
    issues.forEach(issue => log.warning(`- ${issue}`));
    
    log.info('\nRecommendations:');
    
    if (unknownContacts > 0) {
      log.info(`- Run 'fix-unknown-contacts.ts' to improve contact names based on email addresses`);
    }
    
    if (missingCompany > 0) {
      log.info(`- Run 'update-typeform-integration.ts' to update company names for contacts from recognizable domains`);
    }
    
    if (missingCloseId > 0) {
      log.info(`- Run 'merge-typeform-close-contacts.ts' in small batches to link contacts with Close CRM`);
    }
    
    if (orphanedForms > 0) {
      log.info(`- Run a repair script to link orphaned form submissions to matching contacts`);
    }
  } else {
    log.success('All Typeform contacts appear to be properly integrated!');
  }
}

// Run the audit
auditTypeformContacts().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});