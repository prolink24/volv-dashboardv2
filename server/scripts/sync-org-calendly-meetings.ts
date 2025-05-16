/**
 * Sync Organization-wide Calendly Meetings
 * 
 * This script performs a comprehensive sync of Calendly meetings from all team members
 * in the organization, not just the main authenticated user.
 * 
 * It addresses the root cause of missing meetings by:
 * 1. Getting the current user's organization
 * 2. Fetching all scheduled events at the organization level
 * 3. Processing each event and its invitees
 * 4. Creating/updating contacts and meetings with proper attribution
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import { pool, db } from '../db';
import { storage } from '../storage';
import { meetings } from '@shared/schema';
import contactMatcher from '../services/contact-matcher';

// Initialize environment variables
dotenv.config();

// Configure Calendly API client with proper authentication
const calendlyApiClient = axios.create({
  baseURL: 'https://api.calendly.com',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.CALENDLY_API_KEY}`
  }
});

// Helper functions for contact data extraction from invitees
function extractPhoneFromInvitee(invitee: any): string | null {
  if (!invitee || !invitee.questions_and_answers) return null;
  
  // Look for phone number in questions and answers
  const phoneQuestion = invitee.questions_and_answers.find((qa: any) => 
    qa.question.toLowerCase().includes('phone') || 
    qa.question.toLowerCase().includes('mobile') ||
    qa.question.toLowerCase().includes('cell')
  );
  
  return phoneQuestion ? phoneQuestion.answer : null;
}

function extractCompanyFromInvitee(invitee: any): string | null {
  if (!invitee || !invitee.questions_and_answers) return null;
  
  // Look for company/organization in questions and answers
  const companyQuestion = invitee.questions_and_answers.find((qa: any) => 
    qa.question.toLowerCase().includes('company') || 
    qa.question.toLowerCase().includes('organization') ||
    qa.question.toLowerCase().includes('business') ||
    qa.question.toLowerCase().includes('workplace') ||
    qa.question.toLowerCase().includes('employer')
  );
  
  return companyQuestion ? companyQuestion.answer : null;
}

// Main function to sync organization-wide meetings
async function syncOrganizationMeetings() {
  // Initialize counters for reporting
  let totalEvents = 0;
  let processedEvents = 0;
  let importedMeetings = 0;
  let updatedMeetings = 0;
  let errors = 0;
  let teamMemberMeetings: {[key: string]: number} = {};

  try {
    console.log('Starting organization-wide Calendly meeting sync...');
    
    // First, get the current user's information
    console.log('Getting current user information...');
    const userResponse = await calendlyApiClient.get('/users/me');
    const currentUser = userResponse.data.resource;
    const organizationUri = currentUser.current_organization;
    
    if (!organizationUri) {
      throw new Error('No organization found for current user');
    }
    
    console.log(`Current user: ${currentUser.name}`);
    console.log(`Organization URI: ${organizationUri}`);
    
    // Calculate date range (2 years back, 1 year forward for comprehensive coverage)
    const now = new Date();
    const twoYearsAgo = new Date(now);
    twoYearsAgo.setFullYear(now.getFullYear() - 2);
    
    const oneYearForward = new Date(now);
    oneYearForward.setFullYear(now.getFullYear() + 1);
    
    const minStartTime = twoYearsAgo.toISOString();
    const maxStartTime = oneYearForward.toISOString();
    
    console.log(`Using date range: ${twoYearsAgo.toDateString()} to ${oneYearForward.toDateString()}`);
    
    // Set up pagination
    let hasMore = true;
    let pageToken = null;
    let page = 1;
    
    // Fetch the first page of events
    console.log('Fetching organization-wide events from Calendly API...');
    const eventsResponse = await calendlyApiClient.get('/scheduled_events', {
      params: {
        organization: organizationUri,
        min_start_time: minStartTime,
        max_start_time: maxStartTime,
        count: 100
      }
    });
    
    const events = eventsResponse.data.collection || [];
    totalEvents += events.length;
    
    console.log(`Fetched ${events.length} events on page ${page}`);
    
    // Check for pagination
    if (eventsResponse.data.pagination) {
      hasMore = !!eventsResponse.data.pagination.next_page;
      pageToken = eventsResponse.data.pagination.next_page_token;
    } else {
      hasMore = false;
      pageToken = null;
    }
    
    // Process each event and its invitees
    for (const event of events) {
      processedEvents++;
      
      try {
        console.log(`Processing event: ${event.uri} (${processedEvents}/${events.length})`);
        
        // Track which team member this meeting belongs to
        const scheduledBy = event.event_memberships?.[0]?.user_name || 'Unknown';
        teamMemberMeetings[scheduledBy] = (teamMemberMeetings[scheduledBy] || 0) + 1;
        
        // Get event details which contain the invitees
        const eventDetailsResponse = await calendlyApiClient.get(event.uri);
        const eventDetails = eventDetailsResponse.data.resource;
        
        // Get invitees for this event
        const inviteesResponse = await calendlyApiClient.get(`${event.uri}/invitees`);
        const invitees = inviteesResponse.data.collection || [];
        
        console.log(`Event has ${invitees.length} invitees`);
        
        // Process each invitee
        for (const invitee of invitees) {
          // Skip if no email (unlikely but possible)
          if (!invitee.email) {
            console.log('Skipping invitee with no email');
            continue;
          }
          
          const email = invitee.email.toLowerCase(); // Normalize email for matching
          
          // Prepare contact data from Calendly invitee
          const contactData = {
            name: invitee.name || email.split('@')[0],
            email: email,
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
              contactMatcher.MatchConfidence.MEDIUM // Use medium confidence for better matching
            );
            
            contact = result.contact;
            
            if (result.created) {
              console.log(`Created new contact for Calendly invitee: ${contact.name} (${contact.email})`);
            } else {
              console.log(`Matched Calendly invitee to existing contact: ${contact.name} (${contact.email}) - ${result.reason}`);
            }
          } catch (error: any) {
            console.error(`Error matching contact for Calendly invitee: ${email}`, error);
            
            // Fallback to simple lookup by email
            contact = await storage.getContactByEmail(email);
            if (!contact) {
              // Create minimal contact as fallback
              contact = await storage.createContact(contactData);
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
            invitee_email: email,
            invitee_name: invitee.name,
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
                scheduledBy: scheduledBy,
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
            updatedMeetings++;
            
            // Update contact with activity info to ensure proper attribution
            try {
              const contactUpdateData = {
                lastActivityDate: new Date(),
                lastActivityType: 'calendly_meeting',
                notes: contact.notes ? 
                  `${contact.notes}\n\nCalendly Meeting: ${event.name} on ${new Date(event.start_time).toLocaleDateString()}` : 
                  `Calendly Meeting: ${event.name} on ${new Date(event.start_time).toLocaleDateString()}`
              };
              
              await storage.updateContact(contact.id, contactUpdateData);
            } catch (error: any) {
              console.error(`Error updating contact with meeting activity: ${error.message}`);
            }
          } else {
            await storage.createMeeting(meetingData);
            importedMeetings++;
            console.log(`Created new meeting for contact ${contact.name}`);
            
            // Update contact with activity info to ensure proper attribution
            try {
              const contactUpdateData = {
                lastActivityDate: new Date(),
                lastActivityType: 'calendly_meeting',
                notes: contact.notes ? 
                  `${contact.notes}\n\nCalendly Meeting: ${event.name} on ${new Date(event.start_time).toLocaleDateString()}` : 
                  `Calendly Meeting: ${event.name} on ${new Date(event.start_time).toLocaleDateString()}`
              };
              
              await storage.updateContact(contact.id, contactUpdateData);
            } catch (error: any) {
              console.error(`Error updating contact with meeting activity: ${error.message}`);
            }
          }
        }
      } catch (error: any) {
        console.error(`Error processing event ${event.uri}:`, error);
        errors++;
      }
    }
    
    // Continue processing if we have more pages through pagination
    if (hasMore && pageToken) {
      console.log('First batch of events processed, continuing with pagination...');
      
      // Continue with pagination until we've fetched all events
      while (hasMore && pageToken) {
        try {
          console.log(`Fetching additional events with page token: ${pageToken}`);
          page++;
          
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
          totalEvents += nextPageEvents.length;
          console.log(`Fetched ${nextPageEvents.length} additional events on page ${page}`);
          
          // Update pagination status
          if (nextPageResponse.data.pagination) {
            hasMore = !!nextPageResponse.data.pagination.next_page;
            pageToken = nextPageResponse.data.pagination.next_page_token;
          } else {
            hasMore = false;
            pageToken = null;
          }
          
          // Process events from this page
          for (const event of nextPageEvents) {
            processedEvents++;
            
            try {
              console.log(`Processing event from pagination: ${event.uri} (${processedEvents}/${totalEvents})`);
              
              // Track which team member this meeting belongs to
              const scheduledBy = event.event_memberships?.[0]?.user_name || 'Unknown';
              teamMemberMeetings[scheduledBy] = (teamMemberMeetings[scheduledBy] || 0) + 1;
              
              // Get event details which contain the invitees
              const eventDetailsResponse = await calendlyApiClient.get(event.uri);
              const eventDetails = eventDetailsResponse.data.resource;
              
              // Get invitees for this event
              const inviteesResponse = await calendlyApiClient.get(`${event.uri}/invitees`);
              const invitees = inviteesResponse.data.collection || [];
              
              console.log(`Event has ${invitees.length} invitees`);
              
              // Process each invitee (similar to code above)
              for (const invitee of invitees) {
                // Skip if no email
                if (!invitee.email) {
                  console.log('Skipping invitee with no email');
                  continue;
                }
                
                const email = invitee.email.toLowerCase();
                
                // Prepare contact data
                const contactData = {
                  name: invitee.name || email.split('@')[0],
                  email: email,
                  phone: extractPhoneFromInvitee(invitee),
                  company: extractCompanyFromInvitee(invitee),
                  leadSource: 'calendly',
                  status: 'lead',
                  sourceId: invitee.uri,
                  sourceData: invitee,
                  createdAt: new Date(invitee.created_at)
                };
                
                // Find or create contact
                let contact;
                try {
                  const result = await contactMatcher.createOrUpdateContact(
                    contactData, 
                    true, 
                    contactMatcher.MatchConfidence.MEDIUM
                  );
                  
                  contact = result.contact;
                  
                  if (result.created) {
                    console.log(`Created new contact for Calendly invitee: ${contact.name} (${contact.email})`);
                  } else {
                    console.log(`Matched Calendly invitee to existing contact: ${contact.name} (${contact.email}) - ${result.reason}`);
                  }
                } catch (error: any) {
                  console.error(`Error matching contact for Calendly invitee: ${email}`, error);
                  
                  // Fallback to simple lookup
                  contact = await storage.getContactByEmail(email);
                  if (!contact) {
                    contact = await storage.createContact(contactData);
                    console.log(`Created new contact for Calendly invitee (fallback): ${contactData.name} (${contactData.email})`);
                  }
                }
                
                // Create/update meeting record
                const meetingData = {
                  contactId: contact.id,
                  title: event.name || 'Calendly Meeting',
                  type: event.event_type || 'meeting',
                  status: event.status,
                  calendlyEventId: event.uri,
                  startTime: new Date(event.start_time),
                  endTime: new Date(event.end_time),
                  invitee_email: email,
                  invitee_name: invitee.name,
                  assignedTo: null,
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
                      scheduledBy: scheduledBy,
                      contactId: contact.id,
                      timestamp: new Date().toISOString()
                    }
                  }
                };
                
                // Check if meeting exists
                const existingMeeting = await storage.getMeetingByCalendlyEventId(event.uri);
                if (existingMeeting) {
                  await storage.updateMeeting(existingMeeting.id, meetingData);
                  console.log(`Updated existing meeting for contact ${contact.name}`);
                  updatedMeetings++;
                  
                  // Update contact activity info
                  try {
                    const contactUpdateData = {
                      lastActivityDate: new Date(),
                      lastActivityType: 'calendly_meeting',
                      notes: contact.notes ? 
                        `${contact.notes}\n\nCalendly Meeting: ${event.name} on ${new Date(event.start_time).toLocaleDateString()}` : 
                        `Calendly Meeting: ${event.name} on ${new Date(event.start_time).toLocaleDateString()}`
                    };
                    
                    await storage.updateContact(contact.id, contactUpdateData);
                  } catch (error: any) {
                    console.error(`Error updating contact with meeting activity: ${error.message}`);
                  }
                } else {
                  await storage.createMeeting(meetingData);
                  importedMeetings++;
                  console.log(`Created new meeting for contact ${contact.name}`);
                  
                  // Update contact activity info
                  try {
                    const contactUpdateData = {
                      lastActivityDate: new Date(),
                      lastActivityType: 'calendly_meeting',
                      notes: contact.notes ? 
                        `${contact.notes}\n\nCalendly Meeting: ${event.name} on ${new Date(event.start_time).toLocaleDateString()}` : 
                        `Calendly Meeting: ${event.name} on ${new Date(event.start_time).toLocaleDateString()}`
                    };
                    
                    await storage.updateContact(contact.id, contactUpdateData);
                  } catch (error: any) {
                    console.error(`Error updating contact with meeting activity: ${error.message}`);
                  }
                }
              }
            } catch (error: any) {
              console.error(`Error processing event ${event.uri}:`, error);
              errors++;
            }
          }
        } catch (error: any) {
          console.error(`Error fetching additional events page ${page}:`, error);
          errors++;
          hasMore = false; // Stop pagination on error
        }
      }
    }
    
    // Generate final report
    console.log('\n===== ORGANIZATION-WIDE CALENDLY SYNC REPORT =====');
    console.log(`Total events fetched: ${totalEvents}`);
    console.log(`Events processed: ${processedEvents}`);
    console.log(`New meetings imported: ${importedMeetings}`);
    console.log(`Existing meetings updated: ${updatedMeetings}`);
    console.log(`Errors encountered: ${errors}`);
    
    console.log('\nMeetings per team member:');
    for (const [member, count] of Object.entries(teamMemberMeetings)) {
      console.log(`- ${member}: ${count} meetings`);
    }
    
    // Get the latest count of meetings in the database
    const meetingsCount = await db.select({ count: db.fn.count() }).from(meetings);
    console.log(`\nTotal meetings in database after sync: ${meetingsCount[0]?.count || 0}`);
    
    console.log('Organization-wide Calendly meeting sync completed successfully!');
    
  } catch (error: any) {
    console.error('Error in organization-wide Calendly sync:', error.message);
  } finally {
    await pool.end();
  }
}

// Execute the sync
syncOrganizationMeetings();