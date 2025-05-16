/**
 * Fix Meeting Emails
 * 
 * This script extracts email addresses from the metadata JSON field in meetings
 * and populates the invitee_email field for all meetings. This ensures proper
 * contact matching and meeting linkage.
 */

import { db } from '../db';
import { meetings } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function fixMeetingEmails() {
  console.log('Starting meeting email data extraction process...');
  
  // Get all meetings
  const allMeetings = await db.select().from(meetings);
  console.log(`Found ${allMeetings.length} total meetings in database`);
  
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const meeting of allMeetings) {
    try {
      // Skip if invitee_email is already populated
      if (meeting.inviteeEmail) {
        skippedCount++;
        continue;
      }
      
      const metadata = meeting.metadata as any;
      
      if (!metadata) {
        console.log(`Meeting ${meeting.id} has no metadata, skipping`);
        skippedCount++;
        continue;
      }
      
      // Try to extract email from various locations in the metadata
      let email = null;
      
      // From invitee object (most common location)
      if (metadata.invitee && metadata.invitee.email) {
        email = metadata.invitee.email;
      } 
      // From event details
      else if (metadata.eventDetails && 
              metadata.eventDetails.invitees && 
              metadata.eventDetails.invitees[0] && 
              metadata.eventDetails.invitees[0].email) {
        email = metadata.eventDetails.invitees[0].email;
      }
      // From event object
      else if (metadata.event && 
              metadata.event.invitees && 
              metadata.event.invitees[0] && 
              metadata.event.invitees[0].email) {
        email = metadata.event.invitees[0].email;
      }
      
      if (!email) {
        console.log(`Couldn't find email in metadata for meeting ${meeting.id}, skipping`);
        skippedCount++;
        continue;
      }
      
      // Update the meeting with the extracted email (stored in lowercase for consistent matching)
      await db.update(meetings)
        .set({ 
          inviteeEmail: email.toLowerCase(),
          // If we have the name, add it too
          inviteeName: metadata.invitee?.name || null
        })
        .where(eq(meetings.id, meeting.id));
      
      updatedCount++;
      console.log(`Updated meeting ${meeting.id} with email ${email.toLowerCase()}`);
    } catch (error) {
      console.error(`Error processing meeting ${meeting.id}:`, error);
      errorCount++;
    }
  }
  
  console.log('Meeting email extraction complete:');
  console.log(`- Updated: ${updatedCount} meetings`);
  console.log(`- Skipped: ${skippedCount} meetings`);
  console.log(`- Errors: ${errorCount} meetings`);
}

// Execute the function
fixMeetingEmails()
  .then(() => {
    console.log('Email extraction process complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error in email extraction process:', error);
    process.exit(1);
  });