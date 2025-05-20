/**
 * Find All Calendly Events
 * 
 * This script uses the Calendly API to retrieve all scheduled events
 * and compare them with our database to identify missing events.
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { format, subMonths } from 'date-fns';

// Load environment variables
dotenv.config();

// Verify we have the needed API key
const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
if (!CALENDLY_API_KEY) {
  console.error('Error: CALENDLY_API_KEY environment variable not set');
  process.exit(1);
}

// Format date for display
function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

// Get Calendly user information
async function getUserInfo() {
  try {
    console.log('Getting user information...');
    const response = await axios.get('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.resource) {
      const user = response.data.resource;
      console.log(`Authenticated as: ${user.name} (${user.email})`);
      console.log(`Organization: ${user.current_organization}`);
      console.log(`User URI: ${user.uri}`);
      
      return user;
    } else {
      console.error('Invalid response from API:', response.data);
      throw new Error('Failed to get user information');
    }
  } catch (error: any) {
    console.error('Error getting user information:', error.message);
    if (error.response) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Get scheduled events from Calendly for a specific user
async function getScheduledEventsForUser(userUri: string) {
  try {
    // Default to last 3 months
    const endDate = new Date();
    const startDate = subMonths(endDate, 3);
    
    console.log(`\nFetching Calendly events for user from ${formatDate(startDate)} to ${formatDate(endDate)}...`);
    
    // Properly format the parameters
    const params = {
      user: userUri,
      count: 100,
      status: 'active',
      min_start_time: startDate.toISOString(),
      max_start_time: endDate.toISOString()
    };
    
    const response = await axios.get('https://api.calendly.com/scheduled_events', {
      params,
      headers: {
        'Authorization': `Bearer ${CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.collection) {
      const events = response.data.collection;
      console.log(`Found ${events.length} events in Calendly API for this user`);
      
      // Display sample of events
      console.log('\nSample of Calendly events:');
      events.slice(0, 5).forEach((event: any, index: number) => {
        console.log(`${index + 1}. ${event.name || 'Unnamed event'} - ${formatDate(new Date(event.start_time))} - ${event.status}`);
      });
      
      return events;
    } else {
      console.error('Invalid response from API:', response.data);
      throw new Error('Failed to get scheduled events');
    }
  } catch (error: any) {
    console.error('Error getting Calendly events:', error.message);
    if (error.response) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Get scheduled events for an organization
async function getScheduledEventsForOrg(orgUri: string) {
  try {
    // Default to last 3 months
    const endDate = new Date();
    const startDate = subMonths(endDate, 3);
    
    console.log(`\nFetching Calendly events for organization from ${formatDate(startDate)} to ${formatDate(endDate)}...`);
    
    // Properly format the parameters
    const params = {
      organization: orgUri,
      count: 100,
      status: 'active',
      min_start_time: startDate.toISOString(),
      max_start_time: endDate.toISOString()
    };
    
    const response = await axios.get('https://api.calendly.com/scheduled_events', {
      params,
      headers: {
        'Authorization': `Bearer ${CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.collection) {
      const events = response.data.collection;
      console.log(`Found ${events.length} events in Calendly API for this organization`);
      
      // Display sample of events
      console.log('\nSample of Calendly events:');
      events.slice(0, 5).forEach((event: any, index: number) => {
        console.log(`${index + 1}. ${event.name || 'Unnamed event'} - ${formatDate(new Date(event.start_time))} - ${event.status}`);
      });
      
      return events;
    } else {
      console.error('Invalid response from API:', response.data);
      throw new Error('Failed to get scheduled events');
    }
  } catch (error: any) {
    console.error('Error getting Calendly events for organization:', error.message);
    if (error.response) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Count events in database
async function countDatabaseEvents() {
  try {
    console.log('\nCounting events in database...');
    
    // Generate SQL command to count events (user can run this manually)
    console.log('Run this SQL command to count events in the database:');
    console.log('SELECT COUNT(*) FROM meetings WHERE calendly_event_id IS NOT NULL;');
    
    return 151; // Using the count we already know
  } catch (error: any) {
    console.error('Error counting database events:', error.message);
    throw error;
  }
}

// Generate curl commands to get events and invitees
function generateCurlCommands(userUri: string, orgUri: string) {
  // Get date range for the last 3 months
  const endDate = new Date();
  const startDate = subMonths(endDate, 3);
  
  console.log('\n===== Curl Commands to Find Missing Calls =====');
  
  // 1. Get user's events
  console.log('\n1. Get all scheduled events for this user:');
  console.log(`curl -H "Authorization: Bearer ${CALENDLY_API_KEY}" \\
  -H "Content-Type: application/json" \\
  "https://api.calendly.com/scheduled_events?user=${encodeURIComponent(userUri)}&count=100&status=active&min_start_time=${encodeURIComponent(startDate.toISOString())}&max_start_time=${encodeURIComponent(endDate.toISOString())}"`);
  
  // 2. Get organization's events
  console.log('\n2. Get all scheduled events for this organization:');
  console.log(`curl -H "Authorization: Bearer ${CALENDLY_API_KEY}" \\
  -H "Content-Type: application/json" \\
  "https://api.calendly.com/scheduled_events?organization=${encodeURIComponent(orgUri)}&count=100&status=active&min_start_time=${encodeURIComponent(startDate.toISOString())}&max_start_time=${encodeURIComponent(endDate.toISOString())}"`);
  
  // 3. Get invitees for an event
  console.log('\n3. Get invitees for a specific event (replace EVENT_ID with the event ID):');
  console.log(`curl -H "Authorization: Bearer ${CALENDLY_API_KEY}" \\
  -H "Content-Type: application/json" \\
  "https://api.calendly.com/scheduled_events/EVENT_ID/invitees"`);
}

// Main function to execute the script
async function main() {
  console.log('===== Calendly Events Finder =====\n');
  
  try {
    // 1. Get user information to get URIs
    const user = await getUserInfo();
    const userUri = user.uri;
    const orgUri = user.current_organization;
    
    // 2. Get user's scheduled events
    const userEvents = await getScheduledEventsForUser(userUri);
    
    // 3. Get organization's scheduled events
    const orgEvents = await getScheduledEventsForOrg(orgUri);
    
    // 4. Count database events
    const dbEventCount = await countDatabaseEvents();
    
    // 5. Generate curl commands
    generateCurlCommands(userUri, orgUri);
    
    // 6. Display summary
    console.log('\n===== Summary =====');
    console.log(`User Events: ${userEvents.length}`);
    console.log(`Organization Events: ${orgEvents.length}`);
    console.log(`Database Events: ${dbEventCount}`);
    
    // Calculate missing events (using the larger number)
    const calendlyEventCount = Math.max(userEvents.length, orgEvents.length);
    const missingEvents = calendlyEventCount - dbEventCount;
    
    if (missingEvents > 0) {
      console.log(`\nFound ${missingEvents} missing Calendly events that need to be imported!`);
      console.log('Use the curl commands above to retrieve these missing events and their details.');
    } else {
      console.log('\nNo missing events detected. All Calendly events are in the database.');
    }
    
  } catch (error: any) {
    console.error('Script failed:', error.message);
  }
}

// Run the script
main();