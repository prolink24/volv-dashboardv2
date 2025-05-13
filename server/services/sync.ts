/**
 * Synchronization Service
 * 
 * This service coordinates the synchronization of data from all platforms
 * (Close CRM, Calendly, Typeform) and maintains the sync status.
 * It handles sequential execution, error handling, and reporting.
 */

import closeAPI from '../api/close';
import calendlyAPI from '../api/calendly';
import typeformAPI from '../api/typeform';
import * as syncStatus from '../api/sync-status';
import { storage } from '../storage';

// Cache schedule state
let syncIntervalId: NodeJS.Timeout | null = null;
let isInitialSyncCompleted = false;

/**
 * Start an automatic sync schedule
 * This will sync data periodically (every hour by default)
 * 
 * @param intervalMinutes Time between syncs in minutes (default: 60)
 */
export function startSyncSchedule(intervalMinutes = 60) {
  // Clear any existing schedule
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
  }
  
  // Convert minutes to milliseconds
  const intervalMs = intervalMinutes * 60 * 1000;
  
  console.log(`Scheduling regular data sync every ${intervalMinutes} minutes`);
  
  // Run the first sync immediately if we've never synced
  if (!isInitialSyncCompleted) {
    // We'll run initial sync async to not block startup
    setTimeout(() => {
      syncAll()
        .then(() => {
          isInitialSyncCompleted = true;
        })
        .catch(error => {
          console.error('Initial data sync failed:', error);
          // We'll try again on the next scheduled interval
        });
    }, 10000); // Small delay to ensure server is fully up
  }
  
  // Schedule regular syncs
  syncIntervalId = setInterval(() => {
    console.log('Running scheduled data sync...');
    syncAll()
      .then(() => {
        console.log('Scheduled data sync completed');
      })
      .catch(error => {
        console.error('Scheduled data sync failed:', error);
      });
  }, intervalMs);
  
  return { 
    success: true, 
    message: `Sync scheduled every ${intervalMinutes} minutes` 
  };
}

/**
 * Stop the automatic sync schedule
 */
export function stopSyncSchedule() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    return { success: true, message: 'Sync schedule stopped' };
  }
  
  return { success: false, message: 'No sync schedule was active' };
}

/**
 * Synchronize data from all platforms
 * This is the main entry point for data synchronization
 */
export async function syncAll() {
  let totalContacts = 0;
  
  try {
    // Sync Close CRM
    try {
      syncStatus.startSync('close');
      console.log('Starting Close CRM sync...');
      
      const closeSyncResult = await closeAPI.syncAllLeads();
      
      if (!closeSyncResult.success) {
        throw new Error(`Close CRM sync failed: ${closeSyncResult.error}`);
      }
      
      console.log(`Close CRM sync completed. Imported ${closeSyncResult.count} contacts`);
    } catch (error: any) {
      console.error('Close CRM sync error:', error);
      syncStatus.setSyncError(`Close CRM sync error: ${error.message}`);
      throw error;
    }
    
    // Sync Calendly
    try {
      syncStatus.startSync('calendly');
      console.log('Starting Calendly sync...');
      
      const calendlySyncResult = await calendlyAPI.syncAllEvents();
      
      if (!calendlySyncResult.success) {
        throw new Error(`Calendly sync failed: ${calendlySyncResult.error}`);
      }
      
      console.log(`Calendly sync completed. Imported ${calendlySyncResult.count} meetings`);
    } catch (error: any) {
      console.error('Calendly sync error:', error);
      syncStatus.setSyncError(`Calendly sync error: ${error.message}`);
      throw error;
    }
    
    // Sync Typeform
    try {
      syncStatus.startSync('typeform');
      console.log('Starting Typeform sync...');
      
      const typeformSyncResult = await typeformAPI.syncAllResponses();
      
      if (!typeformSyncResult.success) {
        throw new Error(`Typeform sync failed: ${typeformSyncResult.error}`);
      }
      
      console.log(`Typeform sync completed. Imported ${typeformSyncResult.syncedCount} form submissions`);
    } catch (error: any) {
      console.error('Typeform sync error:', error);
      syncStatus.setSyncError(`Typeform sync error: ${error.message}`);
      throw error;
    }
    
    // Get the total contacts count after sync
    const allContacts = await storage.getAllContacts();
    totalContacts = allContacts.length;
    
    // Mark sync as complete
    syncStatus.completeSync(totalContacts);
    
    return {
      success: true,
      message: 'Data sync completed successfully',
      totalContacts
    };
    
  } catch (error: any) {
    console.error('Data sync error:', error);
    
    return {
      success: false,
      error: error.message || 'Unknown sync error',
      totalContacts
    };
  }
}

/**
 * Synchronize only Close CRM data
 * @param resetMode If true, ignore existing contacts and create new ones
 */
export async function syncCloseCRM(resetMode: boolean = false) {
  try {
    syncStatus.startSync('close');
    console.log('Starting Close CRM sync...');

    // If in reset mode, we'll run a query to clear the old contact-lead associations
    if (resetMode) {
      console.log('Running in RESET mode - will create new contacts instead of updating');
      // We won't actually delete contacts, just change how we handle finding existing contacts
    }
    
    const syncResult = await closeAPI.syncAllLeads(resetMode);
    
    if (!syncResult.success) {
      syncStatus.setSyncError(syncResult.error || 'Unknown Close CRM sync error');
      return syncResult;
    }
    
    const allContacts = await storage.getAllContacts();
    syncStatus.completeSync(allContacts.length);
    
    return {
      ...syncResult,
      totalContacts: allContacts.length
    };
    
  } catch (error: any) {
    console.error('Close CRM sync error:', error);
    syncStatus.setSyncError(error.message || 'Unknown Close CRM sync error');
    
    return {
      success: false,
      error: error.message || 'Unknown Close CRM sync error'
    };
  }
}

