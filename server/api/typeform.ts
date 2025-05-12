/**
 * Typeform API Integration
 * 
 * This module handles integration with Typeform API to sync:
 * - All forms with complete details
 * - All form responses with answer data
 * - All hidden fields and calculated values
 * 
 * It supports fetching all historical form submissions and
 * properly links responses to contacts.
 */

import axios from 'axios';
import { storage } from '../storage';
import * as syncStatus from './sync-status';

// API Configuration
const TYPEFORM_API_KEY = process.env.TYPEFORM_API_KEY;
const TYPEFORM_BASE_URL = 'https://api.typeform.com';

// Create axios instance with authentication
const typeformApiClient = axios.create({
  baseURL: TYPEFORM_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TYPEFORM_API_KEY}`
  }
});

/**
 * Test API connection by fetching account information
 */
async function testApiConnection() {
  try {
    console.log('Testing Typeform API connection using account info endpoint...');
    const response = await typeformApiClient.get('/me');
    console.log(`Successfully connected to Typeform API`);
    console.log(`Authenticated as: ${response.data.alias}`);
    return { success: true, user: response.data };
  } catch (error: any) {
    console.error('Error connecting to Typeform API:', error.message);
    return { 
      success: false, 
      error: error.message || 'Failed to connect to Typeform API' 
    };
  }
}

/**
 * Sync all responses from Typeform
 * Fetches all historical form submissions
 */
async function syncAllResponses() {
  // Initialize counters for sync status
  let totalForms = 0;
  let totalResponses = 0;
  let processedResponses = 0;
  let syncedResponses = 0;
  let noEmailCount = 0;
  let errorCount = 0;

  try {
    // First, test the API connection
    const connectionTest = await testApiConnection();
    if (!connectionTest.success) {
      throw new Error(`Typeform API connection failed: ${connectionTest.error}`);
    }
    
    console.log('Fetching all forms from Typeform API...');
    
    // Get all forms first
    const forms = await getAllForms();
    totalForms = forms.length;
    
    console.log(`Found ${totalForms} forms in Typeform account`);
    
    // Initialize sync status
    syncStatus.updateTypeformSyncStatus({
      totalForms,
      totalResponses,
      processedResponses,
      importedSubmissions: syncedResponses,
      errors: errorCount
    });
    
    // Process each form to get all responses
    for (const form of forms) {
      try {
        console.log(`Processing form: ${form.title} (${form.id})`);
        
        // Get form details with fields
        const formDetails = await getFormDetails(form.id);
        
        // Get all responses for this form
        const responses = await getFormResponses(form.id);
        totalResponses += responses.length;
        
        console.log(`Found ${responses.length} responses for form ${form.title}`);
        
        // Update sync status after counting responses
        syncStatus.updateTypeformSyncStatus({
          totalForms,
          totalResponses,
          processedResponses,
          importedSubmissions: syncedResponses,
          errors: errorCount
        });
        
        // Process each response
        for (const response of responses) {
          try {
            processedResponses++;
            
            // Extract email from response (may be in different fields depending on form)
            const email = extractEmailFromResponse(response, formDetails);
            
            if (!email) {
              console.log(`No email found in response ${response.token}`);
              noEmailCount++;
              continue;
            }
            
            // Find or create contact by email
            let contact = await storage.getContactByEmail(email);
            
            if (!contact) {
              // Try to extract name from response
              const name = extractNameFromResponse(response, formDetails) || email.split('@')[0];
              
              // Create new contact
              const contactData = {
                name,
                email,
                phone: extractPhoneFromResponse(response, formDetails) || '',
                company: extractCompanyFromResponse(response, formDetails) || '',
                leadSource: 'typeform',
                status: 'lead',
                sourceId: response.token,
                sourceData: JSON.stringify(response),
                createdAt: new Date(response.submitted_at).toISOString()
              };
              
              contact = await storage.createContact(contactData);
            }
            
            // Create form submission record
            const formData = {
              contactId: contact.id,
              title: form.title,
              description: formDetails.title || form.title,
              formId: form.id,
              responseId: response.token,
              date: new Date(response.submitted_at).toISOString(),
              source: 'typeform',
              sourceId: response.token,
              answers: JSON.stringify(response.answers),
              metadata: JSON.stringify({
                form: form,
                response: response,
                hiddenFields: response.hidden || {},
                calculatedFields: response.calculated || {}
              })
            };
            
            // Check if form response already exists
            const existingForm = await storage.getFormByTypeformResponseId(response.token);
            
            if (existingForm) {
              // Update existing form submission
              await storage.updateForm(existingForm.id, formData);
            } else {
              // Create new form submission
              await storage.createForm(formData);
              syncedResponses++;
            }
            
          } catch (error) {
            console.error(`Error processing response ${response.token}:`, error);
            errorCount++;
          }
          
          // Update sync status periodically
          if (processedResponses % 10 === 0) {
            syncStatus.updateTypeformSyncStatus({
              totalForms,
              totalResponses,
              processedResponses,
              importedSubmissions: syncedResponses,
              errors: errorCount
            });
          }
        }
        
      } catch (error) {
        console.error(`Error processing form ${form.id}:`, error);
        errorCount++;
      }
    }
    
    // Final status update
    syncStatus.updateTypeformSyncStatus({
      totalForms,
      totalResponses,
      processedResponses,
      importedSubmissions: syncedResponses,
      errors: errorCount
    });
    
    return {
      success: true,
      formsCount: totalForms,
      responsesCount: totalResponses,
      syncedCount: syncedResponses,
      errorCount,
      noEmailCount
    };
    
  } catch (error: any) {
    console.error('Error syncing Typeform responses:', error);
    
    // Update sync status with error info
    syncStatus.updateTypeformSyncStatus({
      totalForms,
      totalResponses,
      processedResponses,
      importedSubmissions: syncedResponses,
      errors: errorCount + 1
    });
    
    return {
      success: false,
      error: error.message || 'Unknown error syncing Typeform data',
      formsCount: totalForms,
      responsesCount: totalResponses,
      syncedCount: syncedResponses,
      errorCount: errorCount + 1,
      noEmailCount
    };
  }
}

/**
 * Get all forms from Typeform account
 */
async function getAllForms() {
  try {
    // Set initial pagination state
    let page = 1;
    let allForms: any[] = [];
    let hasMore = true;
    
    // Use pagination to fetch all forms
    while (hasMore) {
      const response = await typeformApiClient.get('/forms', {
        params: {
          page_size: 200, // Max allowed by Typeform API
          page
        }
      });
      
      const forms = response.data.items || [];
      allForms = [...allForms, ...forms];
      
      // Check if there are more pages
      hasMore = forms.length === 200;
      page++;
    }
    
    return allForms;
  } catch (error: any) {
    console.error('Error fetching Typeform forms:', error);
    return [];
  }
}

/**
 * Get detailed form information including fields
 */
async function getFormDetails(formId: string) {
  try {
    const response = await typeformApiClient.get(`/forms/${formId}`);
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching form details for ${formId}:`, error);
    return {};
  }
}

