/**
 * Merge Typeform and Close CRM Contacts
 * 
 * This script efficiently merges Typeform and Close CRM contacts by:
 * 1. Processing contacts in small batches to avoid timeouts
 * 2. Using email matching to find existing Close CRM contacts
 * 3. Updating our database to link contacts from both systems
 */

import dotenv from 'dotenv';
import chalk from 'chalk';
import { db } from './server/db';
import { eq, isNull, sql } from 'drizzle-orm';
import { contacts } from './shared/schema';
import axios from 'axios';

dotenv.config();

// Configure Close API client
const CLOSE_API_KEY = process.env.CLOSE_API_KEY;

if (!CLOSE_API_KEY) {
  console.error(chalk.red('ERROR: CLOSE_API_KEY is not defined in environment variables'));
  process.exit(1);
}

const closeApi = axios.create({
  baseURL: 'https://api.close.com/api/v1',
  auth: {
    username: CLOSE_API_KEY,
    password: ''
  },
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

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
 * Normalize email for consistent comparison
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Search for a lead in Close CRM by email
 */
async function findLeadInClose(email: string): Promise<any> {
  try {
    const normalizedEmail = normalizeEmail(email);
    
    const response = await closeApi.get('/lead', {
      params: {
        query: `email:${normalizedEmail}`,
        _fields: 'id,display_name,contacts,status_label,organization_name'
      }
    });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      return {
        success: true,
        lead: response.data.data[0]
      };
    }
    
    return {
      success: true,
      lead: null
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error searching for lead',
      lead: null
    };
  }
}

/**
 * Create a new lead in Close CRM
 */
async function createLeadInClose(contactData: any): Promise<any> {
  try {
    const payload = {
      name: contactData.company || 'Unknown Company',
      contacts: [
        {
          name: contactData.name || 'Unknown Contact',
          emails: [
            { email: contactData.email, type: 'office' }
          ],
          phones: contactData.phone ? [{ phone: contactData.phone, type: 'office' }] : []
        }
      ],
      status: 'Potential',
      custom: {
        source: 'Typeform'
      }
    };
    
    const response = await closeApi.post('/lead', payload);
    
    if (response.data && response.data.id) {
      return {
        success: true,
        lead: response.data
      };
    }
    
    return {
      success: false,
      error: 'Failed to create lead',
      lead: null
    };
  } catch (error: any) {
    return {
      success: false, 
      error: error.message || 'Unknown error creating lead',
      lead: null
    };
  }
}

/**
 * Process a batch of contacts
 */
async function processBatch(batch: any[]): Promise<{
  matched: number;
  created: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    matched: 0,
    created: 0,
    failed: 0,
    errors: [] as string[]
  };
  
  for (const contact of batch) {
    try {
      log.info(`Processing contact: ${contact.email}`);
      
      // Search for the contact in Close CRM
      const searchResult = await findLeadInClose(contact.email);
      
      if (!searchResult.success) {
        log.error(`Error searching for contact in Close CRM: ${searchResult.error}`);
        results.failed++;
        results.errors.push(`${contact.email}: ${searchResult.error}`);
        continue;
      }
      
      if (searchResult.lead) {
        // Match found in Close CRM
        log.success(`Found matching lead in Close CRM: ${searchResult.lead.id}`);
        
        // Update our contact with Close CRM data
        await db.update(contacts)
          .set({ 
            closeId: searchResult.lead.id,
            name: searchResult.lead.contacts?.[0]?.name || contact.name,
            company: searchResult.lead.organization_name || contact.company,
            status: searchResult.lead.status_label?.toLowerCase() || contact.status,
            sourcesCount: contact.sourcesCount ? contact.sourcesCount + 1 : 2
          })
          .where(eq(contacts.id, contact.id));
        
        results.matched++;
      } else {
        // No match found, create a new lead in Close CRM
        log.info(`No matching lead found for ${contact.email}. Creating new lead...`);
        
        const createResult = await createLeadInClose({
          name: contact.name,
          email: contact.email,
          company: contact.company,
          phone: contact.phone
        });
        
        if (!createResult.success) {
          log.error(`Failed to create lead in Close CRM: ${createResult.error}`);
          results.failed++;
          results.errors.push(`${contact.email}: ${createResult.error}`);
          continue;
        }
        
        log.success(`Created new lead in Close CRM: ${createResult.lead.id}`);
        
        // Update our contact with the new Close CRM ID
        await db.update(contacts)
          .set({ 
            closeId: createResult.lead.id,
            sourcesCount: contact.sourcesCount ? contact.sourcesCount + 1 : 2
          })
          .where(eq(contacts.id, contact.id));
        
        results.created++;
      }
    } catch (error: any) {
      log.error(`Unexpected error processing contact ${contact.email}: ${error.message}`);
      results.failed++;
      results.errors.push(`${contact.email}: ${error.message}`);
    }
  }
  
  return results;
}

