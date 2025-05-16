import { syncTypeformResponses } from '../api/typeform';

/**
 * Sync Typeform Submissions Script
 * 
 * This script syncs all Typeform submissions to our database as activity entries
 * for each contact, marking the "application submitted" timestamp in the customer journey.
 */
async function main() {
  try {
    console.log('Starting Typeform submission sync process...');
    
    // Sync all form responses
    const result = await syncTypeformResponses();
    
    if (result.success) {
      console.log(`Success! Processed ${result.processed} form responses and imported ${result.synced} as activities.`);
    } else {
      console.error(`Sync failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error running Typeform sync script:', error);
    process.exit(1);
  }
}

// Run the script
main().then(() => {
  console.log('Typeform sync script completed');
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error in Typeform sync script:', err);
  process.exit(1);
});