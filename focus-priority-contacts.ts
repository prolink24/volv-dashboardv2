/**
 * Focus Priority Contacts Integration
 * 
 * This script specifically targets high-priority contacts including:
 * 1. Capital firms and investment groups
 * 2. Contacts with potential deal value
 * 3. Recent form submissions
 * 
 * It ensures they have proper names, company information, and Close CRM linkage
 */

import { db } from './server/db';
import { contacts } from './shared/schema';
import { eq, like, ilike, or, and, isNull, not } from 'drizzle-orm';
import axios from 'axios';
import chalk from 'chalk';

const CLOSE_API_KEY = process.env.CLOSE_API_KEY || 'api_1JLEeJyrMIolaQhrCxHSwP.5e8Ek5aBf6HWvcGOZRmbni';
const CLOSE_API_URL = 'https://api.close.com/api/v1';

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

// List of capital and investment related domains/keywords to prioritize
const PRIORITY_DOMAINS = [
  'capital', 'invest', 'ventures', 'partners', 'fund', 
  'asset', 'equity', 'wealth', 'finance', 'holdings',
  'group', 'advisors', 'management', 'private', 'family',
  'trust', 'bancorp', 'property', 'real-estate', 'realty'
];

// Create a lead in Close CRM
async function createLeadInClose(contact: any) {
  try {
    // Make sure contact has company info if available
    const companyName = contact.company || extractCompanyFromEmail(contact.email);
    
    const payload = {
      name: contact.name,
      contacts: [{
        name: contact.name,
        emails: [{ email: contact.email, type: 'office' }],
        phones: contact.phone ? [{ phone: contact.phone, type: 'office' }] : []
      }],
      custom: {
        source: contact.source || 'Attribution Platform'
      }
    };

    if (companyName) {
      // @ts-ignore
      payload.custom.company = companyName;
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

// Find a lead by email in Close CRM
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

// Extract company name from email domain
function extractCompanyFromEmail(email: string): string | null {
  if (!email || !email.includes('@')) return null;
  
  const domain = email.split('@')[1].toLowerCase();
  if (!domain) return null;
  
  // Skip common email providers
  const commonProviders = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
    'aol.com', 'icloud.com', 'mail.com', 'protonmail.com',
    'msn.com', 'live.com'
  ];
  
  if (commonProviders.includes(domain)) return null;
  
  const domainParts = domain.split('.');
  let companyName = domainParts[0]
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
    
  return companyName;
}

// Get priority contacts based on various criteria
async function getPriorityContacts(limit = 25) {
  // Build domain-related conditions
  const domainConditions = PRIORITY_DOMAINS.map(keyword => 
    like(contacts.email, `%${keyword}%`)
  );
  
  // Get contacts matching priority criteria without Close IDs
  const priorityContacts = await db.select()
    .from(contacts)
    .where(
      and(
        isNull(contacts.closeId),
        or(...domainConditions)
      )
    )
    .limit(limit);
    
  return priorityContacts;
}

// Main function to process priority contacts
async function focusPriorityContacts() {
  console.log(chalk.blue(''));
  console.log(chalk.blue('=== FOCUS PRIORITY CONTACTS ==='));
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
  
  // Get priority contacts
  const priorityContacts = await getPriorityContacts(25);
  log.info(`Found ${priorityContacts.length} priority contacts to process`);
  
  if (priorityContacts.length === 0) {
    log.success('No priority contacts found to process.');
    return;
  }
  
  hr();
  
  // Process each priority contact
  let updatedNames = 0;
  let updatedCompanies = 0;
  let linkedToClose = 0;
  let createdInClose = 0;
  let errors = 0;
  
  for (const contact of priorityContacts) {
    try {
      const updates: any = {};
      let madeUpdates = false;
      
      // Try to find the contact in Close CRM
      const lead = await findLeadByEmail(contact.email);
      
      if (lead) {
        // Link to existing lead
        updates.closeId = lead.id;
        madeUpdates = true;
        linkedToClose++;
        log.info(`Found existing lead in Close: ${lead.id} (${lead.display_name})`);
      } else {
        // Create new lead in Close
        const newLead = await createLeadInClose(contact);
        
        if (newLead) {
          updates.closeId = newLead.id;
          madeUpdates = true;
          createdInClose++;
          log.success(`Created new lead in Close: ${newLead.id} (${newLead.display_name})`);
        }
      }
      
      // Add company name if missing and can be derived
      if ((!contact.company || contact.company === '') && contact.email) {
        const companyName = extractCompanyFromEmail(contact.email);
        
        if (companyName) {
          updates.company = companyName;
          madeUpdates = true;
          updatedCompanies++;
        }
      }
      
      // Apply updates
      if (madeUpdates) {
        await db.update(contacts)
          .set(updates)
          .where(eq(contacts.id, contact.id));
        
        log.success(`Updated contact: ${contact.name} (${contact.email})`);
      } else {
        log.info(`No updates needed for ${contact.name} (${contact.email})`);
      }
    } catch (error: any) {
      log.error(`Error processing contact ${contact.id} (${contact.email}): ${error.message}`);
      errors++;
    }
  }
  
  hr();
  log.success(`Processed ${priorityContacts.length} priority contacts`);
  if (updatedCompanies > 0) {
    log.success(`- Added ${updatedCompanies} company names`);
  }
  if (linkedToClose > 0) {
    log.success(`- Linked ${linkedToClose} contacts to existing Close leads`);
  }
  if (createdInClose > 0) {
    log.success(`- Created ${createdInClose} new leads in Close`);
  }
  if (errors > 0) {
    log.warning(`- Encountered ${errors} errors during processing`);
  }
  
  log.info('To process more priority contacts, run this script again.');
}

// Run the script
focusPriorityContacts().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});