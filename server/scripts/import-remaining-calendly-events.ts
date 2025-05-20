/**
 * Import Remaining Calendly Events
 * 
 * This script imports all missing Calendly events from the last 90 days
 * with a focus on the most recent 30 days to fix the dashboard display.
 */

import axios from 'axios';
import { format, parseISO, differenceInMinutes, subDays } from 'date-fns';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables 
dotenv.config();

// Verify API key
if (!process.env.CALENDLY_API_KEY) {
  console.error('Error: CALENDLY_API_KEY environment variable not set');
  process.exit(1);
}

// Set up database connection
const client = neon(process.env.DATABASE_URL!);
const db = drizzle(client);

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

// User email to ID mapping
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

/**
 * Get all Calendly events for a date range
 */
async function getAllEvents(minDate: string, maxDate: string): Promise<any[]> {
  console.log(`Fetching Calendly events from ${minDate} to ${maxDate}...`);
  
  let allEvents: any[] = [];
  let nextPageToken = null;
  let pageCount = 0;
  
  try {
    do {
      const params: any = {
        organization: ORG_URI,
        count: 100,
        status: 'active',
        min_start_time: minDate,
        max_start_time: maxDate
      };
      
      if (nextPageToken) {
        params.page_token = nextPageToken;
      }
      
      const response = await calendlyClient.get('/scheduled_events', { params });
      pageCount++;
      
      if (response.data && response.data.collection) {
        const events = response.data.collection;
        console.log(`Found ${events.length} events on page ${pageCount}`);
        allEvents = [...allEvents, ...events];
        
        // Get next page token
        nextPageToken = null;
        if (response.data.pagination && response.data.pagination.next_page_token) {
          nextPageToken = response.data.pagination.next_page_token;
        }
      } else {
        console.log('No more events found or invalid response format');
        nextPageToken = null;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } while (nextPageToken);
    
    console.log(`Total events found for date range: ${allEvents.length}`);
    return allEvents;
    
  } catch (error: any) {
    console.error(`Error fetching Calendly events: ${error.message}`);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    return allEvents;
  }
}

/**
 * Get existing event IDs
 */
async function getExistingEventIds(): Promise<string[]> {
  try {
    const result = await client`
      SELECT calendly_event_id FROM meetings 
      WHERE calendly_event_id IS NOT NULL
    `;
    
    const eventIds = result.map((row: any) => row.calendly_event_id);
    console.log(`Found ${eventIds.length} existing events in database`);
    return eventIds;
  } catch (error: any) {
    console.error(`Error getting existing events: ${error.message}`);
    return [];
  }
}

/**
 * Get invitee details for an event
 */
async function getInviteeDetails(eventUri: string): Promise<any[]> {
  try {
    const response = await calendlyClient.get(`${eventUri}/invitees`);
    return response.data.collection || [];
  } catch (error: any) {
    console.error(`Error getting invitees for ${eventUri}: ${error.message}`);
    return [];
  }
}

/**
 * Find a contact by email
 */
async function findContactByEmail(email: string): Promise<any> {
  if (!email) return null;
  
  try {
    const result = await client`
      SELECT id, name, email FROM contacts 
      WHERE email = ${email} 
      LIMIT 1
    `;
    
    if (result.length > 0) {
      return result[0];
    }
    
    return null;
  } catch (error: any) {
    console.error(`Error finding contact by email: ${error.message}`);
    return null;
  }
}

/**
 * Find a contact by name
 */
async function findContactByName(name: string): Promise<any> {
  if (!name) return null;
  
  try {
    const result = await client`
      SELECT id, name, email FROM contacts 
      WHERE name ILIKE ${'%' + name + '%'} 
      LIMIT 1
    `;
    
    if (result.length > 0) {
      return result[0];
    }
    
    return null;
  } catch (error: any) {
    console.error(`Error finding contact by name: ${error.message}`);
    return null;
  }
}

/**
 * Get a default contact
 */
async function getDefaultContact(): Promise<any> {
  try {
    const result = await client`
      SELECT id, name, email FROM contacts 
      ORDER BY id 
      LIMIT 1
    `;
    
    if (result.length > 0) {
      return result[0];
    }
    
    console.error('No contacts found in database, cannot assign event');
    return null;
  } catch (error: any) {
    console.error(`Error getting default contact: ${error.message}`);
    return null;
  }
}

/**
 * Determine event type from name
 */
function determineEventType(eventName: string): string {
  if (!eventName) return 'Call 1';
  
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
  
  return 'Call 1';
}

/**
 * Determine assigned user
 */
function determineAssignedUser(event: any): number {
  let assignedUserId = 1;
  
  if (event.event_memberships && event.event_memberships.length > 0) {
    const userEmail = event.event_memberships[0].user_email;
    
    if (userEmail && userEmail.includes('@deleted.calendly.com')) {
      return assignedUserId;
    }
    
    if (userEmail && userEmailToIdMap[userEmail]) {
      return userEmailToIdMap[userEmail];
    }
    
    if (userEmail) {
      const localPart = userEmail.split('@')[0];
      for (const [email, id] of Object.entries(userEmailToIdMap)) {
        if (email.split('@')[0] === localPart) {
          return id;
        }
      }
    }
  }
  
  return assignedUserId;
}

/**
 * Import a single event
 */
async function importEvent(event: any): Promise<boolean> {
  const eventId = event.uri.split('/').pop();
  console.log(`Processing event: ${eventId} - ${event.name || 'Unnamed'}`);
  
  // Get invitees
  const invitees = await getInviteeDetails(event.uri);
  console.log(`Event has ${invitees.length} invitees`);
  
  // Find associated contact
  let contact = null;
  
  if (invitees.length > 0) {
    const invitee = invitees[0];
    
    if (invitee.email) {
      contact = await findContactByEmail(invitee.email);
      if (contact) {
        console.log(`Matched contact by email: ${contact.name}`);
      }
    }
    
    if (!contact && invitee.name) {
      contact = await findContactByName(invitee.name);
      if (contact) {
        console.log(`Matched contact by name: ${contact.name}`);
      }
    }
  }
  
  if (!contact) {
    contact = await getDefaultContact();
    if (!contact) {
      console.error(`Cannot process event ${eventId} - no matching contact and no default`);
      return false;
    }
    
    console.log(`Using default contact: ${contact.name}`);
  }
  
  // Calculate duration
  const duration = differenceInMinutes(
    new Date(event.end_time),
    new Date(event.start_time)
  );
  
  // Import event
  try {
    await client`
      INSERT INTO meetings (
        calendly_event_id, type, title, start_time, end_time, duration, status,
        booked_at, assigned_to, contact_id, invitee_email, invitee_name
      ) VALUES (
        ${eventId},
        ${determineEventType(event.name)},
        ${event.name || 'Calendly Meeting'},
        ${new Date(event.start_time)},
        ${new Date(event.end_time)},
        ${duration},
        ${event.status},
        ${event.created_at ? new Date(event.created_at) : null},
        ${determineAssignedUser(event)},
        ${contact.id},
        ${invitees.length > 0 ? invitees[0].email : null},
        ${invitees.length > 0 ? invitees[0].name : null}
      )
    `;
    
    console.log(`Successfully imported event: ${eventId}`);
    return true;
  } catch (error: any) {
    console.error(`Failed to import event ${eventId}: ${error.message}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('=== Importing Remaining Calendly Events ===');
  
  try {
    // 1. Get existing event IDs
    const existingIds = await getExistingEventIds();
    
    // 2. Set up date ranges - prioritize recent events
    const now = new Date();
    const dateRanges = [
      {
        label: 'Last 30 days',
        minDate: subDays(now, 30).toISOString(),
        maxDate: now.toISOString()
      },
      {
        label: '30-60 days ago',
        minDate: subDays(now, 60).toISOString(),
        maxDate: subDays(now, 30).toISOString()
      },
      {
        label: '60-90 days ago',
        minDate: subDays(now, 90).toISOString(),
        maxDate: subDays(now, 60).toISOString()
      }
    ];
    
    // 3. Process each date range
    let totalImported = 0;
    let totalFailed = 0;
    
    for (const range of dateRanges) {
      console.log(`\nProcessing date range: ${range.label} (${range.minDate} to ${range.maxDate})`);
      
      // Get all events for this range
      const events = await getAllEvents(range.minDate, range.maxDate);
      
      // Find missing events
      const missingEvents = events.filter(event => {
        const eventId = event.uri.split('/').pop();
        return !existingIds.includes(eventId);
      });
      
      console.log(`Found ${missingEvents.length} missing events to import for ${range.label}`);
      
      // Import missing events
      let rangeImported = 0;
      let rangeFailed = 0;
      
      for (const event of missingEvents) {
        const success = await importEvent(event);
        if (success) {
          rangeImported++;
          totalImported++;
          existingIds.push(event.uri.split('/').pop()); // Add to existing IDs to avoid duplicates
        } else {
          rangeFailed++;
          totalFailed++;
        }
        
        // Prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      console.log(`${range.label}: Imported ${rangeImported}, Failed ${rangeFailed}`);
    }
    
    // 4. Summary
    console.log('\n=== Import Complete ===');
    console.log(`Successfully imported: ${totalImported} events`);
    console.log(`Failed to import: ${totalFailed} events`);
    
    // 5. Verify
    const finalResult = await client`SELECT COUNT(*) AS count FROM meetings WHERE calendly_event_id IS NOT NULL`;
    const totalCount = finalResult[0].count;
    
    const recent30DaysResult = await client`
      SELECT COUNT(*) AS count 
      FROM meetings 
      WHERE calendly_event_id IS NOT NULL 
      AND start_time >= CURRENT_DATE - INTERVAL '30 days'
    `;
    const recent30DaysCount = recent30DaysResult[0].count;
    
    console.log(`\nTotal Calendly events in database now: ${totalCount}`);
    console.log(`Calendly events in last 30 days: ${recent30DaysCount}`);
    console.log('Dashboard should now show the correct call counts');
    
  } catch (error: any) {
    console.error(`Import failed: ${error.message}`);
    console.error(error.stack);
  }
}

// Run the script
main().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  console.error(error.stack);
});