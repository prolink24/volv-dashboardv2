import axios from 'axios';
import { storage } from '../storage';
import { InsertContact, InsertActivity, InsertForm } from '@shared/schema';

const TYPEFORM_API_TOKEN = process.env.TYPEFORM_API_TOKEN || '';
const TYPEFORM_API_URL = 'https://api.typeform.com';

// Configure axios for Typeform API
const typeformApi = axios.create({
  baseURL: TYPEFORM_API_URL,
  headers: {
    'Authorization': `Bearer ${TYPEFORM_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Sync a Typeform response to our system
export async function syncTypeformResponse(formId: string, responseId: string) {
  try {
    // Fetch form data from Typeform
    const formResponse = await typeformApi.get(`/forms/${formId}`);
    const formData = formResponse.data;
    
    // Fetch specific response
    const responseResponse = await typeformApi.get(`/forms/${formId}/responses?included_response_ids=${responseId}`);
    const responses = responseResponse.data.items;
    
    if (responses.length === 0) {
      console.warn(`No response found for Typeform ID ${responseId}`);
      return null;
    }
    
    const response = responses[0];
    
    // Check if we already have this form response
    const existingForm = await storage.getFormByTypeformResponseId(responseId);
    if (existingForm) {
      return { existingForm };
    }
    
    // Extract answers data
    const answers = response.answers || [];
    const answerMap: Record<string, any> = {};
    let email = '';
    let name = '';
    let phone = '';
    let company = '';
    
    // Parse answers and look for contact info
    answers.forEach((answer: any) => {
      const fieldData = formData.fields.find((f: any) => f.id === answer.field.id);
      const fieldTitle = fieldData?.title || answer.field.id;
      
      answerMap[fieldTitle] = answer.text || answer.email || answer.phone_number || answer.choice?.label || JSON.stringify(answer);
      
      // Identify common fields
      const lowerTitle = fieldTitle.toLowerCase();
      if (answer.email || lowerTitle.includes('email')) {
        email = answer.email || answer.text || '';
      } else if (lowerTitle.includes('name') || lowerTitle.includes('full name')) {
        name = answer.text || '';
      } else if (answer.phone_number || lowerTitle.includes('phone')) {
        phone = answer.phone_number || answer.text || '';
      } else if (lowerTitle.includes('company')) {
        company = answer.text || '';
      }
    });
    
    // Find or create contact
    let contact = await storage.getContactByEmail(email);
    
    if (!contact && email) {
      const contactData: InsertContact = {
        name: name || email.split('@')[0],
        email,
        phone,
        company,
        typeformId: responseId,
        leadSource: 'typeform',
        status: 'lead'
      };
      
      contact = await storage.createContact(contactData);
    } else if (contact && !contact.typeformId) {
      // Update contact with Typeform ID if not set
      await storage.updateContact(contact.id, {
        typeformId: responseId,
        phone: phone || contact.phone,
        company: company || contact.company
      });
    }
    
    if (!contact) {
      console.warn(`Could not create contact for Typeform response ${responseId}, no email found`);
      return null;
    }
    
    // Create form data
    const formResponseData: InsertForm = {
      contactId: contact.id,
      typeformResponseId: responseId,
      formName: formData.title,
      submittedAt: new Date(response.submitted_at),
      answers: answerMap
    };
    
    const form = await storage.createForm(formResponseData);
    
    // Create activity for this form submission
    const activityData: InsertActivity = {
      contactId: contact.id,
      type: 'form_submission',
      source: 'typeform',
      sourceId: responseId,
      title: `Submitted ${formData.title}`,
      description: `Typeform submission for ${formData.title}`,
      date: new Date(response.submitted_at),
      metadata: {
        typeformResponseId: responseId,
        formId: form.id
      }
    };
    
    await storage.createActivity(activityData);
    
    return { contact, form };
  } catch (error) {
    console.error('Error syncing Typeform response:', error);
    throw error;
  }
}

// Fetch all forms from Typeform
export async function fetchAllForms() {
  try {
    const response = await typeformApi.get('/forms');
    return response.data.items;
  } catch (error) {
    console.error('Error fetching forms from Typeform:', error);
    throw error;
  }
}

// Fetch all responses for a form
export async function fetchAllResponses(formId: string) {
  try {
    let responses: any[] = [];
    let hasMore = true;
    let page_token = '';
    
    while (hasMore) {
      const url = page_token 
        ? `/forms/${formId}/responses?page_size=100&page_token=${page_token}` 
        : `/forms/${formId}/responses?page_size=100`;
        
      const response = await typeformApi.get(url);
      responses = [...responses, ...response.data.items];
      
      page_token = response.data.page_token;
      hasMore = !!page_token;
    }
    
    return responses;
  } catch (error) {
    console.error(`Error fetching responses for form ${formId}:`, error);
    throw error;
  }
}

// Sync all form responses from Typeform to our system
export async function syncAllResponses() {
  try {
    const forms = await fetchAllForms();
    let totalResponses = 0;
    
    for (const form of forms) {
      const responses = await fetchAllResponses(form.id);
      totalResponses += responses.length;
      
      for (const response of responses) {
        await syncTypeformResponse(form.id, response.response_id);
      }
    }
    
    return { success: true, formsCount: forms.length, responsesCount: totalResponses };
  } catch (error) {
    console.error('Error syncing all responses from Typeform:', error);
    throw error;
  }
}

export default {
  syncTypeformResponse,
  fetchAllForms,
  fetchAllResponses,
  syncAllResponses
};
