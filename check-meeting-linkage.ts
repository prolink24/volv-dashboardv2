/**
 * Meeting Linkage Test
 * 
 * This script tests the effectiveness of meeting linkage to contacts
 * by calculating the percentage of meetings successfully linked to contacts.
 */

import { storage } from './server/storage';

async function checkMeetingLinkage() {
  console.log('Checking meeting linkage rates...');
  
  try {
    // Get all meetings
    const allMeetings = await storage.getAllMeetings();
    
    console.log(`Total meetings found: ${allMeetings.length}`);
    
    // Count meetings with valid contact IDs
    const linkedMeetings = allMeetings.filter(meeting => meeting.contactId !== null);
    
    console.log(`Meetings linked to contacts: ${linkedMeetings.length}`);
    
    // Calculate percentage
    const linkageRate = (linkedMeetings.length / allMeetings.length) * 100;
    console.log(`Meeting linkage rate: ${linkageRate.toFixed(2)}%`);
    
    // Count meetings by source
    const calendlyMeetings = allMeetings.filter(meeting => meeting.calendlyEventId !== null);
    console.log(`Calendly meetings: ${calendlyMeetings.length}`);
    
    // Calculate Calendly-specific linkage rate
    const linkedCalendlyMeetings = calendlyMeetings.filter(meeting => meeting.contactId !== null);
    const calendlyLinkageRate = (linkedCalendlyMeetings.length / calendlyMeetings.length) * 100;
    console.log(`Calendly meeting linkage rate: ${calendlyLinkageRate.toFixed(2)}%`);
    
    // Count contacts with multiple data sources
    console.log('\nChecking multi-source contacts...');
    
    // Get all contacts
    const allContacts = await storage.getAllContacts();
    console.log(`Total contacts: ${allContacts.length}`);
    
    // Count contacts with activities
    const contactsWithActivities = await countContactsWithRelatedData('activities');
    console.log(`Contacts with activities: ${contactsWithActivities}`);
    console.log(`Activity linkage rate: ${((contactsWithActivities / allContacts.length) * 100).toFixed(2)}%`);
    
    // Count contacts with deals
    const contactsWithDeals = await countContactsWithRelatedData('deals');
    console.log(`Contacts with deals: ${contactsWithDeals}`);
    console.log(`Deal linkage rate: ${((contactsWithDeals / allContacts.length) * 100).toFixed(2)}%`);
    
    // Count contacts with meetings
    const contactsWithMeetings = await countContactsWithRelatedData('meetings');
    console.log(`Contacts with meetings: ${contactsWithMeetings}`);
    console.log(`Meeting linkage rate: ${((contactsWithMeetings / allContacts.length) * 100).toFixed(2)}%`);
    
    // Count contacts with both activities and meetings (multi-source)
    const contactsWithActivitiesAndMeetings = await countContactsWithMultipleSources();
    console.log(`Contacts with activities AND meetings (multi-source): ${contactsWithActivitiesAndMeetings}`);
    console.log(`Multi-source rate: ${((contactsWithActivitiesAndMeetings / allContacts.length) * 100).toFixed(2)}%`);
    
  } catch (error) {
    console.error('Error checking meeting linkage:', error);
  }
}

// Helper function to count contacts with related data
async function countContactsWithRelatedData(dataType: 'activities' | 'deals' | 'meetings'): Promise<number> {
  const allContacts = await storage.getAllContacts();
  
  let count = 0;
  for (const contact of allContacts) {
    let hasData = false;
    
    if (dataType === 'activities') {
      const activities = await storage.getActivitiesByContactId(contact.id);
      hasData = activities.length > 0;
    } else if (dataType === 'deals') {
      const deals = await storage.getDealsByContactId(contact.id);
      hasData = deals.length > 0;
    } else if (dataType === 'meetings') {
      const meetings = await storage.getMeetingsByContactId(contact.id);
      hasData = meetings.length > 0;
    }
    
    if (hasData) {
      count++;
    }
  }
  
  return count;
}

// Helper function to count contacts with both activities and meetings
async function countContactsWithMultipleSources(): Promise<number> {
  const allContacts = await storage.getAllContacts();
  
  let count = 0;
  for (const contact of allContacts) {
    const activities = await storage.getActivitiesByContactId(contact.id);
    const meetings = await storage.getMeetingsByContactId(contact.id);
    
    if (activities.length > 0 && meetings.length > 0) {
      count++;
    }
  }
  
  return count;
}

// Run the test
checkMeetingLinkage().catch(console.error);