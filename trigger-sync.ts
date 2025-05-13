import axios from 'axios';

/**
 * This script triggers a complete data sync from all platforms
 * It's a convenient way to test the comprehensive data sync process
 */
async function triggerManualSync() {
  try {
    console.log('Triggering manual sync from all platforms...');
    
    // Trigger sync from Close CRM
    console.log('Syncing from Close CRM...');
    const closeResponse = await axios.post('http://localhost:5000/api/sync/close');
    console.log('Close CRM sync triggered:', closeResponse.data);
    
    // Trigger sync from Calendly
    console.log('Syncing from Calendly...');
    const calendlyResponse = await axios.post('http://localhost:5000/api/sync/calendly');
    console.log('Calendly sync triggered:', calendlyResponse.data);
    
    // Skip Typeform for now
    console.log('Note: Skipping Typeform sync as requested');
    
    // Trigger attribution process
    console.log('Running attribution process for all contacts...');
    const attributionResponse = await axios.post('http://localhost:5000/api/attribution/all');
    console.log('Attribution process triggered:', attributionResponse.data);
    
    console.log('Manual sync completed successfully!');
  } catch (error) {
    console.error('Error triggering manual sync:', error.response?.data || error.message);
  }
}

// Run the sync
triggerManualSync()
  .then(() => {
    console.log('Manual sync script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error in manual sync script:', error);
    process.exit(1);
  });