/**
 * Get all responses for a specific form
 */
async function getFormResponses(formId: string) {
  try {
    // Set initial pagination state
    let allResponses: any[] = [];
    let hasMore = true;
    let pageToken = null;
    
    // Use pagination to fetch all responses
    while (hasMore) {
      const params: any = {
        page_size: 1000, // Max allowed by Typeform API
        completed: true // Only fetch completed responses
      };
      
      // For subsequent pages, use the page token
      if (pageToken) {
        params.before = pageToken;
      }
      
      const response = await typeformApiClient.get(`/forms/${formId}/responses`, { params });
      
      const responses = response.data.items || [];
      allResponses = [...allResponses, ...responses];
      
      // Check if there are more pages
      hasMore = responses.length === 1000 && responses.length > 0;
      
      // Get the token for pagination (the token of the first item in the current page)
      pageToken = responses.length > 0 ? responses[0].token : null;
    }
    
    return allResponses;
  } catch (error: any) {
    console.error(`Error fetching responses for form ${formId}:`, error);
    return [];
  }
}

/**
 * Extract email from a form response
 */
function extractEmailFromResponse(response: any, formDetails: any) {
  if (!response.answers || !response.answers.length) {
    return null;
  }
  
  // Try to find email field in the form structure
  let emailFieldId = null;
  
  if (formDetails.fields) {
    // Look for email field type or fields with 'email' in the title
    for (const field of formDetails.fields) {
      if (field.type === 'email' || 
          (field.title && field.title.toLowerCase().includes('email'))) {
        emailFieldId = field.id;
        break;
      }
    }
  }
  
  // First, try to find answer for the identified email field
  if (emailFieldId) {
    const emailAnswer = response.answers.find((answer: any) => answer.field.id === emailFieldId);
    if (emailAnswer && emailAnswer.email) {
      return emailAnswer.email;
    }
  }
  
  // Second, look for any answer of type 'email'
  const emailAnswer = response.answers.find((answer: any) => answer.type === 'email');
  if (emailAnswer && emailAnswer.email) {
    return emailAnswer.email;
  }
  
  // Third, look for email in hidden fields (often used for integrations)
  if (response.hidden && response.hidden.email) {
    return response.hidden.email;
  }
  
  // Fourth, look for any answer that contains an email-like string
  for (const answer of response.answers) {
    if (answer.text) {
      // Simple regex for email validation
      const emailMatch = answer.text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        return emailMatch[0];
      }
    }
  }
  
  return null;
}

