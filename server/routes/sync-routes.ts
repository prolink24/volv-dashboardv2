/**
 * Sync Routes
 * 
 * API endpoints for syncing external services like Calendly
 */

import { Router } from 'express';
import axios from 'axios';
import { db } from '../db';

const router = Router();

/**
 * Endpoint to sync Calendly events
 * GET /api/sync/calendly
 */
router.get('/calendly', async (req, res) => {
  try {
    console.log('Starting Calendly sync...');
    
    // Check for API key
    if (!process.env.CALENDLY_API_KEY) {
      return res.status(400).json({ error: 'CALENDLY_API_KEY not found in environment variables' });
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
    
    // Get a default contact for fallback
    const defaultContactResult = await db.execute(
      `SELECT id, name FROM contacts ORDER BY id DESC LIMIT 1`
    );
    
    const defaultContact = {
      id: defaultContactResult.length > 0 ? defaultContactResult[0].id : 1,
      name: defaultContactResult.length > 0 ? defaultContactResult[0].name : 'Default Contact'
    };
    
    console.log(`Using ${defaultContact.name} (ID: ${defaultContact.id}) as fallback contact if needed`);
    
    // Get all Calendly events
    let allEvents = [];
    let nextPageToken = null;
    
    do {
      const params: any = {
        organization: 'https://api.calendly.com/organizations/54858790-a2e4-4696-9d19-7c6dc22ef508',
        count: 100
      };
      
      if (nextPageToken) {
        params.page_token = nextPageToken;
      }
      
      const response = await calendlyClient.get('/scheduled_events', { params });
      
      if (!response.data || !response.data.collection) {
        break;
      }
      
      allEvents = [...allEvents, ...response.data.collection];
      nextPageToken = response.data.pagination ? response.data.pagination.next_page_token : null;
      
      console.log(`Retrieved ${response.data.collection.length} events, total: ${allEvents.length}`);
      
    } while (nextPageToken);
    
    console.log(`Found ${allEvents.length} total events from Calendly API`);
    
    // Find missing events
    const missingEvents = allEvents.filter(event => {
      const eventId = event.uri.split('/').pop();
      return !existingIds.includes(eventId);
    });
    
    console.log(`Found ${missingEvents.length} missing events to import`);
    
    // Import missing events
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
        const duration = Math.floor(
          (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000
        );
        
        // Check if columns are spelled with underscores or camelCase
        const tableInfo = await db.execute(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name='meetings'
        `);
        
        const columns = [];
        if (Array.isArray(tableInfo)) {
          for (const row of tableInfo) {
            if (row && row.column_name) {
              columns.push(row.column_name);
            }
          }
        }
        
        console.log('Meeting table columns:', columns);
        
        // Based on columns, build the correct insert query
        let query;
        let params;
        
        if (columns.includes('calendly_event_id')) {
          // Snake case columns
          query = `
            INSERT INTO meetings 
            (calendly_event_id, type, title, start_time, end_time, duration, 
             status, booked_at, assigned_to, contact_id, 
             invitee_email, invitee_name, source, sequence_number, meeting_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          `;
        } else {
          // Camel case columns
          query = `
            INSERT INTO meetings 
            (calendlyEventId, type, title, startTime, endTime, duration, 
             status, bookedAt, assignedTo, contactId, 
             inviteeEmail, inviteeName, source, sequenceNumber, meetingType)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          `;
        }
        
        params = [
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
        ];
        
        await db.execute(query, params);
        
        console.log(`Successfully imported event: ${eventId}`);
        successCount++;
      } catch (error) {
        console.error(`Error importing event:`, error);
        errorCount++;
      }
    }
    
    // Clear dashboard cache to refresh data
    await db.execute(`DELETE FROM cache WHERE key LIKE '%dashboard%'`);
    console.log('Dashboard cache cleared');
    
    return res.json({
      success: true,
      message: `Calendly sync completed successfully`,
      stats: {
        total_events: allEvents.length,
        existing_events: existingIds.length,
        missing_events: missingEvents.length,
        imported_events: successCount,
        failed_events: errorCount
      }
    });
    
  } catch (error) {
    console.error('Error syncing Calendly:', error);
    return res.status(500).json({ error: 'Failed to sync Calendly events' });
  }
});

/**
 * Special endpoint to sync just the most recent Calendly events (last 7 days)
 * GET /api/sync/recent-calendly
 */
router.get('/recent-calendly', async (req, res) => {
  try {
    console.log('Starting recent Calendly sync...');
    
    // Check for API key
    if (!process.env.CALENDLY_API_KEY) {
      return res.status(400).json({ error: 'CALENDLY_API_KEY not found in environment variables' });
    }
    
    // Set up Calendly API client
    const calendlyClient = axios.create({
      baseURL: 'https://api.calendly.com',
      headers: {
        'Authorization': `Bearer ${process.env.CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Calculate date range for last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    console.log(`Fetching Calendly events from ${sevenDaysAgo.toISOString()} to ${now.toISOString()}`);
    
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
    
    // Get a default contact for fallback
    const defaultContactResult = await db.execute(
      `SELECT id, name FROM contacts ORDER BY id DESC LIMIT 1`
    );
    
    const defaultContact = {
      id: defaultContactResult.length > 0 ? defaultContactResult[0].id : 1,
      name: defaultContactResult.length > 0 ? defaultContactResult[0].name : 'Default Contact'
    };
    
    // Get recent Calendly events
    const response = await calendlyClient.get('/scheduled_events', {
      params: {
        organization: 'https://api.calendly.com/organizations/54858790-a2e4-4696-9d19-7c6dc22ef508',
        count: 100,
        min_start_time: sevenDaysAgo.toISOString(),
        max_start_time: now.toISOString()
      }
    });
    
    if (!response.data || !response.data.collection) {
      return res.status(500).json({ error: 'Invalid response from Calendly API' });
    }
    
    const events = response.data.collection;
    console.log(`Found ${events.length} events in the last 7 days from Calendly API`);
    
    // Find missing events
    const missingEvents = events.filter(event => {
      const eventId = event.uri.split('/').pop();
      return !existingIds.includes(eventId);
    });
    
    console.log(`Found ${missingEvents.length} missing events to import`);
    
    // Import missing events
    let successCount = 0;
    let errorCount = 0;
    
    // Check if columns are spelled with underscores or camelCase
    const tableInfo = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='meetings'
    `);
    
    const columns = [];
    if (Array.isArray(tableInfo)) {
      for (const row of tableInfo) {
        if (row && row.column_name) {
          columns.push(row.column_name);
        }
      }
    }
    
    const useCamelCase = !columns.includes('calendly_event_id');
    
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
          }
        }
        
        // Calculate duration in minutes
        const duration = Math.floor(
          (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000
        );
        
        // Insert using the correct column names
        let query;
        
        if (useCamelCase) {
          query = `
            INSERT INTO meetings 
            (calendlyEventId, type, title, startTime, endTime, duration, 
             status, bookedAt, assignedTo, contactId, 
             inviteeEmail, inviteeName, source, sequenceNumber, meetingType)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          `;
        } else {
          query = `
            INSERT INTO meetings 
            (calendly_event_id, type, title, start_time, end_time, duration, 
             status, booked_at, assigned_to, contact_id, 
             invitee_email, invitee_name, source, sequence_number, meeting_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          `;
        }
        
        const params = [
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
        ];
        
        await db.execute(query, params);
        
        successCount++;
      } catch (error) {
        console.error(`Error importing event:`, error);
        errorCount++;
      }
    }
    
    // Clear dashboard cache to refresh data
    await db.execute(`DELETE FROM cache WHERE key LIKE '%dashboard%'`);
    
    return res.json({
      success: true,
      message: `Recent Calendly sync completed successfully`,
      stats: {
        recent_events_found: events.length,
        missing_events: missingEvents.length,
        imported_events: successCount,
        failed_events: errorCount
      }
    });
    
  } catch (error) {
    console.error('Error syncing recent Calendly events:', error);
    return res.status(500).json({ error: 'Failed to sync recent Calendly events' });
  }
});

/**
 * Special endpoint to fix Calendly data for dashboard
 * GET /api/sync/fix-calendly-data
 */
router.get('/fix-calendly-data', async (req, res) => {
  try {
    console.log('Starting Calendly dashboard fix...');
    
    // Check for API key
    if (!process.env.CALENDLY_API_KEY) {
      return res.status(400).json({ error: 'CALENDLY_API_KEY not found in environment variables' });
    }
    
    // Set up Calendly API client
    const calendlyClient = axios.create({
      baseURL: 'https://api.calendly.com',
      headers: {
        'Authorization': `Bearer ${process.env.CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Calculate date range for last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log(`Fetching Calendly events from ${thirtyDaysAgo.toISOString()} to ${now.toISOString()}`);
    
    // Check if columns are spelled with underscores or camelCase
    const tableInfo = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='meetings'
    `);
    
    const columns = [];
    if (Array.isArray(tableInfo)) {
      for (const row of tableInfo) {
        if (row && row.column_name) {
          columns.push(row.column_name);
        }
      }
    }
    
    console.log('Meeting table columns:', columns);
    
    // Determine column name format
    const calendlyIdColumn = columns.includes('calendly_event_id') 
      ? 'calendly_event_id' 
      : 'calendlyEventId';
    
    const startTimeColumn = columns.includes('start_time') 
      ? 'start_time' 
      : 'startTime';
    
    // Get existing Calendly events
    const existingEvents = await db.execute(
      `SELECT ${calendlyIdColumn} FROM meetings WHERE ${calendlyIdColumn} IS NOT NULL`
    );
    
    // Extract IDs into array
    const existingIds = [];
    if (Array.isArray(existingEvents)) {
      for (const row of existingEvents) {
        if (row && row[calendlyIdColumn]) {
          existingIds.push(row[calendlyIdColumn]);
        }
      }
    }
    
    console.log(`Found ${existingIds.length} existing Calendly events in database`);
    
    // Get a default contact for fallback
    const defaultContactResult = await db.execute(
      `SELECT id, name FROM contacts ORDER BY id DESC LIMIT 1`
    );
    
    const defaultContact = {
      id: defaultContactResult.length > 0 ? defaultContactResult[0].id : 1,
      name: defaultContactResult.length > 0 ? defaultContactResult[0].name : 'Default Contact'
    };
    
    console.log(`Using ${defaultContact.name} (ID: ${defaultContact.id}) as fallback contact if needed`);
    
    // Get recent Calendly events (last 30 days)
    const response = await calendlyClient.get('/scheduled_events', {
      params: {
        organization: 'https://api.calendly.com/organizations/54858790-a2e4-4696-9d19-7c6dc22ef508',
        count: 100,
        min_start_time: thirtyDaysAgo.toISOString(),
        max_start_time: now.toISOString()
      }
    });
    
    if (!response.data || !response.data.collection) {
      return res.status(500).json({ error: 'Invalid response from Calendly API' });
    }
    
    const events = response.data.collection;
    console.log(`Found ${events.length} events in the last 30 days from Calendly API`);
    
    // Find missing events
    const missingEvents = events.filter(event => {
      const eventId = event.uri.split('/').pop();
      return !existingIds.includes(eventId);
    });
    
    console.log(`Found ${missingEvents.length} missing events to import`);
    
    // Import missing events
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
        const duration = Math.floor(
          (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000
        );
        
        // Insert using the correct column names based on the database structure
        let query;
        
        if (columns.includes('calendly_event_id')) {
          // Snake case columns
          query = `
            INSERT INTO meetings 
            (calendly_event_id, type, title, start_time, end_time, duration, 
             status, booked_at, assigned_to, contact_id, 
             invitee_email, invitee_name, source, sequence_number, meeting_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          `;
        } else {
          // Camel case columns
          query = `
            INSERT INTO meetings 
            (calendlyEventId, type, title, startTime, endTime, duration, 
             status, bookedAt, assignedTo, contactId, 
             inviteeEmail, inviteeName, source, sequenceNumber, meetingType)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          `;
        }
        
        const params = [
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
        ];
        
        await db.execute(query, params);
        
        console.log(`Successfully imported event: ${eventId}`);
        successCount++;
      } catch (error) {
        console.error(`Error importing event:`, error);
        errorCount++;
      }
    }
    
    // Clear dashboard cache to refresh data
    await db.execute(`DELETE FROM cache WHERE key LIKE '%dashboard%'`);
    console.log('Dashboard cache cleared');
    
    // Count meetings in the last 30 days
    const countResult = await db.execute(
      `SELECT COUNT(*) as count FROM meetings WHERE ${startTimeColumn} >= $1 AND ${startTimeColumn} <= $2`,
      [thirtyDaysAgo, now]
    );
    
    let recentMeetingsCount = 0;
    if (Array.isArray(countResult) && countResult.length > 0 && countResult[0].count) {
      recentMeetingsCount = parseInt(countResult[0].count);
    }
    
    return res.json({
      success: true,
      message: `Calendly dashboard fix completed successfully`,
      stats: {
        total_found: events.length,
        missing_events: missingEvents.length,
        imported_events: successCount,
        failed_events: errorCount,
        meetings_in_last_30_days: recentMeetingsCount
      }
    });
    
  } catch (error) {
    console.error('Error fixing Calendly dashboard:', error);
    return res.status(500).json({ error: 'Failed to fix Calendly dashboard' });
  }
});

export default router;