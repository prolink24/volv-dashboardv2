/**
 * Calendly Sync Service
 * 
 * Enhanced service to ensure proper syncing of Calendly events with the database
 */

import axios from 'axios';
import { format, parseISO, differenceInMinutes, subMonths } from 'date-fns';
import { db } from '../db';
import { meetings } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';
import NodeCache from 'node-cache';

// Cache for performance
const syncCache = new NodeCache({ stdTTL: 300 }); // 5 minute cache

// Organization URI
const ORG_URI = 'https://api.calendly.com/organizations/54858790-a2e4-4696-9d19-7c6dc22ef508';

// Calendly API client
const getCalendlyClient = () => {
  // Get API key from environment
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

/**
 * Get Calendly events for a specific time period
 */
export const getCalendlyEventsForPeriod = async (
  minDate: string, 
  maxDate: string,
  includeHistorical: boolean = false
) => {
  try {
    console.log(`Fetching Calendly events from ${minDate} to ${maxDate}`);
    
    // Check cache for this time period
    const cacheKey = `calendly_events_${minDate}_${maxDate}`;
    const cachedEvents = syncCache.get(cacheKey);
    if (cachedEvents && !includeHistorical) {
      console.log('Using cached Calendly events');
      return cachedEvents as any[];
    }
    
    // Build params
    const params = {
      organization: ORG_URI,
      count: 100,
      status: 'active',
      min_start_time: minDate,
      max_start_time: maxDate
    };
    
    // Make API request
    const client = getCalendlyClient();
    const response = await client.get('/scheduled_events', { params });
    
    if (response.data && response.data.collection) {
      const events = response.data.collection;
      console.log(`Found ${events.length} Calendly events for this period`);
      
      // Store in cache
      syncCache.set(cacheKey, events);
      
      // Check for pagination
      if (response.data.pagination && response.data.pagination.next_page) {
        console.log(`More events available at: ${response.data.pagination.next_page}`);
        
        // TODO: Handle pagination for very large event sets
      }
      
      return events;
    } else {
      console.error('Invalid response from Calendly API');
      return [];
    }
  } catch (error: any) {
    console.error(`Error fetching Calendly events: ${error.message}`);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    return [];
  }
};

/**
 * Get invitee details for an event
 */
export const getEventInvitees = async (eventUri: string) => {
  try {
    // Check cache
    const cacheKey = `invitees_${eventUri}`;
    const cachedInvitees = syncCache.get(cacheKey);
    if (cachedInvitees) {
      return cachedInvitees as any[];
    }
    
    // Fetch from API
    const client = getCalendlyClient();
    const response = await client.get(`${eventUri}/invitees`);
    
    if (response.data && response.data.collection) {
      const invitees = response.data.collection;
      
      // Store in cache
      syncCache.set(cacheKey, invitees);
      
      return invitees;
    }
    
    return [];
  } catch (error: any) {
    console.error(`Error fetching invitees for event ${eventUri}: ${error.message}`);
    return [];
  }
};

/**
 * Find a contact by email
 */
export const findContactByEmail = async (email: string) => {
  if (!email) return null;
  
  try {
    const contact = await db.query.contacts.findFirst({
      where: eq(sql`LOWER(email)`, email.toLowerCase()),
      columns: {
        id: true,
        name: true,
        email: true
      }
    });
    
    return contact;
  } catch (error: any) {
    console.error(`Error finding contact by email: ${error.message}`);
    return null;
  }
};

/**
 * Find a contact by fuzzy name match
 */
export const findContactByName = async (name: string) => {
  if (!name) return null;
  
  try {
    // Use SQL for ILIKE operation
    const result = await db.execute(
      sql`SELECT id, name, email FROM contacts WHERE name ILIKE ${`%${name}%`} LIMIT 1`
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    return null;
  } catch (error: any) {
    console.error(`Error finding contact by name: ${error.message}`);
    return null;
  }
};

/**
 * Get a default contact for events with no match
 */
export const getDefaultContact = async () => {
  try {
    // Try to get a specific contact that might be used for this purpose
    const contact = await db.query.contacts.findFirst({
      orderBy: (contacts, { asc }) => [asc(contacts.id)],
      limit: 1
    });
    
    return contact;
  } catch (error: any) {
    console.error(`Error getting default contact: ${error.message}`);
    return null;
  }
};

/**
 * Determine event type from name
 */
export const determineEventType = (eventName: string) => {
  if (!eventName) return 'Call 1'; // Default type
  
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
  
  return 'Call 1'; // Default
};

/**
 * Determine assigned user ID from event memberships
 */
export const determineAssignedUser = (event: any) => {
  // Map of user emails to IDs
  const userEmailToIdMap: Record<string, number> = {
    'dealmaker@thedealmaker.io': 1,
    'mazin@thedealmaker.io': 2,
    'fred@thedealmaker.io': 3,
    'louis@thedealmaker.io': 4,
    'hope@thedealmaker.io': 5,
    'bogdan@thedealmaker.io': 6,
    'marco@thedealmaker.io': 7,
    'laura@thedealmaker.io': 8,
    'vraj@thedealmaker.io': 9
  };
  
  // Default user ID
  let assignedUserId = 1;
  
  if (event.event_memberships && event.event_memberships.length > 0) {
    const userEmail = event.event_memberships[0].user_email;
    
    // Handle deleted users
    if (userEmail.includes('@deleted.calendly.com')) {
      return assignedUserId;
    }
    
    // Check direct email match
    if (userEmailToIdMap[userEmail]) {
      return userEmailToIdMap[userEmail];
    }
    
    // Try matching by local part
    const localPart = userEmail.split('@')[0];
    for (const [email, id] of Object.entries(userEmailToIdMap)) {
      if (email.split('@')[0] === localPart) {
        return id;
      }
    }
  }
  
  return assignedUserId;
};

/**
 * Process a single Calendly event
 */
export const processCalendlyEvent = async (event: any) => {
  // Extract event ID from URI
  const eventId = event.uri.split('/').pop();
  console.log(`Processing Calendly event: ${eventId}`);
  
  // Check if event already exists in database
  const existingEvent = await db.query.meetings.findFirst({
    where: eq(meetings.calendlyEventId, eventId)
  });
  
  if (existingEvent) {
    console.log(`Event ${eventId} already exists in database`);
    return false;
  }
  
  // Get invitees
  const invitees = await getEventInvitees(event.uri);
  console.log(`Event has ${invitees.length} invitees`);
  
  // Find associated contact
  let contact = null;
  
  // If we have invitees, try to match by email or name
  if (invitees.length > 0) {
    const invitee = invitees[0];
    
    if (invitee.email) {
      contact = await findContactByEmail(invitee.email);
      if (contact) {
        console.log(`Matched contact by email: ${contact.name}`);
      }
    }
    
    if (!contact && invitee.name) {
      contact = await findContactByName(invitee.name);
      if (contact) {
        console.log(`Matched contact by name: ${contact.name}`);
      }
    }
  }
  
  // If no contact found, use default
  if (!contact) {
    contact = await getDefaultContact();
    if (!contact) {
      console.error(`Cannot process event ${eventId} - no matching contact and no default`);
      return false;
    }
    
    console.log(`Using default contact: ${contact.name}`);
  }
  
  try {
    // Get duration in minutes
    const duration = Math.floor(
      (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000
    );
    
    // Use the meetings table definition exactly as in the schema
    await db.insert(meetings).values({
      calendlyEventId: eventId,
      type: determineEventType(event.name),
      title: event.name || 'Calendly Meeting',
      startTime: new Date(event.start_time),
      endTime: new Date(event.end_time),
      duration: duration,
      status: event.status,
      bookedAt: event.created_at ? new Date(event.created_at) : null,
      assignedTo: determineAssignedUser(event),
      contactId: contact.id,
      inviteeEmail: invitees.length > 0 ? invitees[0].email : null,
      inviteeName: invitees.length > 0 ? invitees[0].name : null,
      source: 'Calendly',  // Add source field
      sequenceNumber: 1,   // Default sequence number
      meetingType: 'online'  // Default meeting type
    });
    
    console.log(`Successfully imported event: ${eventId}`);
    return true;
  } catch (error: any) {
    console.error(`Failed to import event ${eventId}: ${error.message}`);
    // Try a more direct approach with SQL if the first method fails
    try {
      await db.execute(sql`
        INSERT INTO meetings 
        ("calendlyEventId", "type", "title", "startTime", "endTime", "duration", 
         "status", "bookedAt", "assignedTo", "contactId", "inviteeEmail", "inviteeName",
         "source", "sequenceNumber", "meetingType")
        VALUES 
        (${eventId}, 
         ${determineEventType(event.name)}, 
         ${event.name || 'Calendly Meeting'}, 
         ${new Date(event.start_time).toISOString()}, 
         ${new Date(event.end_time).toISOString()}, 
         ${duration}, 
         ${event.status}, 
         ${event.created_at ? new Date(event.created_at).toISOString() : null}, 
         ${determineAssignedUser(event)}, 
         ${contact.id}, 
         ${invitees.length > 0 ? invitees[0].email : null}, 
         ${invitees.length > 0 ? invitees[0].name : null},
         ${'Calendly'},
         ${1},
         ${'online'})
      `);
      console.log(`Successfully imported event using fallback method: ${eventId}`);
      return true;
    } catch (fallbackError: any) {
      console.error(`Failed to import event ${eventId} using fallback method: ${fallbackError.message}`);
      return false;
    }
  }
};

/**
 * Sync all Calendly events for a specific time range
 */
export const syncCalendlyEvents = async (options: { 
  includeHistorical?: boolean,
  daysBack?: number,
  limit?: number
} = {}) => {
  try {
    const { includeHistorical = false, daysBack = 30, limit = 0 } = options;
    console.log(`Starting Calendly sync (includeHistorical: ${includeHistorical}, daysBack: ${daysBack}, limit: ${limit})`);
    
    // Define time periods to sync
    const now = new Date();
    const periods = [
      {
        label: 'Recent',
        minDate: subMonths(now, 1).toISOString(),
        maxDate: now.toISOString()
      }
    ];
    
    // Add historical periods if requested
    if (includeHistorical) {
      periods.push(
        {
          label: 'Mid-term',
          minDate: subMonths(now, 3).toISOString(),
          maxDate: subMonths(now, 1).toISOString()
        },
        {
          label: 'Older',
          minDate: subMonths(now, 6).toISOString(),
          maxDate: subMonths(now, 3).toISOString()
        }
      );
    }
    
    // Process each time period
    let totalEvents = 0;
    let importedEvents = 0;
    let totalEventsCounted = 0;
    
    for (const period of periods) {
      // Get events for this period
      const events = await getCalendlyEventsForPeriod(
        period.minDate, 
        period.maxDate,
        includeHistorical
      );
      
      totalEvents += events.length;
      
      // Process events (with limit if specified)
      let eventsToProcess = events;
      
      // Apply limit if specified
      if (limit > 0) {
        const remainingLimit = limit - totalEventsCounted;
        if (remainingLimit <= 0) {
          console.log(`Reached limit of ${limit} events, skipping ${period.label} period`);
          continue;
        }
        
        // Take only up to the remaining limit
        eventsToProcess = events.slice(0, remainingLimit);
        console.log(`Processing ${eventsToProcess.length} of ${events.length} events for ${period.label} period (limit: ${limit})`);
        totalEventsCounted += eventsToProcess.length;
      }
      
      // Process each event
      for (const event of eventsToProcess) {
        const success = await processCalendlyEvent(event);
        if (success) {
          importedEvents++;
        }
        
        // Short delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`Calendly sync complete. Processed ${totalEventsCounted > 0 ? totalEventsCounted : totalEvents} events, imported ${importedEvents}`);
    return { totalEvents, importedEvents };
    
  } catch (error: any) {
    console.error(`Calendly sync failed: ${error.message}`);
    throw error;
  }
};

// Export the sync functionality
export default {
  syncCalendlyEvents,
  getCalendlyEventsForPeriod,
  processCalendlyEvent
};