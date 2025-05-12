import axios from 'axios';
import { storage } from '../storage';
import { InsertContact, InsertActivity, InsertMeeting } from '@shared/schema';

const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY || '';
const CALENDLY_API_URL = 'https://api.calendly.com';

// Configure axios for Calendly API
const calendlyApi = axios.create({
  baseURL: CALENDLY_API_URL,
  headers: {
    'Authorization': `Bearer ${CALENDLY_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Maps Calendly event types to our system's meeting types
const eventTypeMap: Record<string, string> = {
  'Triage Call': 'triage',
  'Solution Call': 'solution',
  'Strategy Call': 'strategy',
  'Follow-Up Call': 'follow-up'
};

// Sync a Calendly event to our system
export async function syncCalendlyEvent(eventUUID: string) {
  try {
    // Fetch event data from Calendly
    const response = await calendlyApi.get(`/scheduled_events/${eventUUID}`);
    const eventData = response.data.resource;
    
    // Fetch invitee data (attendee)
    const inviteeResponse = await calendlyApi.get(`/scheduled_events/${eventUUID}/invitees`);
    const invitees = inviteeResponse.data.collection;
    
    if (invitees.length === 0) {
      console.warn(`No invitees found for Calendly event ${eventUUID}`);
      return null;
    }
    
    const invitee = invitees[0];
    
    // Check if we already have this meeting
    const existingMeeting = await storage.getMeetingByCalendlyEventId(eventUUID);
    
    // Find or create contact
    let contact = await storage.getContactByEmail(invitee.email);
    
    if (!contact) {
      const contactData: InsertContact = {
        name: `${invitee.first_name} ${invitee.last_name}`,
        email: invitee.email,
        phone: invitee.text_reminder_number || '',
        calendlyId: invitee.uri.split('/').pop() || '',
        leadSource: 'calendly',
        status: 'lead',
        assignedTo: eventData.event_memberships?.[0]?.user_uri?.split('/').pop() || ''
      };
      
      contact = await storage.createContact(contactData);
    } else if (!contact.calendlyId) {
      // Update contact with Calendly ID if not set
      await storage.updateContact(contact.id, {
        calendlyId: invitee.uri.split('/').pop() || ''
      });
    }
    
    // Extract event type from name or use default
    const eventTypeName = eventData.name || '';
    const eventType = Object.keys(eventTypeMap).find(key => 
      eventTypeName.toLowerCase().includes(key.toLowerCase())
    ) || 'Triage Call';
    
    // Determine meeting status
    let status = 'scheduled';
    if (eventData.status === 'canceled') {
      status = 'canceled';
    } else if (new Date(eventData.end_time) < new Date()) {
      status = 'completed';
    }
    
    // Create meeting data
    const meetingData: InsertMeeting = {
      contactId: contact.id,
      calendlyEventId: eventUUID,
      type: eventTypeMap[eventType] || 'triage',
      title: eventData.name || `Meeting with ${contact.name}`,
      startTime: new Date(eventData.start_time),
      endTime: new Date(eventData.end_time),
      status,
      assignedTo: eventData.event_memberships?.[0]?.user?.name || '',
      metadata: {
        calendlyData: eventData,
        inviteeData: invitee,
        customQuestions: invitee.questions_and_answers || []
      }
    };
    
    let meeting;
    if (existingMeeting) {
      meeting = await storage.updateMeeting(existingMeeting.id, meetingData);
    } else {
      meeting = await storage.createMeeting(meetingData);
      
      // Create activity for this meeting
      const activityData: InsertActivity = {
        contactId: contact.id,
        type: 'meeting',
        source: 'calendly',
        sourceId: eventUUID,
        title: `${eventType} scheduled`,
        description: `${eventType} scheduled for ${new Date(eventData.start_time).toLocaleString()}`,
        date: new Date(),
        metadata: {
          calendlyEventId: eventUUID,
          meetingId: meeting.id
        }
      };
      
      await storage.createActivity(activityData);
    }
    
    return { contact, meeting };
  } catch (error) {
    console.error('Error syncing Calendly event:', error);
    throw error;
  }
}

// Fetch user from Calendly
export async function fetchCalendlyUser() {
  try {
    const response = await calendlyApi.get('/users/me');
    return response.data.resource;
  } catch (error) {
    console.error('Error fetching Calendly user:', error);
    throw error;
  }
}

// Fetch all events from Calendly
export async function fetchAllEvents(minStartTime?: string, maxStartTime?: string) {
  try {
    const user = await fetchCalendlyUser();
    
    let params: any = {
      user: user.uri,
      count: 100
    };
    
    if (minStartTime) params.min_start_time = minStartTime;
    if (maxStartTime) params.max_start_time = maxStartTime;
    
    let hasMore = true;
    let pageToken = '';
    const events = [];
    
    while (hasMore) {
      if (pageToken) params.page_token = pageToken;
      
      const response = await calendlyApi.get('/scheduled_events', { params });
      events.push(...response.data.collection);
      
      pageToken = response.data.pagination?.next_page_token;
      hasMore = !!pageToken;
    }
    
    return events;
  } catch (error) {
    console.error('Error fetching events from Calendly:', error);
    throw error;
  }
}

// Sync all events from Calendly to our system
export async function syncAllEvents(days = 90) {
  try {
    const minStartTime = new Date();
    minStartTime.setDate(minStartTime.getDate() - days);
    
    const events = await fetchAllEvents(minStartTime.toISOString());
    
    for (const event of events) {
      const eventUUID = event.uri.split('/').pop();
      if (eventUUID) {
        await syncCalendlyEvent(eventUUID);
      }
    }
    
    return { success: true, count: events.length };
  } catch (error) {
    console.error('Error syncing all events from Calendly:', error);
    throw error;
  }
}

export default {
  syncCalendlyEvent,
  fetchCalendlyUser,
  fetchAllEvents,
  syncAllEvents
};
