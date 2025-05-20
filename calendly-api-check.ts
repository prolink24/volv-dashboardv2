/**
 * Calendly API Check
 * 
 * This script directly examines Calendly events and compares them with database records
 * to identify missing calls.
 */

import axios from 'axios';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
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

// Set up Calendly API headers
const calendlyHeaders = {
  'Authorization': `Bearer ${CALENDLY_API_KEY}`,
  'Content-Type': 'application/json'
};

// Organization URI
const ORG_URI = 'https://api.calendly.com/organizations/54858790-a2e4-4696-9d19-7c6dc22ef508';

/**
 * Get all scheduled events from Calendly API for a period
 */
async function getCalendlyEvents(minDate: string, maxDate: string) {
  console.log(`Fetching Calendly events from ${minDate} to ${maxDate}...`);
  
  try {
    const url = `https://api.calendly.com/scheduled_events?organization=${encodeURIComponent(ORG_URI)}&count=100&status=active&min_start_time=${encodeURIComponent(minDate)}&max_start_time=${encodeURIComponent(maxDate)}`;
    
    const response = await axios.get(url, { headers: calendlyHeaders });
    
    if (response.data && response.data.collection) {
      const events = response.data.collection;
      console.log(`Found ${events.length} events for this period`);
      
      // Check pagination
      if (response.data.pagination && response.data.pagination.next_page) {
        console.log(`More events available at: ${response.data.pagination.next_page}`);
      }
      
      return events;
    } else {
      console.error('Invalid response from API:', response.data);
      return [];
    }
  } catch (error: any) {
    console.error('Error getting Calendly events:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    return [];
  }
}

/**
 * Get database counts of meetings
 */
async function getDatabaseCounts() {
  try {
    // Count all meetings
    const allMeetingsResult = await db.execute(`
      SELECT COUNT(*) FROM meetings
    `);
    const allMeetingsCount = parseInt(allMeetingsResult.rows[0].count);
    
    // Count Calendly meetings
    const calendlyMeetingsResult = await db.execute(`
      SELECT COUNT(*) FROM meetings WHERE calendly_event_id IS NOT NULL
    `);
    const calendlyMeetingsCount = parseInt(calendlyMeetingsResult.rows[0].count);
    
    // Count meetings with assigned users
    const assignedMeetingsResult = await db.execute(`
      SELECT COUNT(*) FROM meetings WHERE assigned_to IS NOT NULL
    `);
    const assignedMeetingsCount = parseInt(assignedMeetingsResult.rows[0].count);
    
    // Count meetings by type
    const meetingTypeResult = await db.execute(`
      SELECT type, COUNT(*) FROM meetings GROUP BY type ORDER BY COUNT(*) DESC
    `);
    
    console.log('\n===== Database Meeting Counts =====');
    console.log(`Total Meetings: ${allMeetingsCount}`);
    console.log(`Calendly Meetings: ${calendlyMeetingsCount}`);
    console.log(`Meetings with Assigned Users: ${assignedMeetingsCount}`);
    
    console.log('\nMeetings by Type:');
    meetingTypeResult.rows.forEach((row: any) => {
      console.log(`  ${row.type}: ${row.count}`);
    });
    
    return {
      allMeetingsCount,
      calendlyMeetingsCount,
      assignedMeetingsCount,
      meetingTypes: meetingTypeResult.rows
    };
  } catch (error: any) {
    console.error('Error getting database counts:', error.message);
    return {
      allMeetingsCount: 0,
      calendlyMeetingsCount: 0,
      assignedMeetingsCount: 0,
      meetingTypes: []
    };
  }
}

/**
 * Get sample of database events
 */
async function getDatabaseSample() {
  try {
    const result = await db.execute(`
      SELECT id, title, type, assigned_to, calendly_event_id, start_time, end_time, status
      FROM meetings
      WHERE calendly_event_id IS NOT NULL
      ORDER BY start_time DESC
      LIMIT 5
    `);
    
    console.log('\n===== Sample Database Events =====');
    result.rows.forEach((row: any, index: number) => {
      console.log(`Event ${index + 1}:`);
      console.log(`  Title: ${row.title}`);
      console.log(`  Type: ${row.type}`);
      console.log(`  Assigned To: ${row.assigned_to || 'None'}`);
      console.log(`  Calendly Event ID: ${row.calendly_event_id}`);
      console.log(`  Start Time: ${new Date(row.start_time).toISOString()}`);
      console.log(`  Status: ${row.status}`);
      console.log('');
    });
    
    return result.rows;
  } catch (error: any) {
    console.error('Error getting database sample:', error.message);
    return [];
  }
}

/**
 * Main function to find missing calls
 */
async function findMissingCalls() {
  console.log('===== Finding Missing Calendly Calls =====\n');
  
  try {
    // 1. Get database counts
    await getDatabaseCounts();
    
    // 2. Get sample of database events
    await getDatabaseSample();
    
    // 3. Query Calendly for events in different time periods
    // Last 3 months
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    
    const recentEvents = await getCalendlyEvents(
      threeMonthsAgo.toISOString(),
      now.toISOString()
    );
    
    // 3-6 months ago
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    
    const olderEvents = await getCalendlyEvents(
      sixMonthsAgo.toISOString(),
      threeMonthsAgo.toISOString()
    );
    
    // 6-12 months ago
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(now.getMonth() - 12);
    
    const oldestEvents = await getCalendlyEvents(
      twelveMonthsAgo.toISOString(),
      sixMonthsAgo.toISOString()
    );
    
    // 4. Count total Calendly events found
    const totalCalendlyEvents = recentEvents.length + olderEvents.length + oldestEvents.length;
    
    console.log('\n===== Results =====');
    console.log(`Recent Events (0-3 months): ${recentEvents.length}`);
    console.log(`Older Events (3-6 months): ${olderEvents.length}`);
    console.log(`Oldest Events (6-12 months): ${oldestEvents.length}`);
    console.log(`Total Calendly Events Found: ${totalCalendlyEvents}`);
    
    // 5. Generate curl commands for manual verification
    console.log('\n===== Curl Commands for Manual Verification =====');
    console.log(`\n1. Recent Events (0-3 months):`);
    console.log(`curl -H "Authorization: Bearer $CALENDLY_API_KEY" \\
  -H "Content-Type: application/json" \\
  "https://api.calendly.com/scheduled_events?organization=${encodeURIComponent(ORG_URI)}&count=100&status=active&min_start_time=${encodeURIComponent(threeMonthsAgo.toISOString())}&max_start_time=${encodeURIComponent(now.toISOString())}"`);
    
    console.log(`\n2. Older Events (3-6 months):`);
    console.log(`curl -H "Authorization: Bearer $CALENDLY_API_KEY" \\
  -H "Content-Type: application/json" \\
  "https://api.calendly.com/scheduled_events?organization=${encodeURIComponent(ORG_URI)}&count=100&status=active&min_start_time=${encodeURIComponent(sixMonthsAgo.toISOString())}&max_start_time=${encodeURIComponent(threeMonthsAgo.toISOString())}"`);
    
    console.log(`\n3. Oldest Events (6-12 months):`);
    console.log(`curl -H "Authorization: Bearer $CALENDLY_API_KEY" \\
  -H "Content-Type: application/json" \\
  "https://api.calendly.com/scheduled_events?organization=${encodeURIComponent(ORG_URI)}&count=100&status=active&min_start_time=${encodeURIComponent(twelveMonthsAgo.toISOString())}&max_start_time=${encodeURIComponent(sixMonthsAgo.toISOString())}"`);
    
  } catch (error: any) {
    console.error('Error finding missing calls:', error.message);
  }
}

// Run the script
findMissingCalls().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});