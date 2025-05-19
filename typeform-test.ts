// Simple script to test Typeform API connection
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const typeformToken = process.env.TYPEFORM_API_TOKEN;

if (!typeformToken) {
  console.error('TYPEFORM_API_TOKEN is not defined in environment variables');
  process.exit(1);
}

async function testTypeformAPI() {
  try {
    // Test getting forms
    console.log('Testing Typeform API connection by retrieving forms...');
    console.log(`Using token: ${typeformToken.substring(0, 5)}...${typeformToken.substring(typeformToken.length - 5)}`);

    const formsResponse = await axios.get('https://api.typeform.com/forms', {
      headers: {
        'Authorization': `Bearer ${typeformToken}`
      }
    });
    
    console.log(`Successfully retrieved ${formsResponse.data.items.length} forms`);
    
    if (formsResponse.data.items.length > 0) {
      const firstForm = formsResponse.data.items[0];
      console.log(`First form details: ID=${firstForm.id}, Title=${firstForm.title}`);
      
      const testFormId = firstForm.id;
      console.log(`Testing responses for form: ${testFormId}`);
      
      // Test getting responses for the first form
      const responsesResponse = await axios.get(`https://api.typeform.com/forms/${testFormId}/responses`, {
        headers: {
          'Authorization': `Bearer ${typeformToken}`
        },
        params: {
          completed: true,
          page_size: 2
        }
      });
      
      console.log(`Retrieved ${responsesResponse.data.items?.length || 0} responses for the form`);
      
      if (responsesResponse.data.items && responsesResponse.data.items.length > 0) {
        console.log('First response structure:');
        const firstResponse = responsesResponse.data.items[0];
        console.log(JSON.stringify({
          response_id: firstResponse.response_id,
          submitted_at: firstResponse.submitted_at,
          answers_count: firstResponse.answers?.length || 0,
          metadata: firstResponse.metadata
        }, null, 2));
      } else {
        console.log('No responses found for this form');
      }
    }
    
    console.log('Typeform API test completed successfully');
  } catch (error: any) {
    console.error('Error testing Typeform API:');
    console.error(error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testTypeformAPI();