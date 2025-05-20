/**
 * Quick Fix Calendly Dashboard
 * 
 * A direct script to fix the dashboard's Calendly integration by:
 * 1. Importing missing Calendly events for the last 30 days
 * 2. Clearing the dashboard cache to show updated data
 */

import axios from 'axios';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function quickFixCalendly() {
  try {
    console.log('Starting quick fix for Calendly dashboard...');
    
    // Check for API key
    if (!process.env.CALENDLY_API_KEY) {
      console.error('ERROR: CALENDLY_API_KEY not found in environment variables');
      return;
    }
    
    // Set up Calendly API client
    const calendlyClient = axios.create({
      baseURL: 'https://api.calendly.com',
      headers: {
        'Authorization': `Bearer ${process.env.CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Get existing Calendly events
    const existingEvents = await db.execute(
      `SELECT calendly_event_id FROM meetings WHERE calendly_event_id IS NOT NULL`
    );
    
    // Extract IDs into array
    const existingIds = [];
    if (Array.isArray(existingEvents)) {
      for (const row of existingEvents) {
        if (row && row.calendly_event_id) {
          existingIds.push(row.calendly_event_id);
        }
      }
    }
    
    console.log(`Found ${existingIds.length} existing Calendly events in database`);
    
    // Calculate date range for last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log(`Fetching Calendly events from ${thirtyDaysAgo.toISOString()} to ${now.toISOString()}`);
    
    // Get recent Calendly events
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
      console.error('Invalid response from Calendly API');
      return;
    }
    
    const events = response.data.collection;
    console.log(`Found ${events.length} events in the last 30 days from Calendly API`);
    
    // Find missing events
    const missingEvents = events.filter(event => {
      const eventId = event.uri.split('/').pop();
      return !existingIds.includes(eventId);
    });
    
    console.log(`Found ${missingEvents.length} missing events to import`);
    
    // Get a default contact for fallback
    const defaultContactResult = await db.execute(
      `SELECT id, name FROM contacts ORDER BY id DESC LIMIT 1`
    );
    
    const defaultContact = {
      id: defaultContactResult.length > 0 ? defaultContactResult[0].id : 1,
      name: defaultContactResult.length > 0 ? defaultContactResult[0].name : 'Default Contact'
    };
    
    console.log(`Using ${defaultContact.name} (ID: ${defaultContact.id}) as fallback contact if needed`);
    
    // Import missing events
    let successCount = 0;
    
    for (const event of missingEvents) {
      try {
        const eventId = event.uri.split('/').pop();
        
        // Get invitees for this event
        const inviteeResponse = await calendlyClient.get(`${event.uri}/invitees`);
        const invitees = inviteeResponse.data.collection || [];
        
        // Find contact by email
        let contactId = defaultContact.id;
        let contactFound = false;
        
        if (invitees.length > 0 && invitees[0].email) {
          const contactByEmail = await db.execute(
            `SELECT id, name FROM contacts WHERE email = $1 LIMIT 1`,
            [invitees[0].email]
          );
          
          if (Array.isArray(contactByEmail) && contactByEmail.length > 0) {
            contactId = contactByEmail[0].id;
            contactFound = true;
            console.log(`Matched contact by email: ${contactByEmail[0].name} (ID: ${contactId})`);
          }
        }
        
        // If no match by email, try by name
        if (!contactFound && invitees.length > 0 && invitees[0].name) {
          const namePattern = `%${invitees[0].name}%`;
          
          const contactByName = await db.execute(
            `SELECT id, name FROM contacts WHERE name ILIKE $1 LIMIT 1`,
            [namePattern]
          );
          
          if (Array.isArray(contactByName) && contactByName.length > 0) {
            contactId = contactByName[0].id;
            contactFound = true;
            console.log(`Matched contact by name: ${contactByName[0].name} (ID: ${contactId})`);
          }
        }
        
        if (!contactFound) {
          console.log(`No matching contact found for event ${eventId}, using default`);
        }
        
        // Calculate duration in minutes
        const duration = Math.floor((new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000);
        
        // Insert new meeting
        await db.execute(
          `INSERT INTO meetings 
          (calendly_event_id, type, title, start_time, end_time, duration, 
           status, booked_at, assigned_to, contact_id, 
           invitee_email, invitee_name, source, sequence_number, meeting_type)
          VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            eventId, 
            'Call 1', 
            event.name || 'Calendly Meeting', 
            new Date(event.start_time), 
            new Date(event.end_time), 
            duration, 
            event.status, 
            event.created_at ? new Date(event.created_at) : null, 
            1, 
            contactId, 
            invitees.length > 0 ? invitees[0].email : null, 
            invitees.length > 0 ? invitees[0].name : null,
            'Calendly',
            1,
            'online'
          ]
        );
        
        console.log(`Successfully imported event: ${eventId}`);
        successCount++;
      } catch (error) {
        console.error(`Error importing event:`, error);
      }
    }
    
    // Clear dashboard cache to refresh data
    await db.execute(sql`DELETE FROM cache WHERE key LIKE '%dashboard%'`);
    console.log('Dashboard cache cleared');
    
    // Count meetings in the last 30 days
    const countResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM meetings WHERE start_time >= ${thirtyDaysAgo} AND start_time <= ${now}`
    );
    
    const recentMeetingsCount = parseInt(countResult[0].count);
    
    console.log(`
Fix completed:
- ${successCount} new Calendly events imported
- ${existingIds.length + successCount} total Calendly events in database
- ${recentMeetingsCount} total meetings in the last 30 days
    `);
    
    console.log('Refresh the dashboard to see the updated data');
    
  } catch (error) {
    console.error('Error fixing Calendly dashboard:', error);
  }
}

// Run the fix and handle any errors
console.log('Starting Calendly dashboard fix...');
quickFixCalendly()
  .then(() => console.log('Fix completed'))
  .catch(error => console.error('Fix failed:', error));