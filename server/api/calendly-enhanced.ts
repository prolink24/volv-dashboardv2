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
async function processEventBatch(events, userId, batchNumber, batchSize, options = {}) {
  console.log(`Processing batch ${batchNumber} with ${events.length} events...`);
  
  // Default options for processing
  const processingOptions = {
    initialDelay: 100,         // Initial delay between event processing in ms
    maxDelay: 5000,            // Maximum delay between events in ms
    adaptiveDelay: true,       // Increase delay if errors occur
    retryAttempts: 2,          // Number of retry attempts for failed event processing
    ...options
  };
  
  let batchImportedMeetings = 0;
  let batchErrors = 0;
  let consecutiveErrors = 0;
  let currentDelay = processingOptions.initialDelay;
  
  // Helper function to delay execution
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Process each event in the batch
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`Processing event ${i+1}/${events.length} in batch ${batchNumber}: ${event.uri}`);
    
    // Try to process with retries
    let result = null;
    let attempts = 0;
    let success = false;
    
    while (attempts <= processingOptions.retryAttempts && !success) {
      if (attempts > 0) {
        console.log(`Retry attempt ${attempts}/${processingOptions.retryAttempts} for event ${event.uri}`);
        // Wait longer between retries
        await delay(currentDelay * 2);
      }
      
      // Process the event
      result = await processCalendlyEvent(event, userId);
      success = result.success;
      
      attempts++;
    }
    
    if (success) {
      batchImportedMeetings += result.importedMeetings;
      consecutiveErrors = 0;
      
      // If we've had success, gradually reduce the delay (but keep it above initial)
      if (currentDelay > processingOptions.initialDelay && processingOptions.adaptiveDelay) {
        currentDelay = Math.max(processingOptions.initialDelay, currentDelay * 0.8);
      }
    } else {
      batchErrors++;
      consecutiveErrors++;
      
      // If we have consecutive errors and adaptive delay is enabled, increase the delay
      if (consecutiveErrors > 1 && processingOptions.adaptiveDelay) {
        // Increase delay exponentially based on consecutive errors, up to max
        currentDelay = Math.min(
          processingOptions.maxDelay,
          currentDelay * (1 + (0.5 * consecutiveErrors))
        );
        console.warn(`Increasing delay to ${currentDelay}ms after ${consecutiveErrors} consecutive errors`);
      }
    }
    
    // Sleep between events to avoid API rate limits
    if (i < events.length - 1) {
      await delay(currentDelay);
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

/**
 * Sync all events from Calendly with optimized batch processing
 * @param options Configuration options for the sync process
 */
async function syncAllEvents(options = {}) {
  // Default options for sync
  const defaultOptions = {
    batchSize: 10,          // How many events to process in one batch (increased from 5)
    resumeFromToken: null,  // Resume from a specific page token
    resumeFromBatch: 0,     // Resume from a specific batch
    syncLimit: 0,           // Limit number of events to sync (0 = all)
    timeout: 540000,        // Timeout in ms (9 minutes to allow for clean shutdown)
    retryCount: 3,          // Number of retry attempts for failed requests
    retryDelay: 1000,       // Delay between retries in ms
    adaptiveProcessing: true, // Enable adaptive processing speed
    logProgress: true       // Log detailed progress information
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
    batchNumber: syncOptions.resumeFromBatch,
    currentPage: 1,
    hasMore: true,
    allPages: [], // Store all pagination tokens for robust resume
    completedBatches: [] // Track which batches have been completed
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
    
    if (syncOptions.logProgress) {
      console.log(`Starting Calendly sync with date range from ${minStartTime} to ${maxStartTime}`);
      if (syncState.nextPageToken) {
        console.log(`Resuming from page token: ${syncState.nextPageToken.substring(0, 15)}...`);
      }
    }
    
    // Keep track of all events to process, we'll build this list across multiple pages
    let allEvents = [];
    let currentPageToken = syncState.nextPageToken;
    let currentPage = syncState.currentPage;
    let hasMorePages = true;
    
    // Keep fetching pages until we get all the events
    while (hasMorePages) {
      if (syncOptions.logProgress) {
        console.log(`Fetching page ${currentPage} of events${currentPageToken ? ' (with pagination token)' : ''}`);
      }
      
      // Check if we've exceeded the timeout
      if (Date.now() - startTime > syncOptions.timeout * 0.7) { // Use 70% of timeout for fetching
        console.log('Sync timeout threshold reached while fetching pages, saving state for future resume');
        // Save state for future resume
        syncState.nextPageToken = currentPageToken;
        syncState.currentPage = currentPage;
        
        // Update sync status before exiting
        syncStatus.updateCalendlySyncStatus({
          totalEvents,
          processedEvents,
          importedMeetings,
          errors,
          syncState
        });
        
        return {
          success: true,
          count: processedEvents,
          total: totalEvents,
          processed: processedEvents,
          errors,
          resumeToken: currentPageToken,
          completed: false,
          message: 'Sync timeout reached while fetching pages, resumable'
        };
      }
      
      // Get this page of events
      const eventBatch = await getNextEventBatch(
        userId, 
        minStartTime, 
        maxStartTime, 
        currentPageToken, 
        100,
        {
          retryCount: syncOptions.retryCount,
          retryDelay: syncOptions.retryDelay
        }
      );
      
      if (!eventBatch.success) {
        console.error(`Failed to fetch events page ${currentPage}: ${eventBatch.error}`);
        syncStatus.updateCalendlySyncStatus({
          totalEvents,
          processedEvents,
          importedMeetings,
          errors: errors + 1,
          syncState,
          error: `Failed to fetch events: ${eventBatch.error}`
        });
        
        return {
          success: false,
          error: `Failed to fetch events: ${eventBatch.error}`,
          count: processedEvents,
          total: totalEvents,
          processed: processedEvents,
          errors: errors + 1,
          resumeToken: currentPageToken
        };
      }
      
      // If this is the first page, update the total events count
      if (currentPage === 1) {
        totalEvents = eventBatch.totalCount;
        console.log(`Found ${totalEvents} events for the user`);
      }
      
      // Add these events to our collection
      allEvents = allEvents.concat(eventBatch.events);
      
      // Store this page token in our ordered page list for resuming
      if (currentPageToken) {
        syncState.allPages.push(currentPageToken);
      }
      
      // Update for next iteration
      currentPageToken = eventBatch.nextPageToken;
      hasMorePages = !!currentPageToken;
      currentPage++;
      
      if (syncOptions.logProgress) {
        console.log(`Fetched ${eventBatch.events.length} events, ${allEvents.length}/${totalEvents} total (${(allEvents.length / totalEvents * 100).toFixed(1)}%)`);
      }
      
      // If we have a sync limit and we've reached it, stop paging
      if (syncOptions.syncLimit > 0 && allEvents.length >= syncOptions.syncLimit) {
        console.log(`Reached sync limit of ${syncOptions.syncLimit} events, stopping pagination`);
        hasMorePages = false;
        allEvents = allEvents.slice(0, syncOptions.syncLimit);
      }
      
      // Update sync status periodically
      syncStatus.updateCalendlySyncStatus({
        totalEvents,
        processedEvents,
        importedMeetings,
        errors,
        syncState
      });
    }
    
    // If we received events, process them in batches
    if (allEvents.length > 0) {
      // Break the events into batches
      const eventBatches = [];
      const batchSize = syncOptions.batchSize;
      
      for (let i = 0; i < allEvents.length; i += batchSize) {
        eventBatches.push(allEvents.slice(i, i + batchSize));
      }
      
      console.log(`Split ${allEvents.length} events into ${eventBatches.length} batches of size ${batchSize}`);
      
      // Start from resumeBatch if specified
      const startBatch = syncState.batchNumber || 0;
      
      // Process each batch
      for (let i = startBatch; i < eventBatches.length; i++) {
        // Skip completed batches if resuming
        if (syncState.completedBatches.includes(i)) {
          if (syncOptions.logProgress) {
            console.log(`Skipping batch ${i} as it was completed in a previous run`);
          }
          continue;
        }
        
        // Check if we've exceeded the timeout
        if (Date.now() - startTime > syncOptions.timeout * 0.9) { // Use 90% of timeout for processing
          console.log('Sync timeout reached during batch processing, saving state for future resume');
          
          // Save state for future resume
          syncState.nextPageToken = null; // We already have all the events
          syncState.batchNumber = i;
          
          // Update sync status
          syncStatus.updateCalendlySyncStatus({
            totalEvents,
            processedEvents,
            importedMeetings,
            errors,
            syncState
          });
          
          return {
            success: true,
            count: processedEvents,
            total: totalEvents,
            processed: processedEvents,
            errors,
            resumeToken: null, // We don't need page token anymore
            batchNumber: i,    // But we do need batch number
            completed: false,
            message: 'Sync timeout reached during batch processing, resumable'
          };
        }
        
        // Process the batch with advanced retry and logging options
        const batchResults = await processEventBatch(
          eventBatches[i],
          userId,
          i, // Use actual batch index, not offset from resume position
          batchSize,
          {
            initialDelay: 200,           // Increased from 100ms
            maxDelay: 8000,              // Increased from 5000ms for more tolerance
            adaptiveDelay: syncOptions.adaptiveProcessing,
            retryAttempts: syncOptions.retryCount,
            logProgress: syncOptions.logProgress
          }
        );
        
        // Update counters
        processedEvents += eventBatches[i].length;
        importedMeetings += batchResults.importedMeetings;
        errors += batchResults.errors;
        
        // Mark this batch as completed
        syncState.completedBatches.push(i);
        
        // Update sync status periodically
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