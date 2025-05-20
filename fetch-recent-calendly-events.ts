/**
 * Fetch Recent Calendly Events
 * 
 * A lightweight script that fetches the most recent Calendly events
 * and saves them to a JSON file for review.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { subDays, format } from 'date-fns';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Verify API key
if (!process.env.CALENDLY_API_KEY) {
  console.error('Error: CALENDLY_API_KEY environment variable not set');
  process.exit(1);
}

// Create output directory
const OUTPUT_DIR = './recent-calendly-events';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// Organization URI
const ORG_URI = 'https://api.calendly.com/organizations/54858790-a2e4-4696-9d19-7c6dc22ef508';

// Fetch recent events (last 30 days)
async function fetchRecentEvents() {
  console.log('Fetching recent Calendly events (last 30 days)...');
  
  try {
    // Set date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    
    console.log(`Date range: ${format(thirtyDaysAgo, 'yyyy-MM-dd')} to ${format(today, 'yyyy-MM-dd')}`);
    
    // Build URL with params
    const params = {
      organization: ORG_URI,
      count: 100,
      status: 'active',
      min_start_time: thirtyDaysAgo.toISOString(),
      max_start_time: today.toISOString()
    };
    
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, value as string);
    });
    
    const url = `https://api.calendly.com/scheduled_events?${queryParams.toString()}`;
    
    // Make the request
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${process.env.CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.collection) {
      const events = response.data.collection;
      console.log(`Found ${events.length} events in the last 30 days`);
      
      // Save raw response for analysis
      fs.writeFileSync(
        path.join(OUTPUT_DIR, 'recent-events.json'),
        JSON.stringify(response.data, null, 2)
      );
      
      // Save IDs for easy reference
      const eventIds = events.map((event: any) => event.uri.split('/').pop());
      fs.writeFileSync(
        path.join(OUTPUT_DIR, 'recent-event-ids.json'),
        JSON.stringify(eventIds, null, 2)
      );
      
      // Check for pagination
      if (response.data.pagination && response.data.pagination.next_page) {
        console.log(`More events available at: ${response.data.pagination.next_page}`);
        
        // Save next page URL for future reference
        fs.writeFileSync(
          path.join(OUTPUT_DIR, 'next-page-url.txt'),
          response.data.pagination.next_page
        );
      }
      
      // Generate SQL to check which events are missing
      const checkSql = `-- Find which Calendly events are missing from our database\n\n`;
      
      let sql = checkSql + `WITH calendly_events AS (\n  VALUES\n`;
      
      // Add all event IDs
      eventIds.forEach((id: string, index: number) => {
        sql += `    ('${id}'${index < eventIds.length - 1 ? '),\n' : ')\n'}`;
      });
      
      sql += `) AS t(event_id)\n\n`;
      sql += `SELECT t.event_id\nFROM calendly_events t\nLEFT JOIN meetings m ON m.calendly_event_id = t.event_id\nWHERE m.id IS NULL;\n`;
      
      // Save SQL
      fs.writeFileSync(
        path.join(OUTPUT_DIR, 'find-missing-events.sql'),
        sql
      );
      
      return events;
    } else {
      console.error('Invalid response from API:', response.data);
      return [];
    }
  } catch (error: any) {
    console.error('Error fetching events:', error.message);
    if (error.response) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    return [];
  }
}

// Main function
async function main() {
  console.log('===== Fetching Recent Calendly Events =====');
  
  try {
    const events = await fetchRecentEvents();
    
    console.log('\nSummary of findings:');
    console.log(`Total events found: ${events.length}`);
    console.log(`Results saved to: ${OUTPUT_DIR}/`);
    console.log('\nNext steps:');
    console.log('1. Review the events in recent-events.json');
    console.log('2. Run the SQL in find-missing-events.sql to identify which events are missing');
    console.log('3. For those missing events, create INSERT statements to add them to the database');
    
  } catch (error: any) {
    console.error('Error in main process:', error.message);
  }
}

// Run the script
main();