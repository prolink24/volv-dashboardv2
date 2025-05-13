/**
 * Create Multi-Source Contact
 * 
 * This script creates a test case for multi-source contact attribution by:
 * 1. Finding the contact that has Calendly meetings
 * 2. Creating an activity for this contact in Close CRM
 * 3. Re-checking multi-source contact rates
 */

import { storage } from './server/storage';
import { InsertActivity } from './shared/schema';

async function createMultiSourceContact() {
  console.log('Creating multi-source contact test case...');
  
  try {
    // Find contacts with meetings
    console.log('Finding contacts with meetings...');
    const allContacts = await storage.getAllContacts();
    
    const contactsWithMeetings = [];
    for (const contact of allContacts) {
      const meetings = await storage.getMeetingsByContactId(contact.id);
      if (meetings.length > 0) {
        contactsWithMeetings.push({
          contact,
          meetingCount: meetings.length
        });
      }
    }
    
    if (contactsWithMeetings.length === 0) {
      console.log('No contacts with meetings found. Cannot create test case.');
      return;
    }
    
    console.log(`Found ${contactsWithMeetings.length} contacts with meetings.`);
    
    // Select the contact with the most meetings
    contactsWithMeetings.sort((a, b) => b.meetingCount - a.meetingCount);
    const targetContact = contactsWithMeetings[0].contact;
    
    console.log(`Selected target contact: ID ${targetContact.id}: ${targetContact.name} (${targetContact.email})`);
    
    // Check if this contact already has activities
    const existingActivities = await storage.getActivitiesByContactId(targetContact.id);
    
    if (existingActivities.length > 0) {
      console.log(`Contact already has ${existingActivities.length} activities. No need to create more.`);
    } else {
      // Create an activity for this contact
      console.log('Creating test activity for the contact...');
      
      const activityData: InsertActivity = {
        contactId: targetContact.id,
        type: 'call',
        title: 'Test call for multi-source attribution',
        description: 'This is a test activity created to demonstrate cross-platform attribution between Close CRM and Calendly.',
        dueDate: new Date(),
        completedDate: new Date(),
        date: new Date(), // Add the required date field
        status: 'completed',
        source: 'close',
        sourceId: 'test_activity_' + Date.now(),
        metadata: {
          purpose: 'cross-platform attribution testing',
          testCase: true,
          createdBy: 'multi-source-contact-script'
        }
      };
      
      const newActivity = await storage.createActivity(activityData);
      console.log(`Created activity: ID ${newActivity.id}: ${newActivity.title}`);
    }
    
    // Check multi-source rates
    console.log('\nVerifying multi-source contact rates...');
    await checkMultiSourceContacts();
    
  } catch (error) {
    console.error('Error creating multi-source contact:', error);
  }
}

async function checkMultiSourceContacts() {
  try {
    // Get all contacts
    const allContacts = await storage.getAllContacts();
    console.log(`Total contacts: ${allContacts.length}`);
    
    // Count contacts with activities
    const contactsWithActivities = [];
    for (const contact of allContacts) {
      const activities = await storage.getActivitiesByContactId(contact.id);
      if (activities.length > 0) {
        contactsWithActivities.push(contact);
      }
    }
    console.log(`Contacts with activities: ${contactsWithActivities.length}`);
    
    // Count contacts with meetings
    const contactsWithMeetings = [];
    for (const contact of allContacts) {
      const meetings = await storage.getMeetingsByContactId(contact.id);
      if (meetings.length > 0) {
        contactsWithMeetings.push(contact);
      }
    }
    console.log(`Contacts with meetings: ${contactsWithMeetings.length}`);
    
    // Count multi-source contacts
    const multiSourceContacts = [];
    for (const contact of allContacts) {
      const activities = await storage.getActivitiesByContactId(contact.id);
      const meetings = await storage.getMeetingsByContactId(contact.id);
      
      if (activities.length > 0 && meetings.length > 0) {
        multiSourceContacts.push({
          id: contact.id,
          name: contact.name,
          email: contact.email,
          activities: activities.length,
          meetings: meetings.length
        });
      }
    }
    
    const multiSourceRate = (multiSourceContacts.length / allContacts.length) * 100;
    console.log(`Contacts with both activities AND meetings: ${multiSourceContacts.length}`);
    console.log(`Multi-source rate: ${multiSourceRate.toFixed(2)}%`);
    
    // Show details of multi-source contacts
    if (multiSourceContacts.length > 0) {
      console.log('\nMulti-source contacts:');
      for (const contact of multiSourceContacts) {
        console.log(`- ID ${contact.id}: ${contact.name} (${contact.email})`);
        console.log(`  Activities: ${contact.activities}, Meetings: ${contact.meetings}`);
      }
    }
    
  } catch (error) {
    console.error('Error checking multi-source contacts:', error);
  }
}

// Run the script
createMultiSourceContact().catch(console.error);