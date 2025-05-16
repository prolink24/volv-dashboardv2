import axios from 'axios';
import { db } from '../db';
import { activities, type InsertActivity } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { contacts } from '@shared/schema';

// Typeform API Client
const typeformClient = axios.create({
  baseURL: 'https://api.typeform.com',
  headers: {
    'Authorization': `Bearer ${process.env.TYPEFORM_API_TOKEN}`
  }
});

/**
 * Get all forms from Typeform
 */
export async function getForms() {
  try {
    const response = await typeformClient.get('/forms');
    return response.data;
  } catch (error) {
    console.error('Error fetching Typeform forms:', error);
    throw error;
  }
}

/**
 * Get form responses for a specific form
 * @param formId The ID of the form to fetch responses for
 * @param params Additional query parameters for pagination
 */
export async function getFormResponses(formId: string, params: Record<string, any> = {}) {
  try {
    const response = await typeformClient.get(`/forms/${formId}/responses`, {
      params: {
        page_size: 100,
        ...params
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching responses for form ${formId}:`, error);
    throw error;
  }
}

/**
 * Extract email from form response
 * @param response The form response object
 */
function extractEmailFromResponse(response: any): string | null {
  try {
    // Try to find an email field in the answers
    if (response.answers) {
      for (const answer of response.answers) {
        // Check for email type questions
        if (answer.type === 'email' && answer.email) {
          return answer.email;
        }
        
        // Sometimes emails might be in text fields
        if (answer.type === 'text' && answer.text) {
          const text = answer.text.toLowerCase();
          // Basic email pattern check
          if (text.includes('@') && text.includes('.')) {
            return text;
          }
        }
      }
    }
    
    // If no email found in answers, check the hidden fields
    if (response.hidden && response.hidden.email) {
      return response.hidden.email;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting email from response:', error);
    return null;
  }
}

/**
 * Extract name from form response
 * @param response The form response object
 */
function extractNameFromResponse(response: any): string | null {
  try {
    // Try to find name fields in the answers
    if (response.answers) {
      // First look for specific name field types
      const nameFields = response.answers.filter((answer: any) => 
        answer.type === 'text' && 
        (answer.field?.ref?.toLowerCase().includes('name') || 
         (answer.field?.title && answer.field.title.toLowerCase().includes('name')))
      );
      
      if (nameFields.length > 0) {
        return nameFields[0].text;
      }
      
      // If no specific name field, try to find first and last name fields
      const firstNameField = response.answers.find((answer: any) => 
        answer.type === 'text' && 
        (answer.field?.ref?.toLowerCase().includes('first') || 
         (answer.field?.title && answer.field.title.toLowerCase().includes('first')))
      );
      
      const lastNameField = response.answers.find((answer: any) => 
        answer.type === 'text' && 
        (answer.field?.ref?.toLowerCase().includes('last') || 
         (answer.field?.title && answer.field.title.toLowerCase().includes('last')))
      );
      
      if (firstNameField && lastNameField) {
        return `${firstNameField.text} ${lastNameField.text}`;
      }
    }
    
    // If no name found in answers, check hidden fields
    if (response.hidden) {
      if (response.hidden.name) {
        return response.hidden.name;
      }
      
      if (response.hidden.first_name && response.hidden.last_name) {
        return `${response.hidden.first_name} ${response.hidden.last_name}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting name from response:', error);
    return null;
  }
}

/**
 * Get all form responses and sync them to the database
 */
export async function syncTypeformResponses() {
  console.log('Starting Typeform response sync...');
  try {
    // Get all forms
    const formsData = await getForms();
    const forms = formsData.items || [];
    console.log(`Found ${forms.length} forms`);
    
    let totalResponsesProcessed = 0;
    let totalResponsesSynced = 0;
    
    // Process each form
    for (const form of forms) {
      console.log(`Processing form: ${form.title} (${form.id})`);
      let hasMoreResponses = true;
      let beforeParam = '';
      
      // Paginate through all responses
      while (hasMoreResponses) {
        const params: Record<string, any> = { completed: true };
        if (beforeParam) {
          params.before = beforeParam;
        }
        
        const responsesData = await getFormResponses(form.id, params);
        const responses = responsesData.items || [];
        
        console.log(`Processing ${responses.length} responses from form ${form.title}`);
        totalResponsesProcessed += responses.length;
        
        for (const response of responses) {
          const email = extractEmailFromResponse(response);
          if (!email) {
            console.log(`No email found for response ${response.response_id}`);
            continue;
          }
          
          // Find contact by email
          const existingContact = await db.select()
            .from(contacts)
            .where(eq(contacts.email, email))
            .limit(1);
          
          if (existingContact.length === 0) {
            console.log(`No matching contact found for email: ${email}`);
            
            // Option: create a new contact if needed
            const name = extractNameFromResponse(response) || 'Unknown';
            // -- Implementation for creating contact would go here --
            
            continue;
          }
          
          const contact = existingContact[0];
          
          // Check if activity for this response already exists
          const existingActivity = await db.select()
            .from(activities)
            .where(eq(activities.sourceId, `typeform_${response.response_id}`))
            .limit(1);
          
          if (existingActivity.length > 0) {
            console.log(`Activity already exists for response ${response.response_id}`);
            continue;
          }
          
          // Create activity for form submission
          const submissionDate = new Date(response.submitted_at);
          const activityData = {
            type: 'form_submission',
            source: 'Typeform',
            title: `Form Submitted: ${form.title}`,
            date: submissionDate,
            contactId: contact.id,
            sourceId: `typeform_${response.response_id}`,
            description: `Submitted application form: ${form.title}`,
            metadata: response,
            fieldCoverage: 100
          };
          
          await db.insert(activities).values(activityData);
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
    
    console.log(`Typeform sync completed. Processed ${totalResponsesProcessed} responses, synced ${totalResponsesSynced} activities.`);
    return {
      success: true,
      processed: totalResponsesProcessed,
      synced: totalResponsesSynced
    };
  } catch (error) {
    console.error('Error syncing Typeform responses:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Sync a single form's responses
 * @param formId The ID of the form to sync
 */
export async function syncSingleForm(formId: string) {
  console.log(`Starting sync for form ${formId}...`);
  try {
    let totalResponsesProcessed = 0;
    let totalResponsesSynced = 0;
    let hasMoreResponses = true;
    let beforeParam = '';
    
    // Paginate through all responses
    while (hasMoreResponses) {
      const params: Record<string, any> = { completed: true };
      if (beforeParam) {
        params.before = beforeParam;
      }
      
      const responsesData = await getFormResponses(formId, params);
      const responses = responsesData.items || [];
      
      console.log(`Processing ${responses.length} responses from form ${formId}`);
      totalResponsesProcessed += responses.length;
      
      for (const response of responses) {
        const email = extractEmailFromResponse(response);
        if (!email) {
          console.log(`No email found for response ${response.response_id}`);
          continue;
        }
        
        // Find contact by email
        const existingContact = await db.select()
          .from(contacts)
          .where(eq(contacts.email, email))
          .limit(1);
        
        if (existingContact.length === 0) {
          console.log(`No matching contact found for email: ${email}`);
          continue;
        }
        
        const contact = existingContact[0];
        
        // Check if activity for this response already exists
        const existingActivity = await db.select()
          .from(activities)
          .where(eq(activities.sourceId, `typeform_${response.response_id}`))
          .limit(1);
        
        if (existingActivity.length > 0) {
          console.log(`Activity already exists for response ${response.response_id}`);
          continue;
        }
        
        // Create activity for form submission
        const submissionDate = new Date(response.submitted_at);
        const formTitle = response.form_title || 'Application Form';
        
        const activityData = {
          type: 'form_submission',
          source: 'Typeform',
          title: `Form Submitted: ${formTitle}`,
          date: submissionDate,
          contactId: contact.id,
          sourceId: `typeform_${response.response_id}`,
          description: `Submitted application form: ${formTitle}`,
          metadata: response,
          fieldCoverage: 100
        };
        
        await db.insert(activities).values(activityData);
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
    
    console.log(`Form sync completed. Processed ${totalResponsesProcessed} responses, synced ${totalResponsesSynced} activities.`);
    return {
      success: true,
      processed: totalResponsesProcessed,
      synced: totalResponsesSynced
    };
  } catch (error) {
    console.error(`Error syncing form ${formId}:`, error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}