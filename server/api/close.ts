import axios from 'axios';
import { storage } from '../storage';
import { InsertContact, InsertActivity, InsertDeal } from '@shared/schema';

const CLOSE_API_KEY = process.env.CLOSE_API_KEY || '';
const CLOSE_API_URL = 'https://api.close.com/api/v1';

// Configure axios for Close API - using the API key as per Close documentation
// https://developer.close.com/#authentication
const closeApi = axios.create({
  baseURL: CLOSE_API_URL,
  headers: {
    'Authorization': `Basic ${Buffer.from(CLOSE_API_KEY + ':').toString('base64')}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Maps Close lead status to our system's status
const statusMap: Record<string, string> = {
  'Lead': 'lead',
  'Qualified': 'qualified',
  'Opportunity': 'opportunity',
  'Customer': 'customer',
  'Bad Fit': 'disqualified'
};

// Sync a lead from Close to our system
export async function syncCloseLeadToContact(leadId: string) {
  try {
    console.log(`Processing lead ID: ${leadId}`);
    
    // Check if we already have this lead
    const existingContact = await storage.getContactByExternalId('close', leadId);
    console.log(`Existing contact for lead ${leadId}: ${existingContact ? 'Yes (ID: ' + existingContact.id + ')' : 'No'}`);
    
    // Fetch lead data from Close
    console.log(`Fetching lead data from Close for lead ID: ${leadId}`);
    const response = await closeApi.get(`/lead/${leadId}`);
    const leadData = response.data;
    
    // Check if lead has valid email
    const email = leadData.contacts?.[0]?.emails?.[0]?.email;
    if (!email) {
      console.warn(`Lead ${leadId} (${leadData.display_name || 'Unnamed'}) has no email - cannot create contact`);
      throw new Error('Lead has no email address');
    }
    
    console.log(`Creating contact data for ${leadData.display_name}, email: ${email}`);
    
    // Extract contact data
    const contactData: InsertContact = {
      name: leadData.display_name || 'Unknown',
      email: email,
      phone: leadData.contacts?.[0]?.phones?.[0]?.phone || '',
      company: leadData.company || '',
      title: leadData.contacts?.[0]?.title || '',
      closeId: leadId,
      leadSource: leadData.custom?.['lead_source'] || 'close',
      status: statusMap[leadData.status_label] || 'lead',
      assignedTo: leadData.assigned_to,
      notes: leadData.custom?.['notes'] || ''
    };
    
    let contact;
    if (existingContact) {
      // Update existing contact
      console.log(`Updating existing contact ID ${existingContact.id} for lead ${leadId}`);
      contact = await storage.updateContact(existingContact.id, contactData);
    } else {
      // Create new contact
      console.log(`Creating new contact for lead ${leadId}`);
      try {
        contact = await storage.createContact(contactData);
        console.log(`Successfully created contact ID ${contact.id} for lead ${leadId}`);
      } catch (dbError: any) {
        console.error(`Database error creating contact for lead ${leadId}:`, dbError.message);
        if (dbError.code) {
          console.error(`SQL error code: ${dbError.code}`);
        }
        throw dbError;
      }
    }
    
    if (!contact) {
      throw new Error(`Failed to create or update contact for lead ${leadId}`);
    }
    
    // Sync activities
    console.log(`Syncing activities for lead ${leadId}, contact ID ${contact.id}`);
    await syncCloseActivities(leadId, contact.id);
    
    // Sync opportunities (deals)
    console.log(`Syncing opportunities for lead ${leadId}, contact ID ${contact.id}`);
    await syncCloseOpportunities(leadId, contact.id);
    
    console.log(`Successfully synced lead ${leadId} to contact ID ${contact.id}`);
    return contact;
  } catch (error: any) {
    console.error(`Error syncing Close lead ${leadId}:`, error.message);
    throw error;
  }
}

// Sync activities from Close
export async function syncCloseActivities(leadId: string, contactId: number) {
  try {
    const response = await closeApi.get(`/activity/?lead_id=${leadId}`);
    const activities = response.data.data || [];
    
    for (const activity of activities) {
      // Skip if we've already synced this activity
      const existingActivity = await storage.getActivity(parseInt(activity.id));
      if (existingActivity) continue;
      
      const activityData: InsertActivity = {
        contactId,
        type: activity._type || 'note',
        source: 'close',
        sourceId: activity.id,
        title: activity.subject || 'Activity from Close',
        description: activity.text || '',
        date: new Date(activity.date_created),
        metadata: {
          closeData: activity
        }
      };
      
      await storage.createActivity(activityData);
    }
  } catch (error) {
    console.error('Error syncing Close activities:', error);
    throw error;
  }
}

// Sync opportunities (deals) from Close
export async function syncCloseOpportunities(leadId: string, contactId: number) {
  try {
    const response = await closeApi.get(`/opportunity/?lead_id=${leadId}`);
    const opportunities = response.data.data || [];
    
    for (const opportunity of opportunities) {
      // Skip if we've already synced this opportunity
      const existingDeals = await storage.getDealsByContactId(contactId);
      const existingDeal = existingDeals.find(d => d.closeId === opportunity.id);
      
      const dealData: InsertDeal = {
        contactId,
        title: opportunity.note || 'Opportunity from Close',
        value: opportunity.value,
        status: opportunity.status_label.toLowerCase(),
        closeDate: opportunity.date_won || null,
        closeId: opportunity.id,
        assignedTo: opportunity.assigned_to,
        metadata: {
          closeData: opportunity
        }
      };
      
      if (existingDeal) {
        await storage.updateDeal(existingDeal.id, dealData);
      } else {
        await storage.createDeal(dealData);
      }
    }
  } catch (error) {
    console.error('Error syncing Close opportunities:', error);
    throw error;
  }
}

// Test Close API connectivity and authentication
async function testCloseApiConnection() {
  try {
    // Try different endpoints to maximize our chances of connecting successfully
    const endpoints = [
      { path: '/me', name: 'user profile' },
      { path: '/organization', name: 'organization' },
      { path: '/lead', name: 'leads' },
      { path: '/status/lead', name: 'lead statuses' },
      { path: '/activity', name: 'activities' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Testing Close API connection using ${endpoint.name} endpoint...`);
        const response = await closeApi.get(endpoint.path);
        console.log(`Successfully connected to Close API via ${endpoint.name} endpoint`);
        
        if (endpoint.path === '/me') {
          console.log(`Authenticated as: ${response.data.first_name} ${response.data.last_name}`);
        }
        
        return true;
      } catch (error: any) {
        console.warn(`Failed to connect to ${endpoint.name} endpoint: ${error.message}`);
        if (error.response) {
          console.warn(`Status: ${error.response.status}, Data:`, error.response.data);
        }
        // Continue trying other endpoints
      }
    }
    
    // If we get here, all endpoints failed
    throw new Error('All Close API endpoints failed');
  } catch (error) {
    console.error('Error testing Close API connection:', error);
    throw error;
  }
}

// Fetch all leads from Close 
export async function fetchAllLeads() {
  try {
    console.log('Fetching leads from Close API...');
    
    // First, verify the API connection
    await testCloseApiConnection();
    
    let hasMore = true;
    let cursor = '';
    const leads = [];
    let page = 1;
    
    // Fetch all leads using pagination
    while (hasMore) {
      console.log(`Fetching leads page ${page}, cursor: ${cursor || 'initial'}`);
      const url = cursor ? `/lead/?cursor=${cursor}` : '/lead/';
      
      try {
        const response = await closeApi.get(url);
        const pageLeads = response.data.data || [];
        console.log(`Fetched ${pageLeads.length} leads on page ${page}`);
        
        leads.push(...pageLeads);
        
        hasMore = response.data.has_more;
        cursor = response.data.cursor;
        page++;
        
        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        console.error(`Error fetching leads page ${page}:`, error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        
        // If we have some leads already, return them instead of failing completely
        if (leads.length > 0) {
          console.log(`Returning ${leads.length} leads that were successfully fetched before the error`);
          return leads;
        }
        
        throw error;
      }
    }
    
    console.log(`Total leads fetched: ${leads.length}`);
    return leads;
  } catch (error) {
    console.error('Error fetching leads from Close:', error);
    throw error;
  }
}

// Sync all leads from Close to our system, ensuring we get ALL contacts and related data
export async function syncAllLeads() {
  try {
    const leads = await fetchAllLeads();
    console.log(`Starting to sync ${leads.length} leads to contacts`);
    
    let successCount = 0;
    let errorCount = 0;
    let noEmailCount = 0;
    
    // Process in batches to prevent memory issues with large datasets
    const batchSize = 25;
    const totalBatches = Math.ceil(leads.length / batchSize);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * batchSize;
      const batchEnd = Math.min((batchIndex + 1) * batchSize, leads.length);
      const batch = leads.slice(batchStart, batchEnd);
      
      console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (leads ${batchStart + 1}-${batchEnd})`);
      
      // Process each lead in the batch in sequence
      for (const lead of batch) {
        try {
          // Check if the lead has valid contact information
          const hasEmail = lead.contacts?.some((c: any) => c.emails?.length > 0);
          
          if (hasEmail) {
            console.log(`Syncing lead ${lead.id}: ${lead.display_name || 'Unnamed Lead'}`);
            await syncCloseLeadToContact(lead.id);
            successCount++;
          } else {
            // For leads without emails, we'll create a synthetic email to ensure we capture ALL leads
            // This is important for comprehensive data attribution
            console.log(`Lead ${lead.id}: ${lead.display_name || 'Unnamed Lead'} has no email - generating placeholder`);
            
            // Modify the lead object to include a synthetic email before syncing
            const syntheticEmail = `lead-${lead.id.replace(/[^a-zA-Z0-9]/g, '-')}@placeholder.crm`;
            
            // If the lead has contacts but no emails, add the synthetic email
            if (lead.contacts && lead.contacts.length > 0) {
              if (!lead.contacts[0].emails) {
                lead.contacts[0].emails = [];
              }
              lead.contacts[0].emails.push({ email: syntheticEmail, type: 'office' });
            } else {
              // If the lead has no contacts at all, create one
              lead.contacts = [{
                emails: [{ email: syntheticEmail, type: 'office' }]
              }];
            }
            
            // Now sync the lead with the synthetic email
            await syncCloseLeadToContact(lead.id);
            noEmailCount++;
          }
        } catch (error) {
          console.error(`Error syncing lead ${lead.id}:`, error);
          errorCount++;
        }
        
        // Add a small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`Completed batch ${batchIndex + 1}/${totalBatches}`);
      console.log(`Progress: ${successCount + noEmailCount + errorCount}/${leads.length} (${Math.round(((successCount + noEmailCount + errorCount) / leads.length) * 100)}%)`);
      
      // Add a larger delay between batches to let the system catch up
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const totalProcessed = successCount + noEmailCount;
    console.log(`Completed syncing leads:`);
    console.log(`- ${successCount} leads with valid emails synced successfully`);
    console.log(`- ${noEmailCount} leads with generated placeholder emails synced`);
    console.log(`- ${errorCount} leads failed to sync`);
    console.log(`- ${leads.length - totalProcessed - errorCount} leads skipped`);
    console.log(`Total processed: ${totalProcessed} out of ${leads.length} (${Math.round((totalProcessed / leads.length) * 100)}%)`);
    
    return { 
      success: true, 
      count: totalProcessed, 
      withEmail: successCount,
      withoutEmail: noEmailCount, 
      errors: errorCount, 
      total: leads.length 
    };
  } catch (error) {
    console.error('Error syncing all leads from Close:', error);
    throw error;
  }
}

export default {
  syncCloseLeadToContact,
  syncCloseActivities,
  syncCloseOpportunities,
  fetchAllLeads,
  syncAllLeads
};
