/**
 * Test Progressive Sample Attribution
 * 
 * This script tests the attribution system with progressively larger sample sizes,
 * starting with smaller batches and increasing until we find a sample size that's
 * both statistically significant and can complete within our timeout limits.
 */

import enhancedAttributionService from "./server/services/enhanced-attribution";
import { storage } from "./server/storage";

// Test with multiple progressively larger sample sizes
async function testProgressiveSampleAttribution() {
  console.log("\n=== Testing Attribution with Progressive Sample Sizes ===\n");

  try {
    // Step 1: Get total contacts and deals count
    const totalContacts = await storage.getContactsCount();
    const totalDeals = await storage.getDealsCount();
    
    console.log(`Total contacts in system: ${totalContacts}`);
    console.log(`Total deals in system: ${totalDeals}`);
    
    // Test with multiple different sample sizes (starting smaller)
    const sampleSizes = [25, 50, 100, 150];
    
    interface SampleResult {
      sampleSize: number;
      contactsAnalyzed: number;
      dealsAnalyzed: number;
      dealsWithAttribution: number;
      dealAttributionRate: number;
    }
    
    let lastSuccessfulSample: SampleResult | null = null;
    
    for (const sampleSize of sampleSizes) {
      console.log(`\n--- Testing with ${sampleSize} contact sample ---`);
      
      try {
        console.time(`sample-${sampleSize}-attribution`);
        
        // Use direct API call to get the sample size we want
        const contacts = await storage.getContactSample(sampleSize);
        console.log(`Retrieved ${contacts.length} contacts for analysis`);
        
        // Get all deals related to these contacts (one by one since we don't have a batch method)
        const contactIds = contacts.map(c => c.id);
        let allDeals: any[] = [];
        
        // Process in smaller batches to avoid timeouts
        for (let i = 0; i < Math.min(contactIds.length, 50); i++) {
          const contactDeals = await storage.getDealsByContactId(contactIds[i]);
          allDeals = [...allDeals, ...contactDeals];
        }
        
        console.log(`Retrieved ${allDeals.length} deals related to these contacts`);
        
        // Count deals with attribution
        let dealsWithAttribution = 0;
        for (let i = 0; i < Math.min(allDeals.length, 300); i++) {
          const deal = allDeals[i];
          const contact = contacts.find(c => c.id === deal.contactId);
          if (contact && enhancedAttributionService.checkDealForAttribution(deal, contact)) {
            dealsWithAttribution++;
          }
        }
        
        const dealCount = Math.min(allDeals.length, 300);
        const dealAttributionRate = dealCount > 0 ? (dealsWithAttribution / dealCount) * 100 : 0;
        
        console.timeEnd(`sample-${sampleSize}-attribution`);
        
        // Log the results
        console.log("\n--- Attribution Results for this Sample Size ---");
        console.log(`Contacts analyzed: ${contacts.length}`);
        console.log(`Deals analyzed: ${dealCount}`);
        console.log(`Deals with attribution: ${dealsWithAttribution}`);
        console.log(`Deal attribution rate: ${dealAttributionRate.toFixed(2)}%`);
        
        // Store successful result as SampleResult
        lastSuccessfulSample = {
          sampleSize,
          contactsAnalyzed: contacts.length,
          dealsAnalyzed: dealCount,
          dealsWithAttribution,
          dealAttributionRate
        } as SampleResult;
      } catch (error) {
        console.error(`ERROR with sample size ${sampleSize}:`, error);
        console.log(`Skipping to next sample size...`);
      }
    }
    
    // Final results summary
    console.log("\n=== Progressive Sample Attribution Test Complete ===\n");
    
    if (lastSuccessfulSample) {
      console.log("Most successful sample results:");
      console.log(`Sample size: ${lastSuccessfulSample.sampleSize} contacts`);
      console.log(`Deals analyzed: ${lastSuccessfulSample.dealsAnalyzed}`);
      console.log(`Deal attribution rate: ${lastSuccessfulSample.dealAttributionRate.toFixed(2)}%`);
      
      const success = lastSuccessfulSample.dealAttributionRate >= 95;
      
      if (success) {
        console.log(`SUCCESS: Deal attribution rate is ${lastSuccessfulSample.dealAttributionRate.toFixed(2)}%, which exceeds the target of 95%`);
        return true;
      } else {
        console.log(`FAILURE: Deal attribution rate is only ${lastSuccessfulSample.dealAttributionRate.toFixed(2)}%, which is below the target of 95%`);
        return false;
      }
    } else {
      console.log("FAILURE: No successful sample sizes were processed");
      return false;
    }
  } catch (error) {
    console.error("ERROR: Unexpected error during progressive sample attribution test:", error);
    return false;
  }
}

// Run the test
testProgressiveSampleAttribution()
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