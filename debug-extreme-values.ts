/**
 * Extreme Value Diagnostic Tool
 * 
 * This script specifically checks for and analyzes astronomically high deal values
 * in the database to pinpoint the source of the issue.
 */

import { db } from './server/db';
import { closeUsers, deals, dealToUserAssignments } from './shared/schema';
import { eq, like, or } from 'drizzle-orm';

async function debugExtremeValues() {
  console.log('========== EXTREME VALUE DIAGNOSTICS ==========');
  console.log('Looking for users with unrealistic revenue values...');
  
  // First check for Evan Arancibia specifically
  const problematicUsers = await db.select()
    .from(closeUsers)
    .where(or(
      like(closeUsers.first_name, '%Evan%'),
      like(closeUsers.last_name, '%Arancibia%')
    ));
  
  if (problematicUsers.length === 0) {
    console.log('No users found matching Evan Arancibia. Checking for other users with extreme values...');
    
    // Query all user-deal assignments to find extreme values
    const allDeals = await db.select()
      .from(deals);
    
    // Analyze all deals for extreme values
    const extremeDeals = allDeals.filter(deal => {
      if (!deal.value) return false;
      
      try {
        // Check if deal value is extremely large
        const numericValue = parseFloat(String(deal.value).replace(/[^0-9.-]/g, ''));
        return !isNaN(numericValue) && numericValue > 1000000000; // Over 1 billion
      } catch (e) {
        return false;
      }
    });
    
    if (extremeDeals.length === 0) {
      console.log('No extreme deal values found directly in deals table.');
    } else {
      console.log(`Found ${extremeDeals.length} deals with extreme values:`);
      
      for (const deal of extremeDeals) {
        console.log(`\n--- Deal ID: ${deal.id} ---`);
        console.log(`Title: ${deal.title}`);
        console.log(`Raw value: "${deal.value}" (${typeof deal.value})`);
        console.log(`Contact ID: ${deal.contactId}`);
        
        // Check for scientific notation
        const isScientific = String(deal.value).toLowerCase().includes('e');
        if (isScientific) {
          console.log('CONTAINS SCIENTIFIC NOTATION');
        }
        
        // Try to parse the value
        try {
          const numericValue = parseFloat(String(deal.value).replace(/[^0-9.-]/g, ''));
          console.log(`Parsed value: ${numericValue}`);
          console.log(`Formatted: $${numericValue.toLocaleString('en-US')}`);
        } catch (e) {
          console.log(`Error parsing: ${e.message}`);
        }
        
        // Check any additional custom values
        if (deal.cashCollected) {
          console.log(`Raw cash collected: "${deal.cashCollected}"`);
        }
        if (deal.contractedValue) {
          console.log(`Raw contracted value: "${deal.contractedValue}"`);
        }
        
        // Check metadata
        if (deal.metadata) {
          console.log('Metadata:');
          console.log(typeof deal.metadata === 'string' 
            ? deal.metadata 
            : JSON.stringify(deal.metadata, null, 2));
        }
      }
    }
  } else {
    // Found matching users, investigate their deals
    for (const user of problematicUsers) {
      console.log(`\n-------- Investigating user: ${user.first_name} ${user.last_name} (ID: ${user.id}) --------`);
      
      // Find all deals assigned to this user
      const userDealAssignments = await db.select({
        assignment: dealToUserAssignments,
        deal: deals
      })
      .from(dealToUserAssignments)
      .innerJoin(deals, eq(dealToUserAssignments.dealId, deals.id))
      .where(eq(dealToUserAssignments.closeUserId, user.id));
      
      if (userDealAssignments.length === 0) {
        console.log(`No deals found assigned to this user.`);
        continue;
      }
      
      console.log(`Found ${userDealAssignments.length} deals assigned to this user:`);
      
      // Inspect each deal
      for (const { deal } of userDealAssignments) {
        console.log(`\n--- Deal ID: ${deal.id} ---`);
        console.log(`Title: ${deal.title}`);
        console.log(`Status: ${deal.status}`);
        console.log(`Raw value: "${deal.value}" (${typeof deal.value})`);
        
        // Check for scientific notation
        const isScientific = deal.value && String(deal.value).toLowerCase().includes('e');
        if (isScientific) {
          console.log('CONTAINS SCIENTIFIC NOTATION');
        }
        
        // Try to parse the value
        if (deal.value) {
          try {
            const numericValue = parseFloat(String(deal.value).replace(/[^0-9.-]/g, ''));
            console.log(`Parsed value: ${numericValue}`);
            console.log(`Formatted: $${numericValue.toLocaleString('en-US')}`);
          } catch (e) {
            console.log(`Error parsing: ${e.message}`);
          }
        }
        
        // Check any additional custom values that might contribute to revenue calculations
        if (deal.cashCollected) {
          console.log(`Raw cash collected: "${deal.cashCollected}"`);
          try {
            const cashValue = parseFloat(String(deal.cashCollected).replace(/[^0-9.-]/g, ''));
            console.log(`Parsed cash collected: ${cashValue}`);
          } catch (e) {
            console.log(`Error parsing cash collected: ${e.message}`);
          }
        }
        
        if (deal.contractedValue) {
          console.log(`Raw contracted value: "${deal.contractedValue}"`);
          try {
            const contractValue = parseFloat(String(deal.contractedValue).replace(/[^0-9.-]/g, ''));
            console.log(`Parsed contracted value: ${contractValue}`);
          } catch (e) {
            console.log(`Error parsing contracted value: ${e.message}`);
          }
        }
        
        // Check metadata for any additional fields that might be used in calculations
        if (deal.metadata) {
          console.log('Metadata:');
          try {
            const metadata = typeof deal.metadata === 'string' 
              ? JSON.parse(deal.metadata) 
              : deal.metadata;
            
            console.log(JSON.stringify(metadata, null, 2));
            
            // Specifically check for custom fields that might be used in calculations
            if (metadata.custom) {
              console.log('\nCustom fields:');
              for (const [key, value] of Object.entries(metadata.custom)) {
                console.log(`${key}: ${JSON.stringify(value)}`);
              }
            }
          } catch (e) {
            console.log(`Error parsing metadata: ${e.message}`);
          }
        }
      }
    }
  }
  
  console.log('\n========== DIAGNOSTICS COMPLETE ==========');
}

// Run the diagnostics
debugExtremeValues()
  .then(() => {
    console.log('Analysis completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error during analysis:', error);
    process.exit(1);
  });