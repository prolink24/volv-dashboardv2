/**
 * Trigger Full Calendly Sync
 * 
 * This script triggers a full sync of Calendly events to test the
 * enhanced pagination and date range handling.
 */

import calendlyAPI from './server/api/calendly';
import calendlyEnhanced from './server/api/calendly-enhanced';
import { storage } from './server/storage';

async function triggerCalendlySync() {
  console.log("=== Starting Full Calendly Sync with Enhanced Processor ===\n");
  
  try {
    // First, test API connection
    console.log("Testing Calendly API connection...");
    const apiTest = await calendlyAPI.testApiConnection();
    
    if (apiTest.success) {
      console.log(`✅ Calendly API connection successful!`);
      console.log(`Authenticated as: ${apiTest.user?.name || 'Unknown'}`);
    } else {
      console.error(`❌ Calendly API connection failed: ${apiTest.error}`);
      return;
    }
    
    // Count meetings before sync
    const beforeCount = await getMeetingCounts();
    console.log(`\nBefore sync - Total meetings: ${beforeCount.total}, Calendly meetings: ${beforeCount.calendly}`);
    
    // Trigger full sync with enhanced version
    console.log("\n⏳ Starting full Calendly sync with batch processing and resume capability...");
    console.log("This may take a few minutes depending on the number of events...");
    
    // Configure the sync with optimized settings
    const syncOptions = {
      batchSize: 5,        // Process 5 events at a time to avoid timeouts
      timeout: 540000,     // 9 minutes (allow for clean shutdown before Replit's 10-minute limit)
      resumeFromToken: null // Start from the beginning
    };
    
    const syncResult = await calendlyEnhanced.syncAllEvents(syncOptions);
    
    console.log(`\n${syncResult.completed ? '✅ Sync completed!' : '⚠️ Sync partially completed (can be resumed)'}`);
    console.log(`Total events found: ${syncResult.total}`);
    console.log(`Processed ${syncResult.processed} events`);
    console.log(`Imported ${syncResult.count} meetings`);
    console.log(`Errors: ${syncResult.errors}`);
    
    if (!syncResult.completed && syncResult.resumeToken) {
      console.log(`\n⚠️ Sync was incomplete due to timeout or size limits`);
      console.log(`To resume the sync, use resume token: ${syncResult.resumeToken}`);
    }
    
    // Count meetings after sync
    const afterCount = await getMeetingCounts();
    console.log(`\nAfter sync - Total meetings: ${afterCount.total}, Calendly meetings: ${afterCount.calendly}`);
    
    // Report on new meetings
    const newMeetings = afterCount.total - beforeCount.total;
    const newCalendlyMeetings = afterCount.calendly - beforeCount.calendly;
    
    console.log(`\nSummary:`);
    console.log(`📊 New meetings added: ${newMeetings}`);
    console.log(`📊 New Calendly meetings added: ${newCalendlyMeetings}`);
    
    // Test linkage after sync
    await checkMeetingLinkage();
    
  } catch (error) {
    console.error("Error during Calendly sync:", error);
  }
}

async function getMeetingCounts() {
  const allMeetings = await storage.getAllMeetings();
  const calendlyMeetings = allMeetings.filter(meeting => meeting.calendlyEventId !== null);
  
  return {
    total: allMeetings.length,
    calendly: calendlyMeetings.length
  };
}

async function checkMeetingLinkage() {
  console.log('\n=== Checking Meeting Linkage After Sync ===');
  
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

// Run the sync
triggerCalendlySync().then(() => {
  console.log("\nCalendly sync test complete!");
  process.exit(0);
}).catch(error => {
  console.error("Calendly sync test failed:", error);
  process.exit(1);
});