/**
 * Dashboard Metrics Audit
 * 
 * This script performs a comprehensive audit of dashboard metrics, specifically 
 * focusing on the Cash Collected by Rep metrics to identify why they're not showing
 * the correct attribution despite having updated the database records.
 */

import axios from 'axios';
import { db } from './server/db';
import { deals, users } from './shared/schema';
import { sql, and, eq, isNotNull, gte, lte } from 'drizzle-orm';

async function auditDashboardMetrics() {
  console.log("\n=== Dashboard Metrics Audit ===\n");
  
  // 1. Check the database to see what user IDs are assigned to the April deals
  console.log("1. Checking April 2025 deals in database:");
  
  const aprilDeals = await db.select({
    id: deals.id,
    closeId: deals.closeId,
    title: deals.title,
    value: deals.value,
    assignedTo: deals.assignedTo,
    closeDate: deals.closeDate,
    status: deals.status
  })
  .from(deals)
  .where(and(
    gte(deals.closeDate, '2025-04-01'),
    lte(deals.closeDate, '2025-04-30')
  ));
  
  console.log(`Found ${aprilDeals.length} April 2025 deals`);
  
  // Get user names for display
  const userIds = [...new Set(aprilDeals.map(deal => deal.assignedTo).filter(Boolean))];
  const userRecords = await db.select({
    id: users.id,
    name: users.name
  })
  .from(users)
  .where(userIds.length > 0 ? sql`${users.id} IN ${userIds}` : sql`1=0`);
  
  const userMap = new Map();
  userRecords.forEach(user => {
    userMap.set(user.id, user.name);
  });
  
  // Show deal assignments
  console.log("\nDeal assignments:");
  aprilDeals.forEach(deal => {
    const userName = deal.assignedTo ? (userMap.get(deal.assignedTo) || "Unknown User") : "Unassigned";
    console.log(`- Deal ${deal.id} (${deal.closeId}): $${deal.value}, Status: ${deal.status}, Assigned to: ${userName} (${deal.assignedTo || 'null'})`);
  });
  
  // 2. Check how the dashboard API calculates rep-specific metrics
  console.log("\n2. Checking dashboard API rep-specific metrics:");
  try {
    const response = await axios.get('http://localhost:5000/api/enhanced-dashboard?dateRange=2025-04-01_2025-04-30');
    
    if (!response.data || !response.data.salesTeam) {
      console.log("Error: No sales team data in response");
      return;
    }
    
    const { salesTeam, kpis } = response.data;
    
    // Check top reps
    console.log("\nReps with cash collected in dashboard:");
    const repsWithCash = salesTeam
      .filter(rep => rep.cashCollected > 0)
      .sort((a, b) => b.cashCollected - a.cashCollected);
    
    if (repsWithCash.length === 0) {
      console.log("No reps have any cash collected!");
    } else {
      repsWithCash.forEach(rep => {
        console.log(`- ${rep.name} (${rep.id}): $${rep.cashCollected} from ${rep.deals || 0} deals`);
      });
    }
    
    // Compare KPI totals to rep totals
    const totalCashCollectedByRep = salesTeam.reduce((sum, rep) => sum + (rep.cashCollected || 0), 0);
    console.log("\nCash collected comparison:");
    console.log(`- KPI Total: $${kpis.cashCollected}`);
    console.log(`- Sum of Rep Totals: $${totalCashCollectedByRep}`);
    console.log(`- Difference: $${Math.abs(kpis.cashCollected - totalCashCollectedByRep)}`);
    
    // Look for Morgan Clark specifically
    const morganClark = salesTeam.find(rep => rep.name === "Morgan Clark");
    if (morganClark) {
      console.log("\nMorgan Clark's metrics:");
      console.log(`- Cash Collected: $${morganClark.cashCollected}`);
      console.log(`- Deals: ${morganClark.deals}`);
    }
    
    // 3. Check the salesTeam IDs in the dashboard against the user IDs in the database
    console.log("\n3. Comparing dashboard user IDs with database user IDs:");
    
    const dashboardUserIds = salesTeam.map(rep => rep.id);
    console.log(`Dashboard has ${dashboardUserIds.length} users`);
    
    const dashboardUserWithDeals = salesTeam.filter(rep => rep.deals > 0).map(rep => rep.id);
    console.log(`Dashboard has ${dashboardUserWithDeals.length} users with deals`);
    
    // Find the users that should have deals but don't
    const usersWithDealsInDB = new Set(aprilDeals.map(deal => deal.assignedTo).filter(Boolean));
    console.log(`Database has ${usersWithDealsInDB.size} users with April deals`);
    
    for (const userId of usersWithDealsInDB) {
      const hasDealsInDashboard = dashboardUserWithDeals.includes(userId);
      const userName = userMap.get(userId) || userId;
      console.log(`- ${userName} (${userId}): ${hasDealsInDashboard ? 'Has deals in dashboard' : 'Missing from dashboard'}`);
    }
    
    // 4. Check the user resolution function in the dashboard API
    console.log("\n4. Checking user resolution:");
    // This would ideally check the code in the dashboard API that maps user IDs to names
    // Since we can't directly check that here, we can infer issues from the previous steps
    
    // 5. Check one specific deal flow end-to-end
    if (aprilDeals.length > 0) {
      const sampleDeal = aprilDeals[0];
      console.log(`\n5. Tracing specific deal: ${sampleDeal.id} (${sampleDeal.closeId})`);
      console.log(`- Value: $${sampleDeal.value}`);
      console.log(`- Status: ${sampleDeal.status}`);
      console.log(`- Assigned to: ${sampleDeal.assignedTo ? (userMap.get(sampleDeal.assignedTo) || "Unknown User") : "Unassigned"}`);
      
      // Check if this deal appears in the dashboard data
      const dealsInDashboard = response.data.deals || [];
      const foundInDashboard = dealsInDashboard.find(d => d.id === sampleDeal.id || d.closeId === sampleDeal.closeId);
      console.log(`- Found in dashboard data: ${foundInDashboard ? 'Yes' : 'No'}`);
      
      if (foundInDashboard) {
        console.log(`- Dashboard assignedTo: ${foundInDashboard.assignedTo || 'null'}`);
      }
    }
  } catch (error) {
    console.error("Error querying dashboard API:", error);
  }
  
  return {
    success: true,
    deals: aprilDeals,
    users: userRecords
  };
}

// Run the audit
auditDashboardMetrics()
  .then(() => {
    console.log("\n=== Audit Complete ===");
    process.exit(0);
  })
  .catch(error => {
    console.error("Error running audit:", error);
    process.exit(1);
  });