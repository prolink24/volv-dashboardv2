/**
 * Fix Capital Firms Contacts
 * 
 * This script specifically targets the investment capital firms' contacts
 * shown in the screenshots, providing them with proper company names and
 * linking them to Close CRM if needed.
 */

import { db } from './server/db';
import { contacts } from './shared/schema';
import { eq, like, ilike, or, and, isNull } from 'drizzle-orm';
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

// Capital firms from the screenshots
const CAPITAL_FIRMS = [
  { domain: 'vintacapital.com', name: 'Vinta Capital' },
  { domain: 'sharifcapital.ca', name: 'Sharif Capital' },
  { domain: 'colossumgroup.com', name: 'Colossum Group' },
  { domain: 'capstonecapital.io', name: 'Capstone Capital' },
  { domain: 'culmen-capital.com', name: 'Culmen Capital' },
  { domain: '28thstreet.capital', name: '28th Street Capital' },
  { domain: 'capitalgrowthpartners.org', name: 'Capital Growth Partners' },
  { domain: 'missioncapital-partners.com', name: 'Mission Capital Partners' },
  { domain: 'kadenwood.capital', name: 'Kadenwood Capital' },
  { domain: 'investorreadycapital.com', name: 'Investor Ready Capital' },
  { domain: 'eskaycapital.com', name: 'Eskay Capital' },
  { domain: 'emisoncapital.com', name: 'Emison Capital' },
  { domain: 'savvycapital.io', name: 'Savvy Capital' },
  { domain: 'whitewavecapital.co', name: 'White Wave Capital' }
];

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

async function fixCapitalFirmsContacts() {
  console.log(chalk.blue(''));
  console.log(chalk.blue('=== FIX CAPITAL FIRMS CONTACTS ==='));
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
    log.info('Please check your API key and try again.');
    return;
  }
  
  // Find all contacts from capital firms
  const capitalContacts = [];
  let totalFound = 0;
  
  for (const firm of CAPITAL_FIRMS) {
    const domainContacts = await db.select()
      .from(contacts)
      .where(like(contacts.email, `%@${firm.domain}%`));
    
    if (domainContacts.length > 0) {
      log.info(`Found ${domainContacts.length} contacts from ${firm.name} (${firm.domain})`);
      totalFound += domainContacts.length;
      capitalContacts.push(...domainContacts.map(contact => ({ ...contact, firmName: firm.name })));
    }
  }
  
  log.info(`Found ${totalFound} contacts from capital firms`);
  
  if (totalFound === 0) {
    log.warning('No capital firm contacts found to fix.');
    return;
  }
  
  hr();
  
  // Now process each contact
  let updated = 0;
  let linkedToClose = 0;
  let errors = 0;
  
  for (const contact of capitalContacts) {
    try {
      const updates: any = {};
      let madeUpdates = false;
      
      // Update company name if missing
      if (!contact.company || contact.company === '') {
        updates.company = contact.firmName;
        madeUpdates = true;
      }
      
      // Check if already linked to Close
      if (!contact.closeId) {
        // Try to find the lead in Close
        const lead = await findLeadByEmail(contact.email);
        
        if (lead) {
          updates.closeId = lead.id;
          madeUpdates = true;
          linkedToClose++;
          log.info(`Found existing lead in Close: ${lead.id} (${lead.display_name})`);
        }
      }
      
      // Apply updates if we have any
      if (madeUpdates) {
        await db.update(contacts)
          .set(updates)
          .where(eq(contacts.id, contact.id));
        
        updated++;
        log.success(`Updated contact: ${contact.name} (${contact.email})`);
      } else {
        log.info(`No updates needed for ${contact.name} (${contact.email})`);
      }
    } catch (error: any) {
      log.error(`Error updating contact ${contact.id} (${contact.email}): ${error.message}`);
      errors++;
    }
  }
  
  hr();
  log.success(`Fixed ${updated} capital firm contacts`);
  if (linkedToClose > 0) {
    log.success(`- Linked ${linkedToClose} contacts to Close CRM`);
  }
  if (errors > 0) {
    log.warning(`- Encountered ${errors} errors during processing`);
  }
}

// Run the script
fixCapitalFirmsContacts().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});