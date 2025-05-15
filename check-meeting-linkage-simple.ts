/**
 * Simple Meeting Linkage Test
 * 
 * This script tests the effectiveness of meeting linkage to contacts
 * by calculating the percentage of meetings successfully linked to contacts.
 * Simplified version to run quickly.
 */

import { storage } from './server/storage';

async function checkMeetingLinkageSimple() {
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
    
  } catch (error) {
    console.error('Error checking meeting linkage:', error);
  }
}

// Run the test
checkMeetingLinkageSimple().catch(console.error);