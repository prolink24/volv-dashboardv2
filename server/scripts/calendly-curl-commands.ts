/**
 * Calendly Curl Commands Generator
 * 
 * This script generates curl commands for finding missing Calendly events.
 * It follows the Calendly API documentation to ensure proper parameter formatting.
 */

import dotenv from 'dotenv';
import { format, subMonths } from 'date-fns';

// Load environment variables
dotenv.config();

// Calendly API setup
const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
const CALENDLY_BASE_URL = 'https://api.calendly.com';

if (!CALENDLY_API_KEY) {
  console.error('Error: CALENDLY_API_KEY not found in environment variables');
  process.exit(1);
}

// Get current date and date from 3 months ago in proper format
const endDate = new Date();
const startDate = subMonths(endDate, 3);

// Format dates for Calendly API (ISO format)
const startTime = startDate.toISOString();
const endTime = endDate.toISOString();

console.log(`\n=== Calendly API Curl Commands ===\n`);
console.log(`Date Range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}\n`);

// 1. Command to get user info
console.log('1. Get current user info:');
console.log(`curl -H "Authorization: Bearer ${CALENDLY_API_KEY}" \\
  -H "Content-Type: application/json" \\
  "${CALENDLY_BASE_URL}/users/me"`);

// 2. Command to list all events
console.log('\n2. List all events for the last 3 months:');
console.log(`curl -H "Authorization: Bearer ${CALENDLY_API_KEY}" \\
  -H "Content-Type: application/json" \\
  "${CALENDLY_BASE_URL}/scheduled_events?count=100&min_start_time=${startTime}&max_start_time=${endTime}&status=active"`);

// 3. Command to count events
console.log('\n3. Count of scheduled events:');
console.log(`curl -H "Authorization: Bearer ${CALENDLY_API_KEY}" \\
  -H "Content-Type: application/json" \\
  "${CALENDLY_BASE_URL}/scheduled_events/count?min_start_time=${startTime}&max_start_time=${endTime}&status=active"`);

// 4. Command to list organization's members
console.log('\n4. List organization members:');
console.log(`curl -H "Authorization: Bearer ${CALENDLY_API_KEY}" \\
  -H "Content-Type: application/json" \\
  "${CALENDLY_BASE_URL}/organization_memberships"`);

// 5. Command to get event types
console.log('\n5. List event types:');
console.log(`curl -H "Authorization: Bearer ${CALENDLY_API_KEY}" \\
  -H "Content-Type: application/json" \\
  "${CALENDLY_BASE_URL}/event_types"`);

// 6. Command to get a specific event's details and invitees
console.log('\n6. To get details and invitees for a specific event (replace EVENT_ID):');
console.log(`# Get event details
curl -H "Authorization: Bearer ${CALENDLY_API_KEY}" \\
  -H "Content-Type: application/json" \\
  "${CALENDLY_BASE_URL}/scheduled_events/EVENT_ID"

# Get event invitees
curl -H "Authorization: Bearer ${CALENDLY_API_KEY}" \\
  -H "Content-Type: application/json" \\
  "${CALENDLY_BASE_URL}/scheduled_events/EVENT_ID/invitees"`);

console.log('\n=== Database Query Commands ===\n');

// 7. SQL Query to count Calendly meetings in our database
console.log('7. Count Calendly meetings in database:');
console.log(`SELECT COUNT(*) FROM meetings WHERE calendly_event_id IS NOT NULL;`);

// 8. SQL Query to get sample of Calendly meetings
console.log('\n8. Get sample of Calendly meetings from database:');
console.log(`SELECT id, title, assigned_to, calendly_event_id, start_time, end_time, status
FROM meetings
WHERE calendly_event_id IS NOT NULL
ORDER BY start_time DESC
LIMIT 10;`);

console.log('\n=== Instructions for Finding Missing Calls ===\n');
console.log('To find missing calls:');
console.log('1. Run command #2 to get all Calendly events for the last 3 months');
console.log('2. Run command #7 to count how many Calendly events exist in the database');
console.log('3. Compare the counts - any difference represents missing calls');
console.log('4. Use commands #6 to examine specific events that need to be imported');