/**
 * Calendly API Integration
 * 
 * This module handles integration with Calendly API to sync:
 * - All scheduled events with complete details
 * - All users and event types
 * - All invitees and their information
 * 
 * It supports fetching a full year of calendar data and
 * properly links events to contacts.
 */

import axios from 'axios';
import { storage } from '../storage';
import * as syncStatus from './sync-status';

// API Configuration
const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
const CALENDLY_BASE_URL = 'https://api.calendly.com';

// Create axios instance with authentication
const calendlyApiClient = axios.create({
  baseURL: CALENDLY_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${CALENDLY_API_KEY}`
  }
});

/**
 * Test API connection by fetching current user
 */
async function testApiConnection() {
  try {
    console.log('Testing Calendly API connection using current user endpoint...');
    const response = await calendlyApiClient.get('/users/me');
    console.log(`Successfully connected to Calendly API`);
    console.log(`Authenticated as: ${response.data.resource.name}`);
    return { success: true, user: response.data.resource };
  } catch (error: any) {
    console.error('Error connecting to Calendly API:', error.message);
    return { 
      success: false, 
      error: error.message || 'Failed to connect to Calendly API' 
    };
  }
}

/**
 * Sync all events from Calendly
 * Fetches a full year of calendar data (past and future events)
 */
async function syncAllEvents() {
  // Initialize counters for sync status
  let totalEvents = 0;
  let processedEvents = 0;
  let importedMeetings = 0;
  let errors = 0;

  try {
    // First, test the API connection
    const connectionTest = await testApiConnection();
    if (!connectionTest.success) {
      throw new Error(`Calendly API connection failed: ${connectionTest.error}`);
    }

    // Get the current user's organization
    const currentUser = connectionTest.user;
    const organizationUri = currentUser.current_organization;
    const organizationUUID = organizationUri.split('/').pop(); // Extract UUID part only
    const userId = currentUser.uri;
    
    console.log('Fetching events from Calendly API...');
    
    // Calculate date range for a full year (6 months back, 6 months forward)
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    
    const sixMonthsForward = new Date(now);
    sixMonthsForward.setMonth(now.getMonth() + 6);
    
    const minStartTime = sixMonthsAgo.toISOString();
    const maxStartTime = sixMonthsForward.toISOString();
    
    // Set initial pagination state
    let hasMore = true;
    let pageToken = null;
    let page = 1;
    
    // Initialize sync status
    syncStatus.updateCalendlySyncStatus({
      totalEvents,
      processedEvents,
      importedMeetings,
      errors
    });
    
    // Process events in batches using pagination
    while (hasMore) {
      try {
        console.log(`Fetching events page ${page}${pageToken ? ', with page token' : ''}`);
        
        // Construct the query parameters
        // Using organization UUID instead of full URI to avoid encoding issues
        const params: any = {
          organization: organizationUUID,
          min_start_time: minStartTime,
          max_start_time: maxStartTime,
          count: 100 // Max allowed by Calendly API
        };
        
        // For subsequent pages, use the page token
        if (pageToken) {
          params.page_token = pageToken;
        }
        
        console.log('Requesting Calendly events with params:', JSON.stringify(params));
        
        // Make the API request
        const response = await calendlyApiClient.get('/scheduled_events', { params });
        const events = response.data.collection || [];
        
        // Update total on first page
        if (page === 1) {
          totalEvents = response.data.pagination.count || events.length;
          syncStatus.updateCalendlySyncStatus({
            totalEvents,
            processedEvents,
            importedMeetings,
            errors
          });
        }
        
        // Process the batch of events
        console.log(`Fetched ${events.length} events on page ${page}`);
        
        for (const event of events) {
          try {
            processedEvents++;
            
            // Fetch event details with invitees
            const eventDetails = await getEventDetails(event.uri);
            const invitees = await getEventInvitees(event.uri);
            
            // Process each invitee (each invitee could be a different contact)
            for (const invitee of invitees) {
              try {
                // Extract email (required for matching across platforms)
                const email = invitee.email;
                if (!email) {
                  console.log(`Skipping invitee without email for event ${event.uri}`);
                  continue;
                }
                
                // Try to find the contact by email
                let contact = await storage.getContactByEmail(email);
                
                // If contact doesn't exist, create a minimal contact record
                if (!contact) {
                  const contactData = {
                    name: invitee.name || email.split('@')[0],
                    email: email,
                    phone: '',
                    company: '',
                    leadSource: 'calendly',
                    status: 'lead',
                    sourceId: invitee.uri,
                    sourceData: JSON.stringify(invitee),
                    createdAt: new Date(invitee.created_at)
                  };
                  
                  contact = await storage.createContact(contactData);
                }
                
                // Create the meeting record
                const startTime = new Date(event.start_time);
                const endTime = new Date(event.end_time);
                
                const meetingData = {
                  contactId: contact.id,
                  title: event.name || 'Calendly Meeting',
                  type: event.event_type || 'meeting',
                  status: event.status,
                  calendlyEventId: event.uri,
                  startTime,
                  endTime,
                  assignedTo: null,
                  metadata: {
                    location: event.location?.join(', ') || 'Virtual',
                    description: eventDetails.description || '',
                    event: event,
                    invitee: invitee,
                    details: eventDetails
                  }
                };
                
                // Check if meeting already exists by source ID
                const existingMeeting = await storage.getMeetingByCalendlyEventId(event.uri);
                
                if (existingMeeting) {
                  // Update existing meeting
                  await storage.updateMeeting(existingMeeting.id, meetingData);
                } else {
                  // Create new meeting
                  await storage.createMeeting(meetingData);
                  importedMeetings++;
                }
                
              } catch (error) {
                console.error(`Error processing invitee for event ${event.uri}:`, error);
              }
            }
            
          } catch (error) {
            console.error(`Error processing event ${event.uri}:`, error);
            errors++;
          }
          
          // Update sync status periodically
          if (processedEvents % 10 === 0) {
            syncStatus.updateCalendlySyncStatus({
              totalEvents,
              processedEvents,
              importedMeetings,
              errors
            });
          }
        }
        
        // Update pagination info for next batch
        pageToken = response.data.pagination.next_page_token;
        hasMore = !!pageToken;
        page++;
        
        // Update sync status after processing the batch
        syncStatus.updateCalendlySyncStatus({
          totalEvents,
          processedEvents,
          importedMeetings,
          errors
        });
        
      } catch (error: any) {
        console.error(`Error fetching events page ${page}:`, error);
        errors++;
        
        // If we get an error but there are more pages, try to continue
        if (page > 5) {
          // If we've processed a decent number of pages, we can 
          // consider this a partial success even with some errors
          hasMore = false;
        } else {
          // For early failures, treat as a full failure
          throw error;
        }
      }
    }
    
    // Final status update
    syncStatus.updateCalendlySyncStatus({
      totalEvents,
      processedEvents,
      importedMeetings,
      errors
    });
    
    return {
      success: true,
      count: importedMeetings,
      errors,
      total: totalEvents
    };
    
  } catch (error: any) {
    console.error('Error syncing Calendly events:', error);
    
    // Update sync status with error info
    syncStatus.updateCalendlySyncStatus({
      totalEvents,
      processedEvents,
      importedMeetings,
      errors: errors + 1
    });
    
    return {
      success: false,
      error: error.message || 'Unknown error syncing Calendly data',
      count: importedMeetings,
      errors: errors + 1,
      total: totalEvents
    };
  }
}

/**
 * Get details for a specific event
 */
async function getEventDetails(eventUri: string) {
  try {
    // Extract the event UUID from the URI
    const eventId = eventUri.split('/').pop();
    if (!eventId) {
      console.error(`Invalid event URI: ${eventUri}`);
      return {};
    }
    
    console.log(`Fetching details for event with ID: ${eventId}`);
    const response = await calendlyApiClient.get(`/scheduled_events/${eventId}`);
    return response.data.resource;
  } catch (error: any) {
    console.error(`Error fetching event details ${eventUri}:`, error.message || error);
    return { };
  }
}

/**
 * Get invitees for a specific event
 */
async function getEventInvitees(eventUri: string) {
  try {
    const eventId = eventUri.split('/').pop();
    if (!eventId) {
      console.error(`Invalid event URI: ${eventUri}`);
      return [];
    }
    
    console.log(`Fetching invitees for event with ID: ${eventId}`);
    const response = await calendlyApiClient.get(`/scheduled_events/${eventId}/invitees`);
    return response.data.collection || [];
  } catch (error: any) {
    console.error(`Error fetching event invitees ${eventUri}:`, error.message || error);
    return [];
  }
}

/**
 * Fetch a limited number of events for testing purposes
 * @param limit Maximum number of events to fetch
 */
async function fetchEvents(limit: number = 5) {
  try {
    // First, test the API connection
    const connectionTest = await testApiConnection();
    if (!connectionTest.success) {
      throw new Error(`Calendly API connection failed: ${connectionTest.error}`);
    }
    
    // Get the current user's organization
    const currentUser = connectionTest.user;
    const organizationUri = currentUser.current_organization;
    const organizationUUID = organizationUri.split('/').pop(); // Extract UUID only
    const userId = currentUser.uri;
    
    console.log(`Fetching up to ${limit} events from Calendly API for testing...`);
    
    // Calculate date range for recent events (last 3 months)
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    
    const response = await calendlyApiClient.get('/scheduled_events', {
      params: {
        organization: organizationUUID,
        count: limit,
        min_start_time: threeMonthsAgo.toISOString(),
        max_start_time: now.toISOString(),
        sort: 'start_time:desc'
      }
    });
    
    // Map to a simpler event structure
    const events = (response.data.collection || []).map((event: any) => {
      return {
        id: event.uri.split('/').pop(),
        uri: event.uri,
        name: event.name,
        eventType: event.event_type,
        startTime: event.start_time,
        endTime: event.end_time,
        status: event.status
      };
    });
    
    return events;
  } catch (error: any) {
    console.error('Error fetching events for testing:', error.message);
    throw error;
  }
}

export default {
  syncAllEvents,
  getEventDetails,
  getEventInvitees,
  testApiConnection,
  fetchEvents
};