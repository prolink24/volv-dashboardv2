/**
 * Import Recent Calendly Events (Last 30 Days)
 * 
 * A streamlined script that:
 * 1. Fetches only recent Calendly events (last 30 days)
 * 2. Identifies which ones are missing from our database
 * 3. Imports them with correct contact associations
 */

import axios from 'axios';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { format, parseISO, differenceInMinutes, subDays } from 'date-fns';
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

// Pretty logging
function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const colors = {
    info: chalk.blue,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red
  };
  
  const icons = {
    info: 'ℹ',
    success: '✓',
    warning: '⚠',
    error: '✗'
  };
  
  console.log(colors[type](`${icons[type]} ${message}`));
}

function logHeader(message: string) {
  console.log(chalk.bold.magenta(`\n=== ${message} ===\n`));
}

/**
 * Get Calendly events for the last 30 days
 */
async function getRecentCalendlyEvents() {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  
  log(`Fetching events from ${format(thirtyDaysAgo, 'yyyy-MM-dd')} to ${format(now, 'yyyy-MM-dd')}...`, 'info');
  
  try {
    // Build URL with params
    const params = {
      organization: ORG_URI,
      count: 100,
      status: 'active',
      min_start_time: thirtyDaysAgo.toISOString(),
      max_start_time: now.toISOString()
    };
    
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, value as string);
    });
    
    const url = `/scheduled_events?${queryParams.toString()}`;
    
    // Make the request
    const response = await calendlyClient.get(url);
    
    if (response.data && response.data.collection) {
      const events = response.data.collection;
      log(`Found ${events.length} events in the last 30 days`, 'success');
      
      // Check for pagination
      if (response.data.pagination && response.data.pagination.next_page) {
        log(`Note: More events are available at ${response.data.pagination.next_page}`, 'info');
      }
      
      return events;
    } else {
      log(`Invalid response from API`, 'error');
      return [];
    }
  } catch (error: any) {
    log(`Error fetching events: ${error.message}`, 'error');
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    return [];
  }
}

/**
 * Get existing Calendly event IDs from database
 */
async function getExistingEventIds() {
  try {
    log('Checking existing Calendly events in database...', 'info');
    
    const result = await db.execute(
      `SELECT calendly_event_id FROM meetings WHERE calendly_event_id IS NOT NULL`
    );
    
    const eventIds = result.rows.map((row: any) => row.calendly_event_id);
    log(`Found ${eventIds.length} Calendly events already in database`, 'success');
    
    return eventIds;
  } catch (error: any) {
    log(`Error checking database: ${error.message}`, 'error');
    return [];
  }
}

/**
 * Find events that are in Calendly but missing from database
 */
function findMissingEvents(calendlyEvents: any[], existingIds: string[]) {
  const missingEvents = calendlyEvents.filter(event => {
    const eventId = event.uri.split('/').pop();
    return !existingIds.includes(eventId);
  });
  
  log(`Found ${missingEvents.length} events missing from database`, 'success');
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
    log(`Error getting invitees for ${eventUri}: ${error.message}`, 'error');
    return [];
  }
}

/**
 * Look up a contact by email
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
    log(`Error finding contact by email: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Look up a contact by fuzzy name match
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
    log(`Error finding contact by name: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Get default contact for assigning meetings
 */
