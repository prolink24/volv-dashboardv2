/**
 * This script manually triggers a Typeform sync to pull form submissions into our database
 */

import { syncTypeformResponses } from './server/api/typeform';

async function main() {
  console.log('Starting manual Typeform sync...');
  try {
    const result = await syncTypeformResponses();
    console.log('Sync completed successfully:');
    console.log(`- Processed: ${result.processed} responses`);
    console.log(`- Synced: ${result.synced} new submissions`);
    console.log(`- Failed: ${result.failed} submissions`);
    console.log(`- Total forms in database: ${result.total}`);
  } catch (error) {
    console.error('Error during Typeform sync:', error);
  }
}

main()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });