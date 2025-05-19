/**
 * Revenue Discrepancy Debug Script
 * 
 * This script investigates the discrepancy between the total revenue amount ($210,000)
 * and the Cash Collected by Rep metrics ($30,000) shown in the dashboard.
 */

import axios from 'axios';
import { db } from './server/db';
import { deals } from './shared/schema';
import { sql, and, gte, lte, eq, isNotNull } from 'drizzle-orm';

async function debugRevenueDiscrepancy() {
  console.log("=== Revenue Discrepancy Investigation ===\n");
  
  // Define test date range (April 2025)
  const startDate = new Date("2025-04-01T00:00:00.000Z");
  const endDate = new Date("2025-04-30T23:59:59.999Z");
  
  console.log(`Testing date range: ${startDate.toISOString()} to ${endDate.toISOString()}\n`);
  
  // 1. Check total revenue in database with close_date filter
  console.log("1. Checking total revenue in database with close_date filter:");
  const closeDateDeals = await db.select({
    id: deals.id,
    value: deals.value,
    cashCollected: deals.cashCollected,
    assignedTo: deals.assignedTo,
    closeDate: deals.closeDate,
    status: deals.status
  })
  .from(deals)
  .where(and(
    isNotNull(deals.closeDate),
    gte(deals.closeDate, sql`${startDate}`),
    lte(deals.closeDate, sql`${endDate}`)
  ));
  
  const totalRevenue = closeDateDeals.reduce((sum, deal) => {
    try {
      return sum + (parseFloat(String(deal.value || '0')) || 0);
    } catch (e) {
      return sum;
    }
  }, 0);
  
  console.log(`Found ${closeDateDeals.length} deals closed in April 2025`);
  console.log(`Total revenue: $${totalRevenue.toFixed(2)}`);
  
  // 2. Check if the deals have user assignments
  const assignedDeals = closeDateDeals.filter(deal => deal.assignedTo);
  const unassignedDeals = closeDateDeals.filter(deal => !deal.assignedTo);
  
  console.log(`\nDeals with user assignments: ${assignedDeals.length}`);
  console.log(`Deals without user assignments: ${unassignedDeals.length}`);
  
  // 3. Check if there's a specific user assignment issue
  if (assignedDeals.length > 0) {
    const userCounts = {};
    assignedDeals.forEach(deal => {
      const userId = deal.assignedTo;
      userCounts[userId] = (userCounts[userId] || 0) + 1;
    });
    
    console.log("\nUser assignment distribution:");
    Object.entries(userCounts).forEach(([userId, count]) => {
      console.log(`- User ${userId}: ${count} deals`);
    });
  }
  
  if (unassignedDeals.length > 0) {
    console.log("\nUnassigned deals with their values:");
    unassignedDeals.forEach(deal => {
      console.log(`- Deal ${deal.id}: $${deal.value || 0} (Status: ${deal.status})`);
    });
  }
  
  // 4. Check the dashboard API response
  console.log("\n4. Checking dashboard API response:");
  try {
    const response = await axios.get('http://localhost:5000/api/enhanced-dashboard?dateRange=2025-04-01_2025-04-30');
    
    if (response.data) {
      const { salesTeam, kpis } = response.data;
      
      // Print the KPIs section which should show total revenue 
      console.log("Dashboard KPIs:");
      if (kpis) {
        console.log(`- Total Revenue: $${kpis.revenue?.toFixed(2) || 'N/A'}`);
        console.log(`- Total Cash Collected: $${kpis.cashCollected?.toFixed(2) || 'N/A'}`);
        console.log(`- Close Rate: ${kpis.closeRate || 'N/A'}`);
      } else {
        console.log("No KPIs found in dashboard response");
      }
      
      // Calculate total revenue and cash collected from sales team
      if (salesTeam && salesTeam.length > 0) {
        const totalTeamRevenue = salesTeam.reduce((sum, rep) => sum + (rep.revenue || 0), 0);
        const totalTeamCashCollected = salesTeam.reduce((sum, rep) => sum + (rep.cashCollected || 0), 0);
        
        console.log(`\nSales team metrics:`);
        console.log(`- Total team revenue: $${totalTeamRevenue.toFixed(2)}`);
        console.log(`- Total team cash collected: $${totalTeamCashCollected.toFixed(2)}`);
        console.log(`- Number of reps: ${salesTeam.length}`);
        
        // Check for the specific Morgan Clark user
        const morganClark = salesTeam.find(rep => rep.name === 'Morgan Clark');
        if (morganClark) {
          console.log(`\nMorgan Clark metrics:`);
          console.log(`- ID: ${morganClark.id}`);
          console.log(`- Revenue: $${morganClark.revenue?.toFixed(2) || 'N/A'}`);
          console.log(`- Cash Collected: $${morganClark.cashCollected?.toFixed(2) || 'N/A'}`);
          console.log(`- Deals: ${morganClark.deals || 'N/A'}`);
        }
      }
    } else {
      console.log("No data found in dashboard response");
    }
  } catch (error) {
    console.error("Error querying dashboard API:", error.message);
  }
  
  // 5. Check if database has any special distribution by status
  console.log("\n5. Checking deal distribution by status:");
  const dealsByStatus = await db.select({
    status: deals.status,
    count: sql<number>`COUNT(*)`,
    totalValue: sql<number>`SUM(CAST(COALESCE(${deals.value}, '0') AS DECIMAL(15,2)))`
  })
  .from(deals)
  .where(and(
    isNotNull(deals.closeDate),
    gte(deals.closeDate, sql`${startDate}`),
    lte(deals.closeDate, sql`${endDate}`)
  ))
  .groupBy(deals.status);
  
  if (dealsByStatus.length > 0) {
    console.log("Status breakdown:");
    dealsByStatus.forEach(statusGroup => {
      console.log(`- ${statusGroup.status}: ${statusGroup.count} deals, $${statusGroup.totalValue?.toFixed(2) || '0.00'}`);
    });
  } else {
    console.log("No status data found");
  }
  
  console.log("\n=== Investigation Complete ===");
}

// Run the debug function
debugRevenueDiscrepancy()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Error in debug script:", error);
    process.exit(1);
  });