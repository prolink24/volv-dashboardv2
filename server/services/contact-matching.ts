/**
 * Contact Matching Service
 * 
 * This service handles matching contacts across different platforms (Close CRM, Calendly, Typeform)
 * to ensure proper data merging and attribution.
 */

import axios from 'axios';
import { db } from '../db';
import { eq, isNull } from 'drizzle-orm';
import { contacts } from '../../shared/schema';
import * as closeAPI from '../api/close';

/**
 * Normalize email addresses for consistent comparison
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Find a matching contact in Close CRM by email address
 */
export async function findContactInCloseCRM(email: string): Promise<any> {
  try {
    if (!email) {
      return { success: false, error: 'No email provided', contact: null };
    }
    
    const normalizedEmail = normalizeEmail(email);
    
    // Use the Close API service to search for leads by email
    const searchResult = await closeAPI.searchLeadsByEmail(normalizedEmail);
    
    if (!searchResult.success) {
      return { 
        success: false, 
        error: searchResult.error || 'Unknown error searching Close CRM',
        contact: null
      };
    }
    
    if (searchResult.leads && searchResult.leads.length > 0) {
      // Return the first matching lead
      return {
        success: true,
        contact: searchResult.leads[0]
      };
    }
    
    // No matching leads found
    return {
      success: true,
      contact: null
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error searching for contact in Close CRM',
      contact: null
    };
  }
}

/**
 * Create a new lead in Close CRM with contact information
 */
export async function createContactInCloseCRM(contactData: {
  name: string;
  email: string;
  company?: string;
  title?: string;
  phone?: string;
  source?: string;
}): Promise<any> {
  try {
    // Use the Close API service to create a new lead
    const result = await closeAPI.createLead({
      name: contactData.company || 'Unknown Company',
      contacts: [
        {
          name: contactData.name || 'Unknown Contact',
          title: contactData.title || '',
          phones: contactData.phone ? [{ phone: contactData.phone, type: 'office' }] : [],
          emails: [{ email: contactData.email, type: 'office' }]
        }
      ],
      status: 'Potential',
      description: `Created from ${contactData.source || 'Typeform submission'}`
    });
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to create lead in Close CRM',
        contact: null
      };
    }
    
    return {
      success: true,
      contact: result.lead
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error creating contact in Close CRM',
      contact: null
    };
  }
}

/**
 * Match and link Typeform contacts to Close CRM
 * Finds Typeform contacts without Close CRM IDs and attempts to match/create them
 */
