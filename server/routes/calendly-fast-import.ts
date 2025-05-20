/**
 * Calendly Fast Import
 * 
 * This script imports Calendly events directly into the database
 * using SQL for better reliability and performance.
 */

import axios from 'axios';
import { format, parseISO, differenceInMinutes, subDays } from 'date-fns';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { Express, Request, Response } from 'express';

// Organization URI
const ORG_URI = 'https://api.calendly.com/organizations/54858790-a2e4-4696-9d19-7c6dc22ef508';

/**
 * Register calendly fast import routes
 */
export function registerCalendlyFastImportRoutes(app: Express) {
  // Set up the API endpoint to trigger the import
  app.get('/api/calendly/fast-import', async (req: Request, res: Response) => {
    try {
      console.log('Fast Calendly import requested');
      
      const result = await importRecentCalendlyEvents();
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('Error in Calendly fast import:', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.response?.data || 'No additional details'
      });
    }
  });
}

/**
 * Import recent Calendly events
 */
async function importRecentCalendlyEvents() {
  try {
    // Connect to database
    const client = neon(process.env.DATABASE_URL!);
    const db = drizzle(client);
    
    // Check for API key
    if (!process.env.CALENDLY_API_KEY) {
      throw new Error('CALENDLY_API_KEY not set in environment');
    }
    
    const calendlyClient = axios.create({
      baseURL: 'https://api.calendly.com',
      headers: {
        'Authorization': `Bearer ${process.env.CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Step 1: Get existing Calendly event IDs
    const existingEvents = await db.execute(sql`
      SELECT calendly_event_id FROM meetings 
      WHERE calendly_event_id IS NOT NULL
    `);
    
    const existingIds = existingEvents.map((row: any) => row.calendly_event_id);
    console.log(`Found ${existingIds.length} existing Calendly events in database`);
    
    // Step 2: Get events from Calendly API (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    
    console.log(`Fetching Calendly events from ${format(thirtyDaysAgo, 'yyyy-MM-dd')} to ${format(now, 'yyyy-MM-dd')}`);
    
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
      throw new Error('Invalid response from Calendly API');
    }
    
    const events = response.data.collection;
    console.log(`Found ${events.length} events in the last 30 days`);
    
    // Step 3: Identify missing events
    const missingEvents = events.filter((event: any) => {
      const eventId = event.uri.split('/').pop();
      return !existingIds.includes(eventId);
    });
    
    console.log(`Found ${missingEvents.length} missing events to import`);
    
    // Step 4: Get default contact for fallback
    const defaultContactResult = await db.execute(sql`
      SELECT id, name, email FROM contacts ORDER BY id LIMIT 1
    `);
    
    if (defaultContactResult.length === 0) {
      throw new Error('No contacts found in database');
    }
    
    const defaultContact = defaultContactResult[0];
    console.log(`Using ${defaultContact.name} (ID: ${defaultContact.id}) as fallback contact`);
    
    // Step 5: Process each missing event
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
          const matchedContactResult = await db.execute(sql`
            SELECT id, name, email FROM contacts 
            WHERE email = ${invitees[0].email} 
            LIMIT 1
          `);
          
          if (matchedContactResult.length > 0) {
            contactId = matchedContactResult[0].id;
            contactFound = true;
            console.log(`Found matching contact for ${invitees[0].email}: ${matchedContactResult[0].name} (ID: ${contactId})`);
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
        
        // Determine event type
        let eventType = 'Call 1';
        if (event.name) {
          const name = event.name.toLowerCase();
          if (name.includes('solution')) {
            eventType = 'Call 2';
          } else if (name.includes('next step') || name.includes('next-step')) {
            eventType = 'Call 3';
          } else if (name.includes('orientation')) {
            eventType = 'Orientation';
          }
        }
        
        // Calculate duration
        const duration = differenceInMinutes(
          new Date(event.end_time),
          new Date(event.start_time)
        );
        
        // Determine assigned user (default to first user)
        let assignedUserId = 1;
        
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
            ${eventType},
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
        
      } catch (error: any) {
        console.error(`Error importing event: ${error.message}`);
        errorCount++;
      }
      
      // Small delay to prevent API rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Step 6: Get final counts
    const finalCountResult = await db.execute(sql`
      SELECT COUNT(*) AS count FROM meetings 
      WHERE calendly_event_id IS NOT NULL
    `);
    
    const recent30DaysCountResult = await db.execute(sql`
      SELECT COUNT(*) AS count FROM meetings 
      WHERE calendly_event_id IS NOT NULL 
      AND start_time >= CURRENT_DATE - INTERVAL '30 days'
    `);
    
    const totalCount = finalCountResult[0].count;
    const recent30DaysCount = recent30DaysCountResult[0].count;
    
    // Step 7: Return summary
    return {
      total_imported: successCount,
      total_failed: errorCount,
      total_calendly_events: totalCount,
      recent_30_days_count: recent30DaysCount
    };
    
  } catch (error: any) {
    console.error('Error in Calendly fast import function:', error);
    throw error;
  }
}