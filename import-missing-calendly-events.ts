/**
 * Import Missing Calendly Events
 * 
 * This script systematically:
 * 1. Fetches all Calendly events with proper pagination
 * 2. Compares with database records to find missing events
 * 3. Generates SQL to insert missing events
 * 4. Handles proper user assignment based on event_memberships
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { format, parseISO, subMonths, differenceInMinutes } from 'date-fns';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Verify API key
if (!process.env.CALENDLY_API_KEY) {
  console.error('Error: CALENDLY_API_KEY environment variable not set');
  process.exit(1);
}

// Set up database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Create output directory for logs and SQL
const OUTPUT_DIR = './calendly-events-import';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// Log file 
const LOG_FILE = path.join(OUTPUT_DIR, 'import-log.txt');
// SQL output file
const SQL_FILE = path.join(OUTPUT_DIR, 'import-sql.sql');

// Clear previous log files
fs.writeFileSync(LOG_FILE, '');
fs.writeFileSync(SQL_FILE, '');

// Log to console and file
function log(message: string) {
  console.log(message);
  fs.appendFileSync(LOG_FILE, message + '\n');
}

// Write SQL to file
function writeSQL(sql: string) {
  fs.appendFileSync(SQL_FILE, sql + '\n');
}

// Organization URI
const ORG_URI = 'https://api.calendly.com/organizations/54858790-a2e4-4696-9d19-7c6dc22ef508';

// Calendly API client
const calendlyClient = axios.create({
  baseURL: 'https://api.calendly.com',
  headers: {
    'Authorization': `Bearer ${process.env.CALENDLY_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Map of Calendly user emails to internal user IDs
const userMap: Record<string, number> = {
  'dealmaker@thedealmaker.io': 1,
  'mazin@thedealmaker.io': 2,
  'fred@thedealmaker.io': 3,
  'louis@thedealmaker.io': 4,
  'hope@thedealmaker.io': 5,
  'bogdan@thedealmaker.io': 6,
  'marco@thedealmaker.io': 7,
  'laura@thedealmaker.io': 8,
  'vraj@thedealmaker.io': 9,
  // Default user ID if no match found
  'default': 1
};

// Event type mapping
const eventTypeMap: Record<string, string> = {
  'deal-maker-intro-call': 'Call 1',
  'dealmaker-intro-call': 'Call 1',
  'dealmaker-solution-call': 'Call 2',
  'dealmaker-next-steps-call': 'Call 3',
  'deal-maker-orientation': 'Orientation',
  'deal-maker-mentee-call': 'Mentoring',
  // Default type if no match found
  'default': 'Calendly Meeting'
};

// Get all Calendly events with pagination
async function getAllEvents(minDate: string, maxDate: string, label: string = '') {
  log(`Fetching ${label} events from ${minDate} to ${maxDate}...`);
  
  const allEvents: any[] = [];
  let nextPageUrl: string | null = null;
  let page = 1;
  
  try {
    do {
      // Use next page URL if available, otherwise build the initial URL
      let url = nextPageUrl;
      if (!url) {
        url = '/scheduled_events';
        const params = {
          organization: ORG_URI,
          count: 100,
          status: 'active',
          min_start_time: minDate,
          max_start_time: maxDate
        };
        
        // Build URL with params
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          queryParams.append(key, value as string);
        });
        
        url = `${url}?${queryParams.toString()}`;
      } else {
        // Extract just the path and query from the full URL
        url = url.replace('https://api.calendly.com', '');
      }
      
      log(`Fetching ${label} page ${page}...`);
      const response = await calendlyClient.get(url);
      
      if (response.data && response.data.collection) {
        const events = response.data.collection;
        allEvents.push(...events);
        log(`Found ${events.length} events on page ${page}`);
        
        // Get next page URL if available
        nextPageUrl = response.data.pagination?.next_page || null;
        
        // Save raw response for debugging
        fs.writeFileSync(
          path.join(OUTPUT_DIR, `${label.replace(/\s+/g, '-').toLowerCase()}-page-${page}.json`),
          JSON.stringify(response.data, null, 2)
        );
        
        page++;
      } else {
        log(`Invalid response from API on page ${page}: ${JSON.stringify(response.data)}`);
        break;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } while (nextPageUrl);
    
    log(`Total ${label} events found: ${allEvents.length}`);
    return allEvents;
  } catch (error: any) {
    log(`Error fetching ${label} events: ${error.message}`);
    if (error.response) {
      log(`API Response: ${JSON.stringify(error.response.data)}`);
    }
    return [];
  }
}

// Get invitee details for an event
async function getInviteeDetails(eventUri: string) {
  try {
    const response = await calendlyClient.get(`${eventUri}/invitees`);
    return response.data.collection || [];
  } catch (error: any) {
    log(`Error getting invitees for event ${eventUri}: ${error.message}`);
    return [];
  }
}

// Extract event details
function extractEventDetails(event: any, invitees: any[]) {
  try {
    // Get assigned user from event memberships
    let assignedTo = null;
    if (event.event_memberships && event.event_memberships.length > 0) {
      const userEmail = event.event_memberships[0].user_email;
      // Handle deleted users
      if (userEmail.includes('@deleted.calendly.com')) {
        assignedTo = userMap['default'];
      } else {
        // Try to match by domain part
        const domain = userEmail.split('@')[1];
        if (domain === 'thedealmaker.io') {
          const localPart = userEmail.split('@')[0];
          // Match by the local part of the email
          for (const [email, id] of Object.entries(userMap)) {
            if (email.split('@')[0] === localPart) {
              assignedTo = id;
              break;
            }
          }
        }
        
        // If no match found, use the default
        if (!assignedTo) {
          assignedTo = userMap['default'];
        }
      }
    } else {
      assignedTo = userMap['default'];
    }
    
    // Get event type
    let eventType = eventTypeMap['default'];
    if (event.name) {
      const lowerName = event.name.toLowerCase();
      
      if (lowerName.includes('intro call') || lowerName.includes('introduction call')) {
        eventType = eventTypeMap['dealmaker-intro-call'];
      } else if (lowerName.includes('solution call')) {
        eventType = eventTypeMap['dealmaker-solution-call'];
      } else if (lowerName.includes('next steps call')) {
        eventType = eventTypeMap['dealmaker-next-steps-call'];
      } else if (lowerName.includes('orientation')) {
        eventType = eventTypeMap['deal-maker-orientation'];
      } else if (lowerName.includes('mentee call')) {
        eventType = eventTypeMap['deal-maker-mentee-call'];
      }
    }
    
    // Get invitee information
    let contactEmail = null;
    let contactName = null;
    if (invitees.length > 0) {
      contactEmail = invitees[0].email;
      contactName = invitees[0].name;
    }
    
    // Calculate duration in minutes
    const startTime = parseISO(event.start_time);
    const endTime = parseISO(event.end_time);
    const duration = differenceInMinutes(endTime, startTime);
    
    // Extract event ID from URI
    const eventId = event.uri.split('/').pop();
    
    return {
      calendlyEventId: eventId,
      type: eventType,
      title: event.name || 'Calendly Meeting',
      startTime: event.start_time,
      endTime: event.end_time,
      duration,
      status: event.status,
      bookedAt: event.created_at,
      assignedTo,
      contactEmail,
      contactName
    };
  } catch (error: any) {
    log(`Error extracting event details: ${error.message}`);
    return null;
  }
}

// Get existing Calendly event IDs from database
async function getExistingEventIds() {
  try {
    log('Fetching existing Calendly event IDs from database...');
    
    const result = await db.execute(`
      SELECT calendly_event_id FROM meetings 
      WHERE calendly_event_id IS NOT NULL
    `);
    
    const eventIds = result.rows.map((row: any) => row.calendly_event_id);
    log(`Found ${eventIds.length} Calendly events in database`);
    
    return eventIds;
  } catch (error: any) {
    log(`Error getting existing event IDs: ${error.message}`);
    return [];
  }
}

// Generate SQL for inserting a meeting
function generateInsertSQL(event: any) {
  try {
    const startTime = format(parseISO(event.startTime), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
    const endTime = format(parseISO(event.endTime), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
    const bookedAt = event.bookedAt ? format(parseISO(event.bookedAt), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'") : null;
    
    return `
INSERT INTO meetings (
  calendly_event_id, type, title, 
  start_time, end_time, duration, status, 
  booked_at, assigned_to, contact_email, contact_name
) VALUES (
  '${event.calendlyEventId}', '${event.type.replace(/'/g, "''")}', '${event.title.replace(/'/g, "''")}',
  '${startTime}', '${endTime}', ${event.duration}, '${event.status}',
  ${bookedAt ? `'${bookedAt}'` : 'NULL'}, ${event.assignedTo || 'NULL'}, 
  ${event.contactEmail ? `'${event.contactEmail.replace(/'/g, "''")}'` : 'NULL'}, 
  ${event.contactName ? `'${event.contactName.replace(/'/g, "''")}'` : 'NULL'}
);`;
  } catch (error: any) {
    log(`Error generating SQL: ${error.message}`);
    return '';
  }
}

// Main function
async function main() {
  log('===== Importing Missing Calendly Events =====');
  log(`Started import at: ${new Date().toISOString()}`);
  
  try {
    // Define time periods to fetch events for
    const now = new Date();
    
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
      },
      {
        label: 'Archive',
        minDate: subMonths(now, 24).toISOString(),
        maxDate: subMonths(now, 12).toISOString()
      }
    ];
    
    // Fetch events for each period
    let allEvents: any[] = [];
    for (const period of periods) {
      const events = await getAllEvents(period.minDate, period.maxDate, period.label);
      allEvents = [...allEvents, ...events];
    }
    
    // Get existing event IDs from database
    const existingEventIds = await getExistingEventIds();
    
    // Find new events
    const newEvents = allEvents.filter(event => {
      const eventId = event.uri.split('/').pop();
      return !existingEventIds.includes(eventId);
    });
    
    log(`Found ${newEvents.length} new events to import`);
    
    // Write SQL header
    writeSQL(`-- SQL to import missing Calendly events`);
    writeSQL(`-- Generated at ${new Date().toISOString()}`);
    writeSQL(`-- Total events to import: ${newEvents.length}\n`);
    
    // Process each new event
    let processed = 0;
    for (const event of newEvents) {
      processed++;
      log(`Processing event ${processed}/${newEvents.length}: ${event.uri}`);
      
      // Get invitee details
      const invitees = await getInviteeDetails(event.uri);
      log(`Event has ${invitees.length} invitees`);
      
      // Extract event details
      const eventDetails = extractEventDetails(event, invitees);
      if (!eventDetails) {
        log(`Skipping event due to error extracting details: ${event.uri}`);
        continue;
      }
      
      // Generate SQL
      const sql = generateInsertSQL(eventDetails);
      if (sql) {
        writeSQL(sql);
      }
      
      // Save raw event data
      const eventId = event.uri.split('/').pop();
      fs.writeFileSync(
        path.join(OUTPUT_DIR, `event-${eventId}.json`),
        JSON.stringify({ event, invitees, eventDetails }, null, 2)
      );
      
      // Add a small delay to avoid overwhelming the system
      if (processed % 10 === 0) {
        log(`Processed ${processed}/${newEvents.length} events`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    log('===== Import completed =====');
    log(`Total events processed: ${processed}`);
    log(`SQL file generated at: ${SQL_FILE}`);
    log(`Log file generated at: ${LOG_FILE}`);
    
    // Summary instructions
    log('\nTo import the missing events, run:');
    log(`1. Review the SQL file: ${SQL_FILE}`);
    log('2. Execute the SQL using the database tool');
    
  } catch (error: any) {
    log(`Error in main process: ${error.message}`);
    if (error.stack) {
      log(`Stack trace: ${error.stack}`);
    }
  }
}

// Run the script
main().catch(error => {
  log(`Fatal error: ${error.message}`);
  if (error.stack) {
    log(`Stack trace: ${error.stack}`);
  }
});