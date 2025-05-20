/**
 * Import Calendly Events API
 * 
 * This module adds an API endpoint that imports missing Calendly events
 * directly into the database, bypassing previous issues.
 */

import express from 'express';
import axios from 'axios';
import { format, parseISO, differenceInMinutes, subDays } from 'date-fns';
import { sql } from 'drizzle-orm';
import { db } from '../db';

// Create a router for the import endpoint
const router = express.Router();

// Organization URI
const ORG_URI = 'https://api.calendly.com/organizations/54858790-a2e4-4696-9d19-7c6dc22ef508';

/**
 * POST /api/import-calendly
 * Imports missing Calendly events for the last 30 days
 */
router.get('/import-calendly', async (req, res) => {
  try {
    console.log('Calendly import requested');
    
    // Verify API key
    if (!process.env.CALENDLY_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'CALENDLY_API_KEY not found in environment variables'
      });
    }
    
    // Create Calendly API client
    const calendlyClient = axios.create({
      baseURL: 'https://api.calendly.com',
      headers: {
        'Authorization': `Bearer ${process.env.CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Step 1: Get existing Calendly events
    const existingEvents = await db.execute(sql`
      SELECT calendly_event_id FROM meetings 
      WHERE calendly_event_id IS NOT NULL
    `);
    
    const existingIds = existingEvents.map(row => row.calendly_event_id);
    console.log(`Found ${existingIds.length} existing Calendly events in database`);
    
    // Step 2: Get recent Calendly events
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
      return res.status(500).json({
        success: false,
        error: 'Invalid response from Calendly API'
      });
    }
    
    const events = response.data.collection;
    console.log(`Found ${events.length} events in the last 30 days`);
    
    // Step 3: Find missing events
    const missingEvents = events.filter(event => {
      const eventId = event.uri.split('/').pop();
      return !existingIds.includes(eventId);
    });
    
    console.log(`Found ${missingEvents.length} missing events to import`);
    
    // Step 4: Get default contact for fallback
    const defaultContactResult = await db.execute(sql`
      SELECT id, name, email FROM contacts ORDER BY id LIMIT 1
    `);
    
    if (defaultContactResult.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'No contacts found in database'
      });
    }
    
    const defaultContact = defaultContactResult[0];
    console.log(`Using ${defaultContact.name} (ID: ${defaultContact.id}) as fallback contact`);
    
    // Step 5: Import missing events
    let successCount = 0;
    let errorCount = 0;
    
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
          const contactByEmail = await db.execute(sql`
            SELECT id, name FROM contacts 
            WHERE email = ${invitees[0].email} 
            LIMIT 1
          `);
          
          if (contactByEmail.length > 0) {
            contactId = contactByEmail[0].id;
            contactFound = true;
            console.log(`Matched contact by email: ${contactByEmail[0].name} (ID: ${contactId})`);
          }
        }
        
        // If no match by email, try by name
        if (!contactFound && invitees.length > 0 && invitees[0].name) {
          const namePattern = `%${invitees[0].name}%`;
          
          const contactByName = await db.execute(sql`
            SELECT id, name FROM contacts 
            WHERE name ILIKE ${namePattern} 
            LIMIT 1
          `);
          
          if (contactByName.length > 0) {
            contactId = contactByName[0].id;
            contactFound = true;
            console.log(`Matched contact by name: ${contactByName[0].name} (ID: ${contactId})`);
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
        
        // Default to first user
        const assignedUserId = 1;
        
        // Insert event
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
        
      } catch (error) {
        console.error(`Error importing event:`, error);
        errorCount++;
      }
      
      // Small delay to prevent rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Step 6: Clear dashboard cache
    try {
      await db.execute(sql`DELETE FROM cache WHERE key LIKE '%dashboard%'`);
      console.log('Dashboard cache cleared');
    } catch (error) {
      console.error('Failed to clear dashboard cache:', error);
    }
    
    // Step 7: Get updated counts
    const totalResult = await db.execute(sql`
      SELECT COUNT(*) AS count FROM meetings 
      WHERE calendly_event_id IS NOT NULL
    `);
    
    const recentResult = await db.execute(sql`
      SELECT COUNT(*) AS count FROM meetings 
      WHERE calendly_event_id IS NOT NULL 
      AND start_time >= CURRENT_DATE - INTERVAL '30 days'
    `);
    
    const totalCount = totalResult[0].count;
    const recentCount = recentResult[0].count;
    
    // Return success response
    res.json({
      success: true,
      imported: successCount,
      errors: errorCount,
      totalCalendlyEvents: totalCount,
      recentCalendlyEvents: recentCount
    });
    
  } catch (error) {
    console.error('Error in Calendly import:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error occurred',
      details: error.response?.data || 'No additional details'
    });
  }
});

export default router;