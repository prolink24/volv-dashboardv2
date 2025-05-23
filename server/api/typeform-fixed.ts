import axios from 'axios';
import { db } from '../db';
import { activities, type InsertActivity, forms, type InsertForm, contacts } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

// Typeform API Client
const typeformClient = axios.create({
  baseURL: 'https://api.typeform.com',
  timeout: 15000,
  headers: {
    'Authorization': `Bearer ${process.env.TYPEFORM_API_TOKEN}`
  }
});

/**
 * Get all forms from Typeform
 */
export async function getForms() {
  try {
    const response = await typeformClient.get('/forms', {
      params: {
        page_size: 100
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting forms from Typeform API:', error);
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
      params
    });
    return response.data;
  } catch (error) {
    console.error(`Error getting responses for form ${formId}:`, error);
    throw error;
  }
}

/**
 * Extract email from form response
 * @param response The form response object
 */
function extractEmailFromResponse(response: any): string | null {
  if (!response || !response.answers) return null;
  
  // First, look for an email type answer
  const emailAnswer = response.answers.find((answer: any) => answer.type === 'email');
  if (emailAnswer && emailAnswer.email) {
    return emailAnswer.email;
  }
  
  // Next, look for text answers that might contain emails
  const textAnswers = response.answers.filter((answer: any) => answer.type === 'text');
  
  for (const answer of textAnswers) {
    if (!answer.text) continue;
    
    // Simple regex to find emails in text
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = answer.text.match(emailRegex);
    
    if (match) {
      return match[0];
    }
  }
  
  // Check hidden fields for email
  if (response.hidden && response.hidden.email) {
    return response.hidden.email;
  }
  
  return null;
}

/**
 * Extract name from form response
 * @param response The form response object
 */
function extractNameFromResponse(response: any): string | null {
  if (!response || !response.answers) return null;
  
  // Look for fields likely to contain names
  const nameFields = ['name', 'full name', 'your name', 'first name'];
  
  for (const answer of response.answers) {
    if (answer.field && answer.field.title) {
      const title = answer.field.title.toLowerCase();
      
      if (nameFields.some(field => title.includes(field)) && answer.text) {
        return answer.text;
      }
    }
  }
  
  // Check hidden fields
  if (response.hidden && response.hidden.name) {
    return response.hidden.name;
  }
  
  return null;
}

/**
 * Extract company from form response
 * @param response The form response object
 */
function extractCompanyFromResponse(response: any): string | null {
  if (!response || !response.answers) return null;
  
  // Look for fields likely to contain company
  const companyFields = ['company', 'organization', 'business', 'employer'];
  
  for (const answer of response.answers) {
    if (answer.field && answer.field.title) {
      const title = answer.field.title.toLowerCase();
      
      if (companyFields.some(field => title.includes(field)) && answer.text) {
        return answer.text;
      }
    }
  }
  
  // Check hidden fields
  if (response.hidden && response.hidden.company) {
    return response.hidden.company;
  }
  
  return null;
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
    console.log(`Creating form record for contact ID: ${contactId}, response ID: ${response.response_id}`);
    
    // Process answers into a structured object
    const processedAnswers: Record<string, any> = {};
    
    if (response.answers && Array.isArray(response.answers)) {
      for (const answer of response.answers) {
        if (answer.field && answer.field.title) {
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
          
          processedAnswers[key] = value;
        }
      }
    }
    
    // Create the form data record
    const formData: InsertForm = {
      contactId,
      typeformResponseId: response.response_id,
      formName: formName,
      formId: formId,
      submittedAt: new Date(response.submitted_at),
      answers: processedAnswers,
      hiddenFields: response.hidden || {},
      calculatedFields: response.calculated || {},
      completionPercentage: 100,
      respondentEmail: extractEmailFromResponse(response),
      respondentName: extractNameFromResponse(response),
      respondentIp: response.metadata?.network_id || null,
      completionTime: response.metadata?.time_to_complete || null,
      utmSource: response.hidden?.utm_source || null,
      utmMedium: response.hidden?.utm_medium || null,
      utmCampaign: response.hidden?.utm_campaign || null
    };
    
    try {
      const result = await db.insert(forms).values(formData).returning();
      console.log(`Successfully created form record for response ID: ${response.response_id}`);
      return result[0];
    } catch (insertError) {
      console.error('Database error creating form record:', insertError);
      throw insertError;
    }
  } catch (error) {
    console.error('Error in createFormRecord:', error);
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
    
    let totalResponsesProcessed = 0;
    let totalResponsesSynced = 0;
    let failedResponses = 0;
    
    // Process each form
    for (const form of typeformForms) {
      console.log(`Processing form: ${form.title} (${form.id})`);
      
      try {
        // Get responses for this form
        const params = { 
          completed: true,
          page_size: 20 // Start with a reasonable page size
        };
        
        const responsesData = await getFormResponses(form.id, params);
        
        if (!responsesData || !responsesData.items || responsesData.items.length === 0) {
          console.log(`No responses found for form: ${form.title}`);
          continue;
        }
        
        const responses = responsesData.items;
        console.log(`Found ${responses.length} responses for form: ${form.title}`);
        totalResponsesProcessed += responses.length;
        
        // Process each response
        for (const response of responses) {
          try {
            console.log(`Processing response: ${response.response_id}`);
            
            // Check if response already exists in database
            const existingResponse = await db.select()
              .from(forms)
              .where(eq(forms.typeformResponseId, response.response_id));
            
            if (existingResponse.length > 0) {
              console.log(`Response ${response.response_id} already exists, skipping`);
              continue;
            }
            
            // Get email from response
            const email = extractEmailFromResponse(response);
            
            if (!email) {
              console.warn(`No email found in response ${response.response_id}, creating placeholder`);
              // Create a unique identifier from response ID
              const placeholderEmail = `typeform_${response.response_id}@placeholder.com`;
              
              // Create a new contact with the placeholder email
              const contactData = {
                email: placeholderEmail,
                name: extractNameFromResponse(response) || 'Unknown Contact',
                company: extractCompanyFromResponse(response) || 'Unknown Company',
                leadSource: 'typeform'
              };
              
              const contactResult = await db.insert(contacts).values(contactData).returning({ id: contacts.id });
              console.log(`Created placeholder contact with email: ${placeholderEmail}`);
              
              if (contactResult.length > 0) {
                const contactId = contactResult[0].id;
                
                // Create form record
                const formRecord = await createFormRecord(contactId, response, form.id, form.title);
                
                // Create activity for form submission
                const activityData: InsertActivity = {
                  contactId,
                  type: 'form_submission',
                  source: 'typeform',
                  sourceId: response.response_id,
                  title: `Form Submission: ${form.title}`,
                  description: `Submitted form: ${form.title}`,
                  metadata: {
                    formId: form.id,
                    formName: form.title,
                    submittedAt: response.submitted_at
                  },
                  date: new Date(response.submitted_at)
                };
                
                await db.insert(activities).values(activityData);
                console.log(`Created activity for form submission ${response.response_id}`);
                
                totalResponsesSynced++;
              } else {
                console.error(`Failed to get contact ID after creating placeholder contact`);
                failedResponses++;
              }
              
              continue;
            }
            
            // Look up contact by email
            const existingContacts = await db.select()
              .from(contacts)
              .where(eq(contacts.email, email));
            
            let contactId: number;
            
            if (existingContacts.length > 0) {
              // Use existing contact
              contactId = existingContacts[0].id;
              console.log(`Using existing contact ID ${contactId} for email ${email}`);
            } else {
              // Create new contact
              const contactData = {
                email: email,
                name: extractNameFromResponse(response) || 'Unknown Contact',
                company: extractCompanyFromResponse(response) || 'Unknown Company',
                leadSource: 'typeform'
              };
              
              const contactResult = await db.insert(contacts).values(contactData).returning({ id: contacts.id });
              
              if (contactResult.length === 0) {
                console.error(`Failed to create contact for email ${email}`);
                failedResponses++;
                continue;
              }
              
              contactId = contactResult[0].id;
              console.log(`Created new contact ID ${contactId} for email ${email}`);
            }
            
            // Create form submission record
            const formRecord = await createFormRecord(contactId, response, form.id, form.title);
            
            // Create activity record for this form submission
            const activityData: InsertActivity = {
              contactId: contactId,
              type: 'form_submission',
              source: 'typeform',
              sourceId: response.response_id,
              title: `Form Submission: ${form.title}`,
              description: `Submitted form: ${form.title}`,
              metadata: {
                formId: form.id,
                formName: form.title,
                submittedAt: response.submitted_at
              },
              date: new Date(response.submitted_at)
            };
            
            await db.insert(activities).values(activityData);
            console.log(`Created activity for form submission ${response.response_id}`);
            
            totalResponsesSynced++;
          } catch (responseError) {
            console.error(`Error processing response ${response.response_id}:`, responseError);
            failedResponses++;
          }
        }
      } catch (formError) {
        console.error(`Error getting responses for form ${form.id}:`, formError);
        failedResponses++;
      }
    }
    
    // Count the total number of form submissions in the database
    const formCount = await db.select({ count: sql`count(${forms.id})` }).from(forms);
    const formSubmissionsCount = Number(formCount[0]?.count) || 0;
    
    console.log(`Typeform sync completed. Processed ${totalResponsesProcessed} responses, synced ${totalResponsesSynced} form submissions. Failed: ${failedResponses}`);
    console.log(`Total form submissions in database: ${formSubmissionsCount}`);
    
    return {
      processed: totalResponsesProcessed,
      synced: totalResponsesSynced,
      failed: failedResponses,
      total: formSubmissionsCount
    };
  } catch (error) {
    console.error('Error syncing Typeform responses:', error);
    throw error;
  }
}

