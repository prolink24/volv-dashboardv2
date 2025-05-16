/**
 * Sync Organization Calendly Meetings
 * 
 * This script synchronizes ALL Calendly meetings from the entire organization,
 * not just meetings for the authenticated user. This ensures we capture meetings
 * scheduled with any team member, not just the main Calendly account.
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

/**
 * Normalize an email address for consistent matching
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Extract a phone number from invitee data
 */
function extractPhoneFromInvitee(invitee: any): string | null {
  if (!invitee.questions_and_answers || !Array.isArray(invitee.questions_and_answers)) {
    return null;
  }
  
  // Find phone-related questions
  const phoneQuestion = invitee.questions_and_answers.find((q: any) => {
    const question = q.question?.toLowerCase() || '';
    return question.includes('phone') || question.includes('cell') || question.includes('mobile');
  });
  
  return phoneQuestion ? phoneQuestion.answer : null;
}

/**
 * Extract company information from invitee data
 */
function extractCompanyFromInvitee(invitee: any): string | null {
  if (!invitee.questions_and_answers || !Array.isArray(invitee.questions_and_answers)) {
    return null;
  }
  
  // Find company-related questions
  const companyQuestion = invitee.questions_and_answers.find((q: any) => {
    const question = q.question?.toLowerCase() || '';
    return question.includes('company') || question.includes('organization') || question.includes('business');
  });
  
  return companyQuestion ? companyQuestion.answer : null;
}

/**
 * Main sync function
 */
