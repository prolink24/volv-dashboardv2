/**
 * Resume Interrupted Calendly Sync
 * 
 * This script resumes a previously interrupted Calendly sync using the
 * resume token provided as a command-line argument.
 */

import calendlyEnhanced from './server/api/calendly-enhanced';
import { storage } from './server/storage';

async function resumeCalendlySync() {
  // Get resume token from command line
  const resumeToken = process.argv[2];
  
  if (!resumeToken) {
    console.error('❌ Error: No resume token provided');
    console.error('Usage: node -r tsx/register trigger-calendly-resume.ts <resumeToken>');
    process.exit(1);
  }
  
  console.log("=== Resuming Calendly Sync ===\n");
  console.log(`Using resume token: ${resumeToken}\n`);
  
  try {
    // Get counts before resuming
    const beforeCount = await getMeetingCounts();
    console.log(`Before resume - Total meetings: ${beforeCount.total}, Calendly meetings: ${beforeCount.calendly}`);
    
    // Configure resume options
    const resumeOptions = {
      batchSize: 5,        // Process 5 events at a time to avoid timeouts
      timeout: 540000      // 9 minutes (allow for clean shutdown before Replit's 10-minute limit)
    };
    
    // Resume the sync process
    console.log("\n⏳ Resuming Calendly sync...");
    const syncResult = await calendlyEnhanced.resumeSync(resumeToken, resumeOptions);
    
    console.log(`\n${syncResult.completed ? '✅ Sync completed!' : '⚠️ Sync partially completed (can be resumed again)'}`);
    console.log(`Total events found: ${syncResult.total}`);
    console.log(`Processed ${syncResult.processed} events`);
    console.log(`Imported ${syncResult.count} meetings`);
    console.log(`Errors: ${syncResult.errors}`);
    
    if (!syncResult.completed && syncResult.resumeToken) {
      console.log(`\n⚠️ Sync still incomplete due to timeout or size limits`);
      console.log(`To continue the sync, use this new resume token: ${syncResult.resumeToken}`);
    }
    
    // Count meetings after resuming
    const afterCount = await getMeetingCounts();
    console.log(`\nAfter resume - Total meetings: ${afterCount.total}, Calendly meetings: ${afterCount.calendly}`);
    
    // Report on new meetings
    const newMeetings = afterCount.total - beforeCount.total;
    const newCalendlyMeetings = afterCount.calendly - beforeCount.calendly;
    
    console.log(`\nSummary:`);
    console.log(`📊 New meetings added: ${newMeetings}`);
    console.log(`📊 New Calendly meetings added: ${newCalendlyMeetings}`);
    
    // Check linkage after sync
    await checkMeetingLinkage();
    
    console.log("\n=== Resume Completed ===");
    
    // If we have a new resume token and didn't complete, provide instructions
    if (syncResult.resumeToken && !syncResult.completed) {
      console.log(`\nTo continue the sync, run:`);
      console.log(`node -r tsx/register trigger-calendly-resume.ts ${syncResult.resumeToken}`);
    }
    
  } catch (error) {
    console.error("Error during Calendly sync resume:", error);
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
  console.log('\n=== Checking Meeting Linkage After Resume ===');
  
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

// Run the resume
resumeCalendlySync().then(() => {
  console.log("\nCalendly sync resume complete!");
  process.exit(0);
}).catch(error => {
  console.error("Calendly sync resume failed:", error);
  process.exit(1);
});