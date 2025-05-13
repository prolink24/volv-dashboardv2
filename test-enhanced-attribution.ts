/**
 * Enhanced Attribution Test Script
 * 
 * This script tests the enhanced attribution service to verify it meets
 * the accuracy requirement of >90% certainty.
 */

import { storage } from './server/storage';
import enhancedAttributionService from './server/services/enhanced-attribution';
import attributionService from './server/services/attribution';
import { performance } from 'perf_hooks';

async function testEnhancedAttribution() {
  console.log("Starting Enhanced Attribution Test...");
  console.log("---------------------------------------");

  // 1. Test attribution certainty on individual contacts
  try {
    console.log("Test 1: Testing attribution certainty on individual contacts");
    
    // Get a smaller sample of contacts for quicker testing
    const contacts = await storage.getAllContacts(20, 0);
    
    if (!contacts || contacts.length === 0) {
      console.log("No contacts found for testing.");
      return;
    }
    
    console.log(`Testing on ${contacts.length} contacts...`);
    
    let certaintySum = 0;
    let contactsWithAttribution = 0;
    let highCertaintyCount = 0;

    for (const contact of contacts) {
      const startTime = performance.now();
      const result = await enhancedAttributionService.attributeContact(contact.id);
      const endTime = performance.now();
      
      if (result.success && result.attributionCertainty !== undefined) {
        certaintySum += result.attributionCertainty;
        contactsWithAttribution++;
        
        if (result.attributionCertainty >= 0.9) {
          highCertaintyCount++;
        }
        
        console.log(`Contact ${contact.id} (${contact.name}): Certainty = ${(result.attributionCertainty * 100).toFixed(2)}%, Time: ${(endTime - startTime).toFixed(2)}ms`);
      }
    }
    
    if (contactsWithAttribution > 0) {
      const avgCertainty = certaintySum / contactsWithAttribution;
      const highCertaintyPercentage = (highCertaintyCount / contactsWithAttribution) * 100;
      
      console.log(`\nResults:`);
      console.log(`Average Attribution Certainty: ${(avgCertainty * 100).toFixed(2)}%`);
      console.log(`Contacts with >90% Certainty: ${highCertaintyCount}/${contactsWithAttribution} (${highCertaintyPercentage.toFixed(2)}%)`);
      
      if (avgCertainty >= 0.9) {
        console.log("\n✅ SUCCESS: Average attribution certainty is above 90%");
      } else {
        console.log("\n❌ FAIL: Average attribution certainty is below 90%");
      }
    } else {
      console.log("No attribution data was generated for any contacts.");
    }
  } catch (error) {
    console.error("Error testing individual contacts:", error);
  }
  
  // 2. Test attribution accuracy across all contacts
  try {
    console.log("\nTest 2: Testing attribution accuracy across all contacts");
    
    const startTime = performance.now();
    const result = await enhancedAttributionService.attributeAllContacts();
    const endTime = performance.now();
    
    console.log(`\nProcessed in ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
    
    if (result.success) {
      console.log(`Attribution Accuracy: ${(result.attributionAccuracy || 0) * 100}%`);
      console.log(`Total Contacts: ${result.baseResults?.total || 0}`);
      console.log(`Processed Contacts: ${result.baseResults?.processed || 0}`);
      console.log(`Attributed Contacts: ${result.baseResults?.attributed || 0}`);
      console.log(`Errors: ${result.baseResults?.errors || 0}`);
      
      if ((result.attributionAccuracy || 0) >= 0.9) {
        console.log("\n✅ SUCCESS: Overall attribution accuracy is above 90%");
      } else {
        console.log("\n❌ FAIL: Overall attribution accuracy is below 90%");
      }
    } else {
      console.log("Failed to run attribution on all contacts.");
    }
  } catch (error) {
    console.error("Error testing attribution on all contacts:", error);
  }

  // 3. Compare basic and enhanced attribution engines
  try {
    console.log("\nTest 3: Comparing basic and enhanced attribution engines");
    
    // Get a sample of contacts for comparison
    const contacts = await storage.getAllContacts(10, 0);
    
    if (!contacts || contacts.length === 0) {
      console.log("No contacts found for comparison.");
      return;
    }
    
    console.log(`Testing on ${contacts.length} contacts...`);
    
    let basicAttributionTime = 0;
    let enhancedAttributionTime = 0;
    
    for (const contact of contacts) {
      // Test basic attribution
      const basicStart = performance.now();
      const basicResult = await attributionService.attributeContact(contact.id);
      const basicEnd = performance.now();
      basicAttributionTime += (basicEnd - basicStart);
      
      // Test enhanced attribution
      const enhancedStart = performance.now();
      const enhancedResult = await enhancedAttributionService.attributeContact(contact.id);
      const enhancedEnd = performance.now();
      enhancedAttributionTime += (enhancedEnd - enhancedStart);
      
      console.log(`Contact ${contact.id} (${contact.name}):`);
      console.log(`  Basic: ${basicResult.success ? 'Success' : 'Failed'}, Performance: ${(basicEnd - basicStart).toFixed(2)}ms`);
      console.log(`  Enhanced: ${enhancedResult.success ? 'Success' : 'Failed'}, Certainty: ${enhancedResult.attributionCertainty ? (enhancedResult.attributionCertainty * 100).toFixed(2) + '%' : 'N/A'}, Performance: ${(enhancedEnd - enhancedStart).toFixed(2)}ms`);
    }
    
    const avgBasicTime = basicAttributionTime / contacts.length;
    const avgEnhancedTime = enhancedAttributionTime / contacts.length;
    
    console.log(`\nPerformance Comparison:`);
    console.log(`Avg Basic Attribution Time: ${avgBasicTime.toFixed(2)}ms`);
    console.log(`Avg Enhanced Attribution Time: ${avgEnhancedTime.toFixed(2)}ms`);
    console.log(`Performance Difference: ${(((avgEnhancedTime - avgBasicTime) / avgBasicTime) * 100).toFixed(2)}%`);
  } catch (error) {
    console.error("Error comparing attribution engines:", error);
  }
  
  console.log("\nEnhanced Attribution Test Complete!");
}

// Run the test
testEnhancedAttribution()
  .then(() => {
    console.log("Tests completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error running tests:", error);
    process.exit(1);
  });