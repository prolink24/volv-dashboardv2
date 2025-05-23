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
import contactMatcher from '../services/contact-matcher';

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
 * Uses organization-wide access to get meetings from all team members
 */
async function syncAllEvents() {
  // Initialize counters for sync status
  let totalEvents = 0;
  let processedEvents = 0;
  let importedMeetings = 0;
  let errors = 0;
  let teamMemberMeetings: {[key: string]: number} = {};

  try {
    // First, test the API connection
    const connectionTest = await testApiConnection();
    if (!connectionTest.success) {
      throw new Error(`Calendly API connection failed: ${connectionTest.error}`);
    }

    // Get the current user's organization
    const currentUser = connectionTest.user;
    const organizationUri = currentUser.current_organization;
    const userId = currentUser.uri;
    
    console.log('Fetching organization-wide events from Calendly API...');
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
    
    // Fetch all events from the entire organization, not just the current user
    try {
      console.log('Fetching events for the entire organization...');
      const orgEventsResponse = await calendlyApiClient.get('/scheduled_events', {
        params: {
          organization: organizationUri,
          min_start_time: minStartTime,
          max_start_time: maxStartTime,
          count: 100 // Get maximum number of events allowed per page
        }
      });
      
      const orgEvents = orgEventsResponse.data.collection || [];
      console.log(`Found ${orgEvents.length} events in the organization`);
      
      // If we got events, process them
      if (orgEvents.length > 0) {
        totalEvents = orgEventsResponse.data.pagination.count || orgEvents.length;
        
        // Check if there's pagination for more events
        const pagination = orgEventsResponse.data.pagination;
        if (pagination && pagination.next_page_token) {
          console.log(`Found pagination token for more events: ${pagination.next_page_token}`);
          pageToken = pagination.next_page_token;
          hasMore = true;
        }
        
        // Process these events
        for (const event of orgEvents) {
          processedEvents++;
          console.log('Processing event:', event.uri);
          
          try {
            // Fetch event details with invitees
            const eventDetails = await getEventDetails(event.uri);
            const invitees = await getEventInvitees(event.uri);
            
            console.log(`Event has ${invitees.length} invitees`);
            
            for (const invitee of invitees) {
              const email = invitee.email;
              if (!email) {
                console.log(`Skipping invitee without email for event ${event.uri}`);
                continue;
              }
              
              // Use the imported contact matcher
              // Prepare contact data from Calendly invitee
              const contactData = {
                name: invitee.name || email.split('@')[0],
                email: email,
                // Try to extract phone from questions if available
                phone: extractPhoneFromInvitee(invitee),
                company: extractCompanyFromInvitee(invitee),
                leadSource: 'calendly',
                status: 'lead',
                sourceId: invitee.uri,
                sourceData: invitee,
                createdAt: new Date(invitee.created_at)
              };
              
              // Use advanced contact matcher to find or create the contact
              let contact;
              try {
                const result = await contactMatcher.createOrUpdateContact(
                  contactData, 
                  true, // Update existing contacts
                  contactMatcher.MatchConfidence.MEDIUM // Use medium confidence for better matching rates
                );
                
                contact = result.contact;
                
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
                  console.log(`Created new contact for Calendly invitee (fallback): ${contactData.name} (${contactData.email})`);
                }
              }
              
              // Determine if this is the first call (NC1) or follow-up call (C2, C3, etc.)
              const determineCallSequence = async (contactId, eventType) => {
                try {
                  const existingMeetings = await storage.getMeetingsByContactId(contactId);
                  
                  // Filter by similar meeting types if the event has a type
                  const similarMeetings = existingMeetings.filter(m => {
                    // If the event has a type, match on similar types
                    if (eventType) {
                      const mType = (m.type || '').toLowerCase();
                      const eType = eventType.toLowerCase();
                      
                      // Check for type similarity - triage, solution, etc.
                      return mType.includes('triage') && eType.includes('triage') ||
                             mType.includes('solution') && eType.includes('solution') ||
                             mType.includes('discovery') && eType.includes('discovery') ||
                             mType.includes('demo') && eType.includes('demo');
                    }
                    return false;
                  });
                  
                  // If no similar meetings found, this is likely NC1 (first call)
                  if (similarMeetings.length === 0) {
                    return 1; // NC1 - First call
                  } else {
                    // Otherwise, it's a follow-up call (C2, C3, etc.)
                    return similarMeetings.length + 1;
                  }
                } catch (err) {
                  console.error('Error determining call sequence:', err);
                  return null; // Return null if we can't determine
                }
              };
              
              // Extract meeting type for better categorization
              let meetingType = 'meeting';
              if (event.name) {
                const name = event.name.toLowerCase();
                if (name.includes('triage')) {
                  meetingType = 'triage_call';
                } else if (name.includes('solution') || name.includes('demo')) {
                  meetingType = 'solution_call';
                } else if (name.includes('follow') || name.includes('check-in')) {
                  meetingType = 'follow_up';
                }
              }
              
              // Get the call sequence number (NC1, C2, etc.)
              const callSequence = await determineCallSequence(contact.id, meetingType);
              
              // Create a meeting record with comprehensive data for attribution
              const meetingData = {
                contactId: contact.id,
                title: event.name || 'Calendly Meeting',
                type: meetingType,
                status: event.status,
                calendlyEventId: event.uri,
                startTime: new Date(event.start_time),
                endTime: new Date(event.end_time),
                // Add booking time - crucial for proper timeline
                bookedAt: new Date(invitee.created_at || event.created_at),
                // Add sequence for NC1/C2 tracking
                sequence: callSequence,
                inviteeEmail: email.toLowerCase(), // Store lowercase email for consistent matching
                inviteeName: invitee.name,
                assignedTo: null,
                // Include all event and invitee data for complete attribution
                metadata: {
                  location: typeof event.location === 'string' ? event.location : 
                           Array.isArray(event.location) ? event.location.join(', ') : 'Virtual',
                  description: eventDetails.description || '',
                  invitee: invitee,
                  event: event,
                  eventDetails: eventDetails,
                  attribution: {
                    platform: 'calendly',
                    eventType: meetingType,
                    scheduledBy: invitee.name,
                    contactId: contact.id,
                    timestamp: new Date().toISOString(),
                    callSequence: callSequence
                  }
                }
              };
              
              // Check if meeting already exists
              const existingMeeting = await storage.getMeetingByCalendlyEventId(event.uri);
              if (existingMeeting) {
                await storage.updateMeeting(existingMeeting.id, meetingData);
                console.log(`Updated existing meeting for contact ${contact.name}`);
                
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
              } else {
                await storage.createMeeting(meetingData);
                importedMeetings++;
                console.log(`Created new meeting for contact ${contact.name}`);
                
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
            }
          } catch (error) {
            console.error(`Error processing event ${event.uri}:`, error);
            errors++;
          }
        }
        
        // Continue processing if we have more pages through pagination
        if (hasMore && pageToken) {
          console.log('First batch of events processed successfully, continuing with pagination...');
          
          // Continue with pagination until we've fetched all events
          while (hasMore && pageToken) {
            try {
              console.log(`Fetching additional events with page token: ${pageToken}`);
              
              const nextPageResponse = await calendlyApiClient.get('/scheduled_events', {
                params: {
                  organization: organizationUri,
                  min_start_time: minStartTime,
                  max_start_time: maxStartTime,
                  count: 100,
                  page_token: pageToken
                }
              });
              
              const nextPageEvents = nextPageResponse.data.collection || [];
              console.log(`Fetched ${nextPageEvents.length} additional events from pagination`);
              
              // Process the additional events
              for (const event of nextPageEvents) {
                processedEvents++;
                console.log('Processing event from pagination:', event.uri);
                
                try {
                  // Fetch event details with invitees
                  const eventDetails = await getEventDetails(event.uri);
                  const invitees = await getEventInvitees(event.uri);
                  
                  console.log(`Event has ${invitees.length} invitees`);
                  
                  // Process each invitee (identical to the code above)
                  for (const invitee of invitees) {
                    // Reusing the same invitee processing logic as above
                    const email = invitee.email;
                    if (!email) {
                      console.log(`Skipping invitee without email for event ${event.uri}`);
                      continue;
                    }
                    
                    // Use the imported contact matcher
                    // Prepare contact data from Calendly invitee
                    const contactData = {
                      name: invitee.name || email.split('@')[0],
                      email: email,
                      // Try to extract phone from questions if available
                      phone: extractPhoneFromInvitee(invitee),
                      company: extractCompanyFromInvitee(invitee),
                      leadSource: 'calendly',
                      status: 'lead',
                      sourceId: invitee.uri,
                      sourceData: invitee,
                      createdAt: new Date(invitee.created_at)
                    };
                    
                    // Find or create the contact using same approach as above
                    let contact;
                    try {
                      const result = await contactMatcher.createOrUpdateContact(
                        contactData, 
                        true, // Update existing contacts
                        contactMatcher.MatchConfidence.MEDIUM // Use medium confidence for better matching rates
                      );
                      
                      contact = result.contact;
                      
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
                        console.log(`Created new contact for Calendly invitee (fallback): ${contactData.name} (${contactData.email})`);
                      }
                    }
                    
                    // Create meeting record - identical to above
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
                        description: eventDetails.description || '',
                        invitee: invitee,
                        event: event,
                        eventDetails: eventDetails,
                        attribution: {
                          platform: 'calendly',
                          eventType: event.event_type,
                          scheduledBy: invitee.name,
                          contactId: contact.id,
                          timestamp: new Date().toISOString()
                        }
                      }
                    };
                    
                    // Check if meeting already exists - same as above
                    const existingMeeting = await storage.getMeetingByCalendlyEventId(event.uri);
                    if (existingMeeting) {
                      await storage.updateMeeting(existingMeeting.id, meetingData);
                      console.log(`Updated existing meeting for contact ${contact.name}`);
                      
                      // Update contact with activity info
                      try {
                        const contactUpdateData = {
                          lastActivityDate: new Date(),
                          lastActivityType: 'calendly_meeting',
                          notes: contact.notes ? 
                            `${contact.notes}\n\nCalendly Meeting: ${event.name} on ${new Date(event.start_time).toLocaleDateString()}` : 
                            `Calendly Meeting: ${event.name} on ${new Date(event.start_time).toLocaleDateString()}`
                        };
                        
                        await storage.updateContact(contact.id, contactUpdateData);
                        console.log(`Updated contact ${contact.name} with meeting activity`);
                      } catch (err) {
                        console.error(`Error updating contact with meeting activity: ${err}`);
                      }
                    } else {
                      await storage.createMeeting(meetingData);
                      importedMeetings++;
                      console.log(`Created new meeting for contact ${contact.name}`);
                      
                      // Update contact with activity info
                      try {
                        const contactUpdateData = {
                          lastActivityDate: new Date(),
                          lastActivityType: 'calendly_meeting',
                          notes: contact.notes ? 
                            `${contact.notes}\n\nCalendly Meeting: ${event.name} on ${new Date(event.start_time).toLocaleDateString()}` : 
                            `Calendly Meeting: ${event.name} on ${new Date(event.start_time).toLocaleDateString()}`
                        };
                        
                        await storage.updateContact(contact.id, contactUpdateData);
                        console.log(`Updated contact ${contact.name} with meeting activity`);
                      } catch (err) {
                        console.error(`Error updating contact with meeting activity: ${err}`);
                      }
                    }
                  }
                } catch (error) {
                  console.error(`Error processing event ${event.uri} from pagination:`, error);
                  errors++;
                }
              }
              
              // Update the pagination token for next page
              const pagination = nextPageResponse.data.pagination;
              pageToken = pagination && pagination.next_page_token ? pagination.next_page_token : null;
              hasMore = !!pageToken;
              
              // Update sync status after each page
              syncStatus.updateCalendlySyncStatus({
                totalEvents,
                processedEvents,
                importedMeetings,
                errors
              });
            } catch (error) {
              console.error('Error fetching events with pagination:', error);
              hasMore = false;
              errors++;
            }
          }
        }
        
        console.log('Successfully processed all Calendly events organization-wide');
        
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
      }
      
    } catch (error) {
      console.error('Error fetching organization events:', error);
      
      // If we fail to fetch organization events, still attempt to continue with batch processing
      console.log('Continuing with batch processing despite initial error...');
    }
    
    // Process events in batches using pagination
    while (hasMore) {
      try {
        console.log(`Fetching events page ${page}${pageToken ? ', with page token' : ''}`);
        
        // Construct the query parameters
        const params: any = {
          organization: organizationUri,
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
                
                // Extract additional data from invitee to help with matching
                const phone = extractPhoneFromInvitee(invitee);
                const company = extractCompanyFromInvitee(invitee);
                
                // Import the contact matcher service
                const contactMatcher = await import('../services/contact-matcher');
                
                // Prepare contact data for matching/creation with enhanced field mapping
                const contactData = {
                  name: invitee.name || email.split('@')[0],
                  email: email,
                  phone: phone || '',
                  company: company || '',
                  leadSource: 'calendly',
                  status: 'lead',
                  sourceId: invitee.uri,
                  sourceData: invitee,
                  createdAt: new Date(invitee.created_at),
                  // Additional fields from form data if available in custom questions
                  title: '', // Will be populated from custom questions if available
                  address: '',
                  city: '',
                  state: '',
                  country: '',
                  zipcode: '',
                  linkedInUrl: '',
                  twitterHandle: '',
                  notes: '',
                  // Store metadata
                  metadata: {
                    timezone: invitee.timezone || '',
                    locale: invitee.locale || '',
                    event_type: event.event_type || '',
                    questions_and_answers: invitee.questions_and_answers || [],
                    tracking: invitee.tracking || {},
                    utm_source: invitee.utm_source || '',
                    utm_medium: invitee.utm_medium || '',
                    utm_campaign: invitee.utm_campaign || '',
                    utm_content: invitee.utm_content || '',
                    utm_term: invitee.utm_term || '',
                    canceled: invitee.canceled || false,
                    rescheduled: invitee.rescheduled || false
                  }
                };
                
                // Parse custom questions to extract more contact data
                if (invitee.questions_and_answers && Array.isArray(invitee.questions_and_answers)) {
                  for (const qa of invitee.questions_and_answers) {
                    // Skip if question or answer is missing
                    if (!qa.question || !qa.answer) continue;
                    
                    const questionLower = qa.question.toLowerCase();
                    const answer = qa.answer.trim();
                    
                    // Skip empty answers
                    if (!answer) continue;
                    
                    // Map common questions to contact fields
                    if (questionLower.includes('job title') || questionLower.includes('position') || questionLower.includes('role')) {
                      contactData.title = answer;
                    } else if (questionLower.includes('company') || questionLower.includes('organization') || questionLower.includes('business')) {
                      contactData.company = contactData.company || answer;
                    } else if (questionLower.includes('linkedin')) {
                      contactData.linkedInUrl = answer;
                    } else if (questionLower.includes('twitter')) {
                      contactData.twitterHandle = answer;
                    } else if (questionLower.includes('address')) {
                      contactData.address = answer;
                    } else if (questionLower.includes('city')) {
                      contactData.city = answer;
                    } else if (questionLower.includes('state') || questionLower.includes('province')) {
                      contactData.state = answer;
                    } else if (questionLower.includes('zip') || questionLower.includes('postal')) {
                      contactData.zipcode = answer;
                    } else if (questionLower.includes('country')) {
                      contactData.country = answer;
                    } else if (questionLower.includes('note') || questionLower.includes('comments') || questionLower.includes('message')) {
                      contactData.notes = answer;
                    }
                  }
                }
                
                // Use the enhanced contact matcher to find or create contact
                const { contact, created, reason } = await contactMatcher.createOrUpdateContact(
                  contactData,
                  true, // update if found
                  contactMatcher.MatchConfidence.MEDIUM // accept medium confidence and above
                );
                
                if (created) {
                  console.log(`Created new contact from Calendly: ${contact.name} (${contact.email})`);
                } else {
                  console.log(`Using existing contact for Calendly invitee: ${contact.name} (${contact.email}) - ${reason}`);
                }
                
                // Create the meeting record with enhanced field capture
                const startTime = new Date(event.start_time);
                const endTime = new Date(event.end_time);
                
                // Determine meeting duration in minutes
                const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
                
                // Extract location information
                let locationType = 'virtual';
                let locationUrl = '';
                let locationAddress = '';
                let locationNotes = '';
                
                if (event.location && event.location.length > 0) {
                  // Try to determine location type
                  const locationString = Array.isArray(event.location) ? event.location.join(' ') : String(event.location);
                  
                  if (locationString.toLowerCase().includes('zoom')) {
                    locationType = 'zoom';
                    locationUrl = locationString.match(/https:\/\/[^\s]+/)?.[0] || '';
                  } else if (locationString.toLowerCase().includes('google meet') || locationString.toLowerCase().includes('gmeet')) {
                    locationType = 'google_meet';
                    locationUrl = locationString.match(/https:\/\/[^\s]+/)?.[0] || '';
                  } else if (locationString.toLowerCase().includes('teams')) {
                    locationType = 'microsoft_teams';
                    locationUrl = locationString.match(/https:\/\/[^\s]+/)?.[0] || '';
                  } else if (locationString.toLowerCase().includes('phone')) {
                    locationType = 'phone';
                    locationNotes = locationString;
                  } else if (locationString.match(/^(http|https):\/\//)) {
                    locationType = 'virtual';
                    locationUrl = locationString.match(/https?:\/\/[^\s]+/)?.[0] || '';
                  } else {
                    // Assume physical address if not obviously a URL or virtual meeting
                    locationType = 'in_person';
                    locationAddress = locationString;
                  }
                }
                
                // Get host information
                const hostName = event.event_memberships?.[0]?.user_name || '';
                const hostEmail = event.event_memberships?.[0]?.user_email || '';
                
                const meetingData = {
                  contactId: contact.id,
                  title: event.name || 'Calendly Meeting',
                  type: event.event_type || 'meeting',
                  status: event.status,
                  calendlyEventId: event.uri,
                  startTime,
                  endTime,
                  assignedTo: hostName || null,
                  // Enhanced fields for better data capture
                  duration: durationMinutes,
                  timezone: event.invitee_timezone || '',
                  canceled: event.canceled_at ? true : false,
                  canceledAt: event.canceled_at ? new Date(event.canceled_at) : null,
                  cancelReason: event.cancellation_reason || '',
                  rescheduled: event.rescheduled ? true : false,
                  eventType: event.event_type_name || '',
                  eventTypeUuid: event.event_type || '',
                  // Detailed location information
                  locationType: locationType,
                  locationUrl: locationUrl,
                  locationAddress: locationAddress,
                  locationNotes: locationNotes,
                  // Host information
                  hostName: hostName,
                  hostEmail: hostEmail,
                  // Advanced metadata object
                  metadata: {
                    // Basic event information
                    event_uuid: event.uri.split('/').pop() || '',
                    event_name: event.name || '',
                    event_type: event.event_type_name || '',
                    event_description: eventDetails.description || '',
                    
                    // Location details
                    location: event.location?.join(', ') || 'Virtual',
                    location_type: locationType,
                    location_url: locationUrl,
                    location_address: locationAddress,
                    
                    // Time information
                    timezone: event.invitee_timezone || '',
                    duration_minutes: durationMinutes,
                    
                    // Status information
                    status: event.status,
                    canceled: event.canceled_at ? true : false,
                    canceled_at: event.canceled_at || null,
                    cancellation_reason: event.cancellation_reason || '',
                    rescheduled: event.rescheduled || false,
                    
                    // Host information
                    host_name: hostName,
                    host_email: hostEmail,
                    
                    // Invitee information
                    invitee_name: invitee.name || '',
                    invitee_email: email,
                    invitee_timezone: invitee.timezone || '',
                    invitee_questions: invitee.questions_and_answers || [],
                    
                    // UTM parameters for attribution
                    utm_source: invitee.utm_source || '',
                    utm_medium: invitee.utm_medium || '',
                    utm_campaign: invitee.utm_campaign || '',
                    utm_content: invitee.utm_content || '',
                    utm_term: invitee.utm_term || '',
                    
                    // Full raw data for reference
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
 * Helper function to extract phone number from Calendly invitee data
 * Checks custom questions and other fields for phone information
 */
function extractPhoneFromInvitee(invitee: any): string {
  if (!invitee) return '';
  
  // Check if there are custom questions that might contain phone info
  if (invitee.questions_and_answers && Array.isArray(invitee.questions_and_answers)) {
    // Look for phone-related questions
    for (const qa of invitee.questions_and_answers) {
      // Common phone-related keywords
      const phoneKeywords = ['phone', 'cell', 'mobile', 'contact number', 'telephone'];
      
      if (qa.question && phoneKeywords.some(keyword => 
          qa.question.toLowerCase().includes(keyword)) && qa.answer) {
        return qa.answer.trim();
      }
    }
  }
  
  // Check if phone is directly in the invitee object
  if (invitee.phone) {
    return invitee.phone;
  }
  
  // No phone found
  return '';
}

/**
 * Helper function to extract company information from Calendly invitee data
 * Checks custom questions and other fields for company information
 */
function extractCompanyFromInvitee(invitee: any): string {
  if (!invitee) return '';
  
  // Check if there are custom questions that might contain company info
  if (invitee.questions_and_answers && Array.isArray(invitee.questions_and_answers)) {
    // Look for company-related questions
    for (const qa of invitee.questions_and_answers) {
      // Common company-related keywords
      const companyKeywords = ['company', 'organization', 'business', 'employer', 'firm'];
      
      if (qa.question && companyKeywords.some(keyword => 
          qa.question.toLowerCase().includes(keyword)) && qa.answer) {
        return qa.answer.trim();
      }
    }
  }
  
  // Check if company is directly in the invitee object
  if (invitee.company) {
    return invitee.company;
  }
  
  // No company found
  return '';
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
    return response.data.resource || {};
  } catch (error: any) {
    // If we get a 404, just return an empty object
    if (error.response && error.response.status === 404) {
      console.log(`Event ${eventUri} not found, may have been deleted`);
      return { };
    }
    
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
    // If we get a 404, just return an empty array
    if (error.response && error.response.status === 404) {
      console.log(`Invitees for event ${eventUri} not found, may have been deleted`);
      return [];
    }
    
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
    const userId = currentUser.uri;
    
    console.log(`Fetching up to ${limit} events from Calendly API for testing...`);
    console.log('User ID:', userId);
    
    // Calculate date range for recent events (last 3 months)
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    
    const response = await calendlyApiClient.get('/scheduled_events', {
      params: {
        user: userId, // Use user parameter instead of organization
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
        status: event.status,
        createdAt: event.created_at,
        updatedAt: event.updated_at,
        location: event.location || 'Virtual',
        cancellation: event.cancellation || null
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
  fetchEvents,
  extractPhoneFromInvitee,
  extractCompanyFromInvitee
};