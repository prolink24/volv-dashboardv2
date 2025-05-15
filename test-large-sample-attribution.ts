/**
 * Test Large Sample Attribution
 * 
 * This script tests the attribution system with a larger sample size of contacts/deals (1000+)
 * to verify we maintain the high attribution rate with a more representative dataset.
 */

import enhancedAttributionService from "./server/services/enhanced-attribution";
import { storage } from "./server/storage";

async function testLargeSampleAttribution() {
  console.log("\n=== Testing Attribution with Large Sample Size (1000+ contacts) ===\n");

  try {
    // Step 1: Get total contacts and deals count
    const totalContacts = await storage.getContactsCount();
    const totalDeals = await storage.getDealsCount();
    
    console.log(`Total contacts in system: ${totalContacts}`);
    console.log(`Total deals in system: ${totalDeals}`);
    
    console.log("\n--- Testing with 1000 contact sample ---");
    console.time('large-sample-attribution');
    
    // Use the enhanced attribution service with a 1000 contact sample
    const attributionStats = await enhancedAttributionService.getAttributionStats();
    
    console.timeEnd('large-sample-attribution');
    
    if (!attributionStats.success) {
      console.error(`ERROR: Attribution stats generation failed: ${attributionStats.error || 'Unknown error'}`);
      return false;
    }
    
    if (attributionStats.timedOut) {
      console.warn("WARNING: Attribution stats generation timed out - consider increasing timeout limits");
    }
    
    // Log the results
    console.log("\n--- Attribution Results ---");
    console.log(`Attribution accuracy: ${attributionStats.attributionAccuracy}%`);
    
    if (attributionStats.stats) {
      console.log(`Contacts analyzed: ${attributionStats.stats.contactsAnalyzed || 'N/A'}`);
      console.log(`Total deals: ${attributionStats.stats.totalDeals || 0}`);
      console.log(`Deals with attribution: ${attributionStats.stats.dealsWithAttribution || 0}`);
      console.log(`Deal attribution rate: ${attributionStats.stats.dealAttributionRate || 0}%`);
      console.log(`High certainty contacts: ${attributionStats.stats.highCertaintyContacts || 0}`);
      console.log(`Multi-source contact rate: ${attributionStats.stats.multiSourceRate || 0}%`);
      console.log(`Field data coverage: ${attributionStats.stats.fieldCoverage || 0}%`);
    }
    
    // Validate that the attribution rate is still high (>95%)
    const dealAttributionRate = attributionStats.stats?.dealAttributionRate || 0;
    const success = dealAttributionRate >= 95;
    
    console.log("\n=== Large Sample Attribution Test Complete ===\n");
    
    if (success) {
      console.log(`SUCCESS: Deal attribution rate is ${dealAttributionRate}%, which exceeds the target of 95%`);
      return true;
    } else {
      console.log(`FAILURE: Deal attribution rate is only ${dealAttributionRate}%, which is below the target of 95%`);
      return false;
    }
  } catch (error) {
    console.error("ERROR: Unexpected error during large sample attribution test:", error);
    return false;
  }
}

// Run the test
testLargeSampleAttribution()
  .then(success => {
    if (success) {
      console.log("Test completed successfully!");
      process.exit(0);
    } else {
      console.error("Test failed.");
      process.exit(1);
    }
  })
  .catch(error => {
    console.error("Uncaught error:", error);
    process.exit(1);
  });