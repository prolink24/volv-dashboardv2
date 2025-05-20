/**
 * Import All Missing Calendly Events
 * 
 * This script:
 * 1. Fetches all Calendly events from the API
 * 2. Compares with our database to find missing events
 * 3. Fetches invitee information for each missing event
 * 4. Matches invitees to contacts in our database
 * 5. Imports the events with proper associations
 */

import axios from 'axios';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { eq, isNull, and, or, like, ilike } from 'drizzle-orm';
import { format, parseISO, differenceInMinutes, subMonths } from 'date-fns';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Verify API key
const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
if (!CALENDLY_API_KEY) {
  console.error(chalk.red('Error: CALENDLY_API_KEY environment variable not set'));
  process.exit(1);
}

// Database setup
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Organization URI
const ORG_URI = 'https://api.calendly.com/organizations/54858790-a2e4-4696-9d19-7c6dc22ef508';

// Calendly API client
const calendlyClient = axios.create({
  baseURL: 'https://api.calendly.com',
  headers: {
    'Authorization': `Bearer ${CALENDLY_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Map of Calendly user emails to internal user IDs
const userEmailToIdMap: Record<string, number> = {
  'dealmaker@thedealmaker.io': 1,
  'mazin@thedealmaker.io': 2,
  'fred@thedealmaker.io': 3,
  'louis@thedealmaker.io': 4,
  'hope@thedealmaker.io': 5,
  'bogdan@thedealmaker.io': 6,
  'marco@thedealmaker.io': 7,
  'laura@thedealmaker.io': 8,
  'vraj@thedealmaker.io': 9
};

// Event type mapping
const eventTypeMap: Record<string, string> = {
  'intro-call': 'Call 1',
  'introduction-call': 'Call 1',
  'solution-call': 'Call 2', 
  'next-steps-call': 'Call 3',
  'orientation': 'Orientation',
  'mentee-call': 'Mentoring'
};

// Logging utilities
function logSuccess(message: string) {
  console.log(chalk.green('✓ ' + message));
}

function logInfo(message: string) {
  console.log(chalk.blue('ℹ ' + message));
}

function logWarning(message: string) {
  console.log(chalk.yellow('⚠ ' + message));
}

function logError(message: string) {
  console.error(chalk.red('✗ ' + message));
}

function logHeader(message: string) {
  console.log(chalk.bold.magenta('\n=== ' + message + ' ===\n'));
}

/**
 * Get all Calendly events for a specific time period with pagination
 */
async function getAllEventsForPeriod(label: string, minDate: string, maxDate: string) {
  logInfo(`Fetching ${label} events from ${minDate} to ${maxDate}...`);
  
  let allEvents: any[] = [];
  let nextPageUrl: string | null = null;
  let page = 1;
  
  try {
    do {
      // Use next page URL if available, otherwise build initial URL
      let url = nextPageUrl;
      if (!url) {
        const params = {
          organization: ORG_URI,
          count: 100,
          status: 'active',
          min_start_time: minDate,
          max_start_time: maxDate
        };
        
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          queryParams.append(key, value as string);
        });
        
        url = `/scheduled_events?${queryParams.toString()}`;
      } else {
        url = url.replace('https://api.calendly.com', '');
      }
      
      // Make the request
      logInfo(`Fetching ${label} page ${page}...`);
      const response = await calendlyClient.get(url);
      
      if (response.data && response.data.collection) {
        const events = response.data.collection;
        allEvents = [...allEvents, ...events];
        logSuccess(`Found ${events.length} events on page ${page}`);
        
        // Check for next page
        nextPageUrl = response.data.pagination?.next_page || null;
        if (nextPageUrl) {
          logInfo(`More events available at: ${nextPageUrl}`);
        }
        
        page++;
      } else {
        logError(`Invalid response from API on page ${page}`);
        break;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } while (nextPageUrl);
    
    logSuccess(`Total ${label} events found: ${allEvents.length}`);
    return allEvents;
    
  } catch (error: any) {
    logError(`Error fetching ${label} events: ${error.message}`);
    if (error.response) {
      logError(`API Response: ${JSON.stringify(error.response.data)}`);
    }
    return [];
  }
}

/**
 * Get all Calendly events across multiple time periods
 */
async function getAllCalendlyEvents() {
  const now = new Date();
  
  // Define time periods to fetch
  const periods = [
    { 
      label: 'Recent',
      minDate: subMonths(now, 3).toISOString(),
      maxDate: now.toISOString()
    },
    {
      label: 'Older',
      minDate: subMonths(now, 6).toISOString(),
      maxDate: subMonths(now, 3).toISOString()
    },
    {
      label: 'Oldest',
      minDate: subMonths(now, 12).toISOString(),
      maxDate: subMonths(now, 6).toISOString()
    }
  ];
  
  // Fetch events for each period
  let allEvents: any[] = [];
  for (const period of periods) {
    const events = await getAllEventsForPeriod(
      period.label, 
      period.minDate, 
      period.maxDate
    );
    allEvents = [...allEvents, ...events];
  }
  
  logSuccess(`Total Calendly events found across all periods: ${allEvents.length}`);
  return allEvents;
}

/**
 * Get existing Calendly event IDs from our database
 */
async function getExistingCalendlyEventIds() {
  try {
    logInfo('Fetching existing Calendly event IDs from database...');
    
    const result = await db.execute(
      `SELECT calendly_event_id FROM meetings WHERE calendly_event_id IS NOT NULL`
    );
    
    const eventIds = result.rows.map((row: any) => row.calendly_event_id);
    logSuccess(`Found ${eventIds.length} Calendly events already in database`);
    
    return eventIds;
  } catch (error: any) {
    logError(`Error fetching existing event IDs: ${error.message}`);
    return [];
  }
}

/**
 * Find events that exist in Calendly but not in our database
 */
function findMissingEvents(allCalendlyEvents: any[], existingEventIds: string[]) {
  // Extract event IDs from Calendly events
  const allCalendlyEventIds = allCalendlyEvents.map(event => {
    return event.uri.split('/').pop();
  });
  
  // Find IDs that don't exist in our database
  const missingEventIds = allCalendlyEventIds.filter(id => !existingEventIds.includes(id));
  
  // Get the full event objects for missing events
  const missingEvents = allCalendlyEvents.filter(event => {
    const eventId = event.uri.split('/').pop();
    return missingEventIds.includes(eventId);
  });
  
  logSuccess(`Found ${missingEvents.length} events that need to be imported`);
  return missingEvents;
}

/**
 * Get invitee details for an event
 */
async function getInviteeDetails(eventUri: string) {
  try {
    const response = await calendlyClient.get(`${eventUri}/invitees`);
    return response.data.collection || [];
  } catch (error: any) {
    logError(`Error getting invitees for event ${eventUri}: ${error.message}`);
    return [];
  }
}

/**
 * Find contact in database by email
 */
async function findContactByEmail(email: string) {
  if (!email) return null;
  
  try {
    const result = await db.execute(
      `SELECT id, name, email FROM contacts WHERE email = $1 LIMIT 1`,
      [email]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    return null;
  } catch (error: any) {
    logError(`Error finding contact by email: ${error.message}`);
    return null;
  }
}

/**
 * Find contact in database by name (fuzzy match)
 */
async function findContactByName(name: string) {
  if (!name) return null;
  
  try {
    const result = await db.execute(
      `SELECT id, name, email FROM contacts WHERE name ILIKE $1 LIMIT 1`,
      [`%${name}%`]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    return null;
  } catch (error: any) {
    logError(`Error finding contact by name: ${error.message}`);
    return null;
  }
}

/**
 * Get a default contact for event assignment if no match found
 */
async function getDefaultContact() {
  try {
    // First try to get a specific contact that might be used for this purpose
    const result = await db.execute(
      `SELECT id, name, email FROM contacts WHERE name ILIKE 'Default%' OR name ILIKE 'System%' LIMIT 1`
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Fall back to any contact with an ID
    const fallbackResult = await db.execute(
      `SELECT id, name, email FROM contacts WHERE id = 1 LIMIT 1`
    );
    
    if (fallbackResult.rows.length > 0) {
      return fallbackResult.rows[0];
    }
    
    // Last resort - any available contact
    const anyResult = await db.execute(
      `SELECT id, name, email FROM contacts LIMIT 1`
    );
    
    if (anyResult.rows.length > 0) {
      return anyResult.rows[0];
    }
    
    logError('Could not find any contact to use as default');
    return null;
  } catch (error: any) {
    logError(`Error getting default contact: ${error.message}`);
    return null;
  }
}

/**
 * Determine the event type based on event name
 */
function determineEventType(eventName: string) {
  if (!eventName) return 'Call 1'; // Default to Call 1
  
  const lowerName = eventName.toLowerCase();
  
  if (lowerName.includes('intro') || lowerName.includes('introduction')) {
    return 'Call 1';
  } else if (lowerName.includes('solution')) {
    return 'Call 2';
  } else if (lowerName.includes('next steps') || lowerName.includes('next-steps')) {
    return 'Call 3';
  } else if (lowerName.includes('orientation')) {
    return 'Orientation';
  } else if (lowerName.includes('mentee') || lowerName.includes('mentor')) {
    return 'Mentoring';
  }
  
  return 'Call 1'; // Default
}

/**
 * Determine assigned user based on event memberships
 */
function determineAssignedUser(event: any) {
  // Default assigned user ID
  let assignedUserId = 1;
  
  if (event.event_memberships && event.event_memberships.length > 0) {
    const userEmail = event.event_memberships[0].user_email;
    
    // If it's a deleted user
    if (userEmail.includes('@deleted.calendly.com')) {
      return assignedUserId;
    }
    
    // Check for direct email match in our map
    if (userEmailToIdMap[userEmail]) {
      return userEmailToIdMap[userEmail];
    }
    
    // Try to match by the local part of the email
    const localPart = userEmail.split('@')[0];
    for (const [email, id] of Object.entries(userEmailToIdMap)) {
      if (email.split('@')[0] === localPart) {
        return id;
      }
    }
  }
  
  return assignedUserId;
}

/**
 * Process a single event and prepare it for import
 */
async function processEvent(event: any) {
  // Extract event ID from URI
  const eventId = event.uri.split('/').pop();
  logInfo(`Processing event: ${eventId} - ${event.name || 'Unnamed event'}`);
  
  // Get invitee details
  const invitees = await getInviteeDetails(event.uri);
  logInfo(`Event has ${invitees.length} invitees`);
  
  // If no invitees, we need to find a default contact
  if (invitees.length === 0) {
    const defaultContact = await getDefaultContact();
    if (!defaultContact) {
      logError(`Skipping event ${eventId} - no invitees and no default contact available`);
      return null;
    }
    
    // Prepare event with default contact
    return {
      calendlyEventId: eventId,
      type: determineEventType(event.name),
      title: event.name || 'Calendly Meeting',
      startTime: event.start_time,
      endTime: event.end_time,
      duration: differenceInMinutes(new Date(event.end_time), new Date(event.start_time)),
      status: event.status,
      bookedAt: event.created_at,
      assignedTo: determineAssignedUser(event),
      contactId: defaultContact.id,
      contactName: defaultContact.name,
      contactEmail: defaultContact.email
    };
  }
  
  // Use the first invitee
  const invitee = invitees[0];
  
  // Try to find matching contact by email first
  let contact = await findContactByEmail(invitee.email);
  
  // If no match by email, try by name
  if (!contact && invitee.name) {
    contact = await findContactByName(invitee.name);
  }
  
  // If still no match, use default contact
  if (!contact) {
    const defaultContact = await getDefaultContact();
    if (!defaultContact) {
      logError(`Skipping event ${eventId} - cannot find matching contact and no default available`);
      return null;
    }
    contact = defaultContact;
  }
  
  // Prepare event data
  return {
    calendlyEventId: eventId,
    type: determineEventType(event.name),
    title: event.name || 'Calendly Meeting',
    startTime: event.start_time,
    endTime: event.end_time,
    duration: differenceInMinutes(new Date(event.end_time), new Date(event.start_time)),
    status: event.status,
    bookedAt: event.created_at,
    assignedTo: determineAssignedUser(event),
    contactId: contact.id,
    contactName: contact.name,
    contactEmail: contact.email,
    inviteeEmail: invitee.email,
    inviteeName: invitee.name
  };
}

/**
 * Import a processed event into the database
 */
async function importEvent(event: any) {
  try {
    // Format dates to strings
    const startTime = format(new Date(event.startTime), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
    const endTime = format(new Date(event.endTime), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
    const bookedAt = event.bookedAt ? format(new Date(event.bookedAt), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'") : null;
    
    // Execute insert query
    await db.execute(
      `INSERT INTO meetings (
        calendly_event_id, type, title, start_time, end_time, duration, status,
        booked_at, assigned_to, contact_id, invitee_email, invitee_name
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )`,
      [
        event.calendlyEventId,
        event.type,
        event.title,
        startTime,
        endTime,
        event.duration,
        event.status,
        bookedAt,
        event.assignedTo,
        event.contactId,
        event.inviteeEmail,
        event.inviteeName
      ]
    );
    
    logSuccess(`Successfully imported event: ${event.calendlyEventId}`);
    return true;
  } catch (error: any) {
    logError(`Failed to import event ${event.calendlyEventId}: ${error.message}`);
    return false;
  }
}

/**
 * Process batch of events
 */
async function processBatch(events: any[], batchSize: number = 10) {
  const totalEvents = events.length;
  let processed = 0;
  let imported = 0;
  let errors = 0;
  
  for (let i = 0; i < totalEvents; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    logHeader(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(totalEvents / batchSize)}`);
    
    for (const event of batch) {
      processed++;
      
      try {
        // Process the event
        const processedEvent = await processEvent(event);
        
        // Skip if processing failed
        if (!processedEvent) {
          errors++;
          continue;
        }
        
        // Import the event
        const success = await importEvent(processedEvent);
        if (success) {
          imported++;
        } else {
          errors++;
        }
      } catch (error: any) {
        logError(`Error processing event: ${error.message}`);
        errors++;
      }
      
      // Small delay to avoid overloading
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Progress update
    logInfo(`Progress: ${processed}/${totalEvents} processed, ${imported} imported, ${errors} errors`);
    
    // Larger delay between batches
    if (i + batchSize < totalEvents) {
      const waitTime = 2000;
      logInfo(`Waiting ${waitTime/1000} seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  return { processed, imported, errors };
}

/**
 * Main function
 */
async function main() {
  logHeader('Importing Missing Calendly Events');
  
  try {
    // 1. Get all Calendly events
    const allCalendlyEvents = await getAllCalendlyEvents();
    
    // 2. Get existing event IDs from database
    const existingEventIds = await getExistingCalendlyEventIds();
    
    // 3. Find missing events
    const missingEvents = findMissingEvents(allCalendlyEvents, existingEventIds);
    
    if (missingEvents.length === 0) {
      logSuccess('No missing events found. Database is up to date!');
      return;
    }
    
    // 4. Process events in batches
    const results = await processBatch(missingEvents, 5);
    
    // 5. Summary
    logHeader('Import Summary');
    logSuccess(`Total events processed: ${results.processed}`);
    logSuccess(`Successfully imported: ${results.imported}`);
    logWarning(`Failed to import: ${results.errors}`);
    
    // 6. Verification query
    logInfo('\nVerify the import with this query:');
    logInfo('SELECT COUNT(*) FROM meetings WHERE calendly_event_id IS NOT NULL;');
    
  } catch (error: any) {
    logError(`Import process failed: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// Run the script
main().catch(error => {
  logError(`Fatal error: ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
});