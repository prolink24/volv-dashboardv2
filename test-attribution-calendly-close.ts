/**
 * Cross-Platform Attribution Test - Close CRM & Calendly
 * 
 * This script tests the attribution between Close CRM and Calendly
 * by looking for contacts with data from both platforms and verifying
 * that the attribution service correctly combines this data.
 */

import closeApi from './server/api/close';
import calendlyApi from './server/api/calendly';
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

async function runTest() {
  console.log(`${colors.magenta}===== CROSS-PLATFORM ATTRIBUTION TEST =====\n${colors.reset}`);
  
  // Step 1: Verify API connections
  console.log(`${colors.blue}[STEP 1] Verifying API connections${colors.reset}`);
  
  // Test Close API connection
  const closeResult = await closeApi.testApiConnection();
  if (closeResult.success) {
    console.log(`${colors.green}✓ Close CRM API connection successful!${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Close CRM API connection failed: ${closeResult.error}${colors.reset}`);
    throw new Error('Close CRM API connection failed');
  }
  
  // Test Calendly API connection
  const calendlyResult = await calendlyApi.testApiConnection();
  if (calendlyResult.success) {
    console.log(`${colors.green}✓ Calendly API connection successful!${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Calendly API connection failed: ${calendlyResult.error}${colors.reset}`);
    throw new Error('Calendly API connection failed');
  }
  
  // Step 2: Find contacts with data from both platforms
  console.log(`\n${colors.blue}[STEP 2] Finding contacts with cross-platform data${colors.reset}`);
  
  // Get all contacts from the database
  const contacts = await storage.getAllContacts();
  console.log(`Total contacts in database: ${contacts.length}`);
  
  // Track cross-platform contacts
  type CrossPlatformContact = {
    id: number;
    name: string;
    email: string;
    closeActivities: number;
    calendlyMeetings: number;
  };
  
  const crossPlatformContacts: CrossPlatformContact[] = [];
  
  for (const contact of contacts) {
    // Get activities and meetings for this contact
    const activities = await storage.getActivitiesByContactId(contact.id);
    const meetings = await storage.getMeetingsByContactId(contact.id);
    
    // Check which platforms are represented
    const hasCloseData = activities.some(activity => activity.source === 'close');
    const hasCalendlyData = meetings.length > 0;
    
    // If contact has data from both platforms, add to our list
    if (hasCloseData && hasCalendlyData) {
      crossPlatformContacts.push({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        closeActivities: activities.filter(a => a.source === 'close').length,
        calendlyMeetings: meetings.length
      });
    }
  }
  
  console.log(`Found ${crossPlatformContacts.length} contacts with data from both Close and Calendly`);
  
  if (crossPlatformContacts.length === 0) {
    console.log(`${colors.yellow}⚠ No contacts found with cross-platform data${colors.reset}`);
    console.log('This test requires contacts that have both Close CRM and Calendly data');
    console.log('Please run a full data sync first and try again');
    return;
  }
  
  // Display the first few cross-platform contacts
  console.log(`\nCross-platform contacts:`);
  crossPlatformContacts.slice(0, 5).forEach((contact, i) => {
    console.log(`  ${i + 1}. ${contact.name} (${contact.email})`);
    console.log(`     Close Activities: ${contact.closeActivities}, Calendly Meetings: ${contact.calendlyMeetings}`);
  });
  
  // Step 3: Test attribution on a sample contact
  console.log(`\n${colors.blue}[STEP 3] Testing attribution on a sample contact${colors.reset}`);
  
  // Use the first cross-platform contact for attribution testing
  const testContact = crossPlatformContacts[0];
  
  console.log(`Testing attribution for contact: ${testContact.name} (ID: ${testContact.id})`);
  const attributionResult = await attributionService.attributeContact(testContact.id);
  
  if (!attributionResult.success) {
    console.log(`${colors.red}✗ Attribution failed: ${attributionResult.error}${colors.reset}`);
    return;
  }
  
  console.log(`${colors.green}✓ Attribution successful!${colors.reset}`);
  
  // Analyze the timeline
  if (!attributionResult.timeline || attributionResult.timeline.length === 0) {
    console.log(`${colors.yellow}⚠ No timeline events found${colors.reset}`);
    return;
  }
  
  console.log(`Timeline events: ${attributionResult.timeline.length}`);
  
  // Count events by platform and type
  const platformCounts = {};
  const typeCounts = {};
  
  for (const event of attributionResult.timeline) {
    // Count by platform
    platformCounts[event.source] = (platformCounts[event.source] || 0) + 1;
    
    // Count by type
    typeCounts[event.type] = (typeCounts[event.type] || 0) + 1;
  }
  
  // Display counts by platform
  console.log(`\nEvents by platform:`);
  Object.entries(platformCounts).forEach(([platform, count]) => {
    console.log(`  - ${platform}: ${count} event(s)`);
  });
  
  // Display counts by type
  console.log(`\nEvents by type:`);
  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count} event(s)`);
  });
  
  // Display touchpoints
  console.log(`\nTouchpoints:`);
  console.log(`  First touch: ${attributionResult.firstTouch ? new Date(attributionResult.firstTouch.date).toLocaleString() + ' via ' + attributionResult.firstTouch.source : 'None'}`);
  console.log(`  Last touch: ${attributionResult.lastTouch ? new Date(attributionResult.lastTouch.date).toLocaleString() + ' via ' + attributionResult.lastTouch.source : 'None'}`);
  
  console.log(`\n${colors.magenta}===== TEST COMPLETED =====\n${colors.reset}`);
}

// Run the test
runTest()
  .then(() => {
    console.log('Attribution test completed, exiting.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running attribution test:', error);
    process.exit(1);
  });