/**
 * Dashboard UI Test
 * 
 * This script tests the complete dashboard UI flow by:
 * 1. Verifying the API endpoint returns proper data
 * 2. Testing the transformations applied to the data
 * 3. Creating a mock UI rendering test
 */
import axios from 'axios';
import enhancedAttributionService from "./server/services/enhanced-attribution";

async function testDashboardUI() {
  console.log("\n=== Testing Dashboard UI Data Flow ===\n");

  try {
    // Step 1: Test the API endpoint directly
    console.log("--- Step 1: Testing API Endpoint ---");
    
    const apiResponse = await axios.get('http://localhost:5000/api/attribution/enhanced-stats');
    
    if (apiResponse.status !== 200 || !apiResponse.data.success) {
      console.error("API Endpoint Error:", apiResponse.status, apiResponse.data);
      console.log("❌ API endpoint test failed!");
      return false;
    }
    
    console.log("✓ API endpoint returns:", apiResponse.status);
    console.log("Data Structure:", JSON.stringify(apiResponse.data, null, 2));
    
    // Step 2: Test the service directly (to compare with API results)
    console.log("\n--- Step 2: Testing Service Method ---");
    
    const serviceResult = await enhancedAttributionService.getAttributionStats();
    
    if (!serviceResult.success) {
      console.error("Service Method Error:", serviceResult.error);
      console.log("❌ Service method test failed!");
      return false;
    }
    
    console.log("✓ Service method returns success");
    console.log("Service Data Structure:", JSON.stringify(serviceResult, null, 2));
    
    // Step 3: Verify data structure integrity between API and service
    console.log("\n--- Step 3: Verifying Data Structure Integrity ---");
    
    const apiKeys = Object.keys(apiResponse.data).sort();
    const serviceKeys = Object.keys(serviceResult).sort();
    
    const apiStatsKeys = apiResponse.data.stats ? Object.keys(apiResponse.data.stats).sort() : [];
    const serviceStatsKeys = serviceResult.stats ? Object.keys(serviceResult.stats).sort() : [];
    
    console.log("API Response Keys:", apiKeys.join(", "));
    console.log("Service Result Keys:", serviceKeys.join(", "));
    
    const keysMatch = JSON.stringify(apiKeys) === JSON.stringify(serviceKeys);
    const statsKeysMatch = JSON.stringify(apiStatsKeys) === JSON.stringify(serviceStatsKeys);
    
    if (!keysMatch || !statsKeysMatch) {
      console.error("❌ Data structure mismatch between API and service!");
      if (!keysMatch) {
        console.error("Top-level keys don't match");
      }
      if (!statsKeysMatch) {
        console.error("Stats keys don't match");
      }
      return false;
    }
    
    console.log("✓ Data structure is consistent between API and service");
    
    // Step 4: Test UI component data usage
    console.log("\n--- Step 4: Testing UI Component Data Mapping ---");
    
    // Simulate UI component data extraction
    const { attributionAccuracy, stats } = apiResponse.data;
    
    // Check if all required UI fields are present in the data
    const requiredUiFields: string[] = [
      'attributionAccuracy',
      'stats.multiSourceRate',
      'stats.dealAttributionRate',
      'stats.fieldCoverage'
    ];
    
    const missingFields: string[] = [];
    
    if (attributionAccuracy === undefined) missingFields.push('attributionAccuracy');
    if (stats?.multiSourceRate === undefined) missingFields.push('stats.multiSourceRate');
    if (stats?.dealAttributionRate === undefined) missingFields.push('stats.dealAttributionRate');
    if (stats?.fieldCoverage === undefined) missingFields.push('stats.fieldCoverage');
    
    if (missingFields.length > 0) {
      console.error("❌ Missing required UI fields:", missingFields.join(", "));
      return false;
    }
    
    console.log("✓ All required UI fields are present in the data");
    console.log(`  - Attribution Accuracy: ${attributionAccuracy?.toFixed(1)}%`);
    console.log(`  - Multi-Source Rate: ${stats?.multiSourceRate?.toFixed(1)}%`);
    console.log(`  - Deal Attribution Rate: ${stats?.dealAttributionRate?.toFixed(1)}%`);
    console.log(`  - Field Coverage: ${stats?.fieldCoverage?.toFixed(1)}%`);
    
    // Final test status
    console.log("\n=== Dashboard UI Test Complete ===\n");
    console.log("TEST RESULT: SUCCESS - All dashboard UI data tests passed!");
    return true;
  } catch (error) {
    console.error("ERROR: Unexpected error during dashboard UI test:", error);
    return false;
  }
}

// Run the test
testDashboardUI()
  .then(success => {
    if (!success) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  })
  .catch(error => {
    console.error("Uncaught error:", error);
    process.exit(1);
  });