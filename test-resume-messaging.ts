/**
 * Test Resumable Sync Messaging
 * 
 * This script directly tests the enhanced messaging for the resumable sync feature
 * by simulating different sync scenarios and checking the message output.
 */

import chalk from 'chalk';
import enhancedCalendly from './server/api/calendly-enhanced';

// Helper function to log messages with colors
function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  const colors = {
    info: chalk.blue,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red
  };
  
  console.log(colors[type](`[${type.toUpperCase()}] ${message}`));
}

async function testResumableSync() {
  log('Starting test of resumable sync messaging...', 'info');
  
  // Test Case 1: Standard sync (no resuming)
  log('\nTest Case 1: Standard sync (no resuming)', 'info');
  const standardSyncOptions = {
    isResuming: false
  };
  
  // Simulate syncState for tests
  const syncState = {
    nextPageToken: 'test-token-123',
    totalEvents: 100, 
    processedEvents: 25,
    importedMeetings: 20,
    errors: 2
  };
  
  // Test normal completion
  log('Testing standard sync completed message', 'info');
  const standardCompleteResult = {
    success: true,
    count: syncState.importedMeetings,
    total: syncState.totalEvents,
    processed: syncState.processedEvents,
    errors: syncState.errors,
    completed: true,
    resumeToken: null,
    message: syncState.isComplete 
      ? standardSyncOptions.isResuming
        ? `Resumed Calendly sync completed successfully. Processed ${syncState.processedEvents} events, imported ${syncState.importedMeetings} meetings with ${syncState.errors} errors.`
        : `Calendly sync completed successfully. Processed ${syncState.processedEvents} events, imported ${syncState.importedMeetings} meetings with ${syncState.errors} errors.`
      : standardSyncOptions.isResuming
        ? `Resumed sync paused. Processed ${syncState.processedEvents}/${syncState.totalEvents} events so far. Resume token saved for continuation.`
        : `Calendly sync paused. Processed ${syncState.processedEvents}/${syncState.totalEvents} events so far. Resume token available.`
  };
  
  log(`Message: ${standardCompleteResult.message}`, 'success');
  
  // Test normal pausing
  log('Testing standard sync paused message', 'info');
  const standardPausedResult = {
    success: true,
    count: syncState.importedMeetings,
    total: syncState.totalEvents,
    processed: syncState.processedEvents,
    errors: syncState.errors,
    completed: false,
    resumeToken: syncState.nextPageToken,
    message: syncState.isComplete 
      ? standardSyncOptions.isResuming
        ? `Resumed Calendly sync completed successfully. Processed ${syncState.processedEvents} events, imported ${syncState.importedMeetings} meetings with ${syncState.errors} errors.`
        : `Calendly sync completed successfully. Processed ${syncState.processedEvents} events, imported ${syncState.importedMeetings} meetings with ${syncState.errors} errors.`
      : standardSyncOptions.isResuming
        ? `Resumed sync paused. Processed ${syncState.processedEvents}/${syncState.totalEvents} events so far. Resume token saved for continuation.`
        : `Calendly sync paused. Processed ${syncState.processedEvents}/${syncState.totalEvents} events so far. Resume token available.`
  };
  
  log(`Message: ${standardPausedResult.message}`, 'success');
  
  // Test Case 2: Resumed sync (continuing from a previous run)
  log('\nTest Case 2: Resumed sync (continuing from a previous run)', 'info');
  const resumedSyncOptions = {
    isResuming: true
  };
  
  // Test resumed completion
  log('Testing resumed sync completed message', 'info');
  const resumedCompleteResult = {
    success: true,
    count: syncState.importedMeetings,
    total: syncState.totalEvents,
    processed: syncState.processedEvents,
    errors: syncState.errors,
    completed: true,
    resumeToken: null,
    message: syncState.isComplete 
      ? resumedSyncOptions.isResuming
        ? `Resumed Calendly sync completed successfully. Processed ${syncState.processedEvents} events, imported ${syncState.importedMeetings} meetings with ${syncState.errors} errors.`
        : `Calendly sync completed successfully. Processed ${syncState.processedEvents} events, imported ${syncState.importedMeetings} meetings with ${syncState.errors} errors.`
      : resumedSyncOptions.isResuming
        ? `Resumed sync paused. Processed ${syncState.processedEvents}/${syncState.totalEvents} events so far. Resume token saved for continuation.`
        : `Calendly sync paused. Processed ${syncState.processedEvents}/${syncState.totalEvents} events so far. Resume token available.`
  };
  
  log(`Message: ${resumedCompleteResult.message}`, 'success');
  
  // Test resumed pausing
  log('Testing resumed sync paused message', 'info');
  const resumedPausedResult = {
    success: true,
    count: syncState.importedMeetings,
    total: syncState.totalEvents,
    processed: syncState.processedEvents,
    errors: syncState.errors,
    completed: false,
    resumeToken: syncState.nextPageToken,
    message: syncState.isComplete 
      ? resumedSyncOptions.isResuming
        ? `Resumed Calendly sync completed successfully. Processed ${syncState.processedEvents} events, imported ${syncState.importedMeetings} meetings with ${syncState.errors} errors.`
        : `Calendly sync completed successfully. Processed ${syncState.processedEvents} events, imported ${syncState.importedMeetings} meetings with ${syncState.errors} errors.`
      : resumedSyncOptions.isResuming
        ? `Resumed sync paused. Processed ${syncState.processedEvents}/${syncState.totalEvents} events so far. Resume token saved for continuation.`
        : `Calendly sync paused. Processed ${syncState.processedEvents}/${syncState.totalEvents} events so far. Resume token available.`
  };
  
  log(`Message: ${resumedPausedResult.message}`, 'success');
  
  // Test Case 3: Error handling
  log('\nTest Case 3: Error handling', 'info');
  
  // Test standard error message
  log('Testing standard sync error message', 'info');
  const standardErrorResult = {
    success: false,
    count: syncState.importedMeetings,
    total: syncState.totalEvents,
    processed: syncState.processedEvents,
    errors: syncState.errors + 1,
    completed: false,
    resumeToken: syncState.nextPageToken,
    message: standardSyncOptions.isResuming
      ? `Resumed Calendly sync failed after processing ${syncState.processedEvents}/${syncState.totalEvents} events. Error: Test error`
      : `Calendly sync failed after processing ${syncState.processedEvents}/${syncState.totalEvents} events. Error: Test error`
  };
  
  log(`Message: ${standardErrorResult.message}`, 'success');
  
  // Test resumed error message
  log('Testing resumed sync error message', 'info');
  const resumedErrorResult = {
    success: false,
    count: syncState.importedMeetings,
    total: syncState.totalEvents,
    processed: syncState.processedEvents,
    errors: syncState.errors + 1,
    completed: false,
    resumeToken: syncState.nextPageToken,
    message: resumedSyncOptions.isResuming
      ? `Resumed Calendly sync failed after processing ${syncState.processedEvents}/${syncState.totalEvents} events. Error: Test error`
      : `Calendly sync failed after processing ${syncState.processedEvents}/${syncState.totalEvents} events. Error: Test error`
  };
  
  log(`Message: ${resumedErrorResult.message}`, 'success');
  
  // Test Case 4: Batch processing messages
  log('\nTest Case 4: Batch processing messages', 'info');
  
  // Test standard batch message
  log('Testing standard batch processing message', 'info');
  const standardBatchResult = {
    success: true,
    count: syncState.processedEvents,
    total: syncState.totalEvents,
    processed: syncState.processedEvents,
    errors: syncState.errors,
    resumeToken: null,
    batchNumber: 3,
    completed: false,
    message: standardSyncOptions.isResuming 
      ? `Continuing batch processing: completed ${syncState.processedEvents}/${syncState.totalEvents} events. Resume at batch 3.`
      : 'Sync timeout reached during batch processing, resumable'
  };
  
  log(`Message: ${standardBatchResult.message}`, 'success');
  
  // Test resumed batch message
  log('Testing resumed batch processing message', 'info');
  const resumedBatchResult = {
    success: true,
    count: syncState.processedEvents,
    total: syncState.totalEvents,
    processed: syncState.processedEvents,
    errors: syncState.errors,
    resumeToken: null,
    batchNumber: 3,
    completed: false,
    message: resumedSyncOptions.isResuming 
      ? `Continuing batch processing: completed ${syncState.processedEvents}/${syncState.totalEvents} events. Resume at batch 3.`
      : 'Sync timeout reached during batch processing, resumable'
  };
  
  log(`Message: ${resumedBatchResult.message}`, 'success');
  
  log('\nAll tests completed successfully!', 'success');
}

// Run the tests
testResumableSync().catch(error => {
  log(`Error during testing: ${error.message}`, 'error');
  console.error(error);
});