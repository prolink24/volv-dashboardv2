/**
 * Merge Typeform and Close CRM Contacts
 * 
 * This script intelligently links Typeform form submissions with existing Close CRM leads
 * by checking email addresses and creating proper connections in our database. It also 
 * creates new Close CRM leads for Typeform contacts that don't exist in Close.
 * 
 * The script processes contacts in batches for optimal performance.
 */

import axios from 'axios';
import { db } from './server/db';
import { contacts } from './shared/schema';
import { eq, isNull, and, or } from 'drizzle-orm';
import chalk from 'chalk';

// Constants
const CLOSE_API_URL = 'https://api.close.com/api/v1';
const BATCH_SIZE = 50; // Process 50 contacts at a time for optimal performance
const API_KEY = process.env.CLOSE_API_KEY;

// Helper functions for formatting output
function hr() {
  console.log(chalk.gray('─'.repeat(80)));
}

// Helper function to extract company name from email domain
function extractCompanyFromDomain(email: string): string | null {
  if (!email || typeof email !== 'string') return null;
  
  try {
    // Get the domain part after @
    const domain = email.split('@')[1];
    if (!domain) return null;
    
    // Remove TLD and split by dots
    const parts = domain.split('.');
    if (parts.length < 2) return null;
    
    // For common email providers, return null
    const commonProviders = ['gmail', 'yahoo', 'hotmail', 'outlook', 'aol', 'icloud', 'protonmail'];
    if (commonProviders.includes(parts[0].toLowerCase())) return null;
    
    // Otherwise, capitalize the domain name without TLD
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  } catch (e) {
    return null;
  }
}

// Find a lead in Close CRM by email address
async function findLeadByEmail(email: string) {
  if (!API_KEY) {
    console.error(chalk.red('Error: CLOSE_API_KEY environment variable is not set'));
    return null;
  }

  try {
    const response = await axios.get(`${CLOSE_API_URL}/lead/`, {
      auth: {
        username: API_KEY,
        password: ''
      },
      params: {
        email_address: email
      }
    });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data[0];
    }
    
    return null;
  } catch (error) {
    console.error(chalk.red('Error finding lead by email:'), error);
    return null;
  }
}

// Create a new lead in Close CRM
async function createLeadInClose(contact: any) {
  if (!API_KEY) {
    console.error(chalk.red('Error: CLOSE_API_KEY environment variable is not set'));
    return null;
  }

  try {
    const companyName = contact.company || extractCompanyFromDomain(contact.email);
    
    const payload = {
      name: companyName || contact.name,
      contacts: [{
        name: contact.name,
        emails: [{ email: contact.email, type: 'office' }],
        phones: contact.phone ? [{ phone: contact.phone, type: 'office' }] : []
      }],
      custom: {
        source: 'Typeform Integration',
        integration_date: new Date().toISOString().split('T')[0]
      }
    };

    const response = await axios.post(`${CLOSE_API_URL}/lead/`, payload, {
      auth: {
        username: API_KEY,
        password: ''
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(chalk.red('Error creating lead in Close:'), error);
    return null;
  }
}

// Process a batch of contacts - check for existing Close leads and link or create them
async function processContactBatch(contactBatch: any[]) {
  console.log(`Processing batch of ${contactBatch.length} contacts...`);
  
  const updates = {
    linked: 0,
    created: 0,
    failed: 0,
    skipped: 0
  };

  for (const contact of contactBatch) {
    try {
      // Skip contacts that already have Close IDs
      if (contact.closeId) {
        updates.skipped++;
        continue;
      }
      
      // Find existing lead in Close CRM
      const existingLead = await findLeadByEmail(contact.email);
      
      if (existingLead) {
        // Update local contact with Close ID
        await db.update(contacts)
          .set({ 
            closeId: existingLead.id,
            // Update lead source to include "close" if it's not already there
            leadSource: contact.leadSource?.includes('close') 
              ? contact.leadSource 
              : `${contact.leadSource || 'typeform'},close`,
            // Increment sources count if not already counted
            sourcesCount: (contact.sourcesCount || 1) + (contact.leadSource?.includes('close') ? 0 : 1),
            // Update company if it's missing and available in Close
            company: contact.company || existingLead.name
          })
          .where(eq(contacts.id, contact.id));
        
        updates.linked++;
        console.log(chalk.green(`✓ Linked contact ${contact.email} to existing Close lead ${existingLead.id}`));
      } else {
        // Create new lead in Close
        const newLead = await createLeadInClose(contact);
        
        if (newLead) {
          // Update local contact with new Close ID
          await db.update(contacts)
            .set({ 
              closeId: newLead.id,
              // Update lead source to include "close"
              leadSource: contact.leadSource?.includes('close') 
                ? contact.leadSource 
                : `${contact.leadSource || 'typeform'},close`,
              // Increment sources count
              sourcesCount: (contact.sourcesCount || 1) + 1
            })
            .where(eq(contacts.id, contact.id));
          
          updates.created++;
          console.log(chalk.blue(`+ Created new Close lead ${newLead.id} for contact ${contact.email}`));
        } else {
          updates.failed++;
          console.log(chalk.red(`✗ Failed to create Close lead for contact ${contact.email}`));
        }
      }
    } catch (error) {
      updates.failed++;
      console.error(chalk.red(`Error processing contact ${contact.email}:`), error);
    }
  }

  return updates;
}

// Get a batch of contacts that need processing
async function getContactsToProcess(limit: number = BATCH_SIZE) {
  // Get contacts that have Typeform as a source but don't have Close IDs
  const typeformContacts = await db.select()
    .from(contacts)
    .where(
      and(
        or(
          like(contacts.leadSource, '%typeform%'),
          eq(contacts.typeformId, isNull(false))
        ),
        eq(contacts.closeId, isNull(true))
      )
    )
    .limit(limit);

  return typeformContacts;
}

// Main function to merge Typeform and Close contacts
async function mergeTypeformCloseContacts() {
  console.log(chalk.blue('Starting Typeform-Close contact merging process'));
  hr();

  let processedTotal = 0;
  let batchCount = 0;
  let continueProcessing = true;
  
  const totals = {
    linked: 0,
    created: 0,
    failed: 0,
    skipped: 0
  };

  // Check for API key
  if (!API_KEY) {
    console.error(chalk.red('Error: CLOSE_API_KEY environment variable is not set'));
    console.log(chalk.yellow('Please set the CLOSE_API_KEY environment variable and try again'));
    return;
  }

  // Process contacts in batches until we run out or hit a limit
  while (continueProcessing) {
    const contactBatch = await getContactsToProcess();
    
    if (contactBatch.length === 0) {
      console.log(chalk.green('No more contacts to process!'));
      break;
    }

    console.log(`\nBatch ${++batchCount}: Processing ${contactBatch.length} contacts`);
    const batchResults = await processContactBatch(contactBatch);
    
    // Update totals
    totals.linked += batchResults.linked;
    totals.created += batchResults.created;
    totals.failed += batchResults.failed;
    totals.skipped += batchResults.skipped;
    
    processedTotal += contactBatch.length;
    
    // Status update
    hr();
    console.log(chalk.cyan('Batch Results:'));
    console.log(`- Linked to existing Close leads: ${batchResults.linked}`);
    console.log(`- Created new Close leads: ${batchResults.created}`);
    console.log(`- Failed to process: ${batchResults.failed}`);
    console.log(`- Skipped (already linked): ${batchResults.skipped}`);
    
    // Optional: add a small delay to avoid hammering the API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Safety check - stop after processing a large number
    if (processedTotal >= 1000) {
      console.log(chalk.yellow('Reached maximum processing limit of 1000 contacts'));
      continueProcessing = false;
    }
  }

  hr();
  console.log(chalk.green('Typeform-Close contact merging completed!'));
  console.log(chalk.cyan('Final Results:'));
  console.log(`- Total contacts processed: ${processedTotal}`);
  console.log(`- Total linked to existing Close leads: ${totals.linked}`);
  console.log(`- Total new Close leads created: ${totals.created}`);
  console.log(`- Total failed to process: ${totals.failed}`);
  console.log(`- Total skipped (already linked): ${totals.skipped}`);
}

// Run the script
mergeTypeformCloseContacts()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed with error:', error);
    process.exit(1);
  });