/**
 * Synchronize only Calendly data
 */
export async function syncCalendly() {
  try {
    syncStatus.startSync('calendly');
    console.log('Starting Calendly sync...');
    
    // First test the API connection
    const connectionTest = await calendlyAPI.testApiConnection();
    if (!connectionTest.success) {
      const errorMessage = `Calendly API connection failed: ${connectionTest.error || 'Unknown error'}`;
      console.error(errorMessage);
      syncStatus.setSyncError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
    
    console.log('Successfully connected to Calendly API');
    console.log('Authenticated as:', connectionTest.user.name);
    
    // Get some test events first
    try {
      console.log('Fetching test events from Calendly API...');
      const testEvents = await calendlyAPI.fetchEvents(5);
      console.log(`Found ${testEvents.length} test events`);
      
      // Process these test events
      let importedMeetings = 0;
      let errors = 0;
      
      for (const event of testEvents) {
        try {
          console.log(`Processing event: ${event.name || 'Unnamed event'} (${event.uri})`);
          
          // Get invitees for this event
          const invitees = await calendlyAPI.getEventInvitees(event.uri);
          console.log(`Event has ${invitees.length} invitees`);
          
          for (const invitee of invitees) {
            const email = invitee.email;
            if (!email) {
              console.log(`Skipping invitee without email for event ${event.uri}`);
              continue;
            }
            
            // Try to find matching contact
            const contact = await storage.getContactByEmail(email);
            if (contact) {
              console.log(`Found matching contact for ${email}: ${contact.name} (ID: ${contact.id})`);
              
              // Create or update meeting
              const meetingData = {
                contactId: contact.id,
                title: event.name || 'Calendly Meeting',
                type: event.eventType || 'meeting',
                status: event.status,
                calendlyEventId: event.uri,
                startTime: new Date(event.startTime),
                endTime: new Date(event.endTime),
                assignedTo: null,
                metadata: JSON.stringify({
                  invitee: invitee,
                  event: event
                })
              };
              
              // Check if meeting exists
              const existingMeeting = await storage.getMeetingByCalendlyEventId(event.uri);
              if (existingMeeting) {
                await storage.updateMeeting(existingMeeting.id, meetingData);
                console.log(`Updated existing meeting #${existingMeeting.id} for contact ${contact.name}`);
              } else {
                const newMeeting = await storage.createMeeting(meetingData);
                importedMeetings++;
                console.log(`Created new meeting #${newMeeting.id} for contact ${contact.name}`);
              }
            } else {
              console.log(`No matching contact found for ${email}, creating minimal contact`);
              
              // Create minimal contact record
              const contactData = {
                name: invitee.name || email.split('@')[0],
                email: email,
                phone: '',
                company: '',
                leadSource: 'calendly',
                status: 'lead',
                sourceId: invitee.uri,
                sourceData: JSON.stringify(invitee),
                createdAt: new Date()
              };
              
              const newContact = await storage.createContact(contactData);
              console.log(`Created new contact #${newContact.id}: ${newContact.name} (${newContact.email})`);
              
              // Create meeting for new contact
              const meetingData = {
                contactId: newContact.id,
                title: event.name || 'Calendly Meeting',
                type: event.eventType || 'meeting',
                status: event.status,
                calendlyEventId: event.uri,
                startTime: new Date(event.startTime),
                endTime: new Date(event.endTime),
                assignedTo: null,
                metadata: JSON.stringify({
                  invitee: invitee,
                  event: event
                })
              };
              
              const newMeeting = await storage.createMeeting(meetingData);
              importedMeetings++;
              console.log(`Created new meeting #${newMeeting.id} for new contact ${newContact.name}`);
            }
          }
        } catch (eventError) {
          console.error(`Error processing event ${event.uri}:`, eventError);
          errors++;
        }
      }
      
      // Update sync status to success
      const allContacts = await storage.getAllContacts();
      syncStatus.completeSync(allContacts.length);
      
      return {
        success: true,
        count: importedMeetings,
        errors,
        totalContacts: allContacts.length
      };
      
    } catch (err) {
      let errorMessage = 'Error fetching Calendly events: Unknown error';
      if (err instanceof Error) {
        errorMessage = `Error fetching Calendly events: ${err.message}`;
      }
      console.error(errorMessage);
      syncStatus.setSyncError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
    
  } catch (error: any) {
    console.error('Calendly sync error:', error);
    syncStatus.setSyncError(error.message || 'Unknown Calendly sync error');
    
    return {
      success: false,
      error: error.message || 'Unknown Calendly sync error'
    };
  }
}

/**
 * Synchronize only Typeform data
 */
export async function syncTypeform() {
  try {
    syncStatus.startSync('typeform');
    console.log('Starting Typeform sync...');
    
    const syncResult = await typeformAPI.syncAllResponses();
    
    if (!syncResult.success) {
      syncStatus.setSyncError(syncResult.error || 'Unknown Typeform sync error');
      return syncResult;
    }
    
    const allContacts = await storage.getAllContacts();
    syncStatus.completeSync(allContacts.length);
    
    return {
      ...syncResult,
      totalContacts: allContacts.length
    };
    
  } catch (error: any) {
    console.error('Typeform sync error:', error);
    syncStatus.setSyncError(error.message || 'Unknown Typeform sync error');
    
    return {
      success: false,
      error: error.message || 'Unknown Typeform sync error'
    };
  }
}

export default {
  syncAll,
  syncCloseCRM,
  syncCalendly,
  syncTypeform,
  startSyncSchedule,
  stopSyncSchedule
};