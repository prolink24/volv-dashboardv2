/**
 * Enhanced Typeform Integration Script
 * 
 * This script provides a comprehensive fix for Typeform integration issues by:
 * 1. Updating unknown contact names
 * 2. Adding company names based on email domains
 * 3. Linking contacts to Close CRM
 * 
 * The script processes contacts in optimized batches for better performance
 * and includes detailed error handling and reporting.
 */

import { db } from './server/db';
import { contacts } from './shared/schema';
import { isNull, eq, like, or, and, ne } from 'drizzle-orm';
import axios from 'axios';
import chalk from 'chalk';

const CLOSE_API_KEY = process.env.CLOSE_API_KEY || 'api_1JLEeJyrMIolaQhrCxHSwP.5e8Ek5aBf6HWvcGOZRmbni';
const CLOSE_API_URL = 'https://api.close.com/api/v1';
const BATCH_SIZE = 50; // Process 50 contacts per batch

// Logger functions for better readability
const log = {
  info: (message: string) => console.log(chalk.blue(`[INFO] ${message}`)),
  success: (message: string) => console.log(chalk.green(`[SUCCESS] ${message}`)),
  warning: (message: string) => console.log(chalk.yellow(`[WARNING] ${message}`)),
  error: (message: string) => console.log(chalk.red(`[ERROR] ${message}`)),
};

// Helper function for horizontal rule
function hr() {
  console.log(chalk.gray('────────────────────────────────────────────────────────────────────────────────'));
}

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