async function getDefaultContact() {
  try {
    // Try to get a specific contact that might be used for this purpose
    const result = await db.execute(
      `SELECT id, name, email FROM contacts LIMIT 1`
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    log('No contacts found in database!', 'error');
    return null;
  } catch (error: any) {
    log(`Error getting default contact: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Determine event type from name
 */
function determineEventType(eventName: string) {
  if (!eventName) return 'Call 1'; // Default type
  
  const name = eventName.toLowerCase();
  
  if (name.includes('intro') || name.includes('introduction')) {
    return 'Call 1';
  } else if (name.includes('solution')) {
    return 'Call 2';
  } else if (name.includes('next step') || name.includes('next-step')) {
    return 'Call 3';
  } else if (name.includes('orientation')) {
    return 'Orientation';
  } else if (name.includes('mentor') || name.includes('mentee')) {
    return 'Mentoring';
  }
  
  return 'Call 1'; // Default
}

/**
 * Get user ID from event memberships
 */
function determineAssignedUser(event: any) {
  // Default user ID
  let assignedUserId = 1;
  
  if (event.event_memberships && event.event_memberships.length > 0) {
    const userEmail = event.event_memberships[0].user_email;
    
    // Handle deleted users
    if (userEmail.includes('@deleted.calendly.com')) {
      return assignedUserId;
    }
    
    // Check direct email match
    if (userEmailToIdMap[userEmail]) {
      return userEmailToIdMap[userEmail];
    }
    
    // Try matching by local part
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
 * Process a single event
 */
async function processEvent(event: any) {
  const eventId = event.uri.split('/').pop();
  log(`Processing event: ${eventId} - ${event.name || 'Unnamed'}`, 'info');
  
  // Get invitees
  const invitees = await getInviteeDetails(event.uri);
  log(`Event has ${invitees.length} invitees`, 'info');
  
  // If no invitees, find a default contact
  if (invitees.length === 0) {
    const defaultContact = await getDefaultContact();
    if (!defaultContact) {
      log(`Cannot process event ${eventId} - no invitees and no default contact`, 'error');
      return null;
    }
    
    log(`Using default contact: ${defaultContact.name}`, 'warning');
    
    return {
      calendlyEventId: eventId,
      type: determineEventType(event.name),
      title: event.name || 'Calendly Meeting',
      startTime: event.start_time,
      endTime: event.end_time,
      duration: differenceInMinutes(parseISO(event.end_time), parseISO(event.start_time)),
      status: event.status,
      bookedAt: event.created_at,
      assignedTo: determineAssignedUser(event),
      contactId: defaultContact.id,
      contactName: defaultContact.name,
      contactEmail: defaultContact.email
    };
  }
  
  // Use first invitee
  const invitee = invitees[0];
  
  // Try to find matching contact
  let contact = null;
  
  // First by email
  if (invitee.email) {
    contact = await findContactByEmail(invitee.email);
    if (contact) {
      log(`Matched contact by email: ${contact.name}`, 'success');
    }
  }
  
  // Then by name
  if (!contact && invitee.name) {
    contact = await findContactByName(invitee.name);
    if (contact) {
      log(`Matched contact by name: ${contact.name}`, 'success');
    }
  }
  
  // If still no match, use default
  if (!contact) {
    const defaultContact = await getDefaultContact();
    if (!defaultContact) {
      log(`Cannot process event ${eventId} - no matching contact and no default`, 'error');
      return null;
    }
    
    log(`Using default contact: ${defaultContact.name}`, 'warning');
    contact = defaultContact;
  }
  
  return {
    calendlyEventId: eventId,
    type: determineEventType(event.name),
    title: event.name || 'Calendly Meeting',
    startTime: event.start_time,
    endTime: event.end_time,
    duration: differenceInMinutes(parseISO(event.end_time), parseISO(event.start_time)),
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
 * Import a processed event
 */
async function importEvent(event: any) {
  try {
    // Format dates
    const startTime = format(parseISO(event.startTime), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
    const endTime = format(parseISO(event.endTime), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
    const bookedAt = event.bookedAt ? format(parseISO(event.bookedAt), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'") : null;
    
    // Execute insert
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
        event.inviteeEmail || null,
        event.inviteeName || null
      ]
    );
    
    log(`Successfully imported event: ${event.calendlyEventId}`, 'success');
    return true;
  } catch (error: any) {
    log(`Failed to import event ${event.calendlyEventId}: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  logHeader('Importing Recent Calendly Events (Last 30 Days)');
  
  try {
    // 1. Get recent Calendly events
    const recentEvents = await getRecentCalendlyEvents();
    if (recentEvents.length === 0) {
      log('No recent events found. Exiting.', 'warning');
      return;
    }
    
    // 2. Get existing event IDs
    const existingIds = await getExistingEventIds();
    
    // 3. Find missing events
    const missingEvents = findMissingEvents(recentEvents, existingIds);
    if (missingEvents.length === 0) {
      log('No missing events found. Database is up to date!', 'success');
      return;
    }
    
    // 4. Process and import missing events
    logHeader(`Importing ${missingEvents.length} Missing Events`);
    
    let imported = 0;
    let failed = 0;
    
    for (const [index, event] of missingEvents.entries()) {
      log(`Processing event ${index + 1}/${missingEvents.length}`, 'info');
      
      // Process event
      const processedEvent = await processEvent(event);
      if (!processedEvent) {
        failed++;
        continue;
      }
      
      // Import event
      const success = await importEvent(processedEvent);
      if (success) {
        imported++;
      } else {
        failed++;
      }
      
      // Small delay between operations
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 5. Summary
    logHeader('Import Summary');
    log(`Successfully imported: ${imported} events`, 'success');
    log(`Failed to import: ${failed} events`, 'warning');
    
    // 6. Verification
    const verificationResult = await db.execute(
      `SELECT COUNT(*) FROM meetings WHERE calendly_event_id IS NOT NULL`
    );
    const totalCount = parseInt(verificationResult.rows[0].count);
    
    log(`Total Calendly events in database now: ${totalCount}`, 'success');
    log(`Dashboard should now show the correct call counts for the last 30 days`, 'success');
    
  } catch (error: any) {
    log(`Import process failed: ${error.message}`, 'error');
    console.error(error.stack);
  }
}

// Run the script
main().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  console.error(error.stack);
});