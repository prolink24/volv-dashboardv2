/**
 * Multi-Platform Attribution Test Script
 * 
 * This script tests the integration and attribution between Close CRM and Calendly
 * by verifying API connections and testing the attribution service.
 * Note: Typeform integration has been temporarily disabled.
 */

import closeApi from './server/api/close';
import calendlyApi from './server/api/calendly';
import { storage } from './server/storage';
import attributionService from './server/services/attribution';

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
  
  // Step 1: Test API connections
  console.log(`${colors.blue}[STEP 1] Testing API connections${colors.reset}`);
  
  // Test Close API connection
  const closeResult = await closeApi.testApiConnection();
  if (closeResult.success) {
    console.log(`${colors.green}✓ Close CRM API connection successful (Auth: ${closeResult.user?.name || 'Deal Maker'})${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Close CRM API connection failed: ${closeResult.error}${colors.reset}`);
    throw new Error('Close CRM API connection failed');
  }
  
  // Test Calendly API connection
  const calendlyResult = await calendlyApi.testApiConnection();
  if (calendlyResult.success) {
    console.log(`${colors.green}✓ Calendly API connection successful (Auth: ${calendlyResult.user?.name || 'Dealmaker'})${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Calendly API connection failed: ${calendlyResult.error}${colors.reset}`);
    throw new Error('Calendly API connection failed');
  }
  
  // Step 2: Get and create test data
  console.log(`\n${colors.blue}[STEP 2] Creating test contact with cross-platform data${colors.reset}`);
  
  // Get a lead from Close
  console.log('Fetching a sample lead from Close...');
  const leads = await closeApi.fetchLeads(1);
  if (!leads || leads.length === 0) {
    console.log(`${colors.red}✗ No leads found in Close CRM${colors.reset}`);
    throw new Error('No leads found in Close CRM');
  }
  
  const lead = leads[0];
  console.log(`Found lead from Close: ${lead.display_name}`);
  
  // Get first contact from lead
  if (!lead.contacts || lead.contacts.length === 0) {
    console.log(`${colors.red}✗ No contacts found in lead${colors.reset}`);
    throw new Error('No contacts found in lead');
  }
  
  const leadContact = lead.contacts[0];
  const contactEmail = leadContact.emails && leadContact.emails.length > 0 
    ? leadContact.emails[0].email 
    : `test_${Date.now()}@example.com`;
  
  // Get a meeting from Calendly
  console.log('Fetching a sample event from Calendly...');
  const events = await calendlyApi.fetchEvents(1);
  if (!events || events.length === 0) {
    console.log(`${colors.red}✗ No events found in Calendly${colors.reset}`);
    throw new Error('No events found in Calendly');
  }
  
  const event = events[0];
  console.log(`Found event from Calendly: ${event.name}`);
  
  // Check if contact with this email already exists
  let contact = await storage.getContactByEmail(contactEmail);
  
  if (contact) {
    console.log(`Contact with email ${contactEmail} already exists (ID: ${contact.id})`);
  } else {
    // Create the contact
    console.log(`Creating new contact with email ${contactEmail}...`);
    contact = await storage.createContact({
      name: leadContact.name || lead.display_name,
      email: contactEmail,
      phone: leadContact.phones && leadContact.phones.length > 0 ? leadContact.phones[0].phone : null,
      company: lead.company || '',
      title: leadContact.title || '',
      leadSource: 'close',
      status: 'lead',
      sourceId: lead.id,
      sourceData: lead
    });
    
    console.log(`${colors.green}✓ Created new contact: ${contact.name} (ID: ${contact.id})${colors.reset}`);
  }
  
  // Create a Close activity
  console.log('Creating Close activity for contact...');
  const activity = await storage.createActivity({
    contactId: contact.id,
    type: 'note',
    title: 'Test note from Close',
    description: 'This is a test note created for attribution testing',
    date: new Date(),
    source: 'close',
    sourceId: `close_note_${Date.now()}`,
    metadata: {
      leadId: lead.id,
      created_by: 'attribution_test'
    }
  });
  
  console.log(`${colors.green}✓ Created Close activity: ${activity.title}${colors.reset}`);
  
  // Check if meeting already exists
  console.log('Checking if Calendly meeting already exists...');
  let meeting = await storage.getMeetingByCalendlyEventId(event.id);
  
  if (meeting) {
    console.log(`${colors.yellow}⚠ Calendly meeting with event ID ${event.id} already exists${colors.reset}`);
    
    // If meeting exists but is associated with a different contact, create a new one with a unique ID
    if (meeting.contactId !== contact.id) {
      console.log(`Creating Calendly meeting for contact with modified event ID...`);
      meeting = await storage.createMeeting({
        contactId: contact.id,
        calendlyEventId: `${event.id}_${Date.now()}`, // Make the ID unique
        type: event.eventType || 'meeting',
        title: event.name,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
        status: event.status || 'scheduled',
        assignedTo: 'Dealmaker',
        metadata: {
          eventUri: event.uri,
          created_by: 'attribution_test'
        }
      });
      console.log(`${colors.green}✓ Created Calendly meeting: ${meeting.title}${colors.reset}`);
    }
  } else {
    // Create the meeting if it doesn't exist
    console.log('Creating Calendly meeting for contact...');
    meeting = await storage.createMeeting({
      contactId: contact.id,
      calendlyEventId: event.id,
      type: event.eventType || 'meeting',
      title: event.name,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      status: event.status || 'scheduled',
      assignedTo: 'Dealmaker',
      metadata: {
        eventUri: event.uri,
        created_by: 'attribution_test'
      }
    });
    console.log(`${colors.green}✓ Created Calendly meeting: ${meeting.title}${colors.reset}`);
  }
  
  // Step 3: Test attribution
  console.log(`\n${colors.blue}[STEP 3] Testing attribution for contact ID: ${contact.id}${colors.reset}`);
  
  // Get data counts
  const activities = await storage.getActivitiesByContactId(contact.id);
  const meetings = await storage.getMeetingsByContactId(contact.id);
  
  console.log(`Contact: ${contact.name} (${contact.email})`);
  console.log(`Close activities: ${activities.filter(a => a.source === 'close').length}`);
  console.log(`Calendly meetings: ${meetings.length}`);
  
  // Run attribution
  console.log('Running attribution service...');
  const attributionResult = await attributionService.attributeContact(contact.id);
  
  if (!attributionResult.success) {
    console.log(`${colors.red}✗ Attribution failed: ${attributionResult.error}${colors.reset}`);
    throw new Error(`Attribution failed: ${attributionResult.error}`);
  }
  
  console.log(`${colors.green}✓ Attribution successful!${colors.reset}`);
  
  // Analyze the timeline
  if (!attributionResult.timeline || attributionResult.timeline.length === 0) {
    console.log(`${colors.yellow}⚠ No timeline events found${colors.reset}`);
  } else {
    console.log(`\nTimeline events: ${attributionResult.timeline.length}`);
    
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
    
    // Display timeline
    console.log(`\nTimeline:`);
    attributionResult.timeline.forEach((event, i) => {
      const date = new Date(event.date).toLocaleString();
      console.log(`  ${i + 1}. ${event.type} (${event.source}) - ${date}`);
    });
    
    // Display touchpoints
    console.log(`\nTouchpoints:`);
    console.log(`  First touch: ${attributionResult.firstTouch ? new Date(attributionResult.firstTouch.date).toLocaleString() + ' via ' + attributionResult.firstTouch.source : 'None'}`);
    console.log(`  Last touch: ${attributionResult.lastTouch ? new Date(attributionResult.lastTouch.date).toLocaleString() + ' via ' + attributionResult.lastTouch.source : 'None'}`);
  }
  
  console.log(`\n${colors.green}✓ Attribution test completed successfully!${colors.reset}`);
  console.log(`${colors.magenta}===== TEST COMPLETED =====\n${colors.reset}`);
  
  return {
    success: true,
    contactId: contact.id,
    name: contact.name,
    email: contact.email,
    timeline: attributionResult.timeline
  };
}

// Run the tests
runTests()
  .then((result) => {
    console.log('All tests completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running tests:', error);
    process.exit(1);
  });