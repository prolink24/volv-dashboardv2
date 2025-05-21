/**
 * Calendly API Routes
 * 
 * This file contains dedicated routes for the Calendly integration,
 * including syncing events, matching contacts, and testing the integration.
 */

import { Request, Response, Router } from 'express';
import { db } from '../lib/db';
import { meetings, contacts } from '../schema';
import { sql, eq, and, gte, lte, desc, isNull } from 'drizzle-orm';
import axios from 'axios';
import { subDays, format } from 'date-fns';
import { cacheService } from '../services/cache-service';

const router = Router();

// API Key validation middleware
const validateCalendlyApiKey = (req: Request, res: Response, next: Function) => {
  if (!process.env.CALENDLY_API_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Calendly API key is not configured'
    });
  }
  next();
};

// Set up Calendly API client
const getCalendlyClient = () => {
  return axios.create({
    baseURL: 'https://api.calendly.com',
    headers: {
      'Authorization': `Bearer ${process.env.CALENDLY_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
};

/**
 * @route GET /api/calendly/health
 * @desc Check Calendly API connection health
 */
router.get('/health', validateCalendlyApiKey, async (req: Request, res: Response) => {
  try {
    const client = getCalendlyClient();
    const response = await client.get('/user/me');
    
    return res.json({
      success: true,
      user: response.data.resource.name,
      email: response.data.resource.email,
      status: 'connected'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

/**
 * @route GET /api/calendly/events
 * @desc Get recent Calendly events (last 30 days by default)
 */
router.get('/events', validateCalendlyApiKey, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const page = parseInt(req.query.page as string) || 1;
    const count = parseInt(req.query.count as string) || 100;
    
    const now = new Date();
    const startDate = subDays(now, days);
    
    const client = getCalendlyClient();
    const response = await client.get('/scheduled_events', {
      params: {
        organization: 'https://api.calendly.com/organizations/54858790-a2e4-4696-9d19-7c6dc22ef508',
        count: count,
        page_token: req.query.pageToken,
        min_start_time: startDate.toISOString(),
        max_start_time: now.toISOString()
      }
    });
    
    // Check if these events exist in our database
    const events = response.data.collection;
    const eventIds = events.map((event: any) => event.uri.split('/').pop());
    
    const existingEvents = await db.select({ 
      calendly_event_id: meetings.calendly_event_id
    })
    .from(meetings)
    .where(sql`${meetings.calendly_event_id} IN (${eventIds.join(',')})`)
    .execute();
    
    const existingEventIds = existingEvents.map(event => event.calendly_event_id);
    
    // Add a flag to each event indicating if it exists in our database
    const eventsWithStatus = events.map((event: any) => {
      const eventId = event.uri.split('/').pop();
      return {
        ...event,
        exists_in_db: existingEventIds.includes(eventId)
      };
    });
    
    return res.json({
      success: true,
      events: eventsWithStatus,
      pagination: response.data.pagination,
      total_count: events.length,
      imported_count: existingEventIds.length,
      missing_count: events.length - existingEventIds.length
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

/**
 * @route POST /api/calendly/import
 * @desc Import missing Calendly events from a specific date range
 */
router.post('/import', validateCalendlyApiKey, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.body.days as string) || 30;
    const now = new Date();
    const startDate = subDays(now, days);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    // Get all events from the specified time range
    const client = getCalendlyClient();
    const eventsResponse = await client.get('/scheduled_events', {
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
    
    const existingEvents = await db.select({ 
      calendly_event_id: meetings.calendly_event_id
    })
    .from(meetings)
    .where(sql`${meetings.calendly_event_id} IN (${eventIds.join(',')})`)
    .execute();
    
    const existingEventIds = existingEvents.map(event => event.calendly_event_id);
    
    // Process each event one by one
    for (const event of events) {
      try {
        const eventId = event.uri.split('/').pop();
        
        // Skip if already imported
        if (existingEventIds.includes(eventId)) {
          skipped++;
          continue;
        }
        
        // Get invitee information
        const inviteeResponse = await client.get(`${event.uri}/invitees`);
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
            .orderBy(desc(contacts.id))
            .limit(1)
            .execute();
          
          if (defaultContact.length > 0) {
            contactId = defaultContact[0].id;
          } else {
            throw new Error('No default contact found in database');
          }
        }
        
        // Calculate duration in minutes
        const startTime = new Date(event.start_time);
        const endTime = new Date(event.end_time);
        const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
        
        // Insert meeting into database
        await db.insert(meetings).values({
          calendly_event_id: eventId,
          type: 'Call 1',
          title: event.name || 'Calendly Meeting',
          start_time: startTime,
          end_time: endTime,
          duration: duration,
          status: event.status,
          booked_at: event.created_at ? new Date(event.created_at) : null,
          assigned_to: 1,
          contact_id: contactId,
          invitee_email: invitees.length > 0 ? invitees[0].email : null,
          invitee_name: invitees.length > 0 ? invitees[0].name : null,
          sequence: 1
        }).execute();
        
        imported++;
      } catch (error) {
        errors++;
        console.error('Error importing event:', error);
      }
    }
    
    // Clear cache to ensure dashboard shows the new data
    await cacheService.clearCache('%dashboard%');
    
    return res.json({
      success: true,
      total: events.length,
      imported,
      skipped,
      errors,
      message: `Imported ${imported} events, skipped ${skipped} existing events, encountered ${errors} errors`
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

/**
 * @route POST /api/calendly/match-contact
 * @desc Match a Calendly event invitee with a contact in our database
 */
router.post('/match-contact', async (req: Request, res: Response) => {
  try {
    const { invitee_email, invitee_name } = req.body;
    
    if (!invitee_email && !invitee_name) {
      return res.status(400).json({
        success: false,
        error: 'Either invitee_email or invitee_name is required'
      });
    }
    
    // Try to match by email first
    if (invitee_email) {
      const matchedByEmail = await db.select()
        .from(contacts)
        .where(eq(contacts.email, invitee_email))
        .limit(1)
        .execute();
      
      if (matchedByEmail.length > 0) {
        return res.json({
          success: true,
          contactId: matchedByEmail[0].id,
          name: matchedByEmail[0].name,
          matched_by: 'email'
        });
      }
    }
    
    // Try to match by name if email doesn't match
    if (invitee_name) {
      const matchedByName = await db.select()
        .from(contacts)
        .where(sql`LOWER(${contacts.name}) LIKE LOWER('%${invitee_name}%')`)
        .limit(1)
        .execute();
      
      if (matchedByName.length > 0) {
        return res.json({
          success: true,
          contactId: matchedByName[0].id,
          name: matchedByName[0].name,
          matched_by: 'name'
        });
      }
    }
    
    // If no match, return default contact
    const defaultContact = await db.select()
      .from(contacts)
      .orderBy(desc(contacts.id))
      .limit(1)
      .execute();
    
    if (defaultContact.length > 0) {
      return res.json({
        success: true,
        contactId: defaultContact[0].id,
        name: defaultContact[0].name,
        matched_by: 'default'
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'No matching contact found and no default contact available'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/calendly/test
 * @desc Run the Calendly integration tests
 */
router.get('/test', validateCalendlyApiKey, async (req: Request, res: Response) => {
  try {
    // Dynamically import test module
    const testModule = await import('../tests/calendly-sync-tests');
    
    // Start the tests in the background
    res.json({
      success: true,
      message: 'Calendly integration tests started',
      status: 'running',
      check_logs: true
    });
    
    // Run the tests after sending the response
    if (typeof testModule.default === 'function') {
      await testModule.default();
    } else if (typeof testModule.runTests === 'function') {
      await testModule.runTests();
    } else {
      console.error('No test runner function found in test module');
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/calendly/stats
 * @desc Get Calendly integration statistics
 */
router.get('/stats', cacheService.cacheMiddleware(300), async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const now = new Date();
    const startDate = subDays(now, days);
    
    // Count meetings in the last 30 days
    const recentMeetingsResult = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(meetings)
    .where(
      and(
        gte(meetings.start_time, startDate),
        lte(meetings.start_time, now)
      )
    )
    .execute();
    
    // Count meetings from 30-60 days ago
    const olderStartDate = subDays(startDate, 30);
    const olderMeetingsResult = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(meetings)
    .where(
      and(
        gte(meetings.start_time, olderStartDate),
        lte(meetings.start_time, startDate)
      )
    )
    .execute();
    
    // Count meetings with no contact
    const noContactMeetingsResult = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(meetings)
    .where(isNull(meetings.contact_id))
    .execute();
    
    // Count total meetings with Calendly event ID
    const calendlyMeetingsResult = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(meetings)
    .where(sql`${meetings.calendly_event_id} IS NOT NULL`)
    .execute();
    
    // Count total meetings
    const totalMeetingsResult = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(meetings)
    .execute();
    
    return res.json({
      success: true,
      stats: {
        total_meetings: totalMeetingsResult[0].count,
        calendly_meetings: calendlyMeetingsResult[0].count,
        recent_meetings: recentMeetingsResult[0].count,
        older_meetings: olderMeetingsResult[0].count,
        no_contact_meetings: noContactMeetingsResult[0].count,
        days_range: days
      },
      time_periods: {
        recent: {
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(now, 'yyyy-MM-dd'),
          count: recentMeetingsResult[0].count
        },
        older: {
          start_date: format(olderStartDate, 'yyyy-MM-dd'),
          end_date: format(startDate, 'yyyy-MM-dd'),
          count: olderMeetingsResult[0].count
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;