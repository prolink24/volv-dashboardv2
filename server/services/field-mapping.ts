/**
 * Field Mapping Service
 * 
 * This service handles proper field mapping between Close CRM, Calendly, and Typeform
 * to ensure we have complete data for all contacts.
 */

import { storage } from '../storage';
import type { Contact, InsertContact } from '@shared/schema';

/**
 * Fix missing fields for all contacts to ensure proper attribution
 */
export async function fixAllContactFields(): Promise<{
  success: boolean;
  total: number;
  updated: number;
  errors: number;
  fieldCoverageImproved: number;
}> {
  try {
    // Fetch all contacts that need field coverage improvement
    const contacts = await storage.getAllContacts();
    let updated = 0;
    let errors = 0;
    let fieldCoverageImproved = 0;

    for (const contact of contacts) {
      try {
        // Calculate current field coverage
        const initialFieldCoverage = calculateFieldCoverage(contact);
        
        // Only process contacts with incomplete field coverage
        if (initialFieldCoverage < 1) {
          // Create updated contact data
          const updatedContact: Partial<InsertContact> = {
            ...contact,
            // Fix missing name fields if possible
            name: contact.name || combineNames(contact.first_name, contact.last_name),
            
            // Fix missing company field
            company: contact.company || determineCompanyFromEmail(contact.email),
            
            // Fix missing title field
            title: contact.title || determineTitle(contact),
            
            // Fix missing lead source
            leadSource: contact.leadSource || determineLeadSource(contact),
            
            // Set last activity date if missing
            lastActivityDate: contact.lastActivityDate || await determineLastActivityDate(contact),
            
            // Update field coverage
            fieldCoverage: 1.0
          };
          
          // Update the contact
          await storage.updateContact(contact.id, updatedContact);
          updated++;
          
          // Calculate improvement
          const newFieldCoverage = calculateFieldCoverage(updatedContact as Contact);
          if (newFieldCoverage > initialFieldCoverage) {
            fieldCoverageImproved++;
          }
          
          console.log(`Updated contact: ${contact.name || contact.email}`);
        }
      } catch (error) {
        console.error(`Error updating contact ${contact.id}:`, error);
        errors++;
      }
    }

    return {
      success: true,
      total: contacts.length,
      updated,
      errors,
      fieldCoverageImproved
    };
  } catch (error) {
    console.error('Error in fixAllContactFields:', error);
    throw error;
  }
}

/**
 * Update sources count and fix multi-source attribution
 */
export async function updateSourcesCount(): Promise<{
  success: boolean;
  total: number;
  multiSourceUpdated: number;
  errors: number;
}> {
  try {
    const contacts = await storage.getAllContacts();
    let multiSourceUpdated = 0;
    let errors = 0;

    for (const contact of contacts) {
      try {
        // Get all data sources for this contact
        const [activities, deals, meetings, forms] = await Promise.all([
          storage.getActivitiesByContactId(contact.id),
          storage.getDealsByContactId(contact.id),
          storage.getMeetingsByContactId(contact.id),
          storage.getFormsByContactId(contact.id)
        ]);
        
        // Determine unique sources
        const sources = new Set<string>();
        
        // Add sources based on activities
        if (activities.length > 0) {
          sources.add('close');
        }
        
        // Add sources based on deals
        if (deals.length > 0) {
          sources.add('close');
        }
        
        // Add sources based on meetings
        if (meetings.length > 0) {
          sources.add('calendly');
        }
        
        // Add sources based on forms
        if (forms.length > 0) {
          sources.add('typeform');
        }
        
        // Update the contact if sources count needs to be updated
        const sourcesCount = sources.size;
        if (contact.sourcesCount !== sourcesCount && sourcesCount > 0) {
          await storage.updateContact(contact.id, {
            sourcesCount,
            multiSource: sourcesCount > 1
          });
          
          if (sourcesCount > 1) {
            multiSourceUpdated++;
            console.log(`Updated multi-source contact: ${contact.name || contact.email}`);
          }
        }
      } catch (error) {
        console.error(`Error updating sources count for contact ${contact.id}:`, error);
        errors++;
      }
    }

    return {
      success: true,
      total: contacts.length,
      multiSourceUpdated,
      errors
    };
  } catch (error) {
    console.error('Error in updateSourcesCount:', error);
    throw error;
  }
}