/**
 * Main function to merge Typeform and Close CRM contacts
 */
async function mergeTypeformCloseContacts() {
  log.section('Merge Typeform and Close CRM Contacts');
  
  // Find all Typeform contacts without Close CRM IDs
  const unlinkedCount = await db.select({ count: sql`count(${contacts.id})` })
    .from(contacts)
    .where(eq(contacts.leadSource, 'typeform'))
    .where(isNull(contacts.closeId));
  
  const totalUnlinked = Number(unlinkedCount[0]?.count) || 0;
  log.info(`Found ${totalUnlinked} Typeform contacts without Close CRM IDs`);
  
  if (totalUnlinked === 0) {
    log.success('All Typeform contacts are already linked to Close CRM.');
    return;
  }
  
  // Process in batches
  const BATCH_SIZE = 10;
  let processedCount = 0;
  let totalMatched = 0;
  let totalCreated = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];
  
  log.info(`Processing contacts in batches of ${BATCH_SIZE}`);
  hr();
  
  while (processedCount < totalUnlinked) {
    // Get the next batch of contacts
    const batch = await db.select()
      .from(contacts)
      .where(eq(contacts.leadSource, 'typeform'))
      .where(isNull(contacts.closeId))
      .limit(BATCH_SIZE)
      .offset(processedCount);
    
    if (batch.length === 0) {
      break;
    }
    
    log.info(`Processing batch ${Math.floor(processedCount / BATCH_SIZE) + 1}: ${batch.length} contacts`);
    
    // Process the batch
    const batchResults = await processBatch(batch);
    
    // Update totals
    totalMatched += batchResults.matched;
    totalCreated += batchResults.created;
    totalFailed += batchResults.failed;
    allErrors.push(...batchResults.errors);
    
    // Update processed count
    processedCount += batch.length;
    
    // Display progress
    const percentComplete = Math.floor((processedCount / totalUnlinked) * 100);
    log.info(`Progress: ${processedCount}/${totalUnlinked} contacts (${percentComplete}%)`);
    hr();
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Final report
  log.section('Results');
  log.info(`Total contacts processed: ${processedCount}`);
  log.success(`Matched with existing Close CRM leads: ${totalMatched}`);
  log.success(`Created new Close CRM leads: ${totalCreated}`);
  log.warning(`Failed to process: ${totalFailed}`);
  
  if (allErrors.length > 0) {
    log.section('Errors');
    allErrors.slice(0, 10).forEach(error => log.error(error));
    if (allErrors.length > 10) {
      log.warning(`... and ${allErrors.length - 10} more errors`);
    }
  }
  
  // Check for any remaining unlinked contacts
  const remainingUnlinked = await db.select({ count: sql`count(${contacts.id})` })
    .from(contacts)
    .where(eq(contacts.leadSource, 'typeform'))
    .where(isNull(contacts.closeId));
  
  const remainingCount = Number(remainingUnlinked[0]?.count) || 0;
  
  if (remainingCount === 0) {
    log.success('All Typeform contacts are now linked to Close CRM!');
  } else {
    log.warning(`There are still ${remainingCount} Typeform contacts without Close CRM IDs.`);
    log.info('Run this script again to process the remaining contacts.');
  }
}

// Run the script and handle errors
mergeTypeformCloseContacts().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});