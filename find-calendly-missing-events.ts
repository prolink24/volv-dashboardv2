/**
 * Find Missing Calendly Events
 * 
 * This script compares Calendly events from the API with our database
 * to identify missing events.
 */

import axios from 'axios';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Verify we have the API key
if (!process.env.CALENDLY_API_KEY) {
  console.error('Error: CALENDLY_API_KEY not found in environment variables');
  process.exit(1);
}

// Set up database connection
const dbClient = neon(process.env.DATABASE_URL!);
const db = drizzle(dbClient);

// Set up Calendly API client
const calendlyClient = axios.create({
  baseURL: 'https://api.calendly.com',
  headers: {
    'Authorization': `Bearer ${process.env.CALENDLY_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Organization URI
const ORG_URI = 'https://api.calendly.com/organizations/54858790-a2e4-4696-9d19-7c6dc22ef508';

// Create output directory if it doesn't exist
const OUTPUT_DIR = './calendly-events';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

/**
 * Get all scheduled events from Calendly API with pagination
 */
async function getAllCalendlyEvents(minDate: string, maxDate: string) {
  console.log(`Fetching Calendly events from ${minDate} to ${maxDate}...`);
  
  let allEvents: any[] = [];
  let nextPageToken: string | null = null;
  let page = 1;
  
  try {
    do {
      // Set up the request parameters
      const params: any = {
        organization: ORG_URI,
        count: 100,
        status: 'active',
        min_start_time: minDate,
        max_start_time: maxDate
      };
      
      // If we have a next page token, add it
      if (nextPageToken) {
        params.page_token = nextPageToken;
      }
      
      console.log(`Fetching page ${page}...`);
      const response = await calendlyClient.get('/scheduled_events', { params });
      
      if (response.data && response.data.collection) {
        const events = response.data.collection;
        allEvents = [...allEvents, ...events];
        console.log(`Found ${events.length} events on page ${page}`);
        
        // Check if there's another page
        nextPageToken = response.data.pagination?.next_page_token || null;
        
        // Save the raw response for debugging
        fs.writeFileSync(`${OUTPUT_DIR}/calendly_events_page_${page}.json`, JSON.stringify(response.data, null, 2));
        
        page++;
      } else {
        console.error('Invalid response from API:', response.data);
        break;
      }
    } while (nextPageToken);
    
    console.log(`Total events found: ${allEvents.length}`);
    return allEvents;
  } catch (error: any) {
    console.error('Error fetching Calendly events:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Get Calendly event IDs from the database
 */
async function getCalendlyEventIdsFromDatabase() {
  try {
    console.log('Getting Calendly event IDs from database...');
    
    // Execute SQL query to get all Calendly event IDs from the database
    const results = await db.execute(`
      SELECT calendly_event_id FROM meetings 
      WHERE calendly_event_id IS NOT NULL
    `);
    
    // Extract the IDs into an array
    const eventIds = results.rows.map((row: any) => row.calendly_event_id);
    console.log(`Found ${eventIds.length} Calendly events in database`);
    
    // Save the event IDs to a file
    fs.writeFileSync(`${OUTPUT_DIR}/database_event_ids.json`, JSON.stringify(eventIds, null, 2));
    
    return eventIds;
  } catch (error: any) {
    console.error('Error getting Calendly event IDs from database:', error.message);
    throw error;
  }
}

/**
 * Compare Calendly events with database events
 */
function findMissingEvents(calendlyEvents: any[], databaseEventIds: string[]) {
  console.log('Comparing Calendly events with database events...');
  
  // Extract event IDs from Calendly events
  const calendlyEventIds = calendlyEvents.map(event => {
    const eventId = event.uri.split('/').pop();
    return eventId;
  });
  
  // Save the Calendly event IDs to a file
  fs.writeFileSync(`${OUTPUT_DIR}/calendly_event_ids.json`, JSON.stringify(calendlyEventIds, null, 2));
  
  // Find events that are in Calendly but not in the database
  const missingEventIds = calendlyEventIds.filter(id => !databaseEventIds.includes(id));
  
  console.log(`Found ${missingEventIds.length} missing events`);
  
  // Get the full event details for missing events
  const missingEvents = calendlyEvents.filter(event => {
    const eventId = event.uri.split('/').pop();
    return missingEventIds.includes(eventId);
  });
  
  // Save the missing events to a file
  fs.writeFileSync(`${OUTPUT_DIR}/missing_events.json`, JSON.stringify(missingEvents, null, 2));
  
  return missingEvents;
}

/**
 * Get invitee details for an event
 */
async function getInviteeDetails(eventUri: string) {
  try {
    const response = await calendlyClient.get(`${eventUri}/invitees`);
    return response.data.collection;
  } catch (error: any) {
    console.error(`Error getting invitees for event ${eventUri}:`, error.message);
    return [];
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('===== Finding Missing Calendly Events =====');
    
    // Define time periods to search
    const lastSixMonths = {
      minDate: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString(),
      maxDate: new Date().toISOString()
    };
    
    const sixToTwelveMonths = {
      minDate: new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString(),
      maxDate: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString()
    };
    
    const oneToTwoYears = {
      minDate: new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString(),
      maxDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString()
    };
    
    // Fetch events from each time period
    const recentEvents = await getAllCalendlyEvents(lastSixMonths.minDate, lastSixMonths.maxDate);
    const olderEvents = await getAllCalendlyEvents(sixToTwelveMonths.minDate, sixToTwelveMonths.maxDate);
    const oldestEvents = await getAllCalendlyEvents(oneToTwoYears.minDate, oneToTwoYears.maxDate);
    
    // Combine all events
    const allCalendlyEvents = [...recentEvents, ...olderEvents, ...oldestEvents];
    
    // Get event IDs from database
    const databaseEventIds = await getCalendlyEventIdsFromDatabase();
    
    // Find missing events
    const missingEvents = findMissingEvents(allCalendlyEvents, databaseEventIds);
    
    // Summarize findings
    console.log('\n===== Summary =====');
    console.log(`Total Calendly Events: ${allCalendlyEvents.length}`);
    console.log(`Events in Database: ${databaseEventIds.length}`);
    console.log(`Missing Events: ${missingEvents.length}`);
    
    if (missingEvents.length > 0) {
      console.log('\nDetails about missing events:');
      
      // Get invitee details for missing events
      for (let i = 0; i < Math.min(5, missingEvents.length); i++) {
        const event = missingEvents[i];
        console.log(`\nEvent ${i + 1}:`);
        console.log(`  Name: ${event.name}`);
        console.log(`  Start Time: ${event.start_time}`);
        console.log(`  Status: ${event.status}`);
        console.log(`  URI: ${event.uri}`);
        
        // Get invitee details
        const invitees = await getInviteeDetails(event.uri);
        if (invitees.length > 0) {
          console.log('  Invitees:');
          invitees.forEach((invitee: any) => {
            console.log(`    - ${invitee.name} (${invitee.email})`);
          });
        } else {
          console.log('  No invitees found');
        }
      }
      
      if (missingEvents.length > 5) {
        console.log(`\nAnd ${missingEvents.length - 5} more events...`);
      }
      
      console.log('\nAll missing events and their details have been saved to:');
      console.log(`${OUTPUT_DIR}/missing_events.json`);
    } else {
      console.log('\nNo missing events found!');
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

// Run the script
main();