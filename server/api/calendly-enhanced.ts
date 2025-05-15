/**
 * Enhanced Calendly API Integration
 * 
 * This module provides optimized Calendly API integration with:
 * - Batch processing to handle large datasets
 * - Resume capability for interrupted syncs
 * - Timeout detection to avoid process termination
 * - Comprehensive meeting data extraction
 */

import axios from 'axios';
import { storage } from '../storage';
import * as syncStatus from './sync-status';
import contactMatcher from '../services/contact-matcher';
import calendlyApi from './calendly';

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
 * Process a single Calendly event
 * Extracts all details and invitees, creates/updates contacts and meetings
 */
async function processCalendlyEvent(event, userId, eventDetails = null) {
  try {
    // Get event details if not provided
    const details = eventDetails || await calendlyApi.getEventDetails(event.uri);
    // Get all invitees for this event
    const invitees = await calendlyApi.getEventInvitees(event.uri);
    
    console.log(`Event ${event.name || 'Unnamed'} has ${invitees.length} invitees`);
    
    let eventImportedMeetings = 0;
    
    // Process each invitee
    for (const invitee of invitees) {
      const email = invitee.email;
      if (!email) {
        console.log(`Skipping invitee without email for event ${event.uri}`);
        continue;
      }
      
      // Prepare contact data from Calendly invitee
      const contactData = {
        name: invitee.name || email.split('@')[0],
        email: email,
        phone: calendlyApi.extractPhoneFromInvitee(invitee),
        company: calendlyApi.extractCompanyFromInvitee(invitee),
        leadSource: 'calendly',
        status: 'lead',
        sourceId: invitee.uri,
        sourceData: invitee,
        createdAt: new Date(invitee.created_at),
        // Add attribution metadata
        metadata: {
          calendly: {
            eventUri: event.uri,
            eventType: event.event_type || 'meeting',
            importedAt: new Date().toISOString()
          }
        }
      };
      
      // Use advanced contact matcher to find or create the contact
      let contact;
      let contactCreated = false;
      try {
        const result = await contactMatcher.createOrUpdateContact(
          contactData, 
          true, // Update existing contacts
          contactMatcher.MatchConfidence.MEDIUM // Use medium confidence for better matching rates
        );
        
        contact = result.contact;
        contactCreated = result.created;
        
        if (result.created) {
          console.log(`Created new contact for Calendly invitee: ${contact.name} (${contact.email})`);
        } else {
          console.log(`Matched Calendly invitee to existing contact: ${contact.name} (${contact.email}) - ${result.reason}`);
        }
      } catch (error) {
        console.error(`Error matching contact for Calendly invitee: ${email}`, error);
        // Fallback to simple lookup by email
        contact = await storage.getContactByEmail(email);
        if (!contact) {
          // Create minimal contact as fallback
          contact = await storage.createContact(contactData);
          contactCreated = true;
          console.log(`Created new contact for Calendly invitee (fallback): ${contactData.name} (${contactData.email})`);
        }
      }
      
      // Create a meeting record with comprehensive data for attribution
      const meetingData = {
        contactId: contact.id,
        title: event.name || 'Calendly Meeting',
        type: event.event_type || 'meeting',
        status: event.status,
        calendlyEventId: event.uri,
        startTime: new Date(event.start_time),
        endTime: new Date(event.end_time),
        assignedTo: null,
        // Include all event and invitee data for complete attribution
        metadata: {
          location: typeof event.location === 'string' ? event.location : 
                   Array.isArray(event.location) ? event.location.join(', ') : 'Virtual',
          description: details.description || '',
          invitee: invitee,
          event: event,
          eventDetails: details,
          attribution: {
            platform: 'calendly',
            eventType: event.event_type,
            scheduledBy: invitee.name,
            contactId: contact.id,
            timestamp: new Date().toISOString()
          }
        }
      };
      
      // Check if meeting already exists
      const existingMeeting = await storage.getMeetingByCalendlyEventId(event.uri);
      
      if (existingMeeting) {
        await storage.updateMeeting(existingMeeting.id, meetingData);
        console.log(`Updated existing meeting for contact ${contact.name}`);
      } else {
        await storage.createMeeting(meetingData);
        eventImportedMeetings++;
        console.log(`Created new meeting for contact ${contact.name}`);
      }
      
      // Update contact with activity info to ensure proper attribution
      try {
        // Ensure the contact record reflects this activity
        const contactUpdateData = {
          lastActivityDate: new Date(),
          lastActivityType: 'calendly_meeting',
          // Append meeting info to notes if needed
          notes: contact.notes ? 
            `${contact.notes}\n\nCalendly Meeting: ${event.name} on ${new Date(event.start_time).toLocaleDateString()}` : 
            `Calendly Meeting: ${event.name} on ${new Date(event.start_time).toLocaleDateString()}`
        };
        
        await storage.updateContact(contact.id, contactUpdateData);
        console.log(`Updated contact ${contact.name} with meeting activity`);
      } catch (err) {
        console.error(`Error updating contact with meeting activity: ${err.message}`);
      }
    }
    
    return {
      success: true, 
      importedMeetings: eventImportedMeetings,
      inviteeCount: invitees.length
    };
  } catch (error) {
    console.error(`Error processing Calendly event ${event.uri}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error processing event',
      importedMeetings: 0,
      inviteeCount: 0
    };
  }
}

/**
 * Process a batch of Calendly events
 * This allows us to break the work into smaller chunks to avoid timeouts
 */
async function processEventBatch(events, userId, batchNumber, batchSize) {
  console.log(`Processing batch ${batchNumber} with ${events.length} events...`);
  
  let batchImportedMeetings = 0;
  let batchErrors = 0;
  
  // Process each event in the batch
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`Processing event ${i+1}/${events.length} in batch ${batchNumber}: ${event.uri}`);
    
    // Process the event
    const result = await processCalendlyEvent(event, userId);
    
    if (result.success) {
      batchImportedMeetings += result.importedMeetings;
    } else {
      batchErrors++;
    }
    
    // Sleep briefly between events to avoid API rate limits
    if (i < events.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`Batch ${batchNumber} completed: Imported ${batchImportedMeetings} meetings, Errors: ${batchErrors}`);
  
  return {
    importedMeetings: batchImportedMeetings,
    errors: batchErrors
  };
}

/**
 * Get the next batch of events using pagination
 */
async function getNextEventBatch(userId, minStartTime, maxStartTime, pageToken = null, count = 100, options = {}) {
  // Default retry options
  const retryOptions = {
    retryCount: 3,
    retryDelay: 1000,
    ...options
  };
  
  // Helper function to delay execution
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Helper function for the actual API call
  const fetchEvents = async () => {
    const params: any = {
      user: userId,
      min_start_time: minStartTime,
      max_start_time: maxStartTime,
      count: count
    };
    
    if (pageToken) {
      params.page_token = pageToken;
    }
    
    const response = await calendlyApiClient.get('/scheduled_events', { params });
    
    return {
      success: true,
      events: response.data.collection || [],
      pagination: response.data.pagination,
      totalCount: response.data.pagination?.count || 0,
      nextPageToken: response.data.pagination?.next_page_token || null
    };
  };
  
  // Try the request with retries
  let retries = 0;
  let lastError = null;
  
  while (retries <= retryOptions.retryCount) {
    try {
      return await fetchEvents();
    } catch (error) {
      lastError = error;
      
      // If we've reached max retries, break out
      if (retries >= retryOptions.retryCount) {
        break;
      }
      
      // If it's a rate limit error (429), wait longer
      const retryDelay = error.response?.status === 429 
        ? retryOptions.retryDelay * 2 * (retries + 1) // Exponential backoff for rate limits
        : retryOptions.retryDelay * (retries + 1);
        
      console.warn(`API request failed (attempt ${retries + 1}/${retryOptions.retryCount + 1}), retrying in ${retryDelay/1000}s...`);
      
      // Wait before retrying
      await delay(retryDelay);
      retries++;
    }
  }
  
  // If we got here, all retries failed
  console.error('Error fetching event batch after retries:', lastError);
  return {
    success: false,
    events: [],
    error: lastError?.message || 'Unknown error after retries',
    pagination: null,
    nextPageToken: null,
    totalCount: 0
  };
}
}

/**
 * Sync all events from Calendly with optimized batch processing
 * @param options Configuration options for the sync process
 */
async function syncAllEvents(options = {}) {
  // Default options for sync
  const defaultOptions = {
    batchSize: 10,          // How many events to process in one batch (increased from 5)
    resumeFromToken: null,  // Resume from a specific page token
    syncLimit: 0,           // Limit number of events to sync (0 = all)
    timeout: 540000,        // Timeout in ms (9 minutes to allow for clean shutdown)
    retryCount: 3,          // Number of retry attempts for failed requests
    retryDelay: 1000        // Delay between retries in ms
  };
  
  const syncOptions = { ...defaultOptions, ...options };
  
  // Initialize counters for sync status
  let totalEvents = 0;
  let processedEvents = 0;
  let importedMeetings = 0;
  let errors = 0;
  
  // Track start time for timeout detection
  const startTime = Date.now();
  
  // Storage for restart information
  let syncState = {
    nextPageToken: syncOptions.resumeFromToken,
    batchNumber: 0,
    hasMore: true
  };

  try {
    // First, test the API connection
    const connectionTest = await calendlyApi.testApiConnection();
    if (!connectionTest.success) {
      throw new Error(`Calendly API connection failed: ${connectionTest.error}`);
    }

    // Get the current user's organization
    const currentUser = connectionTest.user;
    const organizationUri = currentUser.current_organization;
    const userId = currentUser.uri;
    
    console.log('Fetching events from Calendly API...');
    console.log('Current user organization URI:', organizationUri);
    console.log('Current user ID:', userId);
    
    // Calculate date range for a comprehensive history (2 years back, 1 year forward)
    const now = new Date();
    const twoYearsAgo = new Date(now);
    twoYearsAgo.setFullYear(now.getFullYear() - 2);
    
    const oneYearForward = new Date(now);
    oneYearForward.setFullYear(now.getFullYear() + 1);
    
    const minStartTime = twoYearsAgo.toISOString();
    const maxStartTime = oneYearForward.toISOString();
    
    console.log(`Using date range from ${twoYearsAgo.toDateString()} to ${oneYearForward.toDateString()} for comprehensive meeting data`);
    
    // Initialize sync status
    syncStatus.updateCalendlySyncStatus({
      totalEvents,
      processedEvents,
      importedMeetings,
      errors,
      syncState
    });
    
    // Get the first batch of events (or resume from a token)
    const firstBatch = await getNextEventBatch(
      userId, 
      minStartTime, 
      maxStartTime, 
      syncState.nextPageToken, 
      100
    );
    
    if (!firstBatch.success) {
      throw new Error(`Failed to fetch events: ${firstBatch.error}`);
    }
    
    // Update total events count
    totalEvents = firstBatch.totalCount;
    console.log(`Found ${totalEvents} events for the user`);
    
    // If we received events, process them in batches
    if (firstBatch.events.length > 0) {
      // Break the events into batches
      const eventBatches = [];
      const batchSize = syncOptions.batchSize;
      
      for (let i = 0; i < firstBatch.events.length; i += batchSize) {
        eventBatches.push(firstBatch.events.slice(i, i + batchSize));
      }
      
      console.log(`Split ${firstBatch.events.length} events into ${eventBatches.length} batches of size ${batchSize}`);
      
      // Process each batch
      for (let i = 0; i < eventBatches.length; i++) {
        // Check if we've exceeded the timeout
        if (Date.now() - startTime > syncOptions.timeout) {
          console.log('Sync timeout reached, saving state for future resume');
          // Save state for future resume
          syncState.nextPageToken = firstBatch.nextPageToken;
          syncState.batchNumber = i;
          break;
        }
        
        // Process the batch
        const batchResults = await processEventBatch(
          eventBatches[i],
          userId,
          syncState.batchNumber + i,
          batchSize
        );
        
        // Update counters
        processedEvents += eventBatches[i].length;
        importedMeetings += batchResults.importedMeetings;
        errors += batchResults.errors;
        
        // Update sync status
        syncStatus.updateCalendlySyncStatus({
          totalEvents,
          processedEvents,
          importedMeetings,
          errors,
          syncState: {
            ...syncState,
            batchNumber: syncState.batchNumber + i + 1
          }
        });
      }
      
      // Continue with pagination if there are more events
      syncState.nextPageToken = firstBatch.nextPageToken;
      syncState.hasMore = !!firstBatch.nextPageToken;
      
      // Continue fetching and processing batches until we're done or hit a timeout
      while (syncState.hasMore && syncState.nextPageToken) {
        // Check if we've exceeded the timeout
        if (Date.now() - startTime > syncOptions.timeout) {
          console.log('Sync timeout reached during pagination, saving state for future resume');
          break;
        }
        
        // Get the next batch of events
        const nextBatch = await getNextEventBatch(
          userId,
          minStartTime,
          maxStartTime,
          syncState.nextPageToken,
          100
        );
        
        if (!nextBatch.success) {
          console.error(`Error fetching next batch: ${nextBatch.error}`);
          errors++;
          break;
        }
        
        // Break the events into batches
        const nextEventBatches = [];
        
        for (let i = 0; i < nextBatch.events.length; i += syncOptions.batchSize) {
          nextEventBatches.push(nextBatch.events.slice(i, i + syncOptions.batchSize));
        }
        
        console.log(`Split ${nextBatch.events.length} events into ${nextEventBatches.length} batches of size ${syncOptions.batchSize}`);
        
        // Process each batch
        for (let i = 0; i < nextEventBatches.length; i++) {
          // Check if we've exceeded the timeout
          if (Date.now() - startTime > syncOptions.timeout) {
            console.log('Sync timeout reached during batch processing, saving state for future resume');
            // Update batch number for next resume
            syncState.batchNumber += i;
            break;
          }
          
          // Process the batch
          const batchResults = await processEventBatch(
            nextEventBatches[i],
            userId,
            syncState.batchNumber + i,
            syncOptions.batchSize
          );
          
          // Update counters
          processedEvents += nextEventBatches[i].length;
          importedMeetings += batchResults.importedMeetings;
          errors += batchResults.errors;
          
          // Update sync status
          syncStatus.updateCalendlySyncStatus({
            totalEvents,
            processedEvents,
            importedMeetings,
            errors,
            syncState: {
              ...syncState,
              batchNumber: syncState.batchNumber + i + 1
            }
          });
          
          // Check if we've hit the sync limit
          if (syncOptions.syncLimit > 0 && processedEvents >= syncOptions.syncLimit) {
            console.log(`Reached sync limit of ${syncOptions.syncLimit} events`);
            syncState.hasMore = false;
            break;
          }
        }
        
        // Update pagination token for next batch
        syncState.nextPageToken = nextBatch.nextPageToken;
        syncState.hasMore = !!nextBatch.nextPageToken;
        
        // Reset batch number for the next page
        syncState.batchNumber = 0;
      }
    } else {
      console.log('No events found for user');
    }
    
    // Check if we've finished processing all events
    const isComplete = !syncState.hasMore || !syncState.nextPageToken;
    
    console.log('Calendly events sync completed');
    console.log(`Processed ${processedEvents}/${totalEvents} events`);
    console.log(`Imported ${importedMeetings} meetings`);
    console.log(`Errors: ${errors}`);
    console.log(`Completed: ${isComplete ? 'Yes' : 'No - Can resume with token: ' + syncState.nextPageToken}`);
    
    // Update final sync status
    syncStatus.updateCalendlySyncStatus({
      totalEvents,
      processedEvents,
      importedMeetings,
      errors,
      syncState,
      completed: isComplete
    });
    
    return {
      success: true,
      count: importedMeetings,
      total: totalEvents,
      processed: processedEvents,
      errors,
      completed: isComplete,
      resumeToken: syncState.nextPageToken
    };
  } catch (error) {
    console.error('Error in Calendly sync:', error);
    
    // Update sync status with error
    syncStatus.updateCalendlySyncStatus({
      totalEvents,
      processedEvents,
      importedMeetings,
      errors: errors + 1,
      syncState,
      error: error.message || 'Unknown error during Calendly sync',
      completed: false
    });
    
    return {
      success: false,
      error: error.message || 'Unknown error during Calendly sync',
      count: importedMeetings,
      total: totalEvents,
      processed: processedEvents,
      errors: errors + 1,
      resumeToken: syncState.nextPageToken
    };
  }
}

/**
 * Resume a previously interrupted sync using the saved token
 */
async function resumeSync(resumeToken, options = {}) {
  if (!resumeToken) {
    console.error('No resume token provided, cannot resume sync');
    return {
      success: false,
      error: 'No resume token provided'
    };
  }
  
  console.log(`Resuming Calendly sync from token: ${resumeToken}`);
  
  // Call normal sync with the resume token
  return syncAllEvents({
    ...options,
    resumeFromToken: resumeToken
  });
}

export default {
  syncAllEvents,
  resumeSync,
  processCalendlyEvent,
  processEventBatch,
  getNextEventBatch
};