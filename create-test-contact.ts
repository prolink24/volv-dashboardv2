/**
 * Create Test Contact
 * 
 * This script creates a test contact with data from both Close CRM and Calendly
 * to test cross-platform attribution.
 */

import { storage } from './server/storage';
import closeApi from './server/api/close';
import calendlyApi from './server/api/calendly';

async function createTestContact() {
  console.log('Creating test contact with data from both Close CRM and Calendly...');
  
  // Step 1: Verify API connections
  console.log('\nVerifying API connections...');
  
  // Test Close API connection
  const closeResult = await closeApi.testApiConnection();
  if (closeResult.success) {
    console.log('✓ Close CRM API connection successful!');
  } else {
    console.log(`✗ Close CRM API connection failed: ${closeResult.error}`);
    throw new Error('Close CRM API connection failed');
  }
  
  // Test Calendly API connection
  const calendlyResult = await calendlyApi.testApiConnection();
  if (calendlyResult.success) {
    console.log('✓ Calendly API connection successful!');
  } else {
    console.log(`✗ Calendly API connection failed: ${calendlyResult.error}`);
    throw new Error('Calendly API connection failed');
  }
  
  // Step 2: Fetch sample data from both platforms
  console.log('\nFetching sample data from Close CRM and Calendly...');
  
  // Fetch a lead from Close
  const leads = await closeApi.fetchLeads(1);
  if (!leads || leads.length === 0) {
    throw new Error('No leads found in Close CRM');
  }
  
  const lead = leads[0];
  console.log(`Found lead from Close: ${lead.display_name || lead.name}`);
  
  // Get first contact from lead
  if (!lead.contacts || lead.contacts.length === 0) {
    throw new Error('No contacts found in lead');
  }
  
  const leadContact = lead.contacts[0];
  const contactEmail = leadContact.emails && leadContact.emails.length > 0 
    ? leadContact.emails[0].email 
    : 'test@example.com';
  
  // Fetch an event from Calendly
  const events = await calendlyApi.fetchEvents(1);
  if (!events || events.length === 0) {
    throw new Error('No events found in Calendly');
  }
  
  const event = events[0];
  console.log(`Found event from Calendly: ${event.name}`);
  
  // Step 3: Create the contact
  console.log('\nCreating test contact...');
  
  // Check if contact with this email already exists
  const existingContact = await storage.getContactByEmail(contactEmail);
  
  let contact;
  if (existingContact) {
    console.log(`Contact with email ${contactEmail} already exists, using existing contact`);
    contact = existingContact;
  } else {
    contact = await storage.createContact({
      name: leadContact.name || lead.display_name || 'Test Contact',
      email: contactEmail,
      phone: leadContact.phones && leadContact.phones.length > 0 ? leadContact.phones[0].phone : null,
      company: lead.company || '',
      title: leadContact.title || '',
      leadSource: 'close',
      status: 'lead',
      sourceId: lead.id,
      sourceData: lead
    });
    
    console.log(`Created new contact: ${contact.name} (${contact.email})`);
  }
  
  // Step 4: Create Close activity
  console.log('\nCreating Close activity for the contact...');
  
  const closeActivity = await storage.createActivity({
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
  
  console.log(`Created Close activity: ${closeActivity.title}`);
  
  // Step 5: Create Calendly meeting
  console.log('\nCreating Calendly meeting for the contact...');
  
  const calendlyMeeting = await storage.createMeeting({
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
  
  console.log(`Created Calendly meeting: ${calendlyMeeting.title}`);
  
  // Final verification
  console.log('\nVerifying contact data...');
  
  const activities = await storage.getActivitiesByContactId(contact.id);
  const meetings = await storage.getMeetingsByContactId(contact.id);
  
  console.log(`Contact: ${contact.name} (ID: ${contact.id})`);
  console.log(`- Email: ${contact.email}`);
  console.log(`- Close activities: ${activities.filter(a => a.source === 'close').length}`);
  console.log(`- Calendly meetings: ${meetings.length}`);
  
  return {
    contactId: contact.id,
    name: contact.name,
    email: contact.email,
    closeActivities: activities.filter(a => a.source === 'close').length,
    calendlyMeetings: meetings.length
  };
}

// Run the script
createTestContact()
  .then((result) => {
    console.log('\n✓ Successfully created test contact with cross-platform data!');
    console.log(`Contact ID: ${result.contactId}`);
    console.log('You can now run the attribution test.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Error creating test contact:', error.message);
    process.exit(1);
  });