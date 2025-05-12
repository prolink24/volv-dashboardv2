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
    // Check if we already have this lead
    const existingContact = await storage.getContactByExternalId('close', leadId);
    
    // Fetch lead data from Close
    const response = await closeApi.get(`/lead/${leadId}`);
    const leadData = response.data;
    
    // Extract contact data
    const contactData: InsertContact = {
      name: leadData.display_name || 'Unknown',
      email: leadData.contacts?.[0]?.emails?.[0]?.email || '',
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
      contact = await storage.updateContact(existingContact.id, contactData);
    } else {
      // Create new contact
      contact = await storage.createContact(contactData);
    }
    
    // Sync activities
    await syncCloseActivities(leadId, contact!.id);
    
    // Sync opportunities (deals)
    await syncCloseOpportunities(leadId, contact!.id);
    
    return contact;
  } catch (error) {
    console.error('Error syncing Close lead:', error);
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

// Sync all leads from Close to our system
export async function syncAllLeads() {
  try {
    const leads = await fetchAllLeads();
    console.log(`Starting to sync ${leads.length} leads to contacts`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const lead of leads) {
      try {
        // Check if the lead has valid contact information
        const hasEmail = lead.contacts?.some(c => c.emails?.length > 0);
        
        if (hasEmail) {
          console.log(`Syncing lead ${lead.id}: ${lead.display_name || 'Unnamed Lead'}`);
          await syncCloseLeadToContact(lead.id);
          successCount++;
        } else {
          console.log(`Skipping lead ${lead.id}: ${lead.display_name || 'Unnamed Lead'} - no email address found`);
        }
      } catch (error) {
        console.error(`Error syncing lead ${lead.id}:`, error);
        errorCount++;
      }
      
      // Add a small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`Completed syncing leads: ${successCount} successful, ${errorCount} errors, ${leads.length - successCount - errorCount} skipped`);
    
    return { success: true, count: successCount, errors: errorCount, total: leads.length };
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
