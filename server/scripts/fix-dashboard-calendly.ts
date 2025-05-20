/**
 * Fix Dashboard Calendly Integration
 * 
 * This script directly inserts Calendly events into the database to make them appear
 * in the dashboard, fixing the "0 calls" issue for the last 30 days.
 */

import axios from 'axios';
import { db } from '../db';
import { contacts, meetings } from '../../shared/schema';
import { eq, like, desc } from 'drizzle-orm';
import { differenceInMinutes } from 'date-fns';

// Calendly API client setup
const setupCalendlyClient = () => {
  const apiKey = process.env.CALENDLY_API_KEY;
  if (!apiKey) {
    throw new Error('CALENDLY_API_KEY environment variable not set');
  }
  
  return axios.create({
    baseURL: 'https://api.calendly.com',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });
};

// Get a default contact if needed
const getDefaultContact = async () => {
  try {
    return await db.query.contacts.findFirst({
      orderBy: [desc(contacts.id)],
      columns: { id: true, name: true }
    });
  } catch (error) {
    console.error('Error getting default contact:', error);
    return null;
  }
};

// Find a contact by email
const findContactByEmail = async (email: string) => {
  try {
    return await db.query.contacts.findFirst({
      where: eq(contacts.email, email),
      columns: { id: true, name: true }
    });
  } catch (error) {
    console.error(`Error finding contact by email ${email}:`, error);
    return null;
  }
};

// Find a contact by name (partial match)
const findContactByName = async (name: string) => {
  try {
    const namePattern = `%${name}%`;
    const rows = await db.execute(
      `SELECT id, name FROM contacts WHERE name ILIKE $1 LIMIT 1`,
      [namePattern]
    );
    
    if (rows.length > 0) {
      return {
        id: rows[0].id,
        name: rows[0].name
      };
    }
    return null;
  } catch (error) {
    console.error(`Error finding contact by name ${name}:`, error);
    return null;
  }
};

// Determine meeting type from event name
const determineEventType = (eventName: string) => {
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
};

// Determine assigned user from event
const determineAssignedUser = (event: any) => {
  // Default to user ID 1 if we can't determine
  return 1;
};

// Import a single Calendly event
const importCalendlyEvent = async (event: any, invitees: any[], existingEventIds: string[]) => {
  const eventId = event.uri.split('/').pop();
  
  // Skip if already imported
  if (existingEventIds.includes(eventId)) {
    console.log(`Event ${eventId} already exists in database`);
    return false;
  }
  
  console.log(`Event has ${invitees.length} invitees`);
  
  // Try to find a matching contact
  let contact = null;
  
  if (invitees.length > 0 && invitees[0].email) {
    contact = await findContactByEmail(invitees[0].email);
    if (contact) {
      console.log(`Matched contact by email: ${contact.name}`);
    }
  }
  
  if (!contact && invitees.length > 0 && invitees[0].name) {
    contact = await findContactByName(invitees[0].name);
    if (contact) {
      console.log(`Matched contact by name: ${contact.name}`);
    }
  }
  
  // Get a default contact if no match found
  if (!contact) {
    contact = await getDefaultContact();
    if (!contact) {
      console.error(`Cannot process event ${eventId} - no matching contact and no default`);
      return false;
    }
    console.log(`Using default contact: ${contact.name}`);
  }
  
  try {
    // Calculate duration in minutes
    const duration = Math.floor(
      (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000
    );
    
    // Insert event using parametrized query to avoid SQL injection and parameter binding issues
    await db.execute(
      `INSERT INTO meetings (
        "calendlyEventId", "type", "title", "startTime", "endTime", "duration", "status",
        "bookedAt", "assignedTo", "contactId", "inviteeEmail", "inviteeName",
        "source", "sequenceNumber", "meetingType"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        eventId,
        determineEventType(event.name),
        event.name || 'Calendly Meeting',
        new Date(event.start_time),
        new Date(event.end_time),
        duration,
        event.status,
        event.created_at ? new Date(event.created_at) : null,
        determineAssignedUser(event),
        contact.id,
        invitees.length > 0 ? invitees[0].email : null,
        invitees.length > 0 ? invitees[0].name : null,
        'Calendly',
        1,
        'online'
      ]
    );
    
    console.log(`Successfully imported event: ${eventId}`);
    return true;
  } catch (error) {
    console.error(`Failed to import event ${eventId}:`, error);
    return false;
  }
};

// Main function to fix the dashboard by importing missing Calendly events
const fixDashboardCalendly = async () => {
  console.log('Starting Calendly dashboard fix...');
  
  try {
    // Set up Calendly client
    const calendlyClient = setupCalendlyClient();
    
    // Get existing Calendly event IDs from database
    const existingEventsResult = await db.execute(`
      SELECT "calendly_event_id" FROM meetings WHERE "calendly_event_id" IS NOT NULL
    `);
    
    const existingEventIds = existingEventsResult.map((row: any) => row.calendlyEventId);
    console.log(`Found ${existingEventIds.length} existing Calendly events in database`);
    
    // Calculate date range for last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    console.log(`Fetching Calendly events from ${thirtyDaysAgo.toISOString()} to ${now.toISOString()}`);
    
    // Get events from Calendly API
    const response = await calendlyClient.get('/scheduled_events', {
      params: {
        organization: 'https://api.calendly.com/organizations/54858790-a2e4-4696-9d19-7c6dc22ef508',
        count: 100,
        status: 'active',
        min_start_time: thirtyDaysAgo.toISOString(),
        max_start_time: now.toISOString()
      }
    });
    
    if (!response.data || !response.data.collection) {
      throw new Error('Invalid response from Calendly API');
    }
    
    const events = response.data.collection;
    console.log(`Found ${events.length} events in the last 30 days from Calendly API`);
    
    // Process each event
    let importCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const event of events) {
      const eventId = event.uri.split('/').pop();
      
      // Get invitees for this event
      const inviteeResponse = await calendlyClient.get(`${event.uri}/invitees`);
      const invitees = inviteeResponse.data.collection || [];
      
      const result = await importCalendlyEvent(event, invitees, existingEventIds);
      
      if (result) {
        importCount++;
      } else if (existingEventIds.includes(eventId)) {
        skipCount++;
      } else {
        errorCount++;
      }
    }
    
    // Clear dashboard cache to ensure new events show up
    console.log('Clearing dashboard cache...');
    await db.execute(`DELETE FROM cache WHERE key LIKE '%dashboard%'`);
    
    console.log(`
Dashboard Calendly fix completed:
- ${importCount} new events imported
- ${skipCount} existing events skipped
- ${errorCount} events failed to import
- ${existingEventIds.length + importCount} total events in database
    `);
    
    // Calculate meetings in the last 30 days for confirmation
    const recentMeetingsResult = await db.execute(`
      SELECT COUNT(*) as count FROM meetings 
      WHERE "startTime" >= $1 AND "startTime" <= $2
    `, [thirtyDaysAgo, now]);
    
    const recentMeetingsCount = parseInt(recentMeetingsResult[0].count);
    console.log(`There are now ${recentMeetingsCount} meetings in the last 30 days in the database`);
    
    console.log('Fix completed successfully. The dashboard should now show the correct number of calls.');
    
  } catch (error) {
    console.error('Error fixing dashboard Calendly integration:', error);
  }
};

// Run the fix
fixDashboardCalendly().catch(console.error);