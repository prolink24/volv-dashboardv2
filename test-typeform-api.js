// Simple script to test Typeform API connection
import axios from 'axios';
import { config } from 'dotenv';
config();

async function testTypeformAPI() {
  try {
    // Test getting forms
    console.log('Testing Typeform API connection by retrieving forms...');
    const formsResponse = await axios.get('https://api.typeform.com/forms', {
      headers: {
        'Authorization': `Bearer ${process.env.TYPEFORM_API_TOKEN}`
      }
    });
    
    console.log(`Successfully retrieved ${formsResponse.data.items.length} forms`);
    
    if (formsResponse.data.items.length > 0) {
      const testFormId = formsResponse.data.items[0].id;
      console.log(`Testing responses for form: ${testFormId}`);
      
      // Test getting responses for the first form
      const responsesResponse = await axios.get(`https://api.typeform.com/forms/${testFormId}/responses`, {
        headers: {
          'Authorization': `Bearer ${process.env.TYPEFORM_API_TOKEN}`
        },
        params: {
          completed: true,
          page_size: 2
        }
      });
      
      console.log(`Retrieved ${responsesResponse.data.items.length} responses for the form`);
      
      if (responsesResponse.data.items.length > 0) {
        console.log('First response structure:');
        const firstResponse = responsesResponse.data.items[0];
        console.log(JSON.stringify(firstResponse, null, 2));
      }
    }
    
    console.log('Typeform API test completed successfully');
  } catch (error) {
    console.error('Error testing Typeform API:');
    console.error(error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testTypeformAPI();