// Find a lead by email
async function findLeadByEmail(email: string) {
  try {
    const response = await axios.get(`${CLOSE_API_URL}/lead/`, {
      auth: {
        username: CLOSE_API_KEY,
        password: ''
      },
      params: {
        email_address: email
      }
    });
    
    const data = response.data;
    if (data && data.data && data.data.length > 0) {
      return data.data[0];
    }
    
    return null;
  } catch (error: any) {
    log.error(`Error finding lead by email: ${error.message}`);
    if (error.response) {
      log.error(`Status: ${error.response.status}`);
      log.error(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

// Create a lead in Close CRM
async function createLeadInClose(contact: any) {
  try {
    const payload = {
      name: contact.name,
      contacts: [{
        name: contact.name,
        emails: [{ email: contact.email, type: 'office' }],
        phones: contact.phone ? [{ phone: contact.phone, type: 'office' }] : []
      }],
      custom: {
        source: contact.source || 'Typeform'
      }
    };

    if (contact.company) {
      // @ts-ignore
      payload.custom.company = contact.company;
    }

    const response = await axios.post(`${CLOSE_API_URL}/lead/`, payload, {
      auth: {
        username: CLOSE_API_KEY,
        password: ''
      }
    });
    
    return response.data;
  } catch (error: any) {
    log.error(`Error creating lead in Close: ${error.message}`);
    if (error.response) {
      log.error(`Status: ${error.response.status}`);
      log.error(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

async function processContactBatch(contactBatch: any[]) {
  let updatedNames = 0;
  let updatedCompanies = 0;
  let linkedToClose = 0;
  let createdInClose = 0;
  let errors = 0;

  for (const contact of contactBatch) {
    try {
      const updates: any = {};
      let madeUpdates = false;
      
      // 1. Fix Unknown Contact names
      if (contact.name && contact.name.includes('Unknown Contact') && contact.email) {
        const extractedName = extractNameFromEmail(contact.email);
        if (extractedName !== 'Unknown Contact') {
          updates.name = extractedName;
          madeUpdates = true;
          updatedNames++;
        }
      }
      
      // 2. Add company names for empty company fields
      if ((!contact.company || contact.company === '') && contact.email) {
        const companyName = extractCompanyFromDomain(contact.email);
        if (companyName) {
          updates.company = companyName;
          madeUpdates = true;
          updatedCompanies++;
        }
      }
      
      // 3. Link to Close CRM if not already linked
      if (!contact.closeId && contact.email) {
        // Try to find lead in Close
        const lead = await findLeadByEmail(contact.email);
        
        if (lead) {
          updates.closeId = lead.id;
          madeUpdates = true;
          linkedToClose++;
          log.info(`Found existing lead in Close: ${lead.id} (${lead.display_name})`);
        } else {
          // Try to create a new lead in Close
          const newLead = await createLeadInClose(contact);
          if (newLead) {
            updates.closeId = newLead.id;
            madeUpdates = true;
            createdInClose++;
            log.success(`Created new lead in Close: ${newLead.id} (${newLead.display_name})`);
          }
        }
      }
      
      // Apply updates if we have any
      if (madeUpdates) {
        await db.update(contacts)
          .set(updates)
          .where(eq(contacts.id, contact.id));
        
        log.success(`Updated contact: ${contact.name} (${contact.email})`);
      }
    } catch (error: any) {
      log.error(`Error processing contact ${contact.id} (${contact.email}): ${error.message}`);
      errors++;
    }
  }

  return {
    updatedNames,
    updatedCompanies,
    linkedToClose,
    createdInClose,
    errors
  };
}

async function getContactsToProcess(limit: number, nameFilter: boolean = false, companyFilter: boolean = false, closeIdFilter: boolean = false) {
  let query = db.select().from(contacts);
  
  const conditions = [];
  
  if (nameFilter) {
    conditions.push(like(contacts.name, 'Unknown Contact%'));
  }
  
  if (companyFilter) {
    conditions.push(or(isNull(contacts.company), eq(contacts.company, '')));
  }
  
  if (closeIdFilter) {
    conditions.push(isNull(contacts.closeId));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  
  return await query.limit(limit);
}

async function enhancedTypeformIntegration() {
  console.log(chalk.blue(''));
  console.log(chalk.blue('=== ENHANCED TYPEFORM INTEGRATION ==='));
  console.log(chalk.blue(''));

  // Test Close API connection
  log.info(`Using Close API key: ${CLOSE_API_KEY.substring(0, 5)}...${CLOSE_API_KEY.substring(CLOSE_API_KEY.length - 5)}`);
  log.info('Testing Close API connection...');
  
  try {
    const response = await axios.get(`${CLOSE_API_URL}/me/`, {
      auth: {
        username: CLOSE_API_KEY,
        password: ''
      }
    });
    log.success(`Connected to Close as: ${response.data.first_name} ${response.data.last_name}`);
  } catch (error: any) {
    log.error(`Could not connect to Close API: ${error.message}`);
    if (error.response) {
      log.error(`Status: ${error.response.status}`);
      log.error(`Response: ${JSON.stringify(error.response.data)}`);
    }
    log.error('Cannot proceed without Close API connection. Please check your API key and try again.');
    return;
  }

  // Process in order of priority:
  // 1. Unknown Contact names (highest priority)
  // 2. Missing company names 
  // 3. Missing Close CRM IDs

  // Step 1: Unknown Contact names
  const unknownContacts = await getContactsToProcess(BATCH_SIZE, true, false, false);
  if (unknownContacts.length > 0) {
    log.info(`Processing ${unknownContacts.length} contacts with Unknown Contact names`);
    hr();
    const results1 = await processContactBatch(unknownContacts);
    log.success(`Fixed ${results1.updatedNames} unknown contact names`);
    log.success(`Added ${results1.updatedCompanies} company names`);
    log.success(`Linked ${results1.linkedToClose} contacts to existing Close leads`);
    log.success(`Created ${results1.createdInClose} new leads in Close`);
    if (results1.errors > 0) {
      log.warning(`Encountered ${results1.errors} errors during processing`);
    }
    hr();
  } else {
    log.success('No contacts with Unknown Contact names found. Moving to next step.');
  }

  // Step 2: Missing company names
  const noCompanyContacts = await getContactsToProcess(BATCH_SIZE, false, true, false);
  if (noCompanyContacts.length > 0) {
    log.info(`Processing ${noCompanyContacts.length} contacts without company names`);
    hr();
    const results2 = await processContactBatch(noCompanyContacts);
    log.success(`Fixed ${results2.updatedNames} unknown contact names`);
    log.success(`Added ${results2.updatedCompanies} company names`);
    log.success(`Linked ${results2.linkedToClose} contacts to existing Close leads`);
    log.success(`Created ${results2.createdInClose} new leads in Close`);
    if (results2.errors > 0) {
      log.warning(`Encountered ${results2.errors} errors during processing`);
    }
    hr();
  } else {
    log.success('No contacts without company names found. Moving to next step.');
  }

  // Step 3: Missing Close CRM IDs
  const noCloseIdContacts = await getContactsToProcess(BATCH_SIZE, false, false, true);
  if (noCloseIdContacts.length > 0) {
    log.info(`Processing ${noCloseIdContacts.length} contacts without Close CRM IDs`);
    hr();
    const results3 = await processContactBatch(noCloseIdContacts);
    log.success(`Fixed ${results3.updatedNames} unknown contact names`);
    log.success(`Added ${results3.updatedCompanies} company names`);
    log.success(`Linked ${results3.linkedToClose} contacts to existing Close leads`);
    log.success(`Created ${results3.createdInClose} new leads in Close`);
    if (results3.errors > 0) {
      log.warning(`Encountered ${results3.errors} errors during processing`);
    }
    hr();
  } else {
    log.success('No contacts without Close CRM IDs found. Integration is complete!');
  }

  log.info('To process more contacts, run this script again.');
}

// Run the script
enhancedTypeformIntegration().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});