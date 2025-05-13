/**
 * Close CRM API Integration
 * 
 * This module handles integration with Close CRM API to sync:
 * - All leads (contacts) with complete profile information
 * - All opportunities (deals)
 * - All activities (calls, emails, etc.)
 * - All custom fields
 * 
 * It supports fetching 5000+ contacts by implementing pagination
 * and using batch processing for efficient data retrieval.
 */

import axios from 'axios';
import { storage } from '../storage';
import * as syncStatus from './sync-status';

// API Configuration
const CLOSE_API_KEY = process.env.CLOSE_API_KEY;
const CLOSE_BASE_URL = 'https://api.close.com/api/v1';

// Create axios instance with authentication
const closeApiClient = axios.create({
  baseURL: CLOSE_BASE_URL,
  auth: {
    username: CLOSE_API_KEY || '',
    password: ''
  },
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

/**
 * Test API connection by fetching user profile
 */
async function testApiConnection() {
  try {
    console.log('Testing Close API connection using user profile endpoint...');
    const response = await closeApiClient.get('/me/');
    console.log(`Successfully connected to Close API via user profile endpoint`);
    console.log(`Authenticated as: ${response.data.first_name} ${response.data.last_name}`);
    return { success: true, user: response.data };
  } catch (error: any) {
    console.error('Error connecting to Close API:', error.message);
    return { 
      success: false, 
      error: error.message || 'Failed to connect to Close API' 
    };
  }
}

/**
 * Sync all leads from Close CRM
 * Handles pagination and batch processing for 5000+ contacts
 * @param resetMode If true, create new contacts instead of updating existing ones
 */
async function syncAllLeads(resetMode: boolean = false) {
  // Initialize counters for sync status
  let totalLeads = 0;
  let processedLeads = 0;
  let importedContacts = 0;
  let withEmail = 0;
  let withoutEmail = 0;
  let errors = 0;
  let failedLeads = 0;
  let retryCount = 0;
  const MAX_RETRIES = 3;
  const BATCH_SIZE = 100;
  const ERROR_THRESHOLD = 50; // Maximum allowed consecutive errors
  let consecutiveErrors = 0;
  
  // In reset mode, we'll create new contacts instead of updating existing ones
  console.log(`Sync mode: ${resetMode ? 'RESET (create new)' : 'NORMAL (update existing)'}`);
  
  try {
    // First, test the API connection
    const connectionTest = await testApiConnection();
    if (!connectionTest.success) {
      throw new Error(`Close API connection failed: ${connectionTest.error}`);
    }

    console.log('Fetching leads from Close API...');
    
    // Set initial pagination state
    let hasMore = true;
    let cursor = 'initial'; // Using 'initial' as a marker for first page
    let page = 1;
    let shouldRetry = false;
    
    // Initialize sync status
    syncStatus.updateCloseSyncStatus({
      totalLeads,
      processedLeads,
      importedContacts,
      errors
    });
    
    // Process leads in batches using pagination
    while (hasMore) {
      try {
        console.log(`Fetching leads page ${page}, cursor: ${cursor}`);
        
        // Construct the query parameters
        const params: any = {
          _limit: 100, // Max allowed by Close API
        };
        
        // For subsequent pages, use the cursor if we have a valid one
        if (cursor && cursor !== '' && cursor !== 'initial') {
          params._cursor = cursor;
        } 
        // If we don't have a cursor but we're past page 1, try to use skip
        else if (page > 1 && cursor !== 'initial') {
          // Use _skip as an alternative to cursor-based pagination
          params._skip = (page - 1) * 100;
        }
        
        // Make the API request
        const response = await closeApiClient.get('/lead/', { params });
        const leads = response.data.data || [];
        
        // Update total on first page
        if (page === 1) {
          totalLeads = response.data.total_results || leads.length;
          console.log(`Total leads in Close CRM: ${totalLeads}`);
          syncStatus.updateCloseSyncStatus({
            totalLeads,
            processedLeads,
            importedContacts,
            errors
          });
        }
        
        // Process the batch of leads
        console.log(`Fetched ${leads.length} leads on page ${page}`);
        
        for (const lead of leads) {
          try {
            processedLeads++;
            
            // Extract relevant contact data
            const contactData = {
              name: lead.display_name || '',
              email: '',
              phone: '',
              company: lead.company || '',
              leadSource: 'close',
              status: lead.status_label || 'unknown',
              sourceId: lead.id,
              sourceData: JSON.stringify(lead),
              createdAt: new Date(lead.date_created) // Pass Date object, not ISO string
            };
            
            // Extract email if available
            if (lead.contacts && lead.contacts.length > 0) {
              for (const contact of lead.contacts) {
                if (contact.emails && contact.emails.length > 0) {
                  contactData.email = contact.emails[0].email;
                  break;
                }
              }
            }
            
            // Extract phone if available
            if (lead.contacts && lead.contacts.length > 0) {
              for (const contact of lead.contacts) {
                if (contact.phones && contact.phones.length > 0) {
                  contactData.phone = contact.phones[0].phone;
                  break;
                }
              }
            }
            
            // Check if we have an email (required for matching across platforms)
            if (contactData.email) {
              withEmail++;
              
              // Even in reset mode, we need to check for existing contacts because of email uniqueness constraint
              let existingContact = null;
              
              // Check if contact exists by external ID
              existingContact = await storage.getContactByExternalId('close', lead.id);
              
              // If not found by ID, try email as a fallback
              if (!existingContact && contactData.email) {
                existingContact = await storage.getContactByEmail(contactData.email);
              }
              
              try {
                if (existingContact) {
                  if (resetMode) {
                    // In reset mode, update with new data but mark it specially
                    contactData.sourceData = JSON.stringify({...JSON.parse(contactData.sourceData), reset_mode: true});
                    const updatedContact = await storage.updateContact(existingContact.id, contactData);
                    importedContacts++; // Count as imported since it's reset mode
                    console.log(`Reset mode: Updated contact: ${contactData.name} (${contactData.email})`);
                    
                    // Update sync status after each batch of 10 contacts in reset mode
                    if (importedContacts % 10 === 0) {
                      syncStatus.updateCloseSyncStatus({
                        totalLeads,
                        processedLeads,
                        importedContacts,
                        errors
                      });
                    }
                  } else {
                    // Normal mode - just update
                    const updatedContact = await storage.updateContact(existingContact.id, contactData);
                    console.log(`Updated existing contact: ${contactData.name} (${contactData.email})`);
                    
                    // Import opportunities and activities for this contact
                    try {
                      // Sync opportunities in background
                      syncLeadOpportunities(lead.id, existingContact.id)
                        .then(result => {
                          if (result.count > 0) {
                            console.log(`Imported ${result.count} opportunities for contact ${existingContact.id}`);
                          }
                        })
                        .catch(err => {
                          console.error(`Error importing opportunities for contact ${existingContact.id}:`, err);
                        });
                      
                      // Sync activities in background
                      syncLeadActivities(lead.id, existingContact.id)
                        .then(result => {
                          if (result.count > 0) {
                            console.log(`Imported ${result.count} activities for contact ${existingContact.id}`);
                          }
                        })
                        .catch(err => {
                          console.error(`Error importing activities for contact ${existingContact.id}:`, err);
                        });
                    } catch (err) {
                      console.error(`Error syncing related data for contact ${existingContact.id}:`, err);
                    }
                  }
                } else {
                  // Check if contact data is valid
                  if (!contactData.name || !contactData.email) {
                    console.error(`Skipping contact with invalid data: ${JSON.stringify(contactData)}`);
                    continue;
                  }
                  
                  // Try to create new contact
                  try {
                    const newContact = await storage.createContact(contactData);
                    console.log(`Created new contact #${newContact.id}: ${newContact.name} (${newContact.email})`);
                    importedContacts++;
                    
                    // Import opportunities and activities for this contact
                    try {
                      // Sync opportunities in background
                      syncLeadOpportunities(lead.id, newContact.id)
                        .then(result => {
                          if (result.count > 0) {
                            console.log(`Imported ${result.count} opportunities for new contact ${newContact.id}`);
                          }
                        })
                        .catch(err => {
                          console.error(`Error importing opportunities for new contact ${newContact.id}:`, err);
                        });
                      
                      // Sync activities in background
                      syncLeadActivities(lead.id, newContact.id)
                        .then(result => {
                          if (result.count > 0) {
                            console.log(`Imported ${result.count} activities for new contact ${newContact.id}`);
                          }
                        })
                        .catch(err => {
                          console.error(`Error importing activities for new contact ${newContact.id}:`, err);
                        });
                    } catch (err) {
                      console.error(`Error syncing related data for new contact ${newContact.id}:`, err);
                    }
                  } catch (error) {
                    const createError = error as Error;
                    console.error(`Error creating contact ${contactData.name} (${contactData.email}):`, createError);
                    
                    // Check if it's a duplicate email constraint violation
                    if (createError.message && createError.message.includes('duplicate key value violates unique constraint')) {
                      console.log(`Contact with email ${contactData.email} already exists. Trying to find and update.`);
                      const existingByEmail = await storage.getContactByEmail(contactData.email);
                      if (existingByEmail) {
                        if (resetMode) {
                          // In reset mode, mark the update specially
                          contactData.sourceData = JSON.stringify({...JSON.parse(contactData.sourceData), reset_mode: true});
                        }
                        await storage.updateContact(existingByEmail.id, contactData);
                        if (resetMode) {
                          importedContacts++; // Count as imported in reset mode
                          // Update sync status after each batch of 10 contacts
                          if (importedContacts % 10 === 0) {
                            syncStatus.updateCloseSyncStatus({
                              totalLeads,
                              processedLeads,
                              importedContacts,
                              errors
                            });
                          }
                        }
                        console.log(`Updated existing contact via email fallback: ${contactData.name} (${contactData.email})`);
                      }
                    } else {
                      // Re-throw other errors
                      throw createError;
                    }
                  }
                }
              } catch (contactError) {
                console.error(`Error processing contact ${contactData.name}:`, contactError);
                errors++;
              }
              
              // TODO: Process related data (opportunities, activities, etc.)
              // This would involve additional API calls and data processing
              
            } else {
              withoutEmail++;
              console.log(`Skipping lead without email: ${lead.display_name}`);
            }
            
          } catch (error) {
            console.error(`Error processing lead ${lead.id}:`, error);
            errors++;
          }
          
          // Update sync status periodically
          if (processedLeads % 10 === 0) {
            syncStatus.updateCloseSyncStatus({
              totalLeads,
              processedLeads,
              importedContacts,
              errors
            });
          }
        }
        
        // Update pagination info for next batch
        hasMore = response.data.has_more || false;
        cursor = response.data.cursor || '';  // Empty string instead of null to fix type issues
        
        // Log pagination details
        console.log(`Page ${page} complete. hasMore: ${hasMore}, cursor: ${cursor ? 'exists' : 'empty'}`);
        console.log(`Progress: ${processedLeads}/${totalLeads} leads processed, ${importedContacts} contacts imported`);
        
        // Handle the case when cursor is empty but hasMore is true
        if (hasMore && cursor === '' && page > 1) {
          console.log(`No cursor provided for next page, using skip-based pagination for page ${page+1}`);
          // We'll keep using empty string for cursor to indicate we need skip-based pagination
          // Don't set to null as it causes type errors
        }
        
        page++;
        
        // Update sync status after processing the batch
        syncStatus.updateCloseSyncStatus({
          totalLeads,
          processedLeads,
          importedContacts,
          errors
        });
        
      } catch (error: any) {
        console.error(`Error fetching leads page ${page}:`, error);
        errors++;
        consecutiveErrors++;
        
        // Advanced error handling and retry logic
        if (consecutiveErrors >= ERROR_THRESHOLD) {
          console.error(`Too many consecutive errors (${consecutiveErrors}). Aborting sync to prevent data issues.`);
          throw new Error(`Sync aborted after ${consecutiveErrors} consecutive errors`);
        }
        
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`Retrying page ${page} (Attempt ${retryCount} of ${MAX_RETRIES})...`);
          
          // Wait with exponential backoff before retrying
          const backoffTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
          console.log(`Waiting ${backoffTime/1000} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          
          // Don't increment page on retry
          shouldRetry = true;
          continue;
        }
        
        // Reset retry counter for next page
        retryCount = 0;
        
        // If we get an error after retries, log it but try to continue - we want all 5000+ contacts
        console.warn(`Error on page ${page} after ${MAX_RETRIES} retries, continuing to next page...`);
        
        // If cursor is null but we have more pages, try setting a new cursor
        if (cursor === '' && hasMore && page > 1) {
          console.log(`Lost cursor on page ${page}, attempting to continue with offset...`);
          // When cursor is lost, use _skip parameter to continue pagination
          page++;
          hasMore = true; // Force continuation
        } else {
          // Try to continue with the next page
          page++;
        }
      }
      
      // Reset consecutive errors counter after a successful page
      consecutiveErrors = 0;
    }
    
    // Final status update
    syncStatus.updateCloseSyncStatus({
      totalLeads,
      processedLeads,
      importedContacts,
      errors
    });
    
    return {
      success: true,
      count: importedContacts,
      withEmail,
      withoutEmail,
      errors,
      total: totalLeads
    };
    
  } catch (error: any) {
    console.error('Error syncing Close CRM leads:', error);
    
    // Update sync status with error info
    syncStatus.updateCloseSyncStatus({
      totalLeads,
      processedLeads,
      importedContacts,
      errors: errors + 1
    });
    
    return {
      success: false,
      error: error.message || 'Unknown error syncing Close CRM data',
      count: importedContacts,
      withEmail,
      withoutEmail,
      errors: errors + 1,
      total: totalLeads
    };
  }
}

/**
 * Fetch detailed information for a specific lead
 */
async function getLeadDetails(leadId: string) {
  try {
    const response = await closeApiClient.get(`/lead/${leadId}/`);
    return { success: true, lead: response.data };
  } catch (error: any) {
    console.error(`Error fetching lead ${leadId}:`, error);
    return { 
      success: false, 
      error: error.message || `Failed to fetch lead ${leadId}` 
    };
  }
}

/**
 * Sync all opportunities (deals) for a specific lead
 */
async function syncLeadOpportunities(leadId: string, contactId: number) {
  try {
    const response = await closeApiClient.get(`/opportunity/`, {
      params: { lead_id: leadId }
    });
    
    const opportunities = response.data.data || [];
    let importedDeals = 0;
    
    for (const opportunity of opportunities) {
      try {
        // Extract relevant deal data
        // Store original formatted value as-is since we changed the DB schema to text
        const dealData = {
          contactId,
          title: opportunity.opportunity_name || 'Unnamed Deal',
          status: opportunity.status_type || 'active',
          value: opportunity.value_formatted || String(opportunity.value) || null,
          closeDate: opportunity.date_won ? new Date(opportunity.date_won).toISOString() : null,
          assignedTo: opportunity.assigned_to_name || null,
          closeId: opportunity.id,
          createdAt: new Date(opportunity.date_created),
          metadata: JSON.stringify({
            status_label: opportunity.status_label,
            value_currency: opportunity.value_currency,
            value_period: opportunity.value_period,
            confidence: opportunity.confidence,
            lead_name: opportunity.lead_name,
            opportunity_data: opportunity
          })
        };
        
        // Check if deal exists by external ID
        const existingDeal = await storage.getDealBySourceId('close', opportunity.id);
        
        if (existingDeal) {
          // Update existing deal
          await storage.updateDeal(existingDeal.id, dealData);
        } else {
          // Create new deal
          await storage.createDeal(dealData);
          importedDeals++;
        }
      } catch (error) {
        console.error(`Error processing opportunity ${opportunity.id}:`, error);
      }
    }
    
    return { success: true, count: importedDeals, total: opportunities.length };
  } catch (error: any) {
    console.error(`Error syncing opportunities for lead ${leadId}:`, error);
    return { 
      success: false, 
      error: error.message || `Failed to sync opportunities for lead ${leadId}` 
    };
  }
}

/**
 * Sync all activities for a specific lead
 */
async function syncLeadActivities(leadId: string, contactId: number) {
  try {
    // There are multiple activity types in Close, we need to fetch each type
    const activityTypes = ['call', 'email', 'note', 'task'];
    let importedActivities = 0;
    let totalActivities = 0;
    
    for (const type of activityTypes) {
      try {
        const response = await closeApiClient.get(`/activity/${type}/`, {
          params: { lead_id: leadId }
        });
        
        const activities = response.data.data || [];
        totalActivities += activities.length;
        
        for (const activity of activities) {
          try {
            // Extract relevant activity data
            const activityData = {
              contactId,
              type: type,
              title: activity.subject || `${type} activity`,
              description: activity.note || '',
              date: new Date(activity.date_created),
              source: 'close',
              sourceId: activity.id,
              metadata: {
                status: activity.is_complete ? 'completed' : 'pending',
                activityType: type,
                activityData: activity
              }
            };
            
            // Check if activity exists by external ID
            const existingActivity = await storage.getActivityBySourceId('close', activity.id);
            
            if (existingActivity) {
              // Update existing activity
              await storage.updateActivity(existingActivity.id, activityData);
            } else {
              // Create new activity
              await storage.createActivity(activityData);
              importedActivities++;
            }
          } catch (error) {
            console.error(`Error processing activity ${activity.id}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error fetching ${type} activities for lead ${leadId}:`, error);
      }
    }
    
    return { success: true, count: importedActivities, total: totalActivities };
  } catch (error: any) {
    console.error(`Error syncing activities for lead ${leadId}:`, error);
    return { 
      success: false, 
      error: error.message || `Failed to sync activities for lead ${leadId}` 
    };
  }
}

/**
 * Sync a specific Close CRM lead to a contact
 * This imports all data including opportunities and activities
 * @param leadId ID of the Close CRM lead to sync
 */
async function syncCloseLeadToContact(leadId: string) {
  try {
    console.log(`Syncing lead ${leadId} from Close CRM...`);
    
    // Get lead details from Close
    const leadDetails = await getLeadDetails(leadId);
    
    if (!leadDetails) {
      throw new Error(`Failed to get lead details for ${leadId}`);
    }
    
    // Check if lead has at least one contact
    if (!leadDetails.contacts || leadDetails.contacts.length === 0) {
      throw new Error(`Lead ${leadId} has no contacts`);
    }
    
    // Get the primary contact from the lead
    const primaryContact = leadDetails.contacts[0];
    
    // Extract email address
    const email = primaryContact.emails && primaryContact.emails.length > 0
      ? primaryContact.emails[0].email 
      : null;
      
    if (!email) {
      throw new Error(`Lead contact in ${leadId} has no email address`);
    }
    
    // Extract phone number
    const phone = primaryContact.phones && primaryContact.phones.length > 0
      ? primaryContact.phones[0].phone
      : null;
      
    // Prepare contact data
    const contactData = {
      name: primaryContact.name || leadDetails.display_name,
      email: email,
      phone: phone,
      status: leadDetails.status_label || 'New',
      leadSource: 'close',
      notes: `Imported from Close CRM lead: ${leadDetails.display_name}`,
      metadata: {
        closeId: leadId,
        closeUrl: `https://app.close.com/lead/${leadId}/`,
        importedAt: new Date().toISOString()
      },
      createdAt: new Date(leadDetails.date_created),
      lastActivityDate: leadDetails.date_updated ? new Date(leadDetails.date_updated) : null,
      sourceData: JSON.stringify(leadDetails)
    };
    
    // Check if contact already exists
    let contact = await storage.getContactByEmail(email);
    
    if (contact) {
      // Update existing contact
      console.log(`Contact with email ${email} already exists (ID: ${contact.id}). Updating...`);
      contact = await storage.updateContact(contact.id, contactData);
      console.log(`Updated contact: ${contact.name} (${contact.email})`);
    } else {
      // Create new contact
      contact = await storage.createContact(contactData);
      console.log(`Created new contact: ${contact.name} (${contact.email})`);
    }
    
    // Now sync opportunities for this lead
    console.log(`Syncing opportunities for lead ${leadId}...`);
    const opportunitiesResult = await syncLeadOpportunities(leadId, contact.id);
    console.log(`Synced ${opportunitiesResult.count} opportunities for lead ${leadId}`);
    
    // Sync activities for this lead
    console.log(`Syncing activities for lead ${leadId}...`);
    const activitiesResult = await syncLeadActivities(leadId, contact.id);
    console.log(`Synced ${activitiesResult.count} activities for lead ${leadId}`);
    
    return contact;
  } catch (error: any) {
    console.error(`Failed to sync lead ${leadId}:`, error);
    throw error;
  }
}

/**
 * Fetch a limited number of leads for testing purposes
 * @param limit Maximum number of leads to fetch
 */
async function fetchLeads(limit: number = 5) {
  try {
    // First, test the API connection
    const connectionTest = await testApiConnection();
    if (!connectionTest.success) {
      throw new Error(`Close API connection failed: ${connectionTest.error}`);
    }
    
    console.log(`Fetching up to ${limit} leads from Close API for testing...`);
    const response = await closeApiClient.get('/lead/', {
      params: {
        _limit: limit
      }
    });
    
    return response.data.data || [];
  } catch (error: any) {
    console.error('Error fetching leads for testing:', error.message);
    throw error;
  }
}

export default {
  syncAllLeads,
  getLeadDetails,
  syncLeadOpportunities,
  syncLeadActivities,
  testApiConnection,
  fetchLeads,
  syncCloseLeadToContact
};