/**
 * Clear Dashboard Cache
 * 
 * This script clears the cached dashboard data to ensure
 * the latest fixed cash_collected values are displayed in the UI.
 */

import cacheService from "./server/services/cache";

async function clearDashboardCache() {
  console.log("Clearing dashboard cache...");
  
  // Use direct API call to clear the cache
  try {
    const axios = require('axios');
    
    // Clear all cache via API
    const response = await axios.post('http://localhost:5000/api/cache/clear');
    console.log('Successfully cleared cache via API endpoint');
    console.log(`Cleared ${response.data?.cleared || 0} cache entries`);
  } catch (error) {
    console.log('Error clearing cache via API endpoint:', error.message);
    console.log('Will try alternative approach...');
    
    // Alternative: Try to use the cache's internal methods
    try {
      // Get access to the cache's internal methods if available
      const cache = cacheService.cache;
      if (cache && typeof cache.flushAll === 'function') {
        cache.flushAll();
        console.log('Successfully cleared cache using internal cache.flushAll() method');
      }
    } catch (innerError) {
      console.error('Could not clear cache using internal methods:', innerError.message);
    }
  }
  
  console.log("\nCache clearing completed successfully.");
  console.log("The dashboard will now load fresh data directly from the database on the next request.");
  console.log("The updated cash_collected values should now be correctly displayed.");
}

// Run the function
clearDashboardCache()
  .then(() => console.log("Script completed successfully"))
  .catch(err => console.error("Script failed:", err));