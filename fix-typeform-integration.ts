/**
 * Fix Typeform Integration
 * 
 * This script fixes all issues identified in the Typeform contacts audit:
 * 1. Fixes "Unknown Contact" names using email prefixes
 * 2. Updates missing company names where possible
 * 3. Attempts to link contacts with Close CRM with improved error handling
 */

import dotenv from 'dotenv';
import chalk from 'chalk';
import axios from 'axios';
import { db } from './server/db';
import { eq, isNull, sql, inArray, ne, and, or, like } from 'drizzle-orm';
import { contacts, forms } from './shared/schema';
import { normalizeEmail } from './server/services/contact-matching';

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
 * Fix unknown contact names
 */
async function fixUnknownContactNames() {
  log.section('Fix Unknown Contact Names');
  
  // Find all contacts with "Unknown Contact" as name
  const unknownContacts = await db.select()
    .from(contacts)
    .where(eq(contacts.name, 'Unknown Contact'));
  
  log.info(`Found ${unknownContacts.length} contacts with "Unknown Contact" as name`);
  
  let updated = 0;
  const errors: string[] = [];
  
  // Update each contact with a better name based on email
  for (const contact of unknownContacts) {
    try {
      if (contact.email) {
        const emailPrefix = contact.email.split('@')[0];
        // Convert to title case and replace dots/underscores with spaces
        const betterName = emailPrefix
          .split(/[._-]/)
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ');
        
        await db.update(contacts)
          .set({ name: betterName })
          .where(eq(contacts.id, contact.id));
        
        log.info(`Updated: ${contact.email} → ${betterName}`);
        updated++;
      }
    } catch (error: any) {
      errors.push(`Error updating ${contact.email}: ${error.message}`);
    }
  }
  
  log.success(`Updated ${updated}/${unknownContacts.length} contacts with better names`);
  if (errors.length > 0) {
    log.warning(`Encountered ${errors.length} errors:`);
    errors.forEach(error => log.warning(`- ${error}`));
  }
  hr();
  
  return { updated, total: unknownContacts.length, errors };
}

/**
 * Update missing company names
 */
async function updateCompanyNames() {
  log.section('Update Company Names');
  
  // Company domain mappings (extend this based on your data)
  const companyDomainMappings: Record<string, string> = {
    'gmail.com': '',  // Don't set company for personal emails
    'outlook.com': '',
    'hotmail.com': '',
    'yahoo.com': '',
    'icloud.com': '',
    // Capital firms
    'atlasridge.io': 'Atlas Ridge',
    'caucelcapital.com': 'Caucel Capital',
    'stowecap.co': 'Stowe Capital',
    'vortexcapital.io': 'Vortex Capital',
    'light3capital.com': 'Light3 Capital',
    'amaranthcp.com': 'Amaranth Capital Partners',
    'lightuscapital.com': 'Lightus Capital',
    'spikecapital.io': 'Spike Capital'
  };
  
  // Find contacts missing company names (excluding personal emails)
  const contactsWithoutCompany = await db.select()
    .from(contacts)
    .where(
      and(
        or(
          isNull(contacts.company),
          eq(contacts.company, '')
        ),
        // Exclude personal email domains
        sql`SUBSTRING(${contacts.email} FROM POSITION('@' IN ${contacts.email}) + 1) NOT IN ('gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com')`
      )
    )
    .limit(500); // Process in batches
  
  log.info(`Found ${contactsWithoutCompany.length} contacts without company names (corporate emails only)`);
  
  let updated = 0;
  const errors: string[] = [];
  
  // Update each contact with company name based on email domain
  for (const contact of contactsWithoutCompany) {
    try {
      if (contact.email) {
        const emailParts = contact.email.split('@');
        const domain = emailParts[1];
        
        // If we have a mapped company name, use it
        if (companyDomainMappings[domain]) {
          await db.update(contacts)
            .set({ company: companyDomainMappings[domain] })
            .where(eq(contacts.id, contact.id));
          
          log.info(`Updated: ${contact.email} → ${companyDomainMappings[domain]}`);
          updated++;
        }
        // Otherwise derive company name from domain
        else if (domain && !domain.includes('gmail') && !domain.includes('hotmail') && 
                !domain.includes('outlook') && !domain.includes('yahoo') && 
                !domain.includes('icloud')) {
          // Extract company name from domain (remove TLD and convert to title case)
          const domainParts = domain.split('.');
          const companyName = domainParts[0]
            .split(/[._-]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
          
          await db.update(contacts)
            .set({ company: companyName })
            .where(eq(contacts.id, contact.id));
          
          log.info(`Derived: ${contact.email} → ${companyName}`);
          updated++;
        }
      }
    } catch (error: any) {
      errors.push(`Error updating ${contact.email}: ${error.message}`);
    }
  }
  
  log.success(`Updated ${updated}/${contactsWithoutCompany.length} contacts with company names`);
  if (errors.length > 0) {
    log.warning(`Encountered ${errors.length} errors:`);
    errors.forEach(error => log.warning(`- ${error}`));
  }
  hr();
  
  return { updated, total: contactsWithoutCompany.length, errors };
}

/**
 * Link contacts with Close CRM
 */
async function linkContactsWithCloseCRM() {
  log.section('Link Contacts with Close CRM');
  
  const CLOSE_API_KEY = process.env.CLOSE_API_KEY;
  
  if (!CLOSE_API_KEY) {
    log.error('CLOSE_API_KEY environment variable not found');
    return { updated: 0, total: 0, errors: ['Missing Close API key'] };
  }
  
  // Create Close API client with authentication retry logic
  const closeClient = axios.create({
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
  
  // Add response interceptor for error handling
  closeClient.interceptors.response.use(
    response => response,
    async error => {
      const { config, response } = error;
      
      // If the error is due to authentication (401) or rate limiting (429)
      if (response && (response.status === 401 || response.status === 429)) {
        log.warning(`API request failed with status ${response.status}, retrying in 2 seconds...`);
        
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // For rate limiting, wait longer
        if (response.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        // Return a new request
        return closeClient(config);
      }
      
      return Promise.reject(error);
    }
  );
  
  // Find contacts not linked to Close CRM
  const contactsWithoutCloseId = await db.select()
    .from(contacts)
    .where(isNull(contacts.closeId))
    .limit(50); // Process in small batches
  
  log.info(`Processing ${contactsWithoutCloseId.length} contacts without Close CRM IDs (limit 50)`);
  
  let updated = 0;
  const created = 0;
  const errors: string[] = [];
  
  // Link each contact with Close CRM
  for (const contact of contactsWithoutCloseId) {
    try {
      log.info(`Processing ${contact.name} (${contact.email})`);
      
      // Search for existing lead in Close CRM by email
      const searchResponse = await closeClient.get('/lead/', {
        params: {
          query: `email:${contact.email}`,
          _fields: 'id,display_name,contacts'
        }
      });
      
      const leads = searchResponse.data.data || [];
      
      // If the lead exists in Close CRM
      if (leads.length > 0) {
        const lead = leads[0];
        
        await db.update(contacts)
          .set({ 
            closeId: lead.id,
            // Update name if it's better in Close
            name: (contact.name === 'Unknown Contact' && lead.display_name) ? 
              lead.display_name : contact.name
          })
          .where(eq(contacts.id, contact.id));
        
        log.success(`Linked: ${contact.email} → ${lead.id} (${lead.display_name})`);
        updated++;
      } else {
        // We would create a new lead here, but let's just log for now
        log.info(`No matching lead found for ${contact.email}`);
      }
    } catch (error: any) {
      const message = error.response?.data?.error || error.message;
      errors.push(`Error processing ${contact.email}: ${message}`);
      log.warning(`Error processing ${contact.email}: ${message}`);
    }
  }
  
  log.success(`Linked ${updated}/${contactsWithoutCloseId.length} contacts with Close CRM`);
  if (errors.length > 0) {
    log.warning(`Encountered ${errors.length} errors:`);
    errors.forEach(error => log.warning(`- ${error}`));
  }
  hr();
  
  return { linked: updated, created, total: contactsWithoutCloseId.length, errors };
}

/**
 * Main function to fix all issues
 */
async function fixTypeformIntegration() {
  log.section('Typeform Integration Fix');
  
  // Step 1: Fix unknown contact names
  const nameResults = await fixUnknownContactNames();
  
  // Step 2: Update company names
  const companyResults = await updateCompanyNames();
  
  // Step 3: Link with Close CRM
  const linkResults = await linkContactsWithCloseCRM();
  
  // Summary
  log.section('Summary');
  log.success(`Fixed ${nameResults.updated} contacts with unknown names`);
  log.success(`Updated ${companyResults.updated} contacts with company names`);
  log.success(`Linked ${linkResults.linked} contacts with Close CRM`);
  
  log.info('\nRun this script again to process more contacts in batches');
  log.info('For complete integration, run the audit script again and check progress');
}

// Run the script
fixTypeformIntegration().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});