/**
 * Sync a single form's responses
 * @param formId The ID of the form to sync
 */
export async function syncSingleForm(formId: string) {
  console.log(`Syncing single form: ${formId}`);
  try {
    // Validate form ID
    const formResponse = await typeformClient.get(`/forms/${formId}`);
    const formTitle = formResponse.data.title;
    
    // Get responses for this form
    const params = { 
      completed: true,
      page_size: 20
    };
    
    const responsesData = await getFormResponses(formId, params);
    
    if (!responsesData || !responsesData.items || responsesData.items.length === 0) {
      console.log(`No responses found for form: ${formTitle}`);
      return { synced: 0, failed: 0 };
    }
    
    const responses = responsesData.items;
    console.log(`Found ${responses.length} responses for form: ${formTitle}`);
    
    let syncedCount = 0;
    let failedCount = 0;
    
    // Process each response
    for (const response of responses) {
      try {
        // Check if response already exists
        const existingResponse = await db.select()
          .from(forms)
          .where(eq(forms.typeformResponseId, response.response_id));
        
        if (existingResponse.length > 0) {
          console.log(`Response ${response.response_id} already exists, skipping`);
          continue;
        }
        
        // Get email from response
        const email = extractEmailFromResponse(response);
        let contactId: number;
        
        if (!email) {
          // Create placeholder contact
          const placeholderEmail = `typeform_${response.response_id}@placeholder.com`;
          const contactData = {
            email: placeholderEmail,
            name: extractNameFromResponse(response) || 'Unknown Contact',
            company: extractCompanyFromResponse(response) || 'Unknown Company',
            leadSource: 'typeform'
          };
          
          const contactResult = await db.insert(contacts).values(contactData).returning({ id: contacts.id });
          
          if (contactResult.length === 0) {
            console.error(`Failed to create placeholder contact`);
            failedCount++;
            continue;
          }
          
          contactId = contactResult[0].id;
        } else {
          // Look up existing contact or create new one
          const existingContacts = await db.select()
            .from(contacts)
            .where(eq(contacts.email, email));
          
          if (existingContacts.length > 0) {
            contactId = existingContacts[0].id;
          } else {
            const contactData = {
              email: email,
              name: extractNameFromResponse(response) || 'Unknown Contact',
              company: extractCompanyFromResponse(response) || 'Unknown Company',
              leadSource: 'typeform'
            };
            
            const contactResult = await db.insert(contacts).values(contactData).returning({ id: contacts.id });
            
            if (contactResult.length === 0) {
              console.error(`Failed to create contact for email ${email}`);
              failedCount++;
              continue;
            }
            
            contactId = contactResult[0].id;
          }
        }
        
        // Create form record
        await createFormRecord(contactId, response, formId, formTitle);
        
        // Create activity
        const activityData: InsertActivity = {
          contactId: contactId,
          type: 'form_submission',
          source: 'typeform',
          sourceId: response.response_id,
          title: `Form Submission: ${formTitle}`,
          description: `Submitted form: ${formTitle}`,
          metadata: {
            formId: formId,
            formName: formTitle,
            submittedAt: response.submitted_at
          },
          date: new Date(response.submitted_at)
        };
        
        await db.insert(activities).values(activityData);
        
        syncedCount++;
      } catch (responseError) {
        console.error(`Error processing response ${response.response_id}:`, responseError);
        failedCount++;
      }
    }
    
    console.log(`Form sync completed. Synced ${syncedCount} responses. Failed: ${failedCount}`);
    return { synced: syncedCount, failed: failedCount };
  } catch (error) {
    console.error(`Error syncing form ${formId}:`, error);
    throw error;
  }
}

/**
 * Test the connection to the Typeform API
 */
export async function testTypeformConnection() {
  try {
    const formsData = await getForms();
    
    if (!formsData || !formsData.items) {
      return { success: false, message: 'No forms returned from Typeform API' };
    }
    
    const forms = formsData.items || [];
    
    return { 
      success: true, 
      message: `Successfully connected to Typeform API. Found ${forms.length} forms.`,
      data: {
        formCount: forms.length,
        forms: forms.map(form => ({
          id: form.id,
          title: form.title,
          createdAt: form.created_at
        }))
      }
    };
  } catch (error) {
    return { 
      success: false, 
      message: `Failed to connect to Typeform API: ${error.message}`,
      error
    };
  }
}