export async function matchTypeformContactsToCloseCRM(): Promise<{
  success: boolean;
  processed: number;
  matched: number;
  created: number;
  failed: number;
  errors: string[];
}> {
  // Stats for reporting
  const result = {
    success: false,
    processed: 0,
    matched: 0,
    created: 0,
    failed: 0,
    errors: [] as string[]
  };
  
  try {
    // Find all Typeform contacts without Close CRM IDs
    const typeformContacts = await db.select()
      .from(contacts)
      .where(eq(contacts.leadSource, 'typeform'))
      .where(isNull(contacts.closeId));
    
    result.processed = typeformContacts.length;
    
    if (result.processed === 0) {
      return { ...result, success: true };
    }
    
    // Process each contact
    for (const contact of typeformContacts) {
      try {
        // Skip if no email
        if (!contact.email) {
          result.failed++;
          result.errors.push(`Contact ID ${contact.id}: No email address`);
          continue;
        }
        
        // Step 1: Search for matching lead in Close CRM
        const searchResult = await findContactInCloseCRM(contact.email);
        
        if (!searchResult.success) {
          result.failed++;
          result.errors.push(`Contact ID ${contact.id}: ${searchResult.error}`);
          continue;
        }
        
        let closeId: string;
        
        if (searchResult.contact) {
          // Match found - update our record
          closeId = searchResult.contact.id;
          result.matched++;
          
          // Update the contact with Close CRM data
          await db.update(contacts)
            .set({ 
              closeId: closeId,
              name: searchResult.contact.display_name || contact.name,
              company: searchResult.contact.company_name || contact.company,
              status: searchResult.contact.status_label?.toLowerCase() || contact.status,
              sourcesCount: contact.sourcesCount ? contact.sourcesCount + 1 : 2
            })
            .where(eq(contacts.id, contact.id));
          
        } else {
          // No match found - create new lead in Close CRM
          const createResult = await createContactInCloseCRM({
            name: contact.name || 'Unknown Contact',
            email: contact.email,
            company: contact.company || 'Unknown Company',
            source: 'Typeform submission'
          });
          
          if (!createResult.success) {
            result.failed++;
            result.errors.push(`Contact ID ${contact.id}: ${createResult.error}`);
            continue;
          }
          
          closeId = createResult.contact.id;
          result.created++;
          
          // Update the contact with the new Close CRM ID
          await db.update(contacts)
            .set({ 
              closeId: closeId,
              sourcesCount: contact.sourcesCount ? contact.sourcesCount + 1 : 2
            })
            .where(eq(contacts.id, contact.id));
        }
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Contact ID ${contact.id}: ${error.message || 'Unknown error'}`);
      }
    }
    
    return { ...result, success: true };
  } catch (error: any) {
    return {
      ...result,
      success: false,
      errors: [...result.errors, error.message || 'Unknown error']
    };
  }
}

/**
 * Match a single contact by email across all platforms (Close, Calendly, Typeform)
 */
export async function matchContactByEmail(email: string): Promise<{
  success: boolean;
  contact: any;
  error?: string;
}> {
  try {
    if (!email) {
      return { success: false, contact: null, error: 'No email provided' };
    }
    
    const normalizedEmail = normalizeEmail(email);
    
    // First check if contact exists in our database
    const existingContacts = await db.select()
      .from(contacts)
      .where(eq(contacts.email, normalizedEmail));
    
    if (existingContacts.length > 0) {
      // Contact exists in our database
      const contact = existingContacts[0];
      
      // If no Close CRM ID, try to find/create one
      if (!contact.closeId) {
        const closeResult = await findContactInCloseCRM(normalizedEmail);
        
        if (closeResult.success && closeResult.contact) {
          // Match found in Close CRM, update our record
          await db.update(contacts)
            .set({ 
              closeId: closeResult.contact.id,
              name: closeResult.contact.display_name || contact.name,
              company: closeResult.contact.company_name || contact.company,
              status: closeResult.contact.status_label?.toLowerCase() || contact.status,
              sourcesCount: contact.sourcesCount ? contact.sourcesCount + 1 : 2
            })
            .where(eq(contacts.id, contact.id));
            
          return { success: true, contact: { ...contact, closeId: closeResult.contact.id } };
        }
        
        // No match in Close CRM, create one
        const createResult = await createContactInCloseCRM({
          name: contact.name || 'Unknown Contact',
          email: contact.email,
          company: contact.company || 'Unknown Company',
          title: contact.title || '',
          phone: contact.phone || '',
          source: contact.leadSource || 'Unknown'
        });
        
        if (createResult.success) {
          // Update our record with the new Close CRM ID
          await db.update(contacts)
            .set({ 
              closeId: createResult.contact.id,
              sourcesCount: contact.sourcesCount ? contact.sourcesCount + 1 : 2
            })
            .where(eq(contacts.id, contact.id));
            
          return { success: true, contact: { ...contact, closeId: createResult.contact.id } };
        }
      }
      
      return { success: true, contact };
    }
    
    // Contact doesn't exist in our database, check Close CRM
    const closeResult = await findContactInCloseCRM(normalizedEmail);
    
    if (closeResult.success && closeResult.contact) {
      // Found in Close CRM, create in our database
      const newContact = {
        email: normalizedEmail,
        name: closeResult.contact.display_name || 'Unknown Contact',
        company: closeResult.contact.company_name || 'Unknown Company',
        closeId: closeResult.contact.id,
        leadSource: 'close',
        status: closeResult.contact.status_label?.toLowerCase() || 'lead',
        sourcesCount: 1
      };
      
      const insertResult = await db.insert(contacts)
        .values(newContact)
        .returning();
      
      if (insertResult.length > 0) {
        return { success: true, contact: insertResult[0] };
      }
    }
    
    // Not found anywhere, return failure
    return { success: false, contact: null, error: 'Contact not found in any platform' };
  } catch (error: any) {
    return { 
      success: false, 
      contact: null, 
      error: error.message || 'Unknown error matching contact'
    };
  }
}