/**
 * Multi-Platform Attribution Test Script
 * 
 * This script tests the integration and attribution between Close CRM, Calendly, 
 * and Typeform by verifying API connections and testing the attribution service.
 */

import closeApi from './server/api/close';
import calendlyApi from './server/api/calendly';
import typeformApi from './server/api/typeform';
import attributionService from './server/services/attribution';
import { storage } from './server/storage';

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
  console.log(`${colors.magenta}===== MULTI-PLATFORM ATTRIBUTION TEST =====\n${colors.reset}`);

  // Test 1: Verify API connections
  console.log(`${colors.blue}[TEST 1] Verifying API connections${colors.reset}`);
  
  // Test Close API
  console.log(`\n${colors.cyan}Testing Close CRM API connection...${colors.reset}`);
  const closeResult = await closeApi.testApiConnection();
  if (closeResult.success) {
    console.log(`${colors.green}✓ Close CRM API connection successful!${colors.reset}`);
    console.log(`  Authenticated as: ${closeResult.user.first_name} ${closeResult.user.last_name}`);
  } else {
    console.log(`${colors.red}✗ Close CRM API connection failed: ${closeResult.error}${colors.reset}`);
    console.log('  Please check your CLOSE_API_KEY environment variable');
  }
  
  // Test Calendly API
  console.log(`\n${colors.cyan}Testing Calendly API connection...${colors.reset}`);
  const calendlyResult = await calendlyApi.testApiConnection();
  if (calendlyResult.success) {
    console.log(`${colors.green}✓ Calendly API connection successful!${colors.reset}`);
    console.log(`  Authenticated as: ${calendlyResult.user.name}`);
  } else {
    console.log(`${colors.red}✗ Calendly API connection failed: ${calendlyResult.error}${colors.reset}`);
    console.log('  Please check your CALENDLY_API_KEY environment variable');
  }
  
  // Test Typeform API
  console.log(`\n${colors.cyan}Testing Typeform API connection...${colors.reset}`);
  const typeformResult = await typeformApi.testApiConnection();
  if (typeformResult.success) {
    console.log(`${colors.green}✓ Typeform API connection successful!${colors.reset}`);
    console.log(`  Authenticated as: ${typeformResult.user.alias || typeformResult.user.email}`);
  } else {
    console.log(`${colors.red}✗ Typeform API connection failed: ${typeformResult.error}${colors.reset}`);
    console.log('  Please check your TYPEFORM_API_KEY environment variable');
  }

  // Test 2: Verify data retrieval and contact creation
  console.log(`\n${colors.blue}[TEST 2] Testing data retrieval${colors.reset}`);
  
  // Retrieve samples from each platform (if connected)
  if (closeResult.success) {
    console.log(`\n${colors.cyan}Retrieving sample lead from Close...${colors.reset}`);
    try {
      const leads = await closeApi.fetchLeads(1);
      if (leads && leads.length > 0) {
        console.log(`${colors.green}✓ Successfully retrieved ${leads.length} lead(s) from Close${colors.reset}`);
        console.log(`  Lead: ${leads[0].display_name || leads[0].name || 'Unnamed lead'}`);
      } else {
        console.log(`${colors.yellow}⚠ No leads found in Close${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Error retrieving leads from Close: ${error.message}${colors.reset}`);
    }
  }
  
  if (calendlyResult.success) {
    console.log(`\n${colors.cyan}Retrieving sample events from Calendly...${colors.reset}`);
    try {
      const events = await calendlyApi.fetchEvents(1);
      if (events && events.length > 0) {
        console.log(`${colors.green}✓ Successfully retrieved ${events.length} event(s) from Calendly${colors.reset}`);
        console.log(`  Event: ${events[0].name}, Scheduled for: ${new Date(events[0].startTime).toLocaleString()}`);
      } else {
        console.log(`${colors.yellow}⚠ No events found in Calendly${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Error retrieving events from Calendly: ${error.message}${colors.reset}`);
    }
  }
  
  if (typeformResult.success) {
    console.log(`\n${colors.cyan}Retrieving sample form responses from Typeform...${colors.reset}`);
    try {
      const responses = await typeformApi.fetchResponses(1);
      if (responses && responses.length > 0) {
        console.log(`${colors.green}✓ Successfully retrieved ${responses.length} response(s) from Typeform${colors.reset}`);
        console.log(`  Response submitted at: ${new Date(responses[0].submittedAt).toLocaleString()}`);
      } else {
        console.log(`${colors.yellow}⚠ No form responses found in Typeform${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Error retrieving form responses from Typeform: ${error.message}${colors.reset}`);
    }
  }

  // Test 3: Verify attribution functionality
  console.log(`\n${colors.blue}[TEST 3] Testing attribution functionality${colors.reset}`);
  
  try {
    // Get a contact from the database that has data from multiple platforms
    console.log(`\n${colors.cyan}Finding a contact with cross-platform data...${colors.reset}`);
    
    // Get all contacts
    const contacts = await storage.getAllContacts();
    console.log(`Retrieved ${contacts.length} contacts from database`);
    
    // Find a contact with activities from multiple sources
    let testContactId: number | null = null;
    
    // Look for contacts with multiple platform data
    for (const contact of contacts) {
      const activities = await storage.getActivitiesByContactId(contact.id);
      const meetings = await storage.getMeetingsByContactId(contact.id);
      const forms = await storage.getFormsByContactId(contact.id);
      
      // Check if contact has data from at least 2 platforms
      const platforms = new Set();
      if (activities.length > 0) platforms.add('close');
      if (meetings.length > 0) platforms.add('calendly');
      if (forms.length > 0) platforms.add('typeform');
      
      if (platforms.size >= 2) {
        testContactId = contact.id;
        console.log(`${colors.green}✓ Found contact with cross-platform data: ${contact.name} (ID: ${contact.id})${colors.reset}`);
        console.log(`  Platforms: ${Array.from(platforms).join(', ')}`);
        console.log(`  Activities: ${activities.length}, Meetings: ${meetings.length}, Forms: ${forms.length}`);
        break;
      }
    }
    
    if (!testContactId) {
      console.log(`${colors.yellow}⚠ No contacts found with cross-platform data${colors.reset}`);
      console.log('  Attempting to find any contact with at least some data');
      
      // Look for any contact with at least some data
      for (const contact of contacts) {
        const activities = await storage.getActivitiesByContactId(contact.id);
        const meetings = await storage.getMeetingsByContactId(contact.id);
        const forms = await storage.getFormsByContactId(contact.id);
        
        if (activities.length > 0 || meetings.length > 0 || forms.length > 0) {
          testContactId = contact.id;
          console.log(`${colors.green}✓ Found contact with some data: ${contact.name} (ID: ${contact.id})${colors.reset}`);
          console.log(`  Activities: ${activities.length}, Meetings: ${meetings.length}, Forms: ${forms.length}`);
          break;
        }
      }
    }
    
    if (!testContactId && contacts.length > 0) {
      // If still no contact with data found, just use the first contact
      testContactId = contacts[0].id;
      console.log(`${colors.yellow}⚠ No contacts found with any data, using first contact: ${contacts[0].name} (ID: ${contacts[0].id})${colors.reset}`);
    }
    
    if (testContactId) {
      // Test attribution on the found contact
      console.log(`\n${colors.cyan}Testing attribution on contact ID: ${testContactId}...${colors.reset}`);
      const attributionResult = await attributionService.attributeContact(testContactId);
      
      if (attributionResult.success) {
        console.log(`${colors.green}✓ Attribution successful!${colors.reset}`);
        console.log(`  Timeline events: ${attributionResult.timeline.length}`);
        console.log(`  First touch: ${attributionResult.firstTouch ? new Date(attributionResult.firstTouch.date).toLocaleString() + ' via ' + attributionResult.firstTouch.source : 'None'}`);
        console.log(`  Last touch: ${attributionResult.lastTouch ? new Date(attributionResult.lastTouch.date).toLocaleString() + ' via ' + attributionResult.lastTouch.source : 'None'}`);
        
        // Display timeline summary by platform
        const platformCounts = attributionResult.timeline.reduce((acc, event) => {
          acc[event.source] = (acc[event.source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('\n  Timeline summary by platform:');
        Object.entries(platformCounts).forEach(([platform, count]) => {
          console.log(`    - ${platform}: ${count} event(s)`);
        });
      } else {
        console.log(`${colors.red}✗ Attribution failed: ${attributionResult.error}${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}✗ No contacts found in database${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error testing attribution: ${error.message}${colors.reset}`);
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