/**
 * Deal Values Debugging Tool
 * 
 * This script inspects deal values for specific users having extreme revenue values
 * to pinpoint the source of the corrupted data.
 */

import { db } from './server/db';
import { users, userDeals, deals } from './shared/schema';
import { eq } from 'drizzle-orm';

async function debugDealValues() {
  console.log('==== STARTING DEAL VALUE INSPECTION ====');
  
  // Users with known extreme values
  const problematicUsers = [
    'Evan Arancibia'
  ];
  
  for (const userName of problematicUsers) {
    console.log(`\n\n==== INSPECTING DEALS FOR ${userName} ====`);
    
    // Find user by name (partial match)
    const matchedUsers = await db.select()
      .from(users)
      .where((user) => {
        return user.first_name.like(`%${userName.split(' ')[0]}%`);
      });
    
    if (matchedUsers.length === 0) {
      console.log(`No user found with name: ${userName}`);
      continue;
    }
    
    console.log(`Found ${matchedUsers.length} users matching '${userName}'`);
    
    // Inspect each matching user
    for (const user of matchedUsers) {
      const userId = user.id;
      const userFullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      console.log(`\n-- Inspecting deals for user ID ${userId} (${userFullName}) --`);
      
      // Get all user deal assignments
      const userDealAssignments = await db.select()
        .from(userDeals)
        .where(eq(userDeals.userId, userId));
      
      if (userDealAssignments.length === 0) {
        console.log(`No deals found for user ID ${userId}`);
        continue;
      }
      
      console.log(`Found ${userDealAssignments.length} deals assigned to this user`);
      
      // Inspect each deal's value
      for (const assignment of userDealAssignments) {
        const dealId = assignment.dealId;
        
        // Fetch complete deal information
        const [dealInfo] = await db.select()
          .from(deals)
          .where(eq(deals.id, dealId));
        
        if (!dealInfo) {
          console.log(`Deal ID ${dealId} not found in database`);
          continue;
        }
        
        // Print raw deal data to inspect value format
        console.log(`\nDeal ID: ${dealId}`);
        console.log(`Title: ${dealInfo.title || 'Untitled'}`);
        console.log(`Status: ${dealInfo.status || 'Unknown'}`);
        
        // Detailed value inspection
        console.log(`RAW Value: ${JSON.stringify(dealInfo.value)}`);
        console.log(`Value Type: ${typeof dealInfo.value}`);
        
        if (dealInfo.value) {
          // Try parsing the value 
          try {
            const numValue = parseFloat(String(dealInfo.value).replace(/[^0-9.-]/g, ''));
            console.log(`Parsed value: ${numValue}`);
            console.log(`Is scientific notation: ${String(dealInfo.value).includes('e') || String(dealInfo.value).includes('E')}`);
          } catch (e) {
            console.log(`Error parsing value: ${e.message}`);
          }
        }
        
        // Inspect custom fields stored in metadata
        if (dealInfo.metadata) {
          console.log('Custom fields:');
          try {
            const metadata = typeof dealInfo.metadata === 'string' 
              ? JSON.parse(dealInfo.metadata) 
              : dealInfo.metadata;
            
            if (metadata.custom) {
              for (const [key, value] of Object.entries(metadata.custom)) {
                console.log(`  ${key}: ${JSON.stringify(value)}`);
              }
            } else {
              console.log('  No custom fields found in metadata');
            }
          } catch (e) {
            console.log(`  Error parsing metadata: ${e.message}`);
          }
        }
      }
    }
  }
  
  console.log('\n==== COMPLETED DEAL VALUE INSPECTION ====');
}

// Run the debug function
debugDealValues()
  .then(() => {
    console.log('Debug process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error during debugging:', error);
    process.exit(1);
  });