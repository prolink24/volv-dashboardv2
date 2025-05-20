/**
 * Create Missing Close CRM Leads
 * 
 * This script identifies contacts without Close CRM IDs and creates
 * corresponding leads in Close CRM with proper authentication handling.
 */

import dotenv from 'dotenv';
import chalk from 'chalk';
import axios from 'axios';
import { db } from './server/db';
import { eq, isNull, ne, and, or } from 'drizzle-orm';
import { contacts } from './shared/schema';

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

async function createMissingCloseLeads() {
  log.section('Create Missing Close CRM Leads');
  
  // First, check if we have a valid API key
  const CLOSE_API_KEY = process.env.CLOSE_API_KEY;
  
  if (!CLOSE_API_KEY) {
    log.error('No Close API key found in environment variables.');
    log.info('Please set the CLOSE_API_KEY environment variable and try again.');
    return;
  }
  
  log.info(`Using Close API key: ${CLOSE_API_KEY.substring(0, 5)}...${CLOSE_API_KEY.substring(CLOSE_API_KEY.length - 5)}`);
  
  // Create a Close API client with proper authentication and error handling
  const client = axios.create({
    baseURL: 'https://api.close.com/api/v1',
    auth: {
      username: CLOSE_API_KEY,
      password: ''
    },
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });
  
  // Test the API connection first
  try {
    log.info('Testing Close API connection...');
    const response = await client.get('/me/');
    log.success(`Connected to Close as: ${response.data.first_name} ${response.data.last_name}`);
  } catch (error: any) {
    log.error(`Failed to connect to Close API: ${error.message}`);
    if (error.response) {
      log.error(`Status: ${error.response.status}`);
      log.error(`Response: ${JSON.stringify(error.response.data)}`);
    }
    log.info('Please check your API key and try again.');
    return;
  }
  
  // Get a batch of contacts without Close CRM IDs
  const unlinkedContacts = await db.select()
    .from(contacts)
    .where(isNull(contacts.closeId))
    .limit(10); // Start with a small batch
  
  log.info(`Found ${unlinkedContacts.length} contacts without Close CRM IDs (processing 10)`);
  
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  // Process each contact
  for (const contact of unlinkedContacts) {
    try {
      log.info(`Processing: ${contact.name} (${contact.email})`);
      
      // First, search for existing leads with this email
      const searchResponse = await client.get('/lead/', {
        params: {
          query: `email:${contact.email}`
        }
      });
      
      const existingLeads = searchResponse.data.data || [];
      
      // If a lead already exists, link it
      if (existingLeads.length > 0) {
        const existingLead = existingLeads[0];
        log.info(`Found existing lead: ${existingLead.id} (${existingLead.display_name})`);
        
        await db.update(contacts)
          .set({ closeId: existingLead.id })
          .where(eq(contacts.id, contact.id));
        
        updated++;
        log.success(`Updated contact with existing Close lead ID: ${existingLead.id}`);
      } 
      // Otherwise, create a new lead
      else {
        // Prepare the lead data
        const leadData = {
          name: contact.name || 'Unknown',
          contacts: [
            {
              email: contact.email,
              name: contact.name || 'Unknown'
            }
          ],
          custom: {
            source: 'typeform'
          }
        };
        
        // Add company if available
        if (contact.company) {
          leadData.custom.company = contact.company;
        }
        
        // Create the lead in Close
        const createResponse = await client.post('/lead/', leadData);
        const newLead = createResponse.data;
        
        // Update our contact with the new lead ID
        await db.update(contacts)
          .set({ closeId: newLead.id })
          .where(eq(contacts.id, contact.id));
        
        created++;
        log.success(`Created new Close lead: ${newLead.id} (${newLead.display_name})`);
      }
    } catch (error: any) {
      errors++;
      log.error(`Error processing ${contact.email}: ${error.message}`);
      if (error.response) {
        log.error(`Status: ${error.response.status}`);
        log.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
    }
  }
  
  // Summary
  hr();
  log.success(`Processed ${unlinkedContacts.length} contacts`);
  log.success(`- Created ${created} new leads in Close CRM`);
  log.success(`- Linked ${updated} contacts to existing leads`);
  if (errors > 0) {
    log.warning(`- Encountered ${errors} errors`);
  }
  
  // Instructions for next steps
  log.info('\nTo process more contacts, run this script again.');
}

// Run the script
createMissingCloseLeads().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
});