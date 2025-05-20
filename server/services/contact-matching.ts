/**
 * Contact Matching Service
 * 
 * This service provides functions to match and merge contacts from different sources.
 * It's primarily used to match Typeform submissions with Close CRM contacts.
 */

import axios from 'axios';
import { db } from '../db';
import { eq, isNull, inArray } from 'drizzle-orm';
import { contacts, forms } from '../../shared/schema';

// Close CRM API client
const CLOSE_API_KEY = process.env.CLOSE_API_KEY;
const closeApi = axios.create({
  baseURL: 'https://api.close.com/api/v1',
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
 * Normalize email for consistent comparison
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Search for a contact in Close CRM by email
 */
export async function findContactInCloseCRM(email: string): Promise<{
  success: boolean;
  contact: any | null;
  error?: string;
}> {
  if (!CLOSE_API_KEY) {
    return {
      success: false,
      contact: null,
      error: 'Close API key not configured'
    };
  }

  try {
    const normalizedEmail = normalizeEmail(email);
    
    // Search for leads with this email
    const response = await closeApi.get('/lead', {
      params: {
        query: `email:${normalizedEmail}`,
        _fields: 'id,display_name,contacts,status_label,organization_name'
      }
    });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      return {
        success: true,
        contact: response.data.data[0]
      };
    }
    
    // No matching contact found
    return {
      success: true,
      contact: null
    };
  } catch (error: any) {
    console.error('Error searching for contact in Close CRM:', error.message);
    return {
      success: false,
      contact: null,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Create a new contact in Close CRM
 */
export async function createContactInCloseCRM(contactData: {
  name: string;
  email: string;
  company?: string;
  title?: string;
  phone?: string;
  source?: string;
}): Promise<{
  success: boolean;
  contact: any | null;
  error?: string;
}> {
  if (!CLOSE_API_KEY) {
    return {
      success: false,
      contact: null,
      error: 'Close API key not configured'
    };
  }

  try {
    // Build the payload for creating a lead in Close CRM
    const payload = {
      name: contactData.company || contactData.name,
      contacts: [
        {
          name: contactData.name,
          title: contactData.title || '',
          emails: [
            { email: contactData.email, type: 'office' }
          ],
          phones: contactData.phone ? [{ phone: contactData.phone, type: 'office' }] : []
        }
      ],
      status: 'Potential',
      custom: {
        source: contactData.source || 'Typeform'
      }
    };
    
    // Create the lead in Close CRM
    const response = await closeApi.post('/lead', payload);
    
    if (response.data && response.data.id) {
      return {
        success: true,
        contact: response.data
      };
    }
    
    return {
      success: false,
      contact: null,
      error: 'Failed to create contact in Close CRM'
    };
  } catch (error: any) {
    console.error('Error creating contact in Close CRM:', error.message);
    return {
      success: false,
      contact: null,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Link a typeform submission to a contact
 */
export async function linkFormToContact(formId: number, contactId: number): Promise<boolean> {
  try {
    await db.update(forms)
      .set({ contactId })
      .where(eq(forms.id, formId));
    
    return true;
  } catch (error) {
    console.error('Error linking form to contact:', error);
    return false;
  }
}

/**
 * Get specific contacts by email
 */
export async function getContactsByEmail(emails: string[]): Promise<any[]> {
  try {
    const contactList = await db.select()
      .from(contacts)
      .where(inArray(contacts.email, emails.map(normalizeEmail)));
    
    return contactList;
  } catch (error) {
    console.error('Error getting contacts by email:', error);
    return [];
  }
}

/**
 * Update specific capital contacts with proper company names
 */
export async function updateCapitalContacts(): Promise<{
  updated: number;
  errors: string[];
}> {
  // List of emails from the screenshot that need fixing
  const targetEmails = [
    'tom@atlasridge.io',
    'axel@caucelcapital.com',
    'nick@stowecap.co',
    'dimitri@vortexcapital.io',
    'vlad@light3capital.com',
    'admin@amaranthcp.com',
    'alex@lightuscapital.com',
    'ali@spikecapital.io'
  ];
  
  const companyMappings: Record<string, string> = {
    'atlasridge.io': 'Atlas Ridge',
    'caucelcapital.com': 'Caucel Capital',
    'stowecap.co': 'Stowe Capital',
    'vortexcapital.io': 'Vortex Capital',
    'light3capital.com': 'Light3 Capital',
    'amaranthcp.com': 'Amaranth Capital Partners',
    'lightuscapital.com': 'Lightus Capital',
    'spikecapital.io': 'Spike Capital'
  };
  
  let updated = 0;
  const errors: string[] = [];
  
  try {
    const contactList = await getContactsByEmail(targetEmails);
    
    for (const contact of contactList) {
      try {
        // Extract domain from email
        const emailParts = contact.email.split('@');
        const domain = emailParts[1];
        
        // Get proper company name from mapping
        const companyName = companyMappings[domain];
        
        if (companyName) {
          await db.update(contacts)
            .set({ 
              company: companyName,
              // If name is "Unknown Contact", update it to a better default
              name: contact.name === 'Unknown Contact' ? 
                emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1) : 
                contact.name
            })
            .where(eq(contacts.id, contact.id));
          
          updated++;
        }
      } catch (error: any) {
        errors.push(`Error updating ${contact.email}: ${error.message}`);
      }
    }
    
    return { updated, errors };
  } catch (error: any) {
    return { 
      updated, 
      errors: [...errors, `General error: ${error.message}`] 
    };
  }
}

/**
 * Process a batch of contacts to match with Close CRM
 */
export async function processBatch(batch: any[], options: {
  createIfNotFound?: boolean;
  updateSourceCount?: boolean;
} = {}): Promise<{
  matched: number;
  created: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    matched: 0,
    created: 0,
    failed: 0,
    errors: [] as string[]
  };
  
  for (const contact of batch) {
    try {
      console.log(`Processing contact: ${contact.email}`);
      
      // Search for the contact in Close CRM
      const searchResult = await findContactInCloseCRM(contact.email);
      
      if (!searchResult.success) {
        console.error(`Error searching for contact in Close CRM: ${searchResult.error}`);
        results.failed++;
        results.errors.push(`${contact.email}: ${searchResult.error}`);
        continue;
      }
      
      if (searchResult.contact) {
        // Match found in Close CRM
        console.log(`Found matching lead in Close CRM: ${searchResult.contact.id}`);
        
        // Update our contact with Close CRM data
        await db.update(contacts)
          .set({ 
            closeId: searchResult.contact.id,
            name: searchResult.contact.contacts?.[0]?.name || contact.name,
            company: searchResult.contact.organization_name || contact.company,
            status: searchResult.contact.status_label?.toLowerCase() || contact.status,
            ...(options.updateSourceCount ? { sourcesCount: contact.sourcesCount ? contact.sourcesCount + 1 : 2 } : {})
          })
          .where(eq(contacts.id, contact.id));
        
        results.matched++;
      } else if (options.createIfNotFound) {
        // No match found, create a new lead in Close CRM
        console.log(`No matching lead found for ${contact.email}. Creating new lead...`);
        
        const createResult = await createContactInCloseCRM({
          name: contact.name || 'Unknown Contact',
          email: contact.email,
          company: contact.company || 'Unknown Company',
          title: contact.title || '',
          phone: contact.phone || '',
          source: 'Typeform'
        });
        
        if (!createResult.success) {
          console.error(`Failed to create lead in Close CRM: ${createResult.error}`);
          results.failed++;
          results.errors.push(`${contact.email}: ${createResult.error}`);
          continue;
        }
        
        console.log(`Created new lead in Close CRM: ${createResult.contact.id}`);
        
        // Update our contact with the new Close CRM ID
        await db.update(contacts)
          .set({ 
            closeId: createResult.contact.id,
            ...(options.updateSourceCount ? { sourcesCount: contact.sourcesCount ? contact.sourcesCount + 1 : 2 } : {})
          })
          .where(eq(contacts.id, contact.id));
        
        results.created++;
      }
    } catch (error: any) {
      console.error(`Unexpected error processing contact ${contact.email}: ${error.message}`);
      results.failed++;
      results.errors.push(`${contact.email}: ${error.message}`);
    }
  }
  
  return results;
}