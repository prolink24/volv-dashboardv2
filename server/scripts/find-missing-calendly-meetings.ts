/**
 * Find Missing Calendly Meetings
 * 
 * This script runs a deeper analysis on the Calendly API to find potentially missing meetings
 * by querying different parts of the Calendly API and comparing with our database.
 * It specifically looks for meetings scheduled with team members other than the main account.
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import { pool, db } from '../db';
import { storage } from '../storage';
import { meetings } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Initialize environment variables
dotenv.config();

// Configure Calendly API client
const calendlyApiClient = axios.create({
  baseURL: 'https://api.calendly.com',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.CALENDLY_API_KEY}`
  }
});

// Get organization members
async function getOrganizationMembers() {
  try {
    console.log('Fetching organization members...');
    const response = await calendlyApiClient.get('/organization_memberships');
    const members = response.data.collection || [];
    console.log(`Found ${members.length} organization members`);
    
    return members.map(member => ({
      uri: member.user?.uri,
      name: member.user?.name,
      email: member.user?.email,
      scheduleUrl: member.user?.scheduling_url
    }));
  } catch (error: any) {
    console.error('Error fetching organization members:', error.message);
    return [];
  }
}

// Get meetings for a specific team member
async function getTeamMemberMeetings(userUri: string, userName: string) {
  try {
    // Set date range for past year
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const minStartTime = oneYearAgo.toISOString();
    const maxStartTime = now.toISOString();
    
    console.log(`Fetching meetings for team member: ${userName}`);
    
    // Make the API request
    const response = await calendlyApiClient.get('/scheduled_events', {
      params: {
        user: userUri,
        min_start_time: minStartTime,
        max_start_time: maxStartTime,
        count: 100 // Get maximum number of events allowed per page
      }
    });
    
    const events = response.data.collection || [];
    console.log(`Found ${events.length} events for ${userName}`);
    
    // Return the events with team member info
    return events.map((event: any) => ({
      ...event,
      teamMemberName: userName
    }));
  } catch (error: any) {
    console.error(`Error fetching events for ${userName}:`, error.message);
    return [];
  }
}

// Compare with our database to find missing meetings
async function findMissingMeetings(events: any[]) {
  try {
    console.log(`Analyzing ${events.length} events for potential missing meetings...`);
    
    // Get all meeting IDs in our database
    const existingMeetings = await db.select().from(meetings);
    const existingEventIds = new Set(existingMeetings.map(m => m.calendly_event_id));
    
    // Find events we don't have
    const missingEvents = events.filter(event => !existingEventIds.has(event.uri));
    
    console.log(`Found ${missingEvents.length} potentially missing meetings`);
    return missingEvents;
  } catch (error: any) {
    console.error('Error comparing meetings:', error.message);
    return [];
  }
}

// Get meeting details for a specific event
async function getMeetingDetails(eventUri: string) {
  try {
    console.log(`Fetching details for event: ${eventUri}`);
    
    // Get event details
    const eventResponse = await calendlyApiClient.get(eventUri);
    const event = eventResponse.data.resource;
    
    // Get invitees
    const inviteesResponse = await calendlyApiClient.get(`${eventUri}/invitees`);
    const invitees = inviteesResponse.data.collection || [];
    
    return {
      event,
      invitees
    };
  } catch (error: any) {
    console.error(`Error fetching details for event ${eventUri}:`, error.message);
    return null;
  }
}

// Main function to find missing meetings
async function main() {
  try {
    console.log('Starting comprehensive search for missing Calendly meetings...');
    
    // Get all team members
    const members = await getOrganizationMembers();
    if (members.length === 0) {
      console.error('No team members found. Check Calendly API access.');
      return;
    }
    
    let allEvents: any[] = [];
    
    // Get events for each member
    for (const member of members) {
      if (member.uri) {
        const events = await getTeamMemberMeetings(member.uri, member.name || 'Unknown');
        allEvents = [...allEvents, ...events];
      }
    }
    
    // Find potentially missing meetings
    const missingEvents = await findMissingMeetings(allEvents);
    
    // Get details for missing events
    console.log('Getting details for missing events...');
    
    const detailedMissingEvents = [];
    
    for (const event of missingEvents) {
      const details = await getMeetingDetails(event.uri);
      if (details) {
        detailedMissingEvents.push({
          ...event,
          details
        });
      }
    }
    
    console.log('===== RESULTS =====');
    console.log(`Total meetings found across all team members: ${allEvents.length}`);
    console.log(`Potential missing meetings: ${missingEvents.length}`);
    console.log(`Missing meetings with complete details: ${detailedMissingEvents.length}`);
    
    // Print summary of missing meetings
    if (detailedMissingEvents.length > 0) {
      console.log('\nMissing meeting details:');
      for (const event of detailedMissingEvents) {
        const inviteeEmails = event.details.invitees.map((inv: any) => inv.email).join(', ');
        console.log(`- Meeting "${event.name}" with ${event.teamMemberName} (${event.uri})`);
        console.log(`  Scheduled for: ${new Date(event.start_time).toLocaleString()}`);
        console.log(`  Invitees: ${inviteeEmails}`);
        console.log('  -----');
      }
    }
    
    console.log('\nInvestigation complete!');
  } catch (error: any) {
    console.error('Error in main function:', error.message);
  } finally {
    await pool.end();
  }
}

main();