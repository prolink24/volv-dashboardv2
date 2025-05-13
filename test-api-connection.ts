/**
 * API Connection Test Script
 * 
 * This script tests the API connections for Close CRM and Calendly.
 */

import closeApi from './server/api/close';
import calendlyApi from './server/api/calendly';

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m"
};

async function runTests() {
  console.log(`${colors.magenta}===== API CONNECTION TEST =====\n${colors.reset}`);
  
  // Test Close API
  console.log(`${colors.cyan}Testing Close CRM API connection...${colors.reset}`);
  try {
    const closeResult = await closeApi.testApiConnection();
    if (closeResult.success) {
      console.log(`${colors.green}✓ Close CRM API connection successful!${colors.reset}`);
      console.log(`  Authenticated as: ${closeResult.user.first_name} ${closeResult.user.last_name}`);
      
      // Fetch sample data
      console.log(`\n${colors.cyan}Fetching 5 sample leads from Close CRM...${colors.reset}`);
      const leads = await closeApi.fetchLeads(5);
      console.log(`${colors.green}✓ Successfully retrieved ${leads.length} leads${colors.reset}`);
      
      if (leads.length > 0) {
        // Display sample lead data
        console.log(`\n  Sample leads:`);
        leads.forEach((lead, index) => {
          console.log(`    ${index + 1}. ${lead.display_name || lead.name} (ID: ${lead.id})`);
          
          // Display contact data if available
          if (lead.contacts && lead.contacts.length > 0) {
            console.log(`       Contacts: ${lead.contacts.length}`);
            lead.contacts.forEach((contact, cIndex) => {
              const email = contact.emails && contact.emails.length > 0 ? contact.emails[0].email : 'No email';
              console.log(`       - ${contact.name || 'Unnamed contact'} (${email})`);
            });
          }
        });
      }
    } else {
      console.log(`${colors.red}✗ Close CRM API connection failed: ${closeResult.error}${colors.reset}`);
      console.log('  Please check your CLOSE_API_KEY environment variable');
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error testing Close CRM API: ${error.message}${colors.reset}`);
  }
  
  // Test Calendly API
  console.log(`\n${colors.cyan}Testing Calendly API connection...${colors.reset}`);
  try {
    const calendlyResult = await calendlyApi.testApiConnection();
    if (calendlyResult.success) {
      console.log(`${colors.green}✓ Calendly API connection successful!${colors.reset}`);
      console.log(`  Authenticated as: ${calendlyResult.user.name}`);
      
      // Fetch sample data
      console.log(`\n${colors.cyan}Fetching 5 sample events from Calendly...${colors.reset}`);
      const events = await calendlyApi.fetchEvents(5);
      console.log(`${colors.green}✓ Successfully retrieved ${events.length} events${colors.reset}`);
      
      if (events.length > 0) {
        // Display sample event data
        console.log(`\n  Sample events:`);
        events.forEach((event, index) => {
          console.log(`    ${index + 1}. ${event.name} (ID: ${event.id})`);
          console.log(`       Start: ${new Date(event.startTime).toLocaleString()}`);
          console.log(`       Status: ${event.status}`);
        });
      }
    } else {
      console.log(`${colors.red}✗ Calendly API connection failed: ${calendlyResult.error}${colors.reset}`);
      console.log('  Please check your CALENDLY_API_KEY environment variable');
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error testing Calendly API: ${error.message}${colors.reset}`);
  }

  console.log(`\n${colors.magenta}===== TEST COMPLETED =====\n${colors.reset}`);
}

// Run the tests
runTests()
  .then(() => {
    console.log('Tests completed, exiting.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running tests:', error);
    process.exit(1);
  });