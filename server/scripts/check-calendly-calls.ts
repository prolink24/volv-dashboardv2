/**
 * Check Missing Calendly Calls
 * 
 * This script performs a direct comparison between calls in the Calendly API
 * and what exists in our database to identify missing events.
 */

import axios from 'axios';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { eq, gte, lte, isNull, and } from 'drizzle-orm';
import chalk from 'chalk';
import { format } from 'date-fns';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Import schema
import { meetings } from '../../shared/schema';

// Calendly API client setup
const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
const CALENDLY_BASE_URL = 'https://api.calendly.com';

if (!CALENDLY_API_KEY) {
  console.error(chalk.red('Error: CALENDLY_API_KEY not found in environment variables'));
  process.exit(1);
}

const calendlyApiClient = axios.create({
  baseURL: CALENDLY_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${CALENDLY_API_KEY}`
  }
});

// Helper function to format dates for output
function formatDate(date: Date | string): string {
  return format(new Date(date), 'yyyy-MM-dd HH:mm:ss');
}

// Get organization information
async function getOrganization() {
  try {
    const response = await calendlyApiClient.get('/users/me');
    const currentUser = response.data;
    const orgUri = currentUser.resource.current_organization;
    
    console.log(chalk.blue(`Found organization: ${orgUri}`));
    return orgUri;
  } catch (error) {
    console.error(chalk.red('Error fetching organization:'), error);
    throw error;
  }
}

// Get all events for a given time period
async function getAllCalendlyEvents(startTime: string, endTime: string) {
  try {
    console.log(chalk.blue(`Fetching Calendly events from ${startTime} to ${endTime}...`));
    
    let events: any[] = [];
    let count = 0;
    let nextPage = `${CALENDLY_BASE_URL}/scheduled_events?count=100&min_start_time=${startTime}&max_start_time=${endTime}&status=active,canceled`;
    
    // Paginate through all events
    while (nextPage && count < 1000) { // Safety limit to prevent infinite loops
      const response = await calendlyApiClient.get(nextPage);
      const data = response.data;
      
      events = [...events, ...data.collection];
      count += data.collection.length;
      
      // Check if there are more pages
      const pagination = data.pagination;
      nextPage = pagination.next_page;
      
      console.log(chalk.green(`Retrieved ${events.length} events so far...`));
    }
    
    return events;
  } catch (error) {
    console.error(chalk.red('Error fetching Calendly events:'), error);
    throw error;
  }
}

// Get all events in our database
async function getDatabaseEvents(startTime: string, endTime: string) {
  try {
    console.log(chalk.blue(`Fetching database events from ${startTime} to ${endTime}...`));
    
    const results = await db.select()
      .from(meetings)
      .where(
        and(
          gte(meetings.start_time, new Date(startTime)),
          lte(meetings.end_time, new Date(endTime)),
          // Only include Calendly events
          isNull(meetings.calendly_event_id).not()
        )
      );
    
    console.log(chalk.green(`Found ${results.length} Calendly events in database`));
    return results;
  } catch (error) {
    console.error(chalk.red('Error fetching database events:'), error);
    throw error;
  }
}

// Main function to check for missing Calendly calls
async function checkMissingCalendlyCalls() {
  console.log(chalk.yellow('===== Checking for Missing Calendly Calls ====='));
  
  try {
    // Get the date range - default to the last 12 months
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log(chalk.yellow(`Date range: ${startTime} to ${endTime}`));
    
    // Get organization info
    await getOrganization();
    
    // 1. Get all Calendly events from the API
    const apiEvents = await getAllCalendlyEvents(startTime, endTime);
    console.log(chalk.blue(`Found ${apiEvents.length} events in Calendly API`));
    
    // 2. Get all events in our database
    const dbEvents = await getDatabaseEvents(startTime, endTime);
    console.log(chalk.blue(`Found ${dbEvents.length} Calendly events in database`));
    
    // 3. Find events that are in the API but not in our database
    const dbEventIds = new Set(dbEvents.map(event => event.calendly_event_id));
    
    const missingEvents = apiEvents.filter(apiEvent => {
      // Extract just the ID from the URI for comparison
      const eventId = apiEvent.uri.split('/').pop();
      return !dbEventIds.has(eventId) && !dbEventIds.has(apiEvent.uri);
    });
    
    console.log(chalk.yellow(`Found ${missingEvents.length} Calendly events that are not in our database!`));
    
    // 4. Print details about missing events
    if (missingEvents.length > 0) {
      console.log(chalk.yellow('\nMissing Event Details:'));
      
      missingEvents.slice(0, 10).forEach((event, index) => {
        console.log(chalk.green(`\n${index + 1}. Event: ${event.name || 'Unnamed event'}`));
        console.log(`   URI: ${event.uri}`);
        console.log(`   Created: ${formatDate(event.created_at)}`);
        console.log(`   Start Time: ${formatDate(event.start_time)}`);
        console.log(`   End Time: ${formatDate(event.end_time)}`);
        console.log(`   Status: ${event.status}`);
      });
      
      if (missingEvents.length > 10) {
        console.log(chalk.yellow(`\n...and ${missingEvents.length - 10} more events`));
      }
      
      // 5. Generate curl command to get invitees for a sample missing event
      if (missingEvents.length > 0) {
        const sampleEvent = missingEvents[0];
        console.log(chalk.yellow('\nCurl Command to Get Invitees for a Sample Missing Event:'));
        console.log(`curl -H "Authorization: Bearer ${CALENDLY_API_KEY}" \\
  -H "Content-Type: application/json" \\
  "${CALENDLY_BASE_URL}/scheduled_events/${sampleEvent.uri.split('/').pop()}/invitees"`);
      }
    }
    
    // 6. Generate curl command to get all events for a specific time period
    console.log(chalk.yellow('\nCurl Command to Get All Calendly Events:'));
    console.log(`curl -H "Authorization: Bearer ${CALENDLY_API_KEY}" \\
  -H "Content-Type: application/json" \\
  "${CALENDLY_BASE_URL}/scheduled_events?count=100&min_start_time=${startTime}&max_start_time=${endTime}&status=active,canceled"`);

    return {
      totalCalendlyEvents: apiEvents.length,
      databaseEvents: dbEvents.length,
      missingEvents: missingEvents.length
    };
    
  } catch (error) {
    console.error(chalk.red('Error checking missing Calendly calls:'), error);
  }
}

// Run the check
checkMissingCalendlyCalls().then(result => {
  if (result) {
    console.log(chalk.green('\nSummary:'));
    console.log(`Total Calendly Events: ${result.totalCalendlyEvents}`);
    console.log(`Events in Database: ${result.databaseEvents}`);
    console.log(`Missing Events: ${result.missingEvents}`);
  }
  
  console.log(chalk.yellow('\nProcess complete!'));
}).catch(e => {
  console.error('Error in check process:', e);
});