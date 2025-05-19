import axios from 'axios';
import { db } from '../db';
import { activities, type InsertActivity, forms, type InsertForm, contacts } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

// Typeform API Client
const typeformClient = axios.create({
  baseURL: 'https://api.typeform.com',
  headers: {
    'Authorization': `Bearer ${process.env.TYPEFORM_API_TOKEN}`
  },
  timeout: 30000 // Extend timeout to 30 seconds for larger data requests
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
async function createFormRecord(contactId: number, response: any, formId: string, formName: string): Promise<any> {
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
    const formData: InsertForm = {
      contactId: contactId,
      typeformResponseId: response.response_id,
      formName: formName,
      formId: formId,
      submittedAt: new Date(response.submitted_at),
      answers: {}, // Initialize with empty object first
      hiddenFields: {}, // Initialize with empty object first
      calculatedFields: {}, // Initialize with empty object first
      completionPercentage: completionPercentage
    };
    
    // Transform answers array into a key-value object for better storage
    if (response.answers && Array.isArray(response.answers)) {
      const answersObj: Record<string, any> = {};
      for (const answer of response.answers) {
        if (answer.field && answer.field.title) {
          // Use the field title as the key and the appropriate value based on type
          const key = answer.field.title;
          let value = null;
          
          switch(answer.type) {
            case 'text':
              value = answer.text;
              break;
            case 'email':
              value = answer.email;
              break;
            case 'number':
              value = answer.number;
              break;
            case 'choice':
              value = answer.choice?.label;
              break;
            case 'choices':
              value = answer.choices?.labels;
              break;
            case 'boolean':
              value = answer.boolean;
              break;
            case 'date':
              value = answer.date;
              break;
            case 'url':
              value = answer.url;
              break;
            case 'file_url':
              value = answer.file_url;
              break;
            case 'payment':
              value = answer.payment;
              break;
            default:
              value = JSON.stringify(answer);
          }
          
          answersObj[key] = value;
        }
      }
      formData.answers = answersObj;
    }
    
    // Handle hidden fields
    if (response.hidden) {
      formData.hiddenFields = response.hidden;
    }
    
    // Handle calculated fields
    if (response.calculated) {
      formData.calculatedFields = response.calculated;
    }

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
    
    if (!formsData || !formsData.items) {
      throw new Error('No forms returned from Typeform API');
    }
    
    const typeformForms = formsData.items || [];
    console.log(`Found ${typeformForms.length} forms from Typeform API`);
    
    // Log the first form to debug
    if (typeformForms.length > 0) {
      console.log('Sample form data:', JSON.stringify(typeformForms[0]).substring(0, 300) + '...');
    }
    
    let totalResponsesProcessed = 0;
    let totalResponsesSynced = 0;
    let failedResponses = 0;
    
    // Process each form
    for (const form of typeformForms) {
      console.log(`Processing form: ${form.title} (${form.id})`);
      
      // Test a single request first to debug
      try {
        const testParams = { 
          completed: true,
          page_size: 2 // Just get a few for testing
        };
        
        const testResponse = await getFormResponses(form.id, testParams);
        console.log(`Test response for form ${form.id}: ${testResponse ? 'SUCCESS' : 'FAILED'}`);
        
        if (testResponse && testResponse.items && testResponse.items.length > 0) {
          console.log(`Sample response data:`, JSON.stringify(testResponse.items[0]).substring(0, 300) + '...');
        }
      } catch (testError) {
        console.error(`Error testing form ${form.id}:`, testError);
        continue; // Skip to next form if test fails
      }
      
      let hasMoreResponses = true;
      let beforeParam = '';
      
      // Paginate through all responses with improved error handling
      while (hasMoreResponses) {
        try {
          const params: Record<string, any> = { 
            completed: true,
            page_size: 50 // Reduced page size to avoid timeouts
          };
          
          if (beforeParam) {
            params.before = beforeParam;
          }
          
          const responsesData = await getFormResponses(form.id, params);
          
          if (!responsesData || !responsesData.items) {
            console.warn(`No responses returned for form ${form.id}`);
            break;
          }
          
          const responses = responsesData.items || [];
          
          console.log(`Processing ${responses.length} responses from form ${form.title}`);
          totalResponsesProcessed += responses.length;
          
          if (responses.length === 0) {
            hasMoreResponses = false;
            continue;
          }
          
          // Process each response
          for (const response of responses) {
            try {
              const email = extractEmailFromResponse(response);
              if (!email) {
                console.log(`No email found for response ${response.response_id}`);
                failedResponses++;
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
                  failedResponses++;
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
              const activityData: InsertActivity = {
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
            } catch (responseError) {
              console.error(`Error processing response ${response.response_id}:`, responseError);
              failedResponses++;
              // Continue with next response despite error
              continue;
            }
          }
          
          // Check if there are more responses to fetch
          if (responsesData.page_count > 1 && responses.length === params.page_size) {
            // Get the last response's token for pagination
            const lastResponse = responses[responses.length - 1];
            beforeParam = lastResponse.token;
            console.log(`Fetching next page of responses for form ${form.title}`);
          } else {
            hasMoreResponses = false;
          }
        } catch (pageError) {
          console.error(`Error fetching page of responses for form ${form.id}:`, pageError);
          // If we hit an error with pagination, move to the next form
          hasMoreResponses = false;
          continue;
        }
      }
    }
    
    // Get count of imported form submissions
    const formCount = await db.select({ count: sql`count(${forms.id})` }).from(forms);
    const formSubmissionsCount = Number(formCount[0]?.count) || 0;
    
    console.log(`Typeform sync completed. Processed ${totalResponsesProcessed} responses, synced ${totalResponsesSynced} activities. Failed: ${failedResponses}`);
    console.log(`Typeform sync completed. Imported ${formSubmissionsCount} form submissions`);
    
    return {
      success: true,
      processed: totalResponsesProcessed,
      synced: totalResponsesSynced,
      failed: failedResponses,
      formSubmissions: formSubmissionsCount
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