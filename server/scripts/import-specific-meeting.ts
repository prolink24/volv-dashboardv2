/**
 * Import Specific Calendly Meeting
 * 
 * This script imports a specific Calendly meeting that we confirmed exists in the API
 * but isn't showing up in our database. It targets the meeting for jahugmarketing@gmail.com
 * that was scheduled with Mazin Gazar.
 */

import axios from 'axios';
import { db } from '../db';
import { meetings, contacts } from '@shared/schema';
import { eq } from 'drizzle-orm';

// API Configuration
const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
const CALENDLY_BASE_URL = 'https://api.calendly.com';

// Create axios instance with authentication
const calendlyClient = axios.create({
  baseURL: CALENDLY_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${CALENDLY_API_KEY}`
  }
});

// Constants for the specific meeting we want to import
const EVENT_ID = 'dc5c864a-fdd8-411b-ad48-b8ac1c531f85';
const CONTACT_EMAIL = 'jahugmarketing@gmail.com';

/**
 * Main function to import the specific meeting
 */
async function importSpecificMeeting() {
  console.log(`Starting targeted import for Calendly meeting ID: ${EVENT_ID}`);
  console.log(`Associated contact email: ${CONTACT_EMAIL}`);
  
  try {
    // 1. Check if the contact exists
    console.log('Checking if contact exists...');
    const normalizedEmail = CONTACT_EMAIL.toLowerCase().trim();
    
    const contact = await db.query.contacts.findFirst({
      where: eq(contacts.email, normalizedEmail)
    });
    
    if (!contact) {
      throw new Error(`Contact with email ${CONTACT_EMAIL} does not exist in the database`);
    }
    
    console.log(`Found contact: ${contact.name} (ID: ${contact.id})`);
    
    // 2. Check if meeting already exists
    console.log('Checking if meeting already exists...');
    const eventUri = `https://api.calendly.com/scheduled_events/${EVENT_ID}`;
    
    const existingMeeting = await db.query.meetings.findFirst({
      where: eq(meetings.calendlyEventId, eventUri)
    });
    
    if (existingMeeting) {
      console.log(`Meeting already exists with ID: ${existingMeeting.id}`);
      return;
    }
    
    // 3. Fetch event details from Calendly API
    console.log('Fetching event details from Calendly API...');
    const eventResponse = await calendlyClient.get(`/scheduled_events/${EVENT_ID}`);
    const event = eventResponse.data.resource;
    
    console.log('Event details:', {
      name: event.name,
      startTime: event.start_time,
      endTime: event.end_time,
      status: event.status
    });
    
    // 4. Fetch invitee details
    console.log('Fetching invitee details...');
    const inviteesResponse = await calendlyClient.get(`/scheduled_events/${EVENT_ID}/invitees`);
    const invitees = inviteesResponse.data.collection;
    
    if (!invitees || invitees.length === 0) {
      throw new Error('No invitees found for this event');
    }
    
    const invitee = invitees[0];
    console.log('Invitee details:', {
      name: invitee.name,
      email: invitee.email,
      timezone: invitee.timezone
    });
    
    // 5. Create meeting record
    console.log('Creating meeting record...');
    
    // Extract owner info
    let scheduledBy = 'Unknown';
    if (event.event_memberships && event.event_memberships.length > 0) {
      scheduledBy = event.event_memberships[0].user_name || 'Unknown';
    }
    
    const meetingData = {
      contactId: contact.id,
      title: event.name || 'Calendly Meeting',
      type: 'calendly_meeting',
      status: event.status,
      calendlyEventId: eventUri,
      startTime: new Date(event.start_time),
      endTime: new Date(event.end_time),
      inviteeEmail: normalizedEmail,
      inviteeName: invitee.name,
      metadata: {
        location: typeof event.location === 'object' ? 
                 event.location.location || 'Virtual' : 
                 event.location || 'Virtual',
        description: '',
        invitee: {
          name: invitee.name,
          email: invitee.email,
          timezone: invitee.timezone,
        },
        event: {
          name: event.name,
          status: event.status,
          event_type: event.event_type,
          start_time: event.start_time,
          end_time: event.end_time,
        },
        attribution: {
          platform: 'calendly',
          eventType: event.name ? event.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'meeting',
          scheduledBy: scheduledBy,
          contactId: contact.id,
          timestamp: new Date().toISOString()
        }
      }
    };
    
    const [newMeeting] = await db.insert(meetings).values(meetingData).returning();
    
    console.log('Successfully created meeting record:', {
      id: newMeeting.id,
      title: newMeeting.title,
      startTime: newMeeting.startTime,
      inviteeEmail: newMeeting.inviteeEmail
    });
    
    console.log('Meeting import successful');
    
  } catch (error) {
    console.error('Error during targeted meeting import:', error);
  }
}

// Execute the function
importSpecificMeeting()
  .then(() => {
    console.log('Script execution completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error executing script:', error);
    process.exit(1);
  });