/**
 * Update Company Names from Email Domains
 * 
 * This script analyzes contact email domains and updates company names
 * for contacts where the company field is empty or null.
 */

import { db } from './server/db';
import { contacts } from './shared/schema';
import { isNull, eq, or, and } from 'drizzle-orm';
import chalk from 'chalk';

// Logger functions for better readability
const log = {
  info: (message: string) => console.log(chalk.blue(`[INFO] ${message}`)),
  success: (message: string) => console.log(chalk.green(`[SUCCESS] ${message}`)),
  warning: (message: string) => console.log(chalk.yellow(`[WARNING] ${message}`)),
  error: (message: string) => console.log(chalk.red(`[ERROR] ${message}`)),
};

// Extract and format a company name from a domain
function extractCompanyFromDomain(email: string): string | null {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return null;
  }

  const domain = email.split('@')[1];
  if (!domain) {
    return null;
  }

  // Skip common email providers - these don't usually indicate a company
  const commonProviders = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
    'aol.com', 'icloud.com', 'mail.com', 'protonmail.com', 
    'zoho.com', 'yandex.com', 'gmx.com', 'live.com',
    'msn.com', 'protonmail.ch', 'mail.ru', 'example.com',
    'placeholder.com'
  ];

  if (commonProviders.includes(domain.toLowerCase())) {
    return null;
  }

  // Process domain to create a company name
  // Remove TLD (.com, .org, etc.) and split by dots
  const domainParts = domain.split('.');
  
  // Use only the main domain part, typically the second-to-last segment
  let companyPart = domainParts[0];
  
  if (domainParts.length > 2) {
    // Take the second-to-last part for subdomains
    companyPart = domainParts[domainParts.length - 2];
  }

  // Format: replace hyphens and underscores with spaces, capitalize
  let companyName = companyPart
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // Special case for capital-related domains
  if (domain.includes('capital') || domain.includes('ventures') || domain.includes('partners')) {
    companyName += ' ' + domain.split('.')[0].split('-').join(' ').toUpperCase();
  }
  
  return companyName;
}

async function updateCompanyNames() {
  console.log(chalk.blue(''));
  console.log(chalk.blue('=== UPDATE COMPANY NAMES ==='));
  console.log(chalk.blue(''));

  // Find contacts with missing company names
  const contactsWithoutCompany = await db.select()
    .from(contacts)
    .where(
      or(
        isNull(contacts.company),
        eq(contacts.company, '')
      )
    );
  
  log.info(`Found ${contactsWithoutCompany.length} contacts without company names`);

  if (contactsWithoutCompany.length === 0) {
    log.success('No contacts found with missing company names.');
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const contact of contactsWithoutCompany) {
    const email = contact.email;
    
    if (!email) {
      log.warning(`Skipping contact ID ${contact.id}: No email address found`);
      skipped++;
      continue;
    }

    const companyName = extractCompanyFromDomain(email);
    
    if (!companyName) {
      log.warning(`Skipping contact ID ${contact.id} (${email}): Cannot extract company from domain`);
      skipped++;
      continue;
    }

    // Update the contact's company name
    try {
      await db.update(contacts)
        .set({ company: companyName })
        .where(eq(contacts.id, contact.id));
      
      log.success(`Updated contact ${contact.name} (${email}): Added company "${companyName}"`);
      updated++;
    } catch (error) {
      log.error(`Error updating contact ${contact.id} (${email}): ${error}`);
      skipped++;
    }
  }

  console.log(chalk.gray('────────────────────────────────────────────────────────────────────────────────'));
  log.success(`Updated ${updated} contacts with company names`);
  if (skipped > 0) {
    log.warning(`Skipped ${skipped} contacts that couldn't be updated`);
  }
}

// Run the script
updateCompanyNames().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});