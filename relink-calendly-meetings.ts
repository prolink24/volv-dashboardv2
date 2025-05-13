/**
 * Calendly Meeting Relinking Script
 * 
 * This script relinks existing Calendly meetings to contacts using the improved
 * contact matching algorithm with MEDIUM confidence threshold. This should increase
 * the meeting linkage rate and multi-source contact percentages.
 */

import { storage } from './server/storage';
import contactMatcher from './server/services/contact-matcher';
import { InsertContact, InsertMeeting } from './shared/schema';

async function relinkCalendlyMeetings() {
  console.log('Starting Calendly meeting relinking process...');
  
  try {
    // Get all meetings
    const allMeetings = await storage.getAllMeetings();
    console.log(`Found ${allMeetings.length} total meetings`);
    
    // Filter for Calendly meetings
    const calendlyMeetings = allMeetings.filter(meeting => meeting.calendlyEventId !== null);
    console.log(`Found ${calendlyMeetings.length} Calendly meetings`);
    
    let updateCount = 0;
    let newLinkCount = 0;
    let alreadyLinkedCount = 0;
    
    // Process each meeting
    for (const meeting of calendlyMeetings) {
      // Skip meetings that already have contact linkage
      if (meeting.contactId !== null) {
        alreadyLinkedCount++;
        continue;
      }
      
      // Extract attendee info from meeting metadata
      let attendeeInfo: any = null;
      try {
        // Try to parse metadata if it exists
        if (meeting.metadata) {
          const metadata = typeof meeting.metadata === 'string' 
            ? JSON.parse(meeting.metadata) 
            : meeting.metadata;
          
          if (metadata && metadata.attendee) {
            attendeeInfo = metadata.attendee;
          }
        }
      } catch (error) {
        console.error(`Error parsing metadata for meeting ${meeting.id}:`, error);
      }
      
      // Skip if we couldn't get attendee info
      if (!attendeeInfo) {
        console.log(`No attendee info found for meeting ${meeting.id}`);
        continue;
      }
      
      // Create contact data for matching
      const contactData: InsertContact = {
        name: attendeeInfo.name || '',
        email: attendeeInfo.email || '',
        phone: attendeeInfo.phone || null,
        company: attendeeInfo.company || null,
        title: null,
        status: null,
        sourceId: 'calendly',
        sourceData: meeting.metadata,
        lastActivityDate: meeting.startTime,
        createdAt: new Date(),
        leadSource: 'calendly',
        assignedTo: null,
        notes: null
      };
      
      // Use the contact matcher with MEDIUM confidence
      try {
        const result = await contactMatcher.createOrUpdateContact(
          contactData,
          true,  // Update existing
          contactMatcher.MatchConfidence.MEDIUM  // Use MEDIUM confidence
        );
        
        if (result.contact) {
          // Update the meeting with the new contact ID
          await storage.updateMeeting(meeting.id, {
            contactId: result.contact.id
          });
          
          console.log(`Linked meeting ${meeting.id} to contact ${result.contact.id} (${result.contact.name})`);
          
          if (result.created) {
            console.log(`Created new contact: ${result.contact.name} (${result.contact.email})`);
          } else {
            console.log(`Used existing contact: ${result.contact.name} (${result.contact.email})`);
          }
          
          updateCount++;
          if (result.created) {
            newLinkCount++;
          }
        }
      } catch (error) {
        console.error(`Error linking meeting ${meeting.id}:`, error);
      }
    }
    
    console.log('\nCalendly meeting relinking complete!');
    console.log(`Total Calendly meetings: ${calendlyMeetings.length}`);
    console.log(`Already linked meetings: ${alreadyLinkedCount}`);
    console.log(`Newly linked meetings: ${updateCount}`);
    console.log(`Failed to link: ${calendlyMeetings.length - updateCount - alreadyLinkedCount}`);
    
    // Recalculate linkage rates
    await checkMeetingLinkage();
    
  } catch (error) {
    console.error('Error relinking Calendly meetings:', error);
  }
}

async function checkMeetingLinkage() {
  console.log('\nChecking updated meeting linkage rates...');
  
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
    
    let contactsWithMultipleSources = 0;
    for (const contact of allContacts) {
      const activities = await storage.getActivitiesByContactId(contact.id);
      const meetings = await storage.getMeetingsByContactId(contact.id);
      
      if (activities.length > 0 && meetings.length > 0) {
        contactsWithMultipleSources++;
      }
    }
    
    const multiSourceRate = (contactsWithMultipleSources / allContacts.length) * 100;
    console.log(`Contacts with activities AND meetings (multi-source): ${contactsWithMultipleSources}`);
    console.log(`Multi-source rate: ${multiSourceRate.toFixed(2)}%`);
    
  } catch (error) {
    console.error('Error checking meeting linkage:', error);
  }
}

// Run the script
relinkCalendlyMeetings().catch(console.error);