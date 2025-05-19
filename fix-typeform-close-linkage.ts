/**
 * Fix Typeform to Close CRM Contact Linkage
 * 
 * This script enhances contact matching logic to properly link Typeform submissions
 * with existing Close CRM records. It:
 * 
 * 1. Finds all Typeform contacts without Close CRM IDs
 * 2. Checks Close CRM for matching emails
 * 3. Updates our records when matches are found
 * 4. Creates new Close CRM records for unmatched contacts
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { db } from './server/db';
import { eq, isNull } from 'drizzle-orm';
import { contacts, type InsertContact } from './shared/schema';
import chalk from 'chalk';

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

// Helper for horizontal rule
function hr() {
  console.log(chalk.gray('─'.repeat(80)));
}

/**
 * Normalize email addresses for consistent comparison
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Search for a lead in Close CRM by email address
 */
async function findLeadByEmail(email: string): Promise<any> {
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
          ]
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
 * Main function to fix Typeform to Close CRM contact linkage
 */
async function fixTypeformCloseLinkage() {
  log.section('Fix Typeform to Close CRM Contact Linkage');
  
  // Stats for reporting
  const stats = {
    total: 0,
    matched: 0,
    created: 0,
    failed: 0,
    errors: [] as string[]
  };
  
  try {
    // Find all Typeform contacts without Close CRM IDs
    const typeformContacts = await db.select()
      .from(contacts)
      .where(eq(contacts.leadSource, 'typeform'))
      .where(isNull(contacts.closeId));
    
    stats.total = typeformContacts.length;
    log.info(`Found ${stats.total} Typeform contacts without Close CRM IDs`);
    
    if (stats.total === 0) {
      log.success('No contacts need linking. All Typeform contacts are already linked to Close CRM.');
      return;
    }
    
    hr();
    
    // Process each contact
    for (const [index, contact] of typeformContacts.entries()) {
      log.info(`Processing contact ${index + 1}/${stats.total}: ${contact.email}`);
      
      // Skip if no email
      if (!contact.email) {
        log.warning(`Skipping contact with ID ${contact.id} - No email address`);
        stats.failed++;
        stats.errors.push(`Contact ID ${contact.id}: No email address`);
        continue;
      }
      
      // Step 1: Search for matching lead in Close CRM
      const searchResult = await findLeadByEmail(contact.email);
      
      if (!searchResult.success) {
        log.error(`Error searching for lead: ${searchResult.error}`);
        stats.failed++;
        stats.errors.push(`Contact ID ${contact.id}: ${searchResult.error}`);
        continue;
      }
      
      let closeId: string;
      
      if (searchResult.lead) {
        // Match found - update our record
        closeId = searchResult.lead.id;
        log.success(`Found matching lead in Close CRM: ${closeId} (${searchResult.lead.display_name})`);
        stats.matched++;
        
        // Update the contact with Close CRM data
        await db.update(contacts)
          .set({ 
            closeId: closeId,
            name: searchResult.lead.contacts?.[0]?.name || contact.name,
            company: searchResult.lead.organization_name || contact.company,
            status: searchResult.lead.status_label?.toLowerCase() || contact.status,
            sourcesCount: contact.sourcesCount ? contact.sourcesCount + 1 : 2
          })
          .where(eq(contacts.id, contact.id));
        
        log.success(`Updated local record for contact ID ${contact.id}`);
      } else {
        // No match found - create new lead in Close CRM
        log.info(`No matching lead found for ${contact.email}. Creating new lead...`);
        
        const createResult = await createLeadInClose({
          name: contact.name,
          email: contact.email,
          company: contact.company
        });
        
        if (!createResult.success) {
          log.error(`Failed to create lead in Close CRM: ${createResult.error}`);
          stats.failed++;
          stats.errors.push(`Contact ID ${contact.id}: ${createResult.error}`);
          continue;
        }
        
        closeId = createResult.lead.id;
        log.success(`Created new lead in Close CRM: ${closeId}`);
        stats.created++;
        
        // Update the contact with the new Close CRM ID
        await db.update(contacts)
          .set({ 
            closeId: closeId,
            sourcesCount: contact.sourcesCount ? contact.sourcesCount + 1 : 2
          })
          .where(eq(contacts.id, contact.id));
        
        log.success(`Updated local record for contact ID ${contact.id}`);
      }
      
      hr();
    }
    
    // Final report
    log.section('Results');
    log.info(`Total contacts processed: ${stats.total}`);
    log.success(`Matched with existing Close CRM leads: ${stats.matched}`);
    log.success(`Created new Close CRM leads: ${stats.created}`);
    log.warning(`Failed to process: ${stats.failed}`);
    
    if (stats.errors.length > 0) {
      log.section('Errors');
      stats.errors.forEach(error => log.error(error));
    }
    
  } catch (error: any) {
    log.error(`Unexpected error: ${error.message}`);
    console.error(error);
  }
}

// Run the script
fixTypeformCloseLinkage().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});