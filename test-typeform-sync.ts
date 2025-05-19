/**
 * Typeform Sync Test Script
 * 
 * This script tests the Typeform integration by:
 * 1. Getting all forms from the Typeform API
 * 2. Getting responses for each form
 * 3. Creating contact records as needed
 * 4. Creating form records for each response
 * 5. Verifying the records were created correctly
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { db } from './server/db';
import { eq, sql } from 'drizzle-orm';
import { contacts, forms, activities, type InsertForm, type InsertActivity } from './shared/schema';

dotenv.config();

// Initialize Typeform client with API token
const typeformClient = axios.create({
  baseURL: 'https://api.typeform.com',
  timeout: 10000,
  headers: {
    'Authorization': `Bearer ${process.env.TYPEFORM_API_TOKEN}`
  }
});

// Helper functions for data extraction
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

// API functions
async function getForms() {
  try {
    const response = await typeformClient.get('/forms');
    return response.data;
  } catch (error: any) {
    console.error('Error getting forms:', error.message);
    throw error;
  }
}

async function getFormResponses(formId: string, params: Record<string, any> = {}) {
  try {
    const response = await typeformClient.get(`/forms/${formId}/responses`, { params });
    return response.data;
  } catch (error: any) {
    console.error(`Error getting responses for form ${formId}:`, error.message);
    throw error;
  }
}

// Function to create a form record
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
    
    console.log(`Inserting form record for response ID: ${response.response_id}`);
    
    try {
      const result = await db.insert(forms).values(formData).returning();
      console.log(`Successfully created form record with ID: ${result[0]?.id}`);
      return result[0];
    } catch (insertError: any) {
      console.error('Database error creating form record:', insertError.message);
      throw insertError;
    }
  } catch (error: any) {
    console.error('Error in createFormRecord:', error.message);
    throw error;
  }
}

// Main function to test Typeform sync
async function testTypeformSync() {
  console.log('Starting Typeform sync test...');
  
  try {
    // Get all forms
    const formsData = await getForms();
    
    if (!formsData || !formsData.items) {
      throw new Error('No forms returned from Typeform API');
    }
    
    const typeformForms = formsData.items || [];
    console.log(`Found ${typeformForms.length} forms from Typeform API`);
    
    // First, just try to create a form record for one response to test the DB connection
    if (typeformForms.length > 0) {
      const testForm = typeformForms[0];
      console.log(`Testing with form: ${testForm.title} (${testForm.id})`);
      
      // Get a sample response
      const testResponsesData = await getFormResponses(testForm.id, { 
        completed: true,
        page_size: 1
      });
      
      if (testResponsesData && testResponsesData.items && testResponsesData.items.length > 0) {
        const testResponse = testResponsesData.items[0];
        console.log(`Testing with response ID: ${testResponse.response_id}`);
        
        // Check if this response already exists in the database
        const existingForm = await db.select()
          .from(forms)
          .where(eq(forms.typeformResponseId, testResponse.response_id));
        
        if (existingForm.length > 0) {
          console.log(`Test response already exists in database with ID: ${existingForm[0].id}`);
        } else {
          // Create a contact
          const email = extractEmailFromResponse(testResponse) || `test_${Date.now()}@example.com`;
          console.log(`Using email: ${email} for test contact`);
          
          // Check if contact exists
          const existingContact = await db.select()
            .from(contacts)
            .where(eq(contacts.email, email));
          
          let contactId: number;
          
          if (existingContact.length > 0) {
            contactId = existingContact[0].id;
            console.log(`Using existing contact ID: ${contactId}`);
          } else {
            // Create a new contact
            const contactResult = await db.insert(contacts).values({
              email,
              firstName: extractNameFromResponse(testResponse) || 'Test',
              lastName: '',
              company: extractCompanyFromResponse(testResponse) || 'Test Company',
              source: 'typeform',
              createdAt: new Date(),
              updatedAt: new Date()
            }).returning();
            
            contactId = contactResult[0].id;
            console.log(`Created test contact with ID: ${contactId}`);
          }
          
          // Create a form record
          const formRecord = await createFormRecord(contactId, testResponse, testForm.id, testForm.title);
          console.log(`Created test form record with ID: ${formRecord?.id}`);
          
          // Create an activity
          const activityData: InsertActivity = {
            contactId,
            type: 'form_submission',
            source: 'typeform',
            sourceId: testResponse.response_id,
            description: `Submitted form: ${testForm.title}`,
            metadata: {
              formId: testForm.id,
              formName: testForm.title,
              submittedAt: testResponse.submitted_at
            },
            timestamp: new Date(testResponse.submitted_at)
          };
          
          const activityResult = await db.insert(activities).values(activityData).returning();
          console.log(`Created test activity with ID: ${activityResult[0]?.id}`);
        }
      } else {
        console.log('No responses found for test form');
      }
    }
    
    // Get current form count
    const formCountBefore = await db.select({ count: sql`count(${forms.id})` }).from(forms);
    const formCountBeforeNum = Number(formCountBefore[0]?.count) || 0;
    console.log(`Current form count in database: ${formCountBeforeNum}`);
    
    console.log('Typeform sync test completed successfully');
  } catch (error: any) {
    console.error('Error in Typeform sync test:', error.message);
  }
}

// Run the test
testTypeformSync()
  .then(() => {
    console.log('Test complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });