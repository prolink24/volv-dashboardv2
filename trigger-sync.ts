import syncService from './server/services/sync';

/**
 * This script triggers a complete data sync from all platforms
 * It's a convenient way to test the comprehensive data sync process
 */
async function triggerManualSync() {
  try {
    console.log('Triggering manual comprehensive data sync...');
    await syncService.syncAllData();
    console.log('Manual sync completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during manual sync:', error);
    process.exit(1);
  }
}

triggerManualSync();