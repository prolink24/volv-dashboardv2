import axios from 'axios';
import { storage } from '../storage';
import { InsertContact, InsertActivity, InsertDeal } from '@shared/schema';

const CLOSE_API_KEY = process.env.CLOSE_API_KEY || '';
const CLOSE_API_URL = 'https://api.close.com/api/v1';

// Configure axios for Close API
const closeApi = axios.create({
  baseURL: CLOSE_API_URL,
  auth: {
    username: CLOSE_API_KEY,
    password: ''
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
        closeDate: opportunity.date_won ? new Date(opportunity.date_won) : undefined,
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

// Fetch all leads from Close 
export async function fetchAllLeads() {
  try {
    let hasMore = true;
    let cursor = '';
    const leads = [];
    
    while (hasMore) {
      const url = cursor ? `/lead/?cursor=${cursor}` : '/lead/';
      const response = await closeApi.get(url);
      
      leads.push(...response.data.data);
      
      hasMore = response.data.has_more;
      cursor = response.data.cursor;
    }
    
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
    
    for (const lead of leads) {
      await syncCloseLeadToContact(lead.id);
    }
    
    return { success: true, count: leads.length };
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
