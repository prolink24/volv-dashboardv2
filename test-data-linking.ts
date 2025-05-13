/**
 * Data Linking Verification Test
 * 
 * This script verifies that data linking is working properly between:
 * 1. Contacts and opportunities from Close CRM
 * 2. Contacts and activities from Close CRM
 * 3. Contacts and meetings from Calendly
 */

import { storage } from './server/storage';
import * as closeApi from './server/api/close';
import * as calendlyApi from './server/api/calendly';

async function testDataLinking() {
  console.log('Starting data linking verification test...');
  
  try {
    // 1. First check for contacts with multiple lead sources
    const contacts = await storage.getAllContacts();
    console.log(`Total contacts: ${contacts.length}`);
    
    // Count contacts with multiple lead sources
    const multiSourceContacts = contacts.filter(contact => {
      const sourceData = contact.sourceData ? JSON.parse(contact.sourceData) : {};
      return sourceData.close && sourceData.calendly;
    });
    
    console.log(`Contacts with multiple sources: ${multiSourceContacts.length} (${(multiSourceContacts.length / contacts.length * 100).toFixed(2)}%)`);
    
    // 2. Check for opportunities linked to contacts
    let contactsWithOpportunities = 0;
    let totalOpportunities = 0;
    
    for (const contact of contacts) {
      const opportunities = await storage.getOpportunitiesByContactId(contact.id);
      if (opportunities && opportunities.length > 0) {
        contactsWithOpportunities++;
        totalOpportunities += opportunities.length;
      }
    }
    
    console.log(`Contacts with linked opportunities: ${contactsWithOpportunities} (${(contactsWithOpportunities / contacts.length * 100).toFixed(2)}%)`);
    console.log(`Total opportunities linked: ${totalOpportunities}`);
    
    // 3. Check for activities linked to contacts
    let contactsWithActivities = 0;
    let totalActivities = 0;
    
    for (const contact of contacts) {
      const activities = await storage.getActivitiesByContactId(contact.id);
      if (activities && activities.length > 0) {
        contactsWithActivities++;
        totalActivities += activities.length;
      }
    }
    
    console.log(`Contacts with linked activities: ${contactsWithActivities} (${(contactsWithActivities / contacts.length * 100).toFixed(2)}%)`);
    console.log(`Total activities linked: ${totalActivities}`);
    
    // 4. Check for Calendly meetings linked to contacts
    let contactsWithMeetings = 0;
    let totalMeetings = 0;
    
    for (const contact of contacts) {
      const meetings = await storage.getMeetingsByContactId(contact.id);
      if (meetings && meetings.length > 0) {
        contactsWithMeetings++;
        totalMeetings += meetings.length;
      }
    }
    
    console.log(`Contacts with linked Calendly meetings: ${contactsWithMeetings} (${(contactsWithMeetings / contacts.length * 100).toFixed(2)}%)`);
    console.log(`Total Calendly meetings linked: ${totalMeetings}`);
    
    // 5. Calculate overall data linkage score
    const maxPossibleLinks = contacts.length * 3; // One for each type: opportunities, activities, meetings
    const actualLinks = contactsWithOpportunities + contactsWithActivities + contactsWithMeetings;
    const dataLinkageScore = (actualLinks / maxPossibleLinks * 100).toFixed(2);
    
    console.log(`\nOverall data linkage score: ${dataLinkageScore}%`);
    
    if (parseFloat(dataLinkageScore) >= 90) {
      console.log('✅ Data linkage meets or exceeds 90% requirement');
    } else {
      console.log('❌ Data linkage below 90% requirement');
    }
    
    // 6. Sample data to verify quality
    console.log('\nSample data verification:');
    
    // Sample a contact with opportunities
    if (contactsWithOpportunities > 0) {
      for (const contact of contacts) {
        const opportunities = await storage.getOpportunitiesByContactId(contact.id);
        if (opportunities && opportunities.length > 0) {
          console.log(`\nSample contact with opportunities: ${contact.name} (${contact.email})`);
          console.log(`Sample opportunity: ${opportunities[0].title}, Value: ${opportunities[0].value}, Status: ${opportunities[0].status}`);
          break;
        }
      }
    }
    
    // Sample a contact with activities
    if (contactsWithActivities > 0) {
      for (const contact of contacts) {
        const activities = await storage.getActivitiesByContactId(contact.id);
        if (activities && activities.length > 0) {
          console.log(`\nSample contact with activities: ${contact.name} (${contact.email})`);
          console.log(`Sample activity: ${activities[0].type}, Date: ${activities[0].date}`);
          break;
        }
      }
    }
    
    // Sample a contact with meetings
    if (contactsWithMeetings > 0) {
      for (const contact of contacts) {
        const meetings = await storage.getMeetingsByContactId(contact.id);
        if (meetings && meetings.length > 0) {
          console.log(`\nSample contact with meetings: ${contact.name} (${contact.email})`);
          console.log(`Sample meeting: ${meetings[0].title}, Date: ${meetings[0].startTime}`);
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('Error in data linking test:', error);
  }
}

// Run the test
testDataLinking()
  .then(() => {
    console.log('Test completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });