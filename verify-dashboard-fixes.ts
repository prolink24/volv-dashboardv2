/**
 * Verify Dashboard Fixes
 * 
 * This script tests our fixes to the revenue attribution system:
 * 1. Clears the dashboard cache
 * 2. Gets the sales rep data directly from the enhanced dashboard endpoint
 * 3. Verifies Deal Maker's revenue and cash collected values are correct for April 2025
 */

import axios from 'axios';
import cacheService from './server/services/cache';

async function verifyDashboardFixes() {
  console.log("Starting dashboard verification process...");
  
  // Step 1: Clear the dashboard cache
  console.log("\nStep 1: Clearing dashboard cache...");
  try {
    // Try to use the cache's internal methods
    const cache = cacheService.cache;
    if (cache && typeof cache.flushAll === 'function') {
      cache.flushAll();
      console.log('Successfully cleared cache using internal cache.flushAll() method');
    }
  } catch (error) {
    console.error('Could not clear cache using internal methods:', error);
  }
  
  // Step 2: Get fresh data from the enhanced dashboard endpoint
  console.log("\nStep 2: Fetching fresh dashboard data...");
  
  try {
    // Set date range for April 2025
    const startDate = '2025-03-31';
    const endDate = '2025-04-30';
    const dateRange = `${startDate}_${endDate}`;
    
    console.log(`Fetching dashboard data for date range: ${startDate} to ${endDate}`);
    
    // Make a direct API call to the enhanced dashboard endpoint
    const response = await axios.get(`http://localhost:5000/api/enhanced-dashboard?dateRange=${dateRange}`);
    
    // Check if response is successful
    if (response.data && response.data.success) {
      console.log('Dashboard API response successful');
      
      // Check if sales team data is available
      if (response.data.salesTeam && response.data.salesTeam.length > 0) {
        console.log(`Found ${response.data.salesTeam.length} sales team members`);
        
        // Look for Deal Maker
        const dealMaker = response.data.salesTeam.find(member => 
          member.name.includes('Deal Maker') || 
          member.id === 'user_xZPRj0Npd3RjWlWiYLAx0XzFFRiR5yzCKkpwieZVoqY'
        );
        
        if (dealMaker) {
          console.log('\nDeal Maker Data:');
          console.log(`Name: ${dealMaker.name}`);
          console.log(`Deals: ${dealMaker.deals}`);
          console.log(`Cash Collected: $${dealMaker.cashCollected?.toLocaleString() || 'N/A'}`);
          console.log(`Revenue: $${dealMaker.revenue?.toLocaleString() || 'N/A'}`);
          
          // Verify values
          if (dealMaker.cashCollected === 210000) {
            console.log('\n✅ SUCCESS: Deal Maker shows correct cash collected amount of $210,000');
          } else {
            console.log(`\n⚠️ WARNING: Deal Maker's cash collected is $${dealMaker.cashCollected}, expected $210,000`);
          }
          
          // Check if Revenue is also $210,000 or similar
          if (dealMaker.revenue === 210000 || dealMaker.revenue === dealMaker.cashCollected) {
            console.log('✅ SUCCESS: Deal Maker revenue is correctly calculated');
          } else {
            console.log(`⚠️ WARNING: Deal Maker's revenue is $${dealMaker.revenue}, expected $210,000`);
          }
        } else {
          console.log('⚠️ WARNING: Deal Maker not found in sales team data');
        }
        
        // Display all sales team members with cash collected values for debugging
        console.log('\nAll Sales Team Members with Cash Collected:');
        response.data.salesTeam
          .filter(member => member.cashCollected)
          .forEach(member => {
            console.log(`${member.name}: $${member.cashCollected?.toLocaleString() || '0'}`);
          });
      } else {
        console.log('⚠️ WARNING: No sales team data found in the response');
      }
    } else {
      console.log('⚠️ WARNING: Dashboard API response unsuccessful', response.data?.error || 'No specific error');
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error.message);
  }
  
  console.log("\nVerification process completed.");
}

// Run the verification
verifyDashboardFixes()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch(err => {
    console.error("Script failed:", err);
    process.exit(1);
  });