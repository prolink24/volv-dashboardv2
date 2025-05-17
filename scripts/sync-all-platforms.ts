/**
 * Comprehensive Data Synchronization Script
 * 
 * This script orchestrates the full data synchronization between all platforms:
 * - Close CRM (contacts, activities, deals, users)
 * - Calendly (meetings, invitees)
 * - Typeform (forms, submissions)
 * 
 * It runs each sync operation in sequence, tracks progress, and handles errors.
 * Use this for a complete data refresh to ensure your contact-level attribution
 * has 100% data coverage.
 */

import closeAPI from '../server/api/close';
import calendlyAPI from '../server/api/calendly';
import * as typeformAPI from '../server/api/typeform';
import contactMatcher from '../server/services/contact-matcher';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import chalk from 'chalk';

const log = {
  info: (msg: string) => console.log(chalk.blue(`[INFO] ${msg}`)),
  success: (msg: string) => console.log(chalk.green(`[SUCCESS] ${msg}`)),
  warning: (msg: string) => console.log(chalk.yellow(`[WARNING] ${msg}`)),
  error: (msg: string) => console.log(chalk.red(`[ERROR] ${msg}`)),
  section: (msg: string) => console.log(chalk.cyan(`\n=== ${msg.toUpperCase()} ===`))
};

