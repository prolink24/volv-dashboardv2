/**
 * Field Mapping Service
 * 
 * This service handles proper field mapping between Close CRM, Calendly, and Typeform
 * to ensure we have complete data for all contacts.
 */

import { storage } from '../storage';
import { Contact, InsertContact } from '@shared/schema';
import closeAPI from '../api/close';
import calendlyAPI from '../api/calendly';
import * as typeformAPI from '../api/typeform';

// Common email providers - used to infer proper company names
const COMMON_EMAIL_PROVIDERS = [
  'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'aol.com',
  'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com',
  'gmx.com', 'live.com', 'msn.com', 'me.com', 'inbox.com'
];

/**
 * Fix missing fields for all contacts to ensure proper attribution
 */
export async function fixAllContactFields(): Promise<{
  success: boolean;
  processed: number;
  updated: number;
  error?: string;
}> {
  try {
    console.log('Starting contact field mapping fix...');
    
    // Get all contacts
    const contacts = await storage.getAllContacts();
    console.log(`Found ${contacts.length} contacts to process`);
    
    let updatedCount = 0;
    
    // Process each contact
    for (const contact of contacts) {
      const needsUpdate = !contact.title || 
                         !contact.lastActivityDate || 
                         !contact.assignedTo ||
                         (contact.sourcesCount || 0) <= 1;
      
      if (needsUpdate) {
        // Create updated contact data
        const updatedContact: Partial<Contact> = {
          ...contact,
        };
        
        // Fix missing title
        if (!contact.title) {
          updatedContact.title = determineTitle(contact);
        }
        
        // Fix missing lastActivityDate 
        if (!contact.lastActivityDate) {
          // Get most recent activity date
          const activities = await storage.getActivitiesByContactId(contact.id);
          if (activities && activities.length > 0) {
            // Sort by date descending
            activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            updatedContact.lastActivityDate = activities[0].date;
          } else {
            // If no activities, use createdAt as fallback
            updatedContact.lastActivityDate = contact.createdAt;
          }
        }
        
        // Fix missing assignedTo
        if (!contact.assignedTo) {
          // Check if there's an assignedTo in Close CRM
          const closeAssignments = await storage.getContactUserAssignments(contact.id);
          if (closeAssignments && closeAssignments.length > 0) {
            // Get the user details
            const closeUser = await storage.getCloseUser(closeAssignments[0].closeUserId);
            if (closeUser) {
              updatedContact.assignedTo = closeUser.name;
              updatedContact.assignmentDate = closeAssignments[0].assignmentDate;
            }
          } else {
            // Default to system assignment
            updatedContact.assignedTo = "System";
            updatedContact.assignmentDate = new Date();
          }
        }
        
        // Update the contact
        await storage.updateContact(contact.id, updatedContact);
        updatedCount++;
        
        if (updatedCount % 100 === 0) {
          console.log(`Processed ${updatedCount} contacts so far...`);
        }
      }
    }
    
    console.log(`Completed contact field mapping. Updated ${updatedCount} contacts.`);
    
    return {
      success: true,
      processed: contacts.length,
      updated: updatedCount
    };
  } catch (error: any) {
    console.error('Error fixing contact fields:', error);
    return {
      success: false,
      processed: 0,
      updated: 0,
      error: error.message
    };
  }
}

/**
 * Update sources count and fix multi-source attribution
 */
export async function updateSourcesCount(): Promise<{
  success: boolean;
  updated: number;
  withMultipleSources: number;
  error?: string;
}> {
  try {
    console.log('Starting source count update...');
    
    // Get all contacts
    const contacts = await storage.getAllContacts();
    console.log(`Found ${contacts.length} contacts to process`);
    
    let updatedCount = 0;
    let multiSourceCount = 0;
    
    // Process each contact
    for (const contact of contacts) {
      // Count data from different sources
      const closeActivities = await storage.getActivitiesByContactId(contact.id, 'close');
      const calendlyMeetings = await storage.getMeetingsByContactId(contact.id);
      const typeformForms = await storage.getFormsByContactId(contact.id);
      
      const sources = [];
      if (closeActivities.length > 0) sources.push('close');
      if (calendlyMeetings.length > 0) sources.push('calendly');
      if (typeformForms.length > 0) sources.push('typeform');
      
      const sourcesCount = sources.length;
      const leadSource = sources.join(',');
      
      // Check if update is needed
      if (sourcesCount !== contact.sourcesCount || leadSource !== contact.leadSource) {
        await storage.updateContact(contact.id, {
          sourcesCount,
          leadSource
        });
        
        updatedCount++;
        
        if (sourcesCount > 1) {
          multiSourceCount++;
        }
      }
    }
    
    console.log(`Completed source count update. Updated ${updatedCount} contacts.`);
    console.log(`Found ${multiSourceCount} contacts with multiple sources.`);
    
    return {
      success: true,
      updated: updatedCount,
      withMultipleSources: multiSourceCount
    };
  } catch (error: any) {
    console.error('Error updating sources count:', error);
    return {
      success: false,
      updated: 0,
      withMultipleSources: 0,
      error: error.message
    };
  }
}

/**
 * Intelligently determine a title for a contact based on available data
 */
function determineTitle(contact: Contact): string {
  // Use existing data to infer title
  
  // First, check if we have a company
  if (contact.company) {
    // Generic titles by company
    if (contact.company.toLowerCase().includes('real estate') || 
        contact.company.toLowerCase().includes('properties') ||
        contact.company.toLowerCase().includes('realty')) {
      return 'Real Estate Investor';
    }
    
    if (contact.company.toLowerCase().includes('construction') || 
        contact.company.toLowerCase().includes('builders') ||
        contact.company.toLowerCase().includes('contractors')) {
      return 'Construction Manager';
    }
    
    if (contact.company.toLowerCase().includes('investment') || 
        contact.company.toLowerCase().includes('capital') ||
        contact.company.toLowerCase().includes('financial')) {
      return 'Investment Manager';
    }
    
    // Default based on company
    return 'Business Owner';
  }
  
  // If we have an email, try to infer from domain
  if (contact.email) {
    const domain = contact.email.split('@')[1];
    
    // Check if it's a common provider or a company domain
    if (!COMMON_EMAIL_PROVIDERS.includes(domain.toLowerCase())) {
      return 'Business Professional';
    }
  }
  
  // Default title
  return 'Lead';
}

/**
 * Check if an email domain is a common provider (not a company email)
 */
function isCommonEmailProvider(domain: string): boolean {
  return COMMON_EMAIL_PROVIDERS.includes(domain.toLowerCase());
}

export default {
  fixAllContactFields,
  updateSourcesCount,
  determineTitle
};