/**
 * Test Specific Contact Attribution
 * 
 * This script tests attribution for a specific contact ID.
 */

import attributionService from './server/services/attribution';
import { storage } from './server/storage';

// The ID of the contact to test (from create-test-contact.ts output)
const CONTACT_ID = 2;

async function testContactAttribution(contactId: number) {
  console.log(`Testing attribution for contact ID: ${contactId}`);
  
  // Get the contact
  const contact = await storage.getContact(contactId);
  
  if (!contact) {
    console.error(`Error: Contact with ID ${contactId} not found`);
    return;
  }
  
  console.log(`Contact: ${contact.name} (${contact.email})`);
  
  // Get activities and meetings
  const activities = await storage.getActivitiesByContactId(contactId);
  const meetings = await storage.getMeetingsByContactId(contactId);
  
  console.log(`Close activities: ${activities.filter(a => a.source === 'close').length}`);
  console.log(`Calendly meetings: ${meetings.length}`);
  
  // Run attribution
  console.log('\nRunning attribution...');
  const attributionResult = await attributionService.attributeContact(contactId);
  
  if (!attributionResult.success) {
    console.error(`Attribution failed: ${attributionResult.error}`);
    return;
  }
  
  console.log('Attribution successful!');
  
  // Analyze timeline
  if (!attributionResult.timeline || attributionResult.timeline.length === 0) {
    console.log('No timeline events found');
    return;
  }
  
  console.log(`\nTimeline events: ${attributionResult.timeline.length}`);
  
  // Display timeline
  console.log('\nTimeline:');
  attributionResult.timeline.forEach((event, i) => {
    console.log(`${i + 1}. ${event.type} (${event.source}) - ${new Date(event.date).toLocaleString()}`);
  });
  
  // Display touchpoints
  console.log('\nTouchpoints:');
  console.log(`First touch: ${attributionResult.firstTouch ? new Date(attributionResult.firstTouch.date).toLocaleString() + ' via ' + attributionResult.firstTouch.source : 'None'}`);
  console.log(`Last touch: ${attributionResult.lastTouch ? new Date(attributionResult.lastTouch.date).toLocaleString() + ' via ' + attributionResult.lastTouch.source : 'None'}`);
}

// Run the test
testContactAttribution(CONTACT_ID)
  .then(() => {
    console.log('\nTest completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running test:', error);
    process.exit(1);
  });