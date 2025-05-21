/**
 * Sync Routes for Calendly Integration
 * 
 * This file contains routes for syncing Calendly data with our application
 */

import { Request, Response, Router } from 'express';
import { db } from '../lib/db';
import { meetings, contacts } from '../schema';
import { sql, eq, and, gte, lte, isNull } from 'drizzle-orm';
import axios from 'axios';
import { subDays, format } from 'date-fns';
import { cacheService } from '../services/cache-service';

const router = Router();

/**
 * @route POST /api/sync/calendly-import
 * @desc Import Calendly events from last 30 days
 */
router.post('/calendly-import', async (req: Request, res: Response) => {
  const days = req.body.days || 30;
  const now = new Date();
  const startDate = subDays(now, days);
  
  try {
    if (!process.env.CALENDLY_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Calendly API key is not configured'
      });
    }
    
    // Set up Calendly API client
    const calendlyClient = axios.create({
      baseURL: 'https://api.calendly.com',
      headers: {
        'Authorization': `Bearer ${process.env.CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Get all events from the specified time range
    const eventsResponse = await calendlyClient.get('/scheduled_events', {
      params: {
        organization: 'https://api.calendly.com/organizations/54858790-a2e4-4696-9d19-7c6dc22ef508',
        count: 100,
        min_start_time: startDate.toISOString(),
        max_start_time: now.toISOString()
      }
    });
    
    const events = eventsResponse.data.collection;
    
    // Get list of existing event IDs
    const eventIds = events.map((event: any) => event.uri.split('/').pop());
    
    // Check which events already exist in our database
    const existingEvents = await db.select({ 
      calendly_event_id: meetings.calendly_event_id
    })
    .from(meetings)
    .execute();
    
    const existingEventIds = existingEvents.map(event => event.calendly_event_id);
    
    let imported = 0;
    let skipped = 0;
    
    // Process each event one by one
    for (const event of events) {
      const eventId = event.uri.split('/').pop();
      
      // Skip if already imported
      if (existingEventIds.includes(eventId)) {
        skipped++;
        continue;
      }
      
      // Get invitee information
      const inviteeResponse = await calendlyClient.get(`${event.uri}/invitees`);
      const invitees = inviteeResponse.data.collection || [];
      
      // Try to match with a contact in our database
      let contactId = null;
      
      if (invitees.length > 0 && invitees[0].email) {
        const matchedContact = await db.select()
          .from(contacts)
          .where(eq(contacts.email, invitees[0].email))
          .limit(1)
          .execute();
        
        if (matchedContact.length > 0) {
          contactId = matchedContact[0].id;
        } else if (invitees[0].name) {
          // Try matching by name if email doesn't match
          const matchedByName = await db.select()
            .from(contacts)
            .where(sql`LOWER(${contacts.name}) LIKE LOWER('%${invitees[0].name}%')`)
            .limit(1)
            .execute();
          
          if (matchedByName.length > 0) {
            contactId = matchedByName[0].id;
          }
        }
      }
      
      // If still no match, use a default contact
      if (!contactId) {
        const defaultContact = await db.select()
          .from(contacts)
          .orderBy(contacts.id)
          .limit(1)
          .execute();
        
        if (defaultContact.length > 0) {
          contactId = defaultContact[0].id;
        } else {
          console.error('No default contact found in database');
          continue;
        }
      }
      
      // Calculate duration in minutes
      const startTime = new Date(event.start_time);
      const endTime = new Date(event.end_time);
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
      
      // Insert meeting into database
      await db.insert(meetings).values({
        contact_id: contactId,
        calendly_event_id: eventId,
        type: 'Call 1',
        title: event.name || 'Calendly Meeting',
        start_time: startTime,
        end_time: endTime,
        duration: duration,
        status: event.status,
        booked_at: event.created_at ? new Date(event.created_at) : null,
        assigned_to: 1,
        invitee_email: invitees.length > 0 ? invitees[0].email : null,
        invitee_name: invitees.length > 0 ? invitees[0].name : null,
        sequence: 1
      }).execute();
      
      imported++;
    }
    
    // Clear cache to ensure dashboard shows the new data
    await cacheService.clearCache('%dashboard%');
    
    return res.json({
      success: true,
      total: events.length,
      imported,
      skipped,
      message: `Imported ${imported} events, skipped ${skipped} existing events`
    });
  } catch (error: any) {
    console.error('Error importing Calendly events:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An unknown error occurred'
    });
  }
});

/**
 * @route POST /api/sync/match-contact
 * @desc Match a contact based on email or name
 */
router.post('/match-contact', async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;
    
    if (!email && !name) {
      return res.status(400).json({
        success: false,
        error: 'Either email or name is required'
      });
    }
    
    let contact = null;
    
    // Try to match by email first
    if (email) {
      const matchedByEmail = await db.select()
        .from(contacts)
        .where(eq(contacts.email, email))
        .limit(1)
        .execute();
      
      if (matchedByEmail.length > 0) {
        contact = matchedByEmail[0];
      }
    }
    
    // Try to match by name if no match by email
    if (!contact && name) {
      const matchedByName = await db.select()
        .from(contacts)
        .where(sql`LOWER(${contacts.name}) LIKE LOWER('%${name}%')`)
        .limit(1)
        .execute();
      
      if (matchedByName.length > 0) {
        contact = matchedByName[0];
      }
    }
    
    if (contact) {
      return res.json({
        success: true,
        contactId: contact.id,
        name: contact.name,
        email: contact.email
      });
    }
    
    // If no match found, return default contact
    const defaultContact = await db.select()
      .from(contacts)
      .orderBy(contacts.id)
      .limit(1)
      .execute();
    
    if (defaultContact.length > 0) {
      return res.json({
        success: true,
        contactId: defaultContact[0].id,
        name: defaultContact[0].name,
        email: defaultContact[0].email,
        isDefault: true
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'No matching contact found and no default contact available'
    });
  } catch (error: any) {
    console.error('Error matching contact:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An unknown error occurred'
    });
  }
});

/**
 * @route POST /api/sync/clear-cache
 * @desc Clear the cache
 */
router.post('/clear-cache', async (req: Request, res: Response) => {
  try {
    const pattern = req.body.pattern || '%dashboard%';
    const cleared = await cacheService.clearCache(pattern);
    
    return res.json({
      success: true,
      cleared,
      message: `Cleared ${cleared} cached items matching pattern: ${pattern}`
    });
  } catch (error: any) {
    console.error('Error clearing cache:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An unknown error occurred'
    });
  }
});

/**
 * @route GET /api/sync/status
 * @desc Get the sync status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const totalMeetings = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(meetings)
    .execute();
    
    const calendlyMeetings = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(meetings)
    .where(sql`${meetings.calendly_event_id} IS NOT NULL`)
    .execute();
    
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    const recentMeetings = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(meetings)
    .where(
      and(
        gte(meetings.start_time, thirtyDaysAgo),
        sql`${meetings.calendly_event_id} IS NOT NULL`
      )
    )
    .execute();
    
    return res.json({
      success: true,
      stats: {
        totalMeetings: totalMeetings[0].count,
        calendlyMeetings: calendlyMeetings[0].count,
        recentCalendlyMeetings: recentMeetings[0].count
      },
      lastSync: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error getting sync status:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An unknown error occurred'
    });
  }
});

export default router;