async function syncAllPlatforms() {
  // Track overall sync status
  const startTime = new Date();
  const syncResults: any = {
    close: {
      success: false,
      contacts: 0,
      activities: 0,
      deals: 0,
      users: 0,
      error: null
    },
    calendly: {
      success: false,
      meetings: 0,
      error: null
    },
    typeform: {
      success: false,
      forms: 0,
      submissions: 0,
      error: null
    },
    attribution: {
      multiSourceContacts: 0,
      totalContacts: 0,
      multiSourceRate: 0
    }
  };

  // 1. First, sync Close CRM data
  log.section('Syncing Close CRM Data');
  
  try {
    // Test Close API connection
    log.info('Testing Close CRM API connection...');
    const closeConnectionTest = await closeAPI.testApiConnection();
    if (!closeConnectionTest.success) {
      throw new Error(`Close API connection failed: ${closeConnectionTest.error}`);
    }
    log.success(`Connected to Close CRM as ${closeConnectionTest.user.first_name} ${closeConnectionTest.user.last_name}`);

    // Sync users
    log.info('Syncing Close CRM users...');
    const usersResult = await closeAPI.syncUsers();
    if (!usersResult.success) {
      throw new Error(`Failed to sync Close users: ${usersResult.error}`);
    }
    syncResults.close.users = usersResult.count || 0;
    log.success(`Synced ${syncResults.close.users} Close CRM users`);

    // Sync leads (contacts)
    log.info('Syncing Close CRM leads (contacts)...');
    const leadsResult = await closeAPI.syncAllLeads();
    if (!leadsResult.success) {
      throw new Error(`Failed to sync Close leads: ${leadsResult.error}`);
    }
    syncResults.close.contacts = leadsResult.importedContacts || 0;
    log.success(`Synced ${syncResults.close.contacts} Close CRM contacts`);

    // Sync opportunities (deals) if not already done by the lead sync
    log.info('Syncing Close CRM opportunities (deals)...');
    const dealsResult = await closeAPI.syncAllLeadOpportunities();
    if (!dealsResult.success) {
      throw new Error(`Failed to sync Close opportunities: ${dealsResult.error}`);
    }
    syncResults.close.deals = dealsResult.count || 0;
    log.success(`Synced ${syncResults.close.deals} Close CRM deals`);

    // Sync activities if not already done by the lead sync
    log.info('Syncing Close CRM activities...');
    const activitiesResult = await closeAPI.syncAllLeadActivities();
    if (!activitiesResult.success) {
      throw new Error(`Failed to sync Close activities: ${activitiesResult.error}`);
    }
    syncResults.close.activities = activitiesResult.count || 0;
    log.success(`Synced ${syncResults.close.activities} Close CRM activities`);

    syncResults.close.success = true;
  } catch (error: any) {
    log.error(`Error syncing Close CRM data: ${error.message}`);
    syncResults.close.error = error.message;
  }

  // 2. Next, sync Calendly data
  log.section('Syncing Calendly Data');
  
  try {
    // Test Calendly API connection
    log.info('Testing Calendly API connection...');
    const calendlyConnectionTest = await calendlyAPI.testApiConnection();
    if (!calendlyConnectionTest.success) {
      throw new Error(`Calendly API connection failed: ${calendlyConnectionTest.error}`);
    }
    log.success(`Connected to Calendly as ${calendlyConnectionTest.user.name}`);

    // Sync all calendar events
    log.info('Syncing Calendly events...');
    const eventsResult = await calendlyAPI.syncAllEvents();
    if (!eventsResult.success) {
      throw new Error(`Failed to sync Calendly events: ${eventsResult.error}`);
    }
    syncResults.calendly.meetings = eventsResult.count || 0;
    log.success(`Synced ${syncResults.calendly.meetings} Calendly meetings`);

    syncResults.calendly.success = true;
  } catch (error: any) {
    log.error(`Error syncing Calendly data: ${error.message}`);
    syncResults.calendly.error = error.message;
  }

  // 3. Finally, sync Typeform data
  log.section('Syncing Typeform Data');
  
  try {
    // Sync all forms and their responses
    log.info('Syncing Typeform responses...');
    const typeformResult = await typeformAPI.syncTypeformResponses();
    if (!typeformResult.success) {
      throw new Error(`Failed to sync Typeform responses: ${typeformResult.error}`);
    }
    syncResults.typeform.submissions = typeformResult.synced || 0;
    syncResults.typeform.forms = typeformResult.processed || 0;
    log.success(`Synced ${syncResults.typeform.submissions} Typeform submissions from ${syncResults.typeform.forms} forms`);

    syncResults.typeform.success = true;
  } catch (error: any) {
    log.error(`Error syncing Typeform data: ${error.message}`);
    syncResults.typeform.error = error.message;
  }

  // 4. Generate attribution metrics
  log.section('Generating Attribution Metrics');
  
  try {
    // Count total contacts
    const totalContactsResult = await db.execute(sql`SELECT COUNT(*) as count FROM contacts`);
    syncResults.attribution.totalContacts = parseInt(totalContactsResult.rows[0].count) || 0;
    
    // Count multi-source contacts (with data from more than one platform)
    const multiSourceQuery = sql`
      SELECT COUNT(*) as count FROM contacts 
      WHERE (
        EXISTS(SELECT 1 FROM activities WHERE activities.contact_id = contacts.id AND activities.source = 'close') AND
        EXISTS(SELECT 1 FROM meetings WHERE meetings.contact_id = contacts.id)
      ) OR (
        EXISTS(SELECT 1 FROM activities WHERE activities.contact_id = contacts.id AND activities.source = 'close') AND
        EXISTS(SELECT 1 FROM activities WHERE activities.contact_id = contacts.id AND activities.source = 'Typeform')
      ) OR (
        EXISTS(SELECT 1 FROM meetings WHERE meetings.contact_id = contacts.id) AND
        EXISTS(SELECT 1 FROM activities WHERE activities.contact_id = contacts.id AND activities.source = 'Typeform')
      )
    `;
    
    const multiSourceResult = await db.execute(multiSourceQuery);
    syncResults.attribution.multiSourceContacts = parseInt(multiSourceResult.rows[0].count) || 0;
    
    // Calculate multi-source rate
    if (syncResults.attribution.totalContacts > 0) {
      syncResults.attribution.multiSourceRate = (syncResults.attribution.multiSourceContacts / syncResults.attribution.totalContacts * 100).toFixed(2);
    }
    
    log.success(`Attribution metrics generated: ${syncResults.attribution.multiSourceContacts} multi-source contacts out of ${syncResults.attribution.totalContacts} total contacts (${syncResults.attribution.multiSourceRate}%)`);
  } catch (error: any) {
    log.error(`Error generating attribution metrics: ${error.message}`);
  }

  // 5. Sync summary
  const endTime = new Date();
  const duration = (endTime.getTime() - startTime.getTime()) / 1000; // in seconds
  
  log.section('Sync Summary');
  console.log(chalk.bold(`\nSync completed in ${duration.toFixed(2)} seconds\n`));
  
  // Close CRM summary
  if (syncResults.close.success) {
    log.success(`Close CRM: ${syncResults.close.contacts} contacts, ${syncResults.close.deals} deals, ${syncResults.close.activities} activities, ${syncResults.close.users} users`);
  } else {
    log.error(`Close CRM: Failed - ${syncResults.close.error}`);
  }
  
  // Calendly summary
  if (syncResults.calendly.success) {
    log.success(`Calendly: ${syncResults.calendly.meetings} meetings`);
  } else {
    log.error(`Calendly: Failed - ${syncResults.calendly.error}`);
  }
  
  // Typeform summary
  if (syncResults.typeform.success) {
    log.success(`Typeform: ${syncResults.typeform.submissions} submissions from ${syncResults.typeform.forms} forms`);
  } else {
    log.error(`Typeform: Failed - ${syncResults.typeform.error}`);
  }
  
  // Attribution metrics
  console.log(chalk.bold('\nAttribution Metrics:'));
  console.log(`Total Contacts: ${syncResults.attribution.totalContacts}`);
  console.log(`Multi-Source Contacts: ${syncResults.attribution.multiSourceContacts}`);
  console.log(`Multi-Source Rate: ${syncResults.attribution.multiSourceRate}%`);
  
  return syncResults;
}

// Run the sync
syncAllPlatforms()
  .then(() => {
    console.log(chalk.bold('Sync process completed.'));
    process.exit(0);
  })
  .catch(error => {
    console.error('Error in sync process:', error);
    process.exit(1);
  });