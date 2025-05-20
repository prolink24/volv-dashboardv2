/**
 * Fix Calendly Dashboard
 * 
 * This script directly imports Calendly events for the dashboard
 * using SQL commands to bypass any API issues.
 */

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');
const { format } = require('date-fns');

// Set up PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Set up Calendly API client
const calendlyClient = axios.create({
  baseURL: 'https://api.calendly.com',
  headers: {
    'Authorization': `Bearer ${process.env.CALENDLY_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

async function fixCalendlyDashboard() {
  console.log('Starting Calendly dashboard fix script...');
  
  try {
    // Calculate date range for last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log(`Fetching Calendly events from ${thirtyDaysAgo.toISOString()} to ${now.toISOString()}`);
    
    // Get all existing Calendly event IDs from database
    const existingEventsResult = await pool.query(`
      SELECT calendly_event_id FROM meetings WHERE calendly_event_id IS NOT NULL
    `);
    
    const existingEventIds = existingEventsResult.rows.map(row => row.calendly_event_id);
    console.log(`Found ${existingEventIds.length} existing Calendly events in database`);
    
    // Fetch recent Calendly events
    const response = await calendlyClient.get('/scheduled_events', {
      params: {
        organization: 'https://api.calendly.com/organizations/54858790-a2e4-4696-9d19-7c6dc22ef508',
        count: 100,
        min_start_time: thirtyDaysAgo.toISOString(),
        max_start_time: now.toISOString()
      }
    });
    
    const events = response.data.collection;
    console.log(`Found ${events.length} events in the last 30 days from Calendly API`);
    
    // Find missing events
    const missingEvents = events.filter(event => {
      const eventId = event.uri.split('/').pop();
      return !existingEventIds.includes(eventId);
    });
    
    console.log(`Found ${missingEvents.length} missing events to import`);
    
    // Get a default contact to use as fallback
    const defaultContactResult = await pool.query(`
      SELECT id, name FROM contacts ORDER BY id DESC LIMIT 1
    `);
    
    const defaultContact = {
      id: defaultContactResult.rows[0]?.id || 1,
      name: defaultContactResult.rows[0]?.name || 'Default Contact'
    };
    
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
          const contactByEmailResult = await pool.query(
            `SELECT id, name FROM contacts WHERE email = $1 LIMIT 1`,
            [invitees[0].email]
          );
          
          if (contactByEmailResult.rows.length > 0) {
            contactId = contactByEmailResult.rows[0].id;
            contactFound = true;
            console.log(`Matched contact by email: ${contactByEmailResult.rows[0].name} (ID: ${contactId})`);
          }
        }
        
        // If no match by email, try by name
        if (!contactFound && invitees.length > 0 && invitees[0].name) {
          const namePattern = `%${invitees[0].name}%`;
          
          const contactByNameResult = await pool.query(
            `SELECT id, name FROM contacts WHERE name ILIKE $1 LIMIT 1`,
            [namePattern]
          );
          
          if (contactByNameResult.rows.length > 0) {
            contactId = contactByNameResult.rows[0].id;
            contactFound = true;
            console.log(`Matched contact by name: ${contactByNameResult.rows[0].name} (ID: ${contactId})`);
          }
        }
        
        if (!contactFound) {
          console.log(`No matching contact found for event ${eventId}, using default: ${defaultContact.name} (ID: ${defaultContact.id})`);
        }
        
        // Calculate duration in minutes
        const duration = Math.floor(
          (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000
        );
        
        // Insert meeting into database
        await pool.query(`
          INSERT INTO meetings (
            calendly_event_id, type, title, start_time, end_time, duration, 
            status, booked_at, assigned_to, contact_id, 
            invitee_email, invitee_name, source, sequence_number, meeting_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
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
        ]);
        
        console.log(`Successfully imported event: ${eventId}`);
        successCount++;
      } catch (error) {
        console.error(`Error importing event:`, error.message);
        errorCount++;
      }
    }
    
    // Clear dashboard cache
    await pool.query(`DELETE FROM cache WHERE key LIKE '%dashboard%'`);
    console.log('Dashboard cache cleared');
    
    // Count meetings in the last 30 days
    const countResult = await pool.query(`
      SELECT COUNT(*) as count FROM meetings 
      WHERE start_time >= $1 AND start_time <= $2
    `, [thirtyDaysAgo, now]);
    
    const recentMeetingsCount = parseInt(countResult.rows[0].count);
    
    console.log(`
Fix completed:
- Found ${events.length} total events in Calendly for last 30 days
- Found ${missingEvents.length} missing events not in database
- Successfully imported ${successCount} new events
- Failed to import ${errorCount} events
- Total meetings in last 30 days: ${recentMeetingsCount}
    `);
    
  } catch (error) {
    console.error('Error fixing Calendly dashboard:', error);
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Run the fix script
fixCalendlyDashboard().catch(console.error);