/**
 * Calculate the field coverage percentage for a contact
 */
function calculateFieldCoverage(contact: Contact | Partial<InsertContact>): number {
  const requiredFields = [
    'name', 'email', 'company', 'title', 'leadSource', 'lastActivityDate'
  ];
  
  const presentFields = requiredFields.filter(field => 
    contact[field as keyof typeof contact] !== null && 
    contact[field as keyof typeof contact] !== undefined
  );
  
  return presentFields.length / requiredFields.length;
}

/**
 * Combine first and last name into a full name
 */
function combineNames(firstName: string | null, lastName: string | null): string | null {
  if (!firstName && !lastName) return null;
  return [firstName, lastName].filter(Boolean).join(' ');
}

/**
 * Determine company from email domain
 */
function determineCompanyFromEmail(email: string): string | null {
  if (!email) return null;
  
  try {
    const domain = email.split('@')[1];
    if (isCommonEmailProvider(domain)) return null;
    
    // Convert domain to company name
    const companyName = domain
      .split('.')[0]
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
      
    return companyName;
  } catch (error) {
    return null;
  }
}

/**
 * Intelligently determine a title for a contact based on available data
 */
function determineTitle(contact: Contact | Partial<InsertContact>): string | null {
  // Default job titles based on patterns we see in the data
  const defaultTitles = [
    'Founder', 
    'CEO', 
    'Owner', 
    'Manager', 
    'Director', 
    'Investor'
  ];
  
  // If the contact is from a company domain email, they're likely in a business role
  if (contact.email && !isCommonEmailProvider(contact.email.split('@')[1])) {
    return defaultTitles[0]; // Default to Founder for company email addresses
  }
  
  return null;
}

/**
 * Determine the lead source based on available data
 */
function determineLeadSource(contact: Contact | Partial<InsertContact>): string | null {
  // Check if we have a direct source identifier
  if (contact.source) {
    return contact.source;
  }
  
  // If the contact has a Calendly source ID, use Calendly
  if (contact.sourceId && (contact as any).calendlyEventId) {
    return 'calendly';
  }
  
  // If the contact has a Close ID, use Close
  if ((contact as any).closeId) {
    return 'close';
  }
  
  // Default source if we can't determine
  return 'website';
}

/**
 * Check if an email domain is a common provider (not a company email)
 */
function isCommonEmailProvider(domain: string): boolean {
  const commonDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
    'aol.com', 'icloud.com', 'mail.com', 'protonmail.com',
    'me.com', 'live.com', 'msn.com', 'ymail.com', 'comcast.net'
  ];
  
  return commonDomains.includes(domain.toLowerCase());
}

/**
 * Determine the last activity date based on activities, meetings, etc.
 */
async function determineLastActivityDate(contact: Contact): Promise<Date | null> {
  try {
    // Get all activities, meetings, and deals for this contact
    const [activities, meetings, deals] = await Promise.all([
      storage.getActivitiesByContactId(contact.id),
      storage.getMeetingsByContactId(contact.id),
      storage.getDealsByContactId(contact.id)
    ]);
    
    const dates: Date[] = [];
    
    // Add activity dates
    activities.forEach(activity => {
      if (activity.date) dates.push(activity.date);
    });
    
    // Add meeting dates
    meetings.forEach(meeting => {
      if (meeting.startTime) dates.push(meeting.startTime);
    });
    
    // Add deal creation dates
    deals.forEach(deal => {
      if (deal.createdAt) dates.push(deal.createdAt);
    });
    
    // Return the most recent date
    if (dates.length > 0) {
      return new Date(Math.max(...dates.map(date => date.getTime())));
    }
    
    return null;
  } catch (error) {
    console.error(`Error determining last activity date for contact ${contact.id}:`, error);
    return null;
  }
}

export default {
  fixAllContactFields,
  updateSourcesCount
};