async function syncOrganizationCalendlyMeetings() {
  console.log('Starting organization-wide Calendly meetings sync...');
  
  try {
    // First, get the organization ID from the current user
    console.log('Getting current user and organization info...');
    const userResponse = await calendlyClient.get('/users/me');
    const currentUser = userResponse.data.resource;
    const organizationUri = currentUser.current_organization;
    
    console.log(`Current user: ${currentUser.name}`);
    console.log(`Organization: ${organizationUri}`);
    
    if (!organizationUri) {
      throw new Error('No organization found for current user');
    }
    
    // Calculate date range for comprehensive history (2 years back, 1 year forward)
    const now = new Date();
    const twoYearsAgo = new Date(now);
    twoYearsAgo.setFullYear(now.getFullYear() - 2);
    
    const oneYearForward = new Date(now);
    oneYearForward.setFullYear(now.getFullYear() + 1);
    
    const minStartTime = twoYearsAgo.toISOString();
    const maxStartTime = oneYearForward.toISOString();
    
    console.log(`Using date range from ${twoYearsAgo.toDateString()} to ${oneYearForward.toDateString()}`);
    
    // Track statistics
    let totalFetched = 0;
    let totalProcessed = 0;
    let totalImported = 0;
    let totalErrors = 0;
    
    // Fetch events for the entire organization
    console.log('Fetching events for the entire organization...');
    let hasMore = true;
    let pageToken = null;
    let page = 1;
    
    while (hasMore) {
      console.log(`Fetching page ${page}...`);
      
      try {
        // Build request params
        const params: any = {
          organization: organizationUri,
          min_start_time: minStartTime,
          max_start_time: maxStartTime,
          count: 100
        };
        
        if (pageToken) {
          params.page_token = pageToken;
        }
        
        // Make the API request
        const response = await calendlyClient.get('/scheduled_events', { params });
        const events = response.data.collection || [];
        
        totalFetched += events.length;
        console.log(`Found ${events.length} events on page ${page}`);
        
        // Process pagination
        const pagination = response.data.pagination;
        if (pagination && pagination.next_page_token) {
          pageToken = pagination.next_page_token;
          hasMore = true;
          page++;
        } else {
          hasMore = false;
        }
        
        // Process each event
        for (const event of events) {
          try {
            console.log(`Processing event: ${event.name || 'Unnamed'} (${event.uri})`);
            
            // Get invitees for this event
            const inviteesResponse = await calendlyClient.get(`${event.uri}/invitees`);
            const invitees = inviteesResponse.data.collection || [];
            
            console.log(`Event has ${invitees.length} invitees`);
            
            // Process each invitee
            for (const invitee of invitees) {
              try {
                const email = invitee.email;
                if (!email) {
                  console.log(`Skipping invitee without email for event ${event.uri}`);
                  continue;
                }
                
                const normalizedEmail = normalizeEmail(email);
                
                // Check if contact exists
                let contact = await db.query.contacts.findFirst({
                  where: eq(contacts.email, normalizedEmail)
                });
                
                if (!contact) {
                  // Create new contact
                  console.log(`Creating new contact for email: ${email}`);
                  const contactData = {
                    name: invitee.name || email.split('@')[0],
                    email: normalizedEmail,
                    phone: extractPhoneFromInvitee(invitee),
                    company: extractCompanyFromInvitee(invitee),
                    leadSource: 'calendly',
                    status: 'lead',
                    sourceId: invitee.uri,
                    createdAt: new Date(invitee.created_at)
                  };
                  
                  const [newContact] = await db.insert(contacts).values(contactData).returning();
                  contact = newContact;
                  console.log(`Created new contact: ${contact.name} (${contact.email})`);
                } else {
                  console.log(`Found existing contact: ${contact.name} (${contact.email})`);
                }
                
                // Check if meeting exists
                const existingMeeting = await db.query.meetings.findFirst({
                  where: eq(meetings.calendlyEventId, event.uri)
                });
                
                if (existingMeeting) {
                  console.log(`Meeting already exists for event ${event.uri}`);
                  
                  // Check if we need to update the invitee_email field
                  if (!existingMeeting.inviteeEmail) {
                    console.log(`Updating missing invitee_email for existing meeting #${existingMeeting.id}`);
                    await db.update(meetings)
                      .set({ 
                        inviteeEmail: normalizedEmail,
                        inviteeName: invitee.name
                      })
                      .where(eq(meetings.id, existingMeeting.id));
                  }
                } else {
                  // Create new meeting
                  console.log(`Creating new meeting for event ${event.uri}`);
                  
                  const meetingData = {
                    contactId: contact.id,
                    title: event.name || 'Calendly Meeting',
                    type: 'calendly_meeting',
                    status: event.status,
                    calendlyEventId: event.uri,
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
                        email: email,
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
                        scheduledBy: Object.hasOwnProperty.call(event, 'event_memberships') && event.event_memberships && 
                                     event.event_memberships.length > 0 ? event.event_memberships[0].user_name : 'unknown',
                        contactId: contact.id,
                        timestamp: new Date().toISOString()
                      }
                    }
                  };
                  
                  await db.insert(meetings).values(meetingData);
                  totalImported++;
                  console.log(`Created new meeting for contact: ${contact.name}`);
                }
                
                totalProcessed++;
              } catch (error) {
                console.error(`Error processing invitee: ${error}`);
                totalErrors++;
              }
            }
          } catch (error) {
            console.error(`Error processing event ${event.uri}: ${error}`);
            totalErrors++;
          }
        }
      } catch (error) {
        console.error(`Error fetching events for page ${page}: ${error}`);
        totalErrors++;
        hasMore = false;
      }
    }
    
    console.log('Organization-wide Calendly meetings sync completed');
    console.log('===========================================');
    console.log(`Total events fetched: ${totalFetched}`);
    console.log(`Total invitees processed: ${totalProcessed}`);
    console.log(`Total meetings imported: ${totalImported}`);
    console.log(`Total errors: ${totalErrors}`);
    
  } catch (error) {
    console.error('Error in Calendly organization sync:', error);
  }
}

// Execute the sync function
syncOrganizationCalendlyMeetings()
  .then(() => {
    console.log('Script execution completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error executing script:', error);
    process.exit(1);
  });