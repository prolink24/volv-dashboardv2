/**
 * Find Missing Calendly Calls
 * 
 * This script directly retrieves Calendly events from the API and compares them
 * with our database to identify any missing calls.
 */

import axios from 'axios';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { format, subMonths } from 'date-fns';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Verify we have the needed API key
const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
if (!CALENDLY_API_KEY) {
  console.error('Error: CALENDLY_API_KEY environment variable not set');
  process.exit(1);
}

// Set up database connection
const dbClient = neon(process.env.DATABASE_URL!);
const db = drizzle(dbClient);

// Set up the Calendly API client
const calendlyClient = axios.create({
  baseURL: 'https://api.calendly.com',
  headers: {
    'Authorization': `Bearer ${CALENDLY_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Format date for display
function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

// Get Calendly user information
async function getUserInfo() {
  try {
    console.log('Getting user information...');
    const response = await calendlyClient.get('/users/me');
    
    if (response.data && response.data.resource) {
      console.log(`Authenticated as: ${response.data.resource.name} (${response.data.resource.email})`);
      console.log(`Organization: ${response.data.resource.current_organization}`);
      return response.data.resource;
    } else {
      console.error('Invalid response from API:', response.data);
      throw new Error('Failed to get user information');
    }
  } catch (error: any) {
    console.error('Error getting user information:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    throw error;
  }
}

// Get scheduled events from Calendly
async function getScheduledEvents() {
  try {
    // Default to last 3 months
    const endDate = new Date();
    const startDate = subMonths(endDate, 3);
    
    console.log(`Fetching Calendly events from ${formatDate(startDate)} to ${formatDate(endDate)}...`);
    
    const response = await calendlyClient.get('/scheduled_events', {
      params: {
        count: 100,
        status: 'active',
        min_start_time: startDate.toISOString(),
        max_start_time: endDate.toISOString()
      }
    });
    
    if (response.data && response.data.collection) {
      const events = response.data.collection;
      console.log(`Found ${events.length} events in Calendly API`);
      
      // Display sample of events
      console.log('\nSample of Calendly events:');
      events.slice(0, 5).forEach((event: any, index: number) => {
        console.log(`${index + 1}. ${event.name} - ${format(new Date(event.start_time), 'yyyy-MM-dd HH:mm')} - ${event.status}`);
      });
      
      return events;
    } else {
      console.error('Invalid response from API:', response.data);
      throw new Error('Failed to get scheduled events');
    }
  } catch (error: any) {
    console.error('Error getting Calendly events:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    throw error;
  }
}

// Get events stored in our database
async function getDatabaseEvents() {
  try {
    console.log('\nChecking meetings in our database...');
    
    // SQL query to count Calendly meetings
    const countResult = await db.execute(
      sql`SELECT COUNT(*) FROM meetings WHERE calendly_event_id IS NOT NULL`
    );
    
    const count = parseInt(countResult.rows[0].count);
    console.log(`Found ${count} Calendly meetings in database`);
    
    // Get sample of database events
    const events = await db.execute(
      sql`SELECT id, title, assigned_to, calendly_event_id, start_time, end_time, status
          FROM meetings
          WHERE calendly_event_id IS NOT NULL
          ORDER BY start_time DESC
          LIMIT 5`
    );
    
    console.log('\nSample of database events:');
    events.rows.forEach((event: any, index: number) => {
      console.log(`${index + 1}. ${event.title} - ${format(new Date(event.start_time), 'yyyy-MM-dd HH:mm')} - ${event.status}`);
    });
    
    return {
      count,
      events: events.rows
    };
  } catch (error: any) {
    console.error('Error getting database events:', error.message);
    throw error;
  }
}

// Get the available event types
async function getEventTypes() {
  try {
    console.log('\nFetching event types...');
    const response = await calendlyClient.get('/event_types');
    
    if (response.data && response.data.collection) {
      const eventTypes = response.data.collection;
      console.log(`Found ${eventTypes.length} event types`);
      
      // Display event types
      console.log('\nEvent types:');
      eventTypes.forEach((type: any, index: number) => {
        console.log(`${index + 1}. ${type.name} (${type.slug})`);
      });
      
      return eventTypes;
    } else {
      console.error('Invalid response from API:', response.data);
      throw new Error('Failed to get event types');
    }
  } catch (error: any) {
    console.error('Error getting event types:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    throw error;
  }
}

// Generate curl commands to retrieve and analyze data
function generateCurlCommands() {
  // Get date range for the last 3 months
  const endDate = new Date();
  const startDate = subMonths(endDate, 3);
  const startTimeParam = encodeURIComponent(startDate.toISOString());
  const endTimeParam = encodeURIComponent(endDate.toISOString());
  
  console.log('\n===== Curl Commands for Manual Verification =====');
  
  console.log('\n1. Get all scheduled events for the last 3 months:');
  console.log(`curl -H "Authorization: Bearer ${CALENDLY_API_KEY}" \\
  -H "Content-Type: application/json" \\
  "https://api.calendly.com/scheduled_events?count=100&status=active&min_start_time=${startTimeParam}&max_start_time=${endTimeParam}"`);

  console.log('\n2. Get invitees for a specific event (replace EVENT_ID with the event ID):');
  console.log(`curl -H "Authorization: Bearer ${CALENDLY_API_KEY}" \\
  -H "Content-Type: application/json" \\
  "https://api.calendly.com/scheduled_events/EVENT_ID/invitees"`);
  
  console.log('\n3. Get information about a specific invitee (replace INVITEE_ID with the invitee ID):');
  console.log(`curl -H "Authorization: Bearer ${CALENDLY_API_KEY}" \\
  -H "Content-Type: application/json" \\
  "https://api.calendly.com/scheduled_events/invitees/INVITEE_ID"`);
}

// Main function to find missing calls
async function findMissingCalls() {
  console.log('===== Finding Missing Calendly Calls =====\n');
  
  try {
    // 1. Get user information first
    const user = await getUserInfo();
    
    // 2. Get Calendly events
    const calendlyEvents = await getScheduledEvents();
    
    // 3. Get database events
    const databaseEvents = await getDatabaseEvents();
    
    // 4. Get event types
    const eventTypes = await getEventTypes();
    
    // 5. Generate curl commands for manual verification
    generateCurlCommands();
    
    // 6. Calculate and display findings
    console.log('\n===== Results =====');
    
    const missingEventsCount = calendlyEvents.length - databaseEvents.count;
    
    if (missingEventsCount > 0) {
      console.log(`\nFound ${missingEventsCount} missing Calendly events that need to be imported!`);
      console.log('Use the curl commands above to retrieve these missing events.');
    } else {
      console.log('\nNo missing events detected. All Calendly events are in the database.');
    }
    
  } catch (error: any) {
    console.error('Error finding missing calls:', error.message);
  }
}

// Run the script
findMissingCalls().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});