/**
 * Cash Collected by Rep Debug Script
 * 
 * This script directly analyzes how the dashboard API calculates and returns
 * the Cash Collected by Rep metrics to ensure they're working correctly.
 */

import axios from 'axios';
import { db } from './server/db';
import { deals } from './shared/schema';
import { sql, and, eq, isNotNull } from 'drizzle-orm';

async function debugCashCollectedByRep() {
  console.log("=== Cash Collected by Rep Debugging ===\n");

  // 1. Query the dashboard API directly to get the rep metrics
  console.log("1. Querying dashboard API for rep metrics (April 2025):");
  try {
    const response = await axios.get('http://localhost:5000/api/enhanced-dashboard?dateRange=2025-04-01_2025-04-30');
    
    if (response.data && response.data.salesTeam) {
      const { salesTeam } = response.data;
      
      console.log(`Found ${salesTeam.length} reps in the dashboard data`);
      
      // Check if we're using the enhanced revenue calculation
      console.log(`Using enhanced revenue calculation: ${response.data.usingEnhancedRevenueCalculation || false}`);
      
      // Calculate total cash collected across all reps
      const totalCashCollected = salesTeam.reduce((sum, rep) => sum + (rep.cashCollected || 0), 0);
      console.log(`Total cash collected across all reps: $${totalCashCollected.toFixed(2)}`);
      
      // Show top 3 reps by cash collected
      const topReps = [...salesTeam]
        .sort((a, b) => (b.cashCollected || 0) - (a.cashCollected || 0))
        .slice(0, 3);
      
      console.log("\nTop reps by cash collected:");
      topReps.forEach((rep, index) => {
        console.log(`${index + 1}. ${rep.name || rep.id}: $${rep.cashCollected?.toFixed(2) || '0.00'}`);
      });
      
      // Analyze rep performance data structure
      if (salesTeam.length > 0) {
        const sampleRep = salesTeam[0];
        console.log("\nSample rep data structure:");
        Object.keys(sampleRep).forEach(key => {
          const value = sampleRep[key];
          if (typeof value === 'object' && value !== null) {
            console.log(`- ${key}: [Object]`);
          } else {
            console.log(`- ${key}: ${value}`);
          }
        });
      }
    } else {
      console.log("No sales team data found in the dashboard response");
    }
  } catch (error) {
    console.error("Error querying dashboard API:", error.message);
  }
  
  // 2. Direct database query to validate the data
  console.log("\n2. Direct database query for closed deals with user assignments (April 2025):");
  try {
    const closedDeals = await db.select({
      id: deals.id,
      value: deals.value,
      cashCollected: deals.cashCollected,
      assignedTo: deals.assignedTo,
      closeDate: deals.closeDate
    })
    .from(deals)
    .where(and(
      isNotNull(deals.closeDate),
      isNotNull(deals.assignedTo)
    ));
    
    console.log(`Found ${closedDeals.length} closed deals with user assignments`);
    
    if (closedDeals.length > 0) {
      // Group by user
      const userSummary = closedDeals.reduce((acc, deal) => {
        const userId = deal.assignedTo;
        if (!userId) return acc;
        
        if (!acc[userId]) {
          acc[userId] = {
            userId,
            deals: 0,
            totalValue: 0,
            totalCashCollected: 0
          };
        }
        
        acc[userId].deals += 1;
        
        const value = typeof deal.value === 'string' 
          ? parseFloat(deal.value) 
          : (deal.value || 0);
          
        const cashCollected = typeof deal.cashCollected === 'string'
          ? parseFloat(deal.cashCollected)
          : (deal.cashCollected || value); // Assume cash collected equals value if not specified
          
        acc[userId].totalValue += value;
        acc[userId].totalCashCollected += cashCollected;
        
        return acc;
      }, {});
      
      const userSummaryArray = Object.values(userSummary);
      console.log(`Found ${userSummaryArray.length} users with closed deals`);
      
      if (userSummaryArray.length > 0) {
        console.log("\nUser cash collected summary:");
        userSummaryArray
          .sort((a, b) => (b as any).totalCashCollected - (a as any).totalCashCollected)
          .slice(0, 5)
          .forEach((user: any) => {
            console.log(`User ${user.userId}: $${user.totalCashCollected.toFixed(2)} from ${user.deals} deals`);
          });
      }
    }
  } catch (error) {
    console.error("Error querying database:", error);
  }
  
  console.log("\n=== Debug Complete ===");
}

// Run the debug script
debugCashCollectedByRep()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Error in debug script:", error);
    process.exit(1);
  });