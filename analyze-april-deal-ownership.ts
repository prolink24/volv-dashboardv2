/**
 * Analyze April Deal Ownership
 * 
 * This script analyzes the April 2025 deals to determine the proper ownership
 * based on associated contacts, leads, and other metadata instead of randomly assigning them.
 */

import { db } from "./server/db";
import { deals, contacts, activities } from "./shared/schema";
import { sql, and, gte, lte, eq, isNull, isNotNull } from "drizzle-orm";
import axios from "axios";

// Get environment variables for API access
const CLOSE_API_KEY = process.env.CLOSE_API_KEY;

async function analyzeAprilDealOwnership() {
  console.log("\n=== Analyzing April 2025 Deal Ownership ===\n");
  
  // Define date range for April 2025
  const startDate = new Date("2025-04-01T00:00:00.000Z");
  const endDate = new Date("2025-04-30T23:59:59.999Z");
  
  console.log(`Analyzing deals in date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  // 1. Get all April 2025 deals
  const aprilDeals = await db.select({
    id: deals.id,
    value: deals.value,
    status: deals.status,
    assignedTo: deals.assignedTo,
    closeDate: deals.closeDate,
    contactId: deals.contactId,
    leadId: deals.leadId,
    createdBy: deals.createdBy,
    metadata: deals.metadata
  })
  .from(deals)
  .where(and(
    isNotNull(deals.closeDate),
    gte(deals.closeDate, sql`${startDate}`),
    lte(deals.closeDate, sql`${endDate}`)
  ));
  
  console.log(`Found ${aprilDeals.length} deals in April 2025`);
  
  if (aprilDeals.length === 0) {
    console.log("No deals found in April 2025.");
    return;
  }
  
  // 2. Get unassigned deals
  const unassignedDeals = aprilDeals.filter(deal => !deal.assignedTo);
  
  console.log(`\nUnassigned deals: ${unassignedDeals.length} of ${aprilDeals.length}`);
  
  if (unassignedDeals.length === 0) {
    console.log("All deals already have assignments.");
    return;
  }
  
  // 3. Print the total value
  const totalValue = unassignedDeals.reduce((sum, deal) => {
    const value = typeof deal.value === 'string' ? parseFloat(deal.value) : (deal.value || 0);
    return sum + value;
  }, 0);
  
  console.log(`Total value of unassigned deals: $${totalValue.toFixed(2)}`);
  
  // 4. Analyze each unassigned deal to determine best ownership
  console.log("\nAnalyzing unassigned deals for proper ownership:");
  
  for (const deal of unassignedDeals) {
    const dealValue = typeof deal.value === 'string' ? parseFloat(deal.value) : (deal.value || 0);
    console.log(`\n- Deal ID ${deal.id}: $${dealValue.toFixed(2)} (Status: ${deal.status})`);
    
    // Look for ownership clues
    console.log(`  Lead ID: ${deal.leadId || 'None'}`);
    console.log(`  Contact ID: ${deal.contactId || 'None'}`);
    console.log(`  Created By: ${deal.createdBy || 'Unknown'}`);
    
    // Check for related activities that might indicate ownership
    if (deal.contactId) {
      const relatedActivities = await db.select({
        id: activities.id,
        userId: activities.userId,
        type: activities.type
      })
      .from(activities)
      .where(eq(activities.contactId, deal.contactId))
      .limit(5);
      
      if (relatedActivities.length > 0) {
        console.log(`  Related activities found: ${relatedActivities.length}`);
        
        // Group activities by user to find the most active user
        const userActivityCounts = {};
        relatedActivities.forEach(activity => {
          if (activity.userId) {
            userActivityCounts[activity.userId] = (userActivityCounts[activity.userId] || 0) + 1;
          }
        });
        
        const mostActiveUser = Object.entries(userActivityCounts).sort((a, b) => b[1] - a[1])[0];
        if (mostActiveUser) {
          console.log(`  Most active user for this contact: ${mostActiveUser[0]} (${mostActiveUser[1]} activities)`);
        }
      } else {
        console.log(`  No related activities found`);
      }
    }
    
    // Check for other similar deals by the same contact/lead
    if (deal.contactId) {
      const otherDealsForContact = await db.select({
        id: deals.id,
        assignedTo: deals.assignedTo
      })
      .from(deals)
      .where(and(
        eq(deals.contactId, deal.contactId),
        isNotNull(deals.assignedTo)
      ))
      .limit(3);
      
      if (otherDealsForContact.length > 0) {
        console.log(`  Other deals for this contact: ${otherDealsForContact.length}`);
        otherDealsForContact.forEach(otherDeal => {
          console.log(`    Deal ${otherDeal.id} assigned to: ${otherDeal.assignedTo}`);
        });
      }
    }
    
    // Extract ownership information from metadata if available
    if (deal.metadata) {
      let metadata;
      try {
        if (typeof deal.metadata === 'string') {
          metadata = JSON.parse(deal.metadata);
        } else {
          metadata = deal.metadata;
        }
        
        console.log(`  Metadata found. Looking for ownership information...`);
        if (metadata.original_owner || metadata.owner || metadata.created_by || metadata.assigned_to) {
          console.log(`  Owner info in metadata: ${metadata.original_owner || metadata.owner || metadata.created_by || metadata.assigned_to}`);
        }
      } catch (error) {
        console.log(`  Error parsing metadata: ${error.message}`);
      }
    }
    
    // Suggestion based on available data
    console.log(`  Suggested action: Investigate this deal's ownership further. May need to check Close CRM UI.`);
  }
  
  console.log("\n=== Analysis Complete ===");
}

// Run the analysis
analyzeAprilDealOwnership()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch(error => {
    console.error("Error executing script:", error);
    process.exit(1);
  });