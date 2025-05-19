import axios from 'axios';
import { db } from '../db';
import { activities, type InsertActivity, forms, type InsertForm } from '@shared/schema';
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
 * Extract company from form response
 * @param response The form response object
 */
function extractCompanyFromResponse(response: any): string | null {
  try {
    // Try to find company fields in the answers
    if (response.answers) {
      // Look for specific company field types
      const companyFields = response.answers.filter((answer: any) => 
        answer.type === 'text' && 
        (answer.field?.ref?.toLowerCase().includes('company') || 
         answer.field?.ref?.toLowerCase().includes('organization') ||
         (answer.field?.title && (
           answer.field.title.toLowerCase().includes('company') ||
           answer.field.title.toLowerCase().includes('organization')
         )))
      );
      
      if (companyFields.length > 0) {
        return companyFields[0].text;
      }
    }
    
    // If no company found in answers, check hidden fields
    if (response.hidden) {
      if (response.hidden.company) {
        return response.hidden.company;
      }
      
      if (response.hidden.organization) {
        return response.hidden.organization;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting company from response:', error);
    return null;
  }
}

/**
 * Create a form submission record in the database
 * @param contactId The ID of the contact associated with this form
 * @param response The Typeform response object
 * @param formId The Typeform form ID
 * @param formName The name/title of the form
 */
async function createFormRecord(contactId: number, response: any, formId: string, formName: string) {
  try {
    // Calculate completion percentage based on answer count vs total questions
    const questionCount = response.calculated?.variables?.length || 0;
    const answeredCount = response.answers?.length || 0;
    const completionPercentage = questionCount > 0 ? 
      Math.floor((answeredCount / questionCount) * 100) : 100;

    // Extract metadata like IP, completion time, etc.
    const metadata = {
      platform: 'typeform',
      browser: response.metadata?.browser,
      platform_details: response.metadata?.platform,
      user_agent: response.metadata?.user_agent,
      referer: response.metadata?.referer,
      network_id: response.metadata?.network_id,
      response_id: response.response_id
    };

    // Prepare the form data
    const formData = {
      contactId: contactId,
      typeformResponseId: response.response_id,
      formName: formName,
      formId: formId,
      submittedAt: new Date(response.submitted_at),
      respondentEmail: extractEmailFromResponse(response),
      respondentName: extractNameFromResponse(response),
      respondentIp: response.metadata?.network_id || null,
      completionTime: response.metadata?.time_to_complete || null,
      completionPercentage: completionPercentage,
      questionCount: questionCount,
      answeredCount: answeredCount,
      answers: response.answers || {},
      hiddenFields: response.hidden || {},
      calculatedFields: response.calculated || {},
      utmSource: response.hidden?.utm_source || null,
      utmMedium: response.hidden?.utm_medium || null,
      utmCampaign: response.hidden?.utm_campaign || null,
      fieldCoverage: 85, // Since we're capturing most fields
      metadata: metadata
    };

    // Insert the form record
    const result = await db.insert(forms).values(formData);
    
    console.log(`Created form record for response ID: ${response.response_id}`);
    return result;
  } catch (error) {
    console.error('Error creating form record:', error);
    throw error;
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
            console.log(`No matching contact found for email: ${email}. Creating new contact...`);
            
            // Create a new contact from the form submission
            const name = extractNameFromResponse(response) || 'Unknown';
            const company = extractCompanyFromResponse(response);
            
            // Create new contact record
            const newContact = await db.insert(contacts).values({
              name: name,
              email: email,
              company: company,
              leadSource: 'typeform',
              sourcesCount: 1,
              fieldCoverage: 70,
              firstTouchDate: new Date(response.submitted_at),
              sourceData: response
            }).returning();
            
            if (newContact.length === 0) {
              console.error(`Failed to create new contact for email: ${email}`);
              continue;
            }
            
            console.log(`Created new contact: ${name} (${email})`);
            
            // Continue processing with the newly created contact
            const contact = newContact[0];
            
            // Create form record
            const formTitle = response.form_title || form.title;
            await createFormRecord(contact.id, response, form.id, formTitle);
            
            totalResponsesSynced++;
            continue;
          }
          
          const contact = existingContact[0];
          
          // Check if form submission already exists
          const existingForm = await db.select()
            .from(forms)
            .where(eq(forms.typeformResponseId, response.response_id))
            .limit(1);
          
          if (existingForm.length > 0) {
            console.log(`Form submission already exists for response ${response.response_id}`);
            continue;
          }
          
          // Create form record
          const formTitle = response.form_title || form.title;
          await createFormRecord(contact.id, response, form.id, formTitle);
          
          // Also create activity for form submission to ensure visibility in timeline
          const submissionDate = new Date(response.submitted_at);
          const activityData = {
            type: 'form_submission',
            source: 'typeform',
            title: `Form Submitted: ${formTitle}`,
            date: submissionDate,
            contactId: contact.id,
            sourceId: `typeform_${response.response_id}`,
            description: `Submitted application form: ${formTitle}`,
            metadata: response,
            fieldCoverage: 100
          };
          
          await db.insert(activities).values(activityData);
          
          // Update contact to mark as multi-source if it wasn't already
          if (!contact.leadSource || !contact.leadSource.includes('typeform')) {
            const newLeadSource = contact.leadSource ? 
              `${contact.leadSource},typeform` : 
              'typeform';
            
            const newSourcesCount = (contact.sourcesCount || 0) + 1;
            
            await db.update(contacts)
              .set({ 
                leadSource: newLeadSource, 
                sourcesCount: newSourcesCount,
                lastActivityDate: submissionDate
              })
              .where(eq(contacts.id, contact.id));
            
            console.log(`Updated contact ${contact.name} (${contact.email}) to include Typeform as a source`);
          }
          
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