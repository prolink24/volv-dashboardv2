/**
 * Verify Resumable Sync
 * 
 * This script tests the resumable sync functionality for Calendly to ensure:
 * 1. It properly supports resuming from where it left off
 * 2. It provides the correct status messages for resumed syncs
 * 3. Batch processing continues correctly after resuming
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

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

async function verifyResumableSync() {
  log('Starting verification of resumable sync functionality...', 'info');
  
  try {
    // 1. Get current sync status
    log('Checking current sync status...', 'info');
    const statusResponse = await fetch('http://localhost:5000/api/sync/status/calendly');
    const initialStatus = await statusResponse.json();
    
    log(`Current sync status: ${initialStatus.status}`, 'info');
    log(`Last sync: ${initialStatus.lastSync ? new Date(initialStatus.lastSync).toLocaleString() : 'Never'}`, 'info');
    
    // 2. Start a new sync with a small timeout to force it to pause
    log('Starting a new sync with timeout to test resumability...', 'info');
    const startResponse = await fetch('http://localhost:5000/api/calendly/sync?timeout=5000&limit=5', {
      method: 'POST'
    });
    
    const startResult = await startResponse.json();
    log(`Sync started with result: ${JSON.stringify(startResult)}`, 'info');
    
    if (!startResult.success) {
      log('Failed to start sync for testing', 'error');
      return;
    }
    
    // 3. Check if we got a resume token
    if (!startResult.resumeToken) {
      log('No resume token returned, sync may have completed too quickly', 'warning');
      log('Try setting a shorter timeout or smaller limit', 'info');
      return;
    }
    
    log(`Got resume token: ${startResult.resumeToken}`, 'success');
    log(`Events processed so far: ${startResult.processed}/${startResult.total}`, 'info');
    
    // 4. Wait a moment to ensure we're not hitting rate limits
    log('Waiting 2 seconds before resuming...', 'info');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Resume the sync
    log(`Resuming sync with token: ${startResult.resumeToken}`, 'info');
    const resumeResponse = await fetch('http://localhost:5000/api/calendly/resume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: startResult.resumeToken,
        timeout: 5000, // Another short timeout to test multiple resumes
        limit: 5
      })
    });
    
    const resumeResult = await resumeResponse.json();
    log(`Resume result: ${JSON.stringify(resumeResult)}`, 'info');
    
    // 6. Check if the resume was successful
    if (!resumeResult.success) {
      log('Failed to resume sync', 'error');
      return;
    }
    
    // 7. Verify that we processed more events after resuming
    if (resumeResult.processed > startResult.processed) {
      log(`Successfully processed more events after resuming: ${startResult.processed} → ${resumeResult.processed}`, 'success');
    } else {
      log('Did not process more events after resuming', 'warning');
    }
    
    // 8. Check if we have another resume token to continue
    if (resumeResult.resumeToken) {
      log(`Another resume token available: ${resumeResult.resumeToken}`, 'info');
      log('You can manually continue the sync with this token using the resume endpoint', 'info');
    } else if (resumeResult.completed) {
      log('Sync has been completed fully', 'success');
    }
    
    // 9. Get updated sync status
    const finalStatusResponse = await fetch('http://localhost:5000/api/sync/status/calendly');
    const finalStatus = await finalStatusResponse.json();
    
    log(`Updated sync status: ${finalStatus.status}`, 'info');
    log(`Last sync attempt: ${finalStatus.lastAttempt ? new Date(finalStatus.lastAttempt).toLocaleString() : 'Never'}`, 'info');
    
    if (finalStatus.status === 'completed') {
      log('Verification successful: Sync completed successfully', 'success');
    } else if (finalStatus.status === 'in_progress') {
      log('Verification successful: Sync is still in progress and can be resumed', 'success');
    } else {
      log(`Verification inconclusive: Sync status is ${finalStatus.status}`, 'warning');
    }
    
  } catch (error) {
    log(`Error during verification: ${error.message}`, 'error');
    console.error(error);
  }
}

// Run the verification
verifyResumableSync().catch(error => {
  log(`Unhandled error: ${error.message}`, 'error');
  console.error(error);
});