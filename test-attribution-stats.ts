/**
 * Attribution Stats Test
 * 
 * This script tests the attribution stats endpoint to verify it returns all expected
 * data and resolves the issue with the dashboard.
 */
import { storage } from "./server/storage";
import enhancedAttributionService from "./server/services/enhanced-attribution";

async function testAttributionStats() {
  console.log("\n=== Testing Enhanced Attribution Stats ===\n");

  try {
    // Step 1: Check if we have contacts to analyze
    const contacts = await storage.getAllContacts(10);
    if (!contacts || contacts.length === 0) {
      console.error("ERROR: No contacts found in database");
      return;
    }
    console.log(`Found ${contacts.length} contacts to analyze`);

    // Step 2: Test getAttributionStats method directly
    console.log("\n--- Testing getAttributionStats method ---");
    const attributionStats = await enhancedAttributionService.getAttributionStats();
    
    if (!attributionStats.success) {
      console.error(`ERROR: getAttributionStats failed with error: ${attributionStats.error}`);
      return;
    }
    
    console.log(`Attribution accuracy: ${attributionStats.attributionAccuracy?.toFixed(2)}%`);
    console.log("Stats:", JSON.stringify(attributionStats.stats, null, 2));

    // Step 3: Test contact attribution on a sample contact
    console.log("\n--- Testing contact attribution on sample contact ---");
    const sampleContact = contacts[0];
    console.log(`Using sample contact: ${sampleContact.name} (ID: ${sampleContact.id})`);
    
    const contactAttribution = await enhancedAttributionService.attributeContact(sampleContact.id);
    
    if (!contactAttribution.success) {
      console.error(`ERROR: attributeContact failed with error: ${contactAttribution.error}`);
    } else {
      console.log(`Successfully attributed contact ${sampleContact.name}`);
      console.log(`Attribution certainty: ${(contactAttribution.attributionCertainty || 0) * 100}%`);
      console.log(`Attribution model: ${contactAttribution.attributionModel || "N/A"}`);
      
      // Print touchpoints if available
      if (contactAttribution.timeline && contactAttribution.timeline.length > 0) {
        console.log(`\nTimeline has ${contactAttribution.timeline.length} touchpoints:`);
        contactAttribution.timeline.forEach((tp, i) => {
          console.log(`  ${i+1}. ${tp.type} (${tp.source}) - ${new Date(tp.date).toLocaleString()}`);
        });
      } else {
        console.log("No touchpoints found in timeline");
      }
    }

    // Step 4: Validate all expected fields are present
    console.log("\n--- Validating attribution stats fields ---");
    const requiredStats = ["totalContacts", "multiSourceRate", "dealAttributionRate", "fieldCoverage"];
    
    const missingStats = requiredStats.filter(
      stat => !attributionStats.stats || attributionStats.stats[stat] === undefined
    );
    
    if (missingStats.length > 0) {
      console.error(`ERROR: Missing required stats: ${missingStats.join(", ")}`);
    } else {
      console.log("✓ All required attribution stats fields are present");
    }

    console.log("\n=== Attribution Stats Test Complete ===\n");
    
    if (attributionStats.success && missingStats.length === 0) {
      console.log("TEST RESULT: SUCCESS - All attribution stats tests passed!");
      return true;
    } else {
      console.log("TEST RESULT: FAILED - Some attribution stats tests failed. See errors above.");
      return false;
    }
  } catch (error) {
    console.error("ERROR: Unexpected error during attribution stats test:", error);
    return false;
  }
}

// Run the test
testAttributionStats()
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