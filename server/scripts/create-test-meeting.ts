/**
 * Create Test Meeting
 * 
 * This script creates a test Calendly meeting record for a specific contact
 * to demonstrate the case-insensitive email matching system.
 */

import { db } from '../db';
import { meetings } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function createTestMeeting() {
  console.log('Creating test Calendly meeting record...');
  
  // Contact info for Jamsky Jean-Baptiste
  const contactId = 11547;
  const contactEmail = 'jahugmarketing@gmail.com';
  
  // Create a test meeting
  const meetingData = {
    contactId,
    title: 'Deal Maker Introduction Call',
    type: 'calendly_meeting',
    status: 'completed',
    calendlyEventId: 'test-calendly-event-' + Date.now(),
    startTime: new Date('2025-05-15T15:30:00Z'),
    endTime: new Date('2025-05-15T16:00:00Z'),
    inviteeEmail: contactEmail.toLowerCase(), // Store lowercase for consistent matching
    inviteeName: 'Jamsky Jean-Baptiste',
    metadata: {
      location: 'Virtual',
      description: 'Initial consultation and introduction to our services',
      invitee: {
        name: 'Jamsky Jean-Baptiste',
        email: contactEmail,
        timezone: 'America/New_York',
      },
      event: {
        name: 'Deal Maker Introduction Call',
        status: 'active',
        event_type: 'https://api.calendly.com/event_types/test-event-type',
        start_time: '2025-05-15T15:30:00Z',
        end_time: '2025-05-15T16:00:00Z',
      },
      attribution: {
        platform: 'calendly',
        eventType: 'introduction_call',
        scheduledBy: 'Jamsky Jean-Baptiste',
        contactId: contactId,
        timestamp: new Date().toISOString()
      }
    }
  };
  
  try {
    // Insert the test meeting
    const [newMeeting] = await db
      .insert(meetings)
      .values(meetingData)
      .returning();
    
    console.log('Successfully created test meeting:', newMeeting.id);
    console.log('Meeting details:', {
      title: newMeeting.title,
      contactId: newMeeting.contactId,
      inviteeEmail: newMeeting.inviteeEmail,
      startTime: newMeeting.startTime
    });
    
    console.log('The meeting should now show up in the customer journey for this contact.');
  } catch (error) {
    console.error('Error creating test meeting:', error);
  }
}

// Execute the function
createTestMeeting()
  .then(() => {
    console.log('Test meeting creation process complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error in test meeting creation process:', error);
    process.exit(1);
  });