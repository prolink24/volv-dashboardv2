/**
 * Test Calendly Integration
 * 
 * This script tests the enhanced Calendly integration with contact merging
 */

import calendlyAPI from './server/api/calendly';
import { storage } from './server/storage';
import contactMatcher from './server/services/contact-matcher';

async function testCalendlyIntegration() {
  console.log("=== Testing Calendly Integration with Enhanced Contact Merging ===\n");
  
  try {
    // First, test API connection
    console.log("Testing Calendly API connection...");
    const apiTest = await calendlyAPI.testApiConnection();
    
    if (apiTest.success) {
      console.log(`✅ Calendly API connection successful: ${apiTest.message}`);
    } else {
      console.error(`❌ Calendly API connection failed: ${apiTest.error}`);
      return;
    }
    
    // Fetch a few recent events for testing
    console.log("\nFetching recent Calendly events for testing...");
    const events = await calendlyAPI.fetchEvents(3);
    
    console.log(`Found ${events.length} recent events\n`);
    
    // Process each event to test contact matching
    for (const event of events) {
      console.log(`Processing event: ${event.name} (${new Date(event.start_time).toLocaleString()})`);
      
      // Fetch invitees
      const invitees = await calendlyAPI.getEventInvitees(event.uri);
      console.log(`Event has ${invitees.length} invitees`);
      
      // Process each invitee
      for (const invitee of invitees) {
        console.log(`\nInvitee: ${invitee.name} (${invitee.email})`);
        
        // Check if there's a matching contact in the system
        const phone = calendlyAPI.extractPhoneFromInvitee(invitee);
        const company = calendlyAPI.extractCompanyFromInvitee(invitee);
        
        console.log(`Additional data extracted - Phone: ${phone || 'None'}, Company: ${company || 'None'}`);
        
        // Prepare contact data
        const contactData = {
          name: invitee.name,
          email: invitee.email,
          phone: phone || '',
          company: company || '',
          leadSource: 'calendly',
          status: 'lead'
        };
        
        // Test contact matching
        const matchResult = await contactMatcher.findBestMatchingContact(contactData);
        
        console.log(`Match result: ${matchResult.confidence}`);
        console.log(`Match reason: ${matchResult.reason || 'No reason provided'}`);
        
        if (matchResult.contact) {
          console.log(`Matched to: ${matchResult.contact.name} (${matchResult.contact.email})`);
          
          // Check if this is a good match
          if (matchResult.confidence !== 'none') {
            console.log(`✅ Successfully matched invitee to existing contact`);
          } else {
            console.log(`❌ No match found, would create new contact`);
          }
        } else {
          console.log(`❌ No match found, would create new contact`);
        }
      }
      
      console.log("\n----------------------\n");
    }
    
    console.log("Calendly integration test complete");
    
  } catch (error) {
    console.error("Error testing Calendly integration:", error);
  }
}

// Run the test
testCalendlyIntegration().then(() => {
  console.log("Test complete");
  process.exit(0);
}).catch(error => {
  console.error("Test failed:", error);
  process.exit(1);
});