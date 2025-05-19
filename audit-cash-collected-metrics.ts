/**
 * Cash Collected Metrics Audit
 * 
 * This script performs a comprehensive audit of how cash collected metrics are
 * generated throughout the entire application, from database to dashboard display.
 * It traces the complete data flow to pinpoint exactly where the issue is occurring.
 */

import chalk from 'chalk';
import { db } from './server/db';
import { 
  deals, 
  closeUsers, 
  dealToUserAssignments,
  users
} from './shared/schema';
import { 
  eq, 
  and, 
  gte, 
  lte, 
  sql, 
  isNotNull,
  desc,
  asc,
  inArray
} from 'drizzle-orm';
import axios from 'axios';

function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  const colors = {
    info: chalk.blue,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red
  };
  
  console.log(colors[type](message));
}

function hr() {
  console.log('\n' + '-'.repeat(80) + '\n');
}

async function auditCashCollectedMetrics() {
  log('Starting comprehensive audit of Cash Collected metrics', 'info');
  hr();

  // 1. Check all April 2025 deals in the database
  log('1. Auditing all April 2025 deals in the database', 'info');
  
  const aprilDeals = await db.select({
    id: deals.id,
    closeId: deals.closeId,
    title: deals.title,
    value: deals.value,
    status: deals.status,
    createdAt: deals.createdAt,
    closeDate: deals.closeDate,
    assignedTo: deals.assignedTo,
    cashCollected: deals.cashCollected
  })
  .from(deals)
  .where(and(
    gte(deals.closeDate, '2025-04-01'),
    lte(deals.closeDate, '2025-04-30')
  ))
  .orderBy(asc(deals.id));
  
  log(`Found ${aprilDeals.length} deals for April 2025`, 'info');
  
  let totalValue = 0;
  let totalCashCollected = 0;
  
  aprilDeals.forEach(deal => {
    let dealValue = 0;
    let dealCashCollected = 0;
    
    // Safely parse the value
    if (deal.value) {
      try {
        dealValue = typeof deal.value === 'string' ? parseFloat(deal.value) : deal.value;
      } catch (e) {
        dealValue = 0;
      }
    }
    
    // Safely parse the cash collected
    if (deal.cashCollected) {
      try {
        dealCashCollected = typeof deal.cashCollected === 'string' ? 
          parseFloat(deal.cashCollected) : deal.cashCollected;
      } catch (e) {
        dealCashCollected = 0;
      }
    }
    
    totalValue += dealValue;
    totalCashCollected += dealCashCollected;
    
    console.log(`- Deal #${deal.id}: $${dealValue.toLocaleString()}, status: ${deal.status}, assigned to: ${deal.assignedTo}, cash collected: $${dealCashCollected.toLocaleString()}`);
  });
  
  log(`Total value of April deals: $${totalValue.toLocaleString()}`, 'info');
  log(`Total cash collected from April deals: $${totalCashCollected.toLocaleString()}`, 'info');
  hr();
  
  // 2. Check all deal-to-user assignments for April 2025 deals
  log('2. Auditing deal-to-user assignments for April 2025 deals', 'info');
  
  const dealIds = aprilDeals.map(deal => deal.id);
  
  let dealAssignments = [];
  if (dealIds.length > 0) {
    dealAssignments = await db.select({
      dealId: dealToUserAssignments.dealId,
      closeUserId: dealToUserAssignments.closeUserId,
      assignmentDate: dealToUserAssignments.assignmentDate,
      assignmentType: dealToUserAssignments.assignmentType
    })
    .from(dealToUserAssignments)
    .where(inArray(dealToUserAssignments.dealId, dealIds))
    .orderBy(asc(dealToUserAssignments.dealId));
  }
  
  log(`Found ${dealAssignments.length} deal-user assignments for April deals`, 'info');
  
  for (const assignment of dealAssignments) {
    // Find the corresponding deal
    const deal = aprilDeals.find(d => d.id === assignment.dealId);
    
    // Find the user name
    const user = await db.select({
      id: closeUsers.id,
      first_name: closeUsers.first_name,
      last_name: closeUsers.last_name,
      closeId: closeUsers.closeId
    })
    .from(closeUsers)
    .where(eq(closeUsers.id, assignment.closeUserId))
    .limit(1);
    
    const userName = user.length > 0 ? 
      `${user[0].first_name || ''} ${user[0].last_name || ''}`.trim() : 
      `User ID ${assignment.closeUserId}`;
    
    console.log(`- Deal #${assignment.dealId} (${deal?.title || 'Unknown'}) assigned to: ${userName} (ID: ${assignment.closeUserId}), type: ${assignment.assignmentType}`);
  }
  
  // Also check for deals without assignments
  const dealsWithoutAssignments = aprilDeals.filter(
    deal => !dealAssignments.some(assignment => assignment.dealId === deal.id)
  );
  
  if (dealsWithoutAssignments.length > 0) {
    log(`Found ${dealsWithoutAssignments.length} April deals WITHOUT user assignments!`, 'warning');
    dealsWithoutAssignments.forEach(deal => {
      console.log(`- Deal #${deal.id} (${deal.title || 'Unknown'}): value $${deal.value}, no user assigned in junction table`);
    });
  } else {
    log('✅ All April deals have user assignments in the junction table', 'success');
  }
  hr();
  
  // 3. Audit how the dashboard API computes cash collected by rep
  log('3. Auditing how the dashboard API computes cash collected by rep', 'info');
  
  try {
    // Query the dashboard API
    const response = await axios.get('http://localhost:5000/api/enhanced-dashboard?dateRange=2025-04-01_2025-04-30');
    const dashboardData = response.data;
    
    if (dashboardData && dashboardData.salesTeam) {
      log(`Dashboard API returned ${dashboardData.salesTeam.length} sales team members`, 'info');
      
      // Find Morgan Clark in salesTeam
      const morganClark = dashboardData.salesTeam.find(rep => rep.name.includes('Morgan'));
      
      if (morganClark) {
        log('Found Morgan Clark in dashboard salesTeam data', 'success');
        log(`Morgan Clark dashboard metrics:`, 'info');
        log(`- ID: ${morganClark.id}`, 'info');
        log(`- Deals: ${morganClark.deals}`, 'info');
        log(`- Cash Collected: $${morganClark.cashCollected?.toLocaleString() || 0}`, 'info');
        log(`- Revenue: $${morganClark.revenue?.toLocaleString() || 0}`, 'info');
        
        // Look up Morgan in the close users table
        const morganInDb = await db.select()
          .from(closeUsers)
          .where(sql`LOWER(${closeUsers.first_name}) LIKE ${'%morgan%'} OR LOWER(${closeUsers.last_name}) LIKE ${'%morgan%'}`)
          .limit(1);
          
        if (morganInDb.length > 0) {
          log(`Found Morgan Clark in closeUsers table: ID ${morganInDb[0].id}, Close ID: ${morganInDb[0].closeId}`, 'info');
          
          // Find deals assigned to Morgan in the junction table
          const morganDeals = await db.select({
              dealId: dealToUserAssignments.dealId,
              closeUserId: dealToUserAssignments.closeUserId
            })
            .from(dealToUserAssignments)
            .where(eq(dealToUserAssignments.closeUserId, morganInDb[0].id));
            
          log(`Found ${morganDeals.length} deals assigned to Morgan Clark in junction table`, 'info');
          
          // Get the actual deals from the deals table
          const morganDealDetails = await db.select({
              id: deals.id,
              title: deals.title,
              value: deals.value,
              status: deals.status,
              closeDate: deals.closeDate,
              cashCollected: deals.cashCollected
            })
            .from(deals)
            .where(sql`${deals.id} IN (${morganDeals.map(d => d.dealId).join(',')})`)
            .orderBy(asc(deals.id));
            
          log(`Retrieved ${morganDealDetails.length} deals for Morgan Clark`, 'info');
          
          let morganTotalValue = 0;
          let morganTotalCashCollected = 0;
          
          morganDealDetails.forEach(deal => {
            let dealValue = 0;
            let dealCashCollected = 0;
            
            if (deal.value) {
              try {
                dealValue = typeof deal.value === 'string' ? parseFloat(deal.value) : deal.value;
              } catch (e) {
                dealValue = 0;
              }
            }
            
            if (deal.cashCollected) {
              try {
                dealCashCollected = typeof deal.cashCollected === 'string' ? 
                  parseFloat(deal.cashCollected) : deal.cashCollected;
              } catch (e) {
                dealCashCollected = 0;
              }
            }
            
            morganTotalValue += dealValue;
            morganTotalCashCollected += dealCashCollected;
            
            console.log(`- Deal #${deal.id}: $${dealValue.toLocaleString()}, status: ${deal.status}, close date: ${deal.closeDate}, cash collected: $${dealCashCollected.toLocaleString()}`);
          });
          
          log(`Total value of Morgan's deals: $${morganTotalValue.toLocaleString()}`, 'info');
          log(`Total cash collected from Morgan's deals: $${morganTotalCashCollected.toLocaleString()}`, 'info');
          
          // Compare with what's shown in dashboard
          log(`Discrepancy check:`, 'info');
          log(`- Dashboard shows Cash Collected: $${morganClark.cashCollected?.toLocaleString() || 0}`, 'info');
          log(`- Database calculation: $${morganTotalCashCollected.toLocaleString()}`, 'info');
          
          const discrepancy = (morganClark.cashCollected || 0) - morganTotalCashCollected;
          if (Math.abs(discrepancy) > 1) {  // Allow for small rounding differences
            log(`⚠️ Discrepancy found! Difference of $${discrepancy.toLocaleString()}`, 'warning');
          } else {
            log(`✅ No significant discrepancy found!`, 'success');
          }
        } else {
          log(`Could not find Morgan Clark in closeUsers table!`, 'error');
        }
      } else {
        log(`Could not find Morgan Clark in dashboard salesTeam data!`, 'error');
      }
    } else {
      log(`No salesTeam data found in dashboard response!`, 'error');
    }
  } catch (error) {
    log(`Error querying dashboard API: ${error.message}`, 'error');
  }
  hr();
  
  // 4. Trace through the storage.ts implementation of the getDashboardData method
  log('4. Auditing storage.ts implementation of the getDashboardData method', 'info');
  log('Tracing how Cash Collected values are calculated in the business logic:', 'info');
  log(`
CODE TRACE:
1. The dashboard queries the enhanced-dashboard API endpoint
2. This endpoint calls storage.getDashboardData() with a date range
3. getDashboardData() gets users from closeUsers table
4. For each user:
   - Gets deals via dealToUserAssignments.closeUserId JOIN deals
   - Filters deals by date range
   - Calculates cash collected by summing deal.cash_collected 
     (if deal is won and has a cash_collected value)
5. Returns salesTeam array with calculated metrics
`, 'info');
  
  // 5. Check all users with April deals
  log('5. Checking all users with April deals', 'info');
  
  const userIdsWithDeals = [...new Set(dealAssignments.map(a => a.closeUserId))];
  log(`Found ${userIdsWithDeals.length} unique users with April deals`, 'info');
  
  for (const userId of userIdsWithDeals) {
    // Get user details
    const user = await db.select({
      id: closeUsers.id,
      first_name: closeUsers.first_name,
      last_name: closeUsers.last_name,
      closeId: closeUsers.closeId
    })
    .from(closeUsers)
    .where(eq(closeUsers.id, userId))
    .limit(1);
    
    if (user.length === 0) {
      log(`Could not find user with ID ${userId}!`, 'error');
      continue;
    }
    
    const userName = `${user[0].first_name || ''} ${user[0].last_name || ''}`.trim();
    
    // Get the deals assigned to this user
    const userDealIds = dealAssignments
      .filter(a => a.closeUserId === userId)
      .map(a => a.dealId);
    
    // Get the actual deals from the deals table
    const userDeals = await db.select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      status: deals.status,
      closeDate: deals.closeDate,
      cashCollected: deals.cashCollected
    })
    .from(deals)
    .where(sql`${deals.id} IN (${userDealIds.join(',')})`)
    .orderBy(asc(deals.id));
    
    // Calculate metrics
    let totalValue = 0;
    let totalCashCollected = 0;
    let wonDeals = 0;
    
    userDeals.forEach(deal => {
      let dealValue = 0;
      let dealCashCollected = 0;
      
      if (deal.value) {
        try {
          dealValue = typeof deal.value === 'string' ? parseFloat(deal.value) : deal.value;
        } catch (e) {
          dealValue = 0;
        }
      }
      
      if (deal.cashCollected) {
        try {
          dealCashCollected = typeof deal.cashCollected === 'string' ? 
            parseFloat(deal.cashCollected) : deal.cashCollected;
        } catch (e) {
          dealCashCollected = 0;
        }
      }
      
      totalValue += dealValue;
      totalCashCollected += dealCashCollected;
      if (deal.status === 'won') wonDeals++;
    });
    
    log(`User: ${userName} (ID: ${userId})`, 'info');
    log(`- Total deals: ${userDeals.length}`, 'info');
    log(`- Won deals: ${wonDeals}`, 'info');
    log(`- Total value: $${totalValue.toLocaleString()}`, 'info');
    log(`- Total cash collected: $${totalCashCollected.toLocaleString()}`, 'info');
    console.log(); // Empty line for separation
  }
  hr();
  
  // 6. Check against the enhanced dashboard endpoint for the same date range
  log('6. Cross-referencing with actual dashboard API values', 'info');
  
  try {
    // Query the dashboard API
    const response = await axios.get('http://localhost:5000/api/enhanced-dashboard?dateRange=2025-04-01_2025-04-30');
    const dashboardData = response.data;
    
    if (dashboardData && dashboardData.salesTeam) {
      log(`Dashboard shows ${dashboardData.salesTeam.length} users with metrics`, 'info');
      
      // Sort by cash collected descending to see top performers
      const sortedTeam = [...dashboardData.salesTeam]
        .sort((a, b) => (b.cashCollected || 0) - (a.cashCollected || 0))
        .filter(rep => rep.cashCollected > 0);
      
      log(`Users with Cash Collected values > 0:`, 'info');
      sortedTeam.forEach((rep, index) => {
        console.log(`${index + 1}. ${rep.name}: $${rep.cashCollected?.toLocaleString() || 0}`);
      });
      
      // Calculate total from dashboard
      const totalFromDashboard = sortedTeam.reduce((total, rep) => total + (rep.cashCollected || 0), 0);
      log(`Total Cash Collected from dashboard: $${totalFromDashboard.toLocaleString()}`, 'info');
      log(`Expected total from database: $${totalCashCollected.toLocaleString()}`, 'info');
      
      const diff = totalFromDashboard - totalCashCollected;
      if (Math.abs(diff) > 1) {
        log(`⚠️ Discrepancy of $${diff.toLocaleString()} between dashboard and database`, 'warning');
      } else {
        log(`✅ Total values match between dashboard and database!`, 'success');
      }
    }
  } catch (error) {
    log(`Error querying dashboard API: ${error.message}`, 'error');
  }
  hr();
  
  // 7. Check for any caching issues
  log('7. Checking for any caching issues', 'info');
  
  try {
    // Make two consecutive calls to check for consistency
    const response1 = await axios.get('http://localhost:5000/api/enhanced-dashboard?dateRange=2025-04-01_2025-04-30');
    const response2 = await axios.get('http://localhost:5000/api/enhanced-dashboard?dateRange=2025-04-01_2025-04-30');
    
    const timing1 = response1.headers['x-response-time'] || 'unknown';
    const timing2 = response2.headers['x-response-time'] || 'unknown';
    
    log(`First call response time: ${timing1}ms`, 'info');
    log(`Second call response time: ${timing2}ms`, 'info');
    
    const data1 = JSON.stringify(response1.data);
    const data2 = JSON.stringify(response2.data);
    
    if (data1 === data2) {
      log(`✅ Consecutive API calls returned identical data (possibly cached)`, 'success');
    } else {
      log(`⚠️ Consecutive API calls returned different data!`, 'warning');
    }
    
    // Try with a cache-busting parameter
    const response3 = await axios.get(`http://localhost:5000/api/enhanced-dashboard?dateRange=2025-04-01_2025-04-30&_=${Date.now()}`);
    const data3 = JSON.stringify(response3.data);
    
    if (data1 === data3) {
      log(`✅ Cache-busting call returned same data, cache is consistent`, 'success');
    } else {
      log(`⚠️ Cache-busting call returned different data, possible caching issue!`, 'warning');
    }
  } catch (error) {
    log(`Error checking cache: ${error.message}`, 'error');
  }
  hr();
  
  // Final summary
  log('AUDIT SUMMARY', 'info');
  log(`Total April 2025 deals: ${aprilDeals.length}`, 'info');
  log(`Total April 2025 deal value: $${totalValue.toLocaleString()}`, 'info');
  log(`Total April 2025 cash collected: $${totalCashCollected.toLocaleString()}`, 'info');
  log(`Total users with April deals: ${userIdsWithDeals.length}`, 'info');
  log(`Total deal-user assignments: ${dealAssignments.length}`, 'info');
  
  return {
    dealsCount: aprilDeals.length,
    totalValue,
    totalCashCollected,
    usersCount: userIdsWithDeals.length,
    assignmentsCount: dealAssignments.length
  };
}

// Run the audit
auditCashCollectedMetrics()
  .then(results => {
    console.log('\nAudit completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running audit:', error);
    process.exit(1);
  });