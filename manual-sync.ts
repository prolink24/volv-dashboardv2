import axios from 'axios';
import { db } from './server/db';
import { contacts } from './shared/schema';

async function manualSync() {
  try {
    console.log('Starting manual contact sync test');
    
    // 1. Try to fetch a single lead from Close
    const closeApi = axios.create({
      baseURL: 'https://api.close.com/api/v1',
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.CLOSE_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Fetching sample lead from Close...');
    const response = await closeApi.get('/lead?_limit=1');
    const lead = response.data.data[0];
    
    if (!lead) {
      console.error('No leads found in Close');
      process.exit(1);
    }
    
    console.log(`Found lead: ${lead.id} - ${lead.display_name}`);
    
    // 2. Check if lead has valid email
    let email = '';
    if (lead.contacts && lead.contacts.length > 0) {
      for (const contact of lead.contacts) {
        if (contact.emails && contact.emails.length > 0) {
          email = contact.emails[0].email;
          break;
        }
      }
    }
    
    if (!email) {
      console.log('Lead has no email, adding a test email');
      email = `test-${lead.id}@example.com`;
    }
    
    console.log(`Using email: ${email}`);
    
    // 3. Manually insert the contact into our database
    console.log('Creating contact record in database...');
    const [contact] = await db.insert(contacts).values({
      name: lead.display_name || 'Unknown',
      email: email,
      phone: lead.contacts?.[0]?.phones?.[0]?.phone || '',
      company: lead.company || '',
      closeId: lead.id,
      leadSource: 'close',
      status: lead.status_label?.toLowerCase() || 'lead',
      createdAt: new Date()
    }).returning();
    
    console.log('Successfully created contact:', contact);
    
    // 4. Verify it shows up in API
    console.log('Checking if contact is accessible via API...');
    const apiResponse = await axios.get('http://localhost:5000/api/contacts');
    console.log(`API response: ${apiResponse.data.contacts.length} contacts found`);
    
    // Find our contact
    const ourContact = apiResponse.data.contacts.find((c: any) => c.closeId === lead.id);
    if (ourContact) {
      console.log('✅ Success! Contact was found in API response:', ourContact);
    } else {
      console.error('❌ Error: Contact was not found in API response');
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('Manual sync error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data));
    }
    process.exit(1);
  }
}

manualSync();