import closeApi from './server/api/close';

async function testSyncSpecificLead() {
  try {
    // Get the first few leads to find one with an email
    console.log('Testing Close API connection...');
    
    // Try different endpoints to maximize our chances of connecting successfully
    const endpoints = [
      { path: '/me', name: 'user profile' },
      { path: '/lead?_limit=10', name: 'leads' }
    ];
    
    let foundLead = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Testing Close API connection using ${endpoint.name} endpoint...`);
        const response = await axios.get(endpoint.path, {
          baseURL: 'https://api.close.com/api/v1',
          headers: {
            'Authorization': `Basic ${Buffer.from(process.env.CLOSE_API_KEY + ':').toString('base64')}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        console.log(`Successfully connected to Close API via ${endpoint.name} endpoint`);
        
        if (endpoint.path.includes('lead')) {
          const leads = response.data.data;
          console.log(`Found ${leads.length} leads`);
          
          // Find first lead with contacts that have emails
          for (const lead of leads) {
            if (lead.contacts && lead.contacts.length > 0) {
              // Log each contact
              console.log(`Lead ${lead.id} has ${lead.contacts.length} contacts`);
              const contactsWithEmail = lead.contacts.filter(c => c.emails && c.emails.length > 0);
              
              if (contactsWithEmail.length > 0) {
                console.log(`Found lead with ${contactsWithEmail.length} contacts with email`);
                foundLead = lead;
                break;
              }
            }
          }
          
          if (foundLead) {
            console.log(`Found lead with email: ${foundLead.id} - ${foundLead.display_name}`);
            
            // Try to sync this specific lead
            console.log('Attempting to sync this lead...');
            const contact = await closeApi.syncCloseLeadToContact(foundLead.id);
            console.log('Successfully synced lead to contact:', contact);
          } else {
            console.log('No leads with email found');
          }
        }
      } catch (error) {
        console.warn(`Failed to connect to ${endpoint.name} endpoint:`, error.message);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Sync test error:', error);
    process.exit(1);
  }
}

// We need axios for this test
import axios from 'axios';
testSyncSpecificLead();