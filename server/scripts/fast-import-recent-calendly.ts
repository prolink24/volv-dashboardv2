/**
 * Fast Import Recent Calendly Events
 * 
 * This script specifically targets only the most recent Calendly events
 * (last 30 days) to quickly fix the dashboard display issue.
 */

import axios from 'axios';
import { format, parseISO, differenceInMinutes, subDays } from 'date-fns';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { eq, and, isNull, not, sql, desc } from 'drizzle-orm';
import * as schema from '../../shared/schema';
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

// Single database query for better performance
async function batchImportEvents() {
  try {
    console.log("=== Starting Fast Import of Recent Calendly Events ===");
    
    // Step 1: Get recent events from Calendly (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    
    console.log(`Fetching events from ${format(thirtyDaysAgo, 'yyyy-MM-dd')} to ${format(now, 'yyyy-MM-dd')}`);
    
    const response = await calendlyClient.get('/scheduled_events', {
      params: {
        organization: ORG_URI,
        count: 100,
        status: 'active',
        min_start_time: thirtyDaysAgo.toISOString(),
        max_start_time: now.toISOString()
      }
    });
    
    if (!response.data || !response.data.collection) {
      console.error("Invalid response from Calendly API");
      return;
    }
    
    const events = response.data.collection;
    console.log(`Found ${events.length} events in the last 30 days`);
    
    // Step 2: Get all existing Calendly event IDs in our database
    const existingEvents = await db.execute(sql`
      SELECT calendly_event_id FROM meetings 
      WHERE calendly_event_id IS NOT NULL
    `);
    
    const existingIds = existingEvents.map(row => row.calendly_event_id);
    console.log(`Found ${existingIds.length} existing Calendly events in our database`);
    
    // Step 3: Identify missing events
    const missingEvents = events.filter(event => {
      const eventId = event.uri.split('/').pop();
      return !existingIds.includes(eventId);
    });
    
    console.log(`Found ${missingEvents.length} missing events to import`);
    
    // Step 4: Get default contact ID for events without matching contacts
    const defaultContact = await db.query.contacts.findFirst({
      orderBy: [desc(schema.contacts.id)],
      columns: { id: true, name: true, email: true }
    });
    
    if (!defaultContact) {
      console.error("No contacts found in database, cannot proceed with import");
      return;
    }
    
    console.log(`Using ${defaultContact.name} (ID: ${defaultContact.id}) as fallback contact`);
    
    // Step 5: Batch process events
    let successCount = 0;
    let errorCount = 0;
    
    for (const event of missingEvents) {
      try {
        const eventId = event.uri.split('/').pop();
        
        // Get invitees for this event
        const inviteeResponse = await calendlyClient.get(`${event.uri}/invitees`);
        const invitees = inviteeResponse.data.collection || [];
        
        // Find contact by email if available
        let contactId = defaultContact.id;
        let contactFound = false;
        
        if (invitees.length > 0 && invitees[0].email) {
          const matchedContact = await db.query.contacts.findFirst({
            where: eq(schema.contacts.email, invitees[0].email),
            columns: { id: true, name: true }
          });
          
          if (matchedContact) {
            contactId = matchedContact.id;
            contactFound = true;
            console.log(`Found matching contact for ${invitees[0].email}: ${matchedContact.name} (ID: ${contactId})`);
          }
        }
        
        // If no match by email, try by name
        if (!contactFound && invitees.length > 0 && invitees[0].name) {
          const namePattern = `%${invitees[0].name}%`;
          
          const contactsByName = await db.execute(sql`
            SELECT id, name FROM contacts 
            WHERE name ILIKE ${namePattern} 
            LIMIT 1
          `);
          
          if (contactsByName.length > 0) {
            contactId = contactsByName[0].id;
            contactFound = true;
            console.log(`Found matching contact by name: ${contactsByName[0].name} (ID: ${contactId})`);
          }
        }
        
        if (!contactFound) {
          console.log(`No matching contact found for event ${eventId}, using default`);
        }
        
        // Insert the event
        const duration = differenceInMinutes(
          new Date(event.end_time),
          new Date(event.start_time)
        );
        
        // Determine assigned user ID
        let assignedUserId = 1; // Default to first user
        
        // Insert the event
        await db.execute(sql`
          INSERT INTO meetings (
            calendly_event_id, 
            type, 
            title, 
            start_time, 
            end_time, 
            duration, 
            status,
            booked_at, 
            assigned_to, 
            contact_id, 
            invitee_email, 
            invitee_name
          ) VALUES (
            ${eventId},
            ${'Call 1'},
            ${event.name || 'Calendly Meeting'},
            ${new Date(event.start_time)},
            ${new Date(event.end_time)},
            ${duration},
            ${event.status},
            ${event.created_at ? new Date(event.created_at) : null},
            ${assignedUserId},
            ${contactId},
            ${invitees.length > 0 ? invitees[0].email : null},
            ${invitees.length > 0 ? invitees[0].name : null}
          )
        `);
        
        console.log(`Successfully imported event: ${eventId}`);
        successCount++;
        
      } catch (error) {
        console.error(`Error importing event: ${error.message}`);
        errorCount++;
      }
      
      // Small delay to prevent API rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Final report
    console.log("\n=== Import Complete ===");
    console.log(`Successfully imported: ${successCount} events`);
    console.log(`Failed to import: ${errorCount} events`);
    
    // Verify final counts
    const finalCount = await db.execute(sql`
      SELECT COUNT(*) AS count FROM meetings 
      WHERE calendly_event_id IS NOT NULL
    `);
    
    const recentCount = await db.execute(sql`
      SELECT COUNT(*) AS count FROM meetings 
      WHERE calendly_event_id IS NOT NULL 
      AND start_time >= CURRENT_DATE - INTERVAL '30 days'
    `);
    
    console.log(`\nTotal Calendly events now in database: ${finalCount[0].count}`);
    console.log(`Calendly events in last 30 days: ${recentCount[0].count}`);
    
  } catch (error) {
    console.error("Error in batch import:", error);
  }
}

// Run the import
batchImportEvents().catch(error => {
  console.error("Fatal error:", error);
});