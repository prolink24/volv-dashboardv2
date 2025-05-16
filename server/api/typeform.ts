/**
 * Typeform API Integration
 * 
 * This module handles integration with Typeform API to sync:
 * - Form definitions and structure
 * - Form responses/submissions
 * - Custom fields
 * 
 * It maps Typeform submissions to contacts in our database and creates
 * appropriate form and activity records.
 */

import axios from 'axios';
import { storage } from '../storage';
import { db } from '../db';
import { 
  InsertForm, 
  InsertActivity,
  forms,
  activities
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { normalizeEmail } from '../services/contact-matcher';

// API Configuration
const TYPEFORM_API_KEY = process.env.TYPEFORM_API_KEY;
const TYPEFORM_BASE_URL = 'https://api.typeform.com';

// Create axios instance with authentication
const apiClient = axios.create({
  baseURL: TYPEFORM_BASE_URL,
  headers: {
    'Authorization': `Bearer ${TYPEFORM_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Test Typeform API connection
 * Returns user account information if successful
 */
export async function testApiConnection() {
  try {
    if (!TYPEFORM_API_KEY) {
      return {
        success: false,
        error: 'Typeform API key is not configured'
      };
    }

    const response = await apiClient.get('/me');
    
    if (response.status === 200) {
      return {
        success: true,
        user: response.data,
        message: 'Typeform API connection successful'
      };
    } else {
      return {
        success: false,
        error: `API connection failed with status ${response.status}`
      };
    }
  } catch (error: any) {
    console.error('Typeform API connection test error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Unknown error'
    };
  }
}

/**
 * Get all available forms
 */
export async function getForms() {
  try {
    const response = await apiClient.get('/forms');
    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching Typeform forms:', error);
    throw error;
  }
}

/**
 * Get detailed information about a specific form
 */
export async function getForm(formId: string) {
  try {
    const response = await apiClient.get(`/forms/${formId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching Typeform form ${formId}:`, error);
    throw error;
  }
}

/**
 * Get form responses/submissions
 */
export async function getFormResponses(formId: string, options: { 
  pageSize?: number,
  since?: string, 
  until?: string, 
  after?: string,
  before?: string
} = {}) {
  try {
    const { pageSize = 50, since, until, after, before } = options;
    
    const params: any = {
      page_size: pageSize
    };
    
    if (since) params.since = since;
    if (until) params.until = until;
    if (after) params.after = after;
    if (before) params.before = before;
    
    const response = await apiClient.get(`/forms/${formId}/responses`, { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching Typeform responses for form ${formId}:`, error);
    throw error;
  }
}

/**
 * Sync a single form and its responses
 */
export async function syncSingleForm(formId: string) {
  try {
    // Get form details
    const formDetails = await getForm(formId);
    
    // Get form responses
    const responses = await syncFormResponses(formId, formDetails.title);
    
    return {
      success: true,
      formId,
      formTitle: formDetails.title,
      processed: responses.processed,
      synced: responses.synced
    };
  } catch (error) {
    console.error(`Error syncing form ${formId}:`, error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Sync responses for a specific form
 */
async function syncFormResponses(formId: string, formTitle: string) {
  let totalResponsesProcessed = 0;
  let totalResponsesSynced = 0;
  let hasMoreResponses = true;
  let beforeParam: string | undefined;
  
  while (hasMoreResponses) {
    const options: any = {
      pageSize: 100
    };
    
    if (beforeParam) {
      options.before = beforeParam;
    }
    
    const responsesData = await getFormResponses(formId, options);
    const responses = responsesData.items || [];
    
    if (responses.length === 0) {
      hasMoreResponses = false;
      continue;
    }
    
    totalResponsesProcessed += responses.length;
    
    for (const response of responses) {
      // Find or create contact based on email
      let contact = null;
      let email = null;
      let name = null;
      
      // Extract email and name from hidden fields or answers
      if (response.hidden && response.hidden.email) {
        email = normalizeEmail(response.hidden.email);
      }
      
      if (response.hidden && response.hidden.name) {
        name = response.hidden.name;
      }
      
      // Look for email and name in answers if not found in hidden fields
      if (!email || !name) {
        for (const answer of response.answers || []) {
          if (answer.type === 'email' && !email) {
            email = normalizeEmail(answer.email);
          }
          
          if ((answer.type === 'short_text' || answer.type === 'text') && !name) {
            // Check if this field might contain a name
            const fieldRef = answer.field.ref;
            const questionText = answer.field.title.toLowerCase();
            
            if (questionText.includes('name') || 
                questionText.includes('full name') || 
                fieldRef.includes('name')) {
              name = answer.text;
            }
          }
        }
      }
      
      // Skip if no email (we can't reliably match the contact)
      if (!email) {
        console.log(`Skipping Typeform response with no email: ${response.token}`);
        continue;
      }
      
      // Find contact by email
      contact = await storage.getContactByEmail(email);
      
      // Create new contact if not found and we have enough information
      if (!contact && email && name) {
        const newContact = await storage.createContact({
          name,
          email,
          leadSource: 'typeform',
          sourcesCount: 1,
          firstTouchDate: new Date(response.submitted_at),
          status: 'lead',
          metadata: {
            source: 'typeform',
            formId: formId,
            responseId: response.token
          }
        });
        
        contact = newContact;
        console.log(`Created new contact from Typeform: ${name} (${email})`);
      } else if (contact) {
        // Update existing contact's lead source if it doesn't already include typeform
        if (!contact.leadSource.includes('typeform')) {
          const updatedSource = contact.leadSource 
            ? `${contact.leadSource},typeform` 
            : 'typeform';
          
          await storage.updateContact(contact.id, { 
            leadSource: updatedSource,
            sourcesCount: (contact.sourcesCount || 1) + 1
          });
          
          console.log(`Updated contact ${contact.name} lead source to include Typeform`);
        }
      }
      
      if (!contact) {
        console.log(`Couldn't find or create contact for Typeform response: ${response.token}`);
        continue;
      }
      
      // Look for existing form entry with this response ID
      const existingForm = await db.query.forms.findFirst({
        where: eq(forms.typeformResponseId, response.token)
      });
      
      if (!existingForm) {
        // Create form entry with all response data
        const formData: InsertForm = {
          contactId: contact.id,
          typeformResponseId: response.token,
          formName: formTitle,
          formId: formId,
          submittedAt: new Date(response.submitted_at),
          respondentEmail: email,
          respondentName: name || '',
          respondentIp: response.metadata.user_agent || '',
          completionTime: response.metadata.time_to_submit,
          // Extract answers in a structured way
          questionCount: (response.answers || []).length,
          answeredCount: (response.answers || []).length,
          answers: response.answers || [],
          // Extract any hidden fields
          hiddenFields: response.hidden || {},
          // Extract UTM tracking if available
          utmSource: response.hidden?.utm_source || '',
          utmMedium: response.hidden?.utm_medium || '',
          utmCampaign: response.hidden?.utm_campaign || '',
          utmTerm: response.hidden?.utm_term || '',
          utmContent: response.hidden?.utm_content || ''
        };
        
        const newForm = await storage.createForm(formData);
        
        // Also create an activity for this form submission
        const activityData: InsertActivity = {
          contactId: contact.id,
          type: 'form_submission',
          source: 'typeform',
          sourceId: response.token,
          title: `Submitted form: ${formTitle}`,
          description: `Completed Typeform submission with ${formData.answeredCount} answers`,
          date: new Date(response.submitted_at),
          fieldCoverage: 100,
          metadata: {
            formId: formId,
            formTitle: formTitle,
            responseToken: response.token,
            hiddenFields: response.hidden || {}
          }
        };
        
        await storage.createActivity(activityData);
        
        totalResponsesSynced++;
        
        console.log(`Added Typeform submission activity for contact: ${contact.name} (${contact.email})`);
      }
      
      // Check if there are more responses to fetch
      if (responsesData.page_count > 1 && responsesData.items.length > 0) {
        // Get the last response's token for pagination
        const lastResponse = responses[responses.length - 1];
        beforeParam = lastResponse.token;
      } else {
        hasMoreResponses = false;
      }
    }
  }
  
  return {
    processed: totalResponsesProcessed,
    synced: totalResponsesSynced
  };
}

/**
 * Sync all Typeform forms and responses
 */
export async function syncTypeformResponses() {
  try {
    // Validate API connection
    const apiTest = await testApiConnection();
    if (!apiTest.success) {
      return {
        success: false,
        error: apiTest.error
      };
    }
    
    // Get all forms
    const forms = await getForms();
    console.log(`Found ${forms.length} forms in Typeform account`);
    
    let totalResponsesProcessed = 0;
    let totalResponsesSynced = 0;
    
    // Process each form
    for (const form of forms) {
      console.log(`Processing form: ${form.title} (${form.id})`);
      
      // Sync responses for this form
      const results = await syncFormResponses(form.id, form.title);
      
      totalResponsesProcessed += results.processed;
      totalResponsesSynced += results.synced;
      
      console.log(`Form ${form.title}: processed ${results.processed} responses, synced ${results.synced}`);
    }
    
    console.log(`Typeform sync completed. Processed ${totalResponsesProcessed} responses, synced ${totalResponsesSynced} activities.`);
    return {
      success: true,
      processed: totalResponsesProcessed,
      synced: totalResponsesSynced,
      syncedCount: totalResponsesSynced
    };
  } catch (error) {
    console.error('Error syncing Typeform responses:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}