/**
 * Extract name from a form response
 */
function extractNameFromResponse(response: any, formDetails: any) {
  if (!response.answers || !response.answers.length) {
    return null;
  }
  
  // Look for name fields in the form structure
  let nameFieldIds: string[] = [];
  
  if (formDetails.fields) {
    // Look for fields with 'name' in the title
    for (const field of formDetails.fields) {
      if (field.title && 
          (field.title.toLowerCase().includes('name') || 
           field.title.toLowerCase().includes('first') || 
           field.title.toLowerCase().includes('last'))) {
        nameFieldIds.push(field.id);
      }
    }
  }
  
  // Try to find answers for the identified name fields
  const nameAnswers = response.answers
    .filter((answer: any) => nameFieldIds.includes(answer.field.id))
    .map((answer: any) => answer.text || '')
    .filter(Boolean);
  
  if (nameAnswers.length > 0) {
    return nameAnswers.join(' ');
  }
  
  // Look for name in hidden fields
  if (response.hidden && response.hidden.name) {
    return response.hidden.name;
  }
  
  return null;
}

/**
 * Extract phone from a form response
 */
function extractPhoneFromResponse(response: any, formDetails: any) {
  if (!response.answers || !response.answers.length) {
    return null;
  }
  
  // Look for phone fields in the form structure
  let phoneFieldIds: string[] = [];
  
  if (formDetails.fields) {
    // Look for fields with 'phone' in the title
    for (const field of formDetails.fields) {
      if (field.title && field.title.toLowerCase().includes('phone')) {
        phoneFieldIds.push(field.id);
      }
    }
  }
  
  // Try to find answers for the identified phone fields
  for (const fieldId of phoneFieldIds) {
    const phoneAnswer = response.answers.find((answer: any) => answer.field.id === fieldId);
    if (phoneAnswer && (phoneAnswer.phone_number || phoneAnswer.text)) {
      return phoneAnswer.phone_number || phoneAnswer.text;
    }
  }
  
  // Look for phone in hidden fields
  if (response.hidden && response.hidden.phone) {
    return response.hidden.phone;
  }
  
  return null;
}

/**
 * Extract company from a form response
 */
function extractCompanyFromResponse(response: any, formDetails: any) {
  if (!response.answers || !response.answers.length) {
    return null;
  }
  
  // Look for company fields in the form structure
  let companyFieldIds: string[] = [];
  
  if (formDetails.fields) {
    // Look for fields with 'company' or 'organization' in the title
    for (const field of formDetails.fields) {
      if (field.title && 
          (field.title.toLowerCase().includes('company') || 
           field.title.toLowerCase().includes('organization') ||
           field.title.toLowerCase().includes('business'))) {
        companyFieldIds.push(field.id);
      }
    }
  }
  
  // Try to find answers for the identified company fields
  for (const fieldId of companyFieldIds) {
    const companyAnswer = response.answers.find((answer: any) => answer.field.id === fieldId);
    if (companyAnswer && companyAnswer.text) {
      return companyAnswer.text;
    }
  }
  
  // Look for company in hidden fields
  if (response.hidden && response.hidden.company) {
    return response.hidden.company;
  }
  
  return null;
}

export default {
  syncAllResponses,
  getAllForms,
  getFormDetails,
  getFormResponses,
  testApiConnection
};