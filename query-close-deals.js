/**
 * Query Close Deals and Fix User Assignments
 * 
 * This script directly queries the Close API for April 2025 won deals,
 * then updates our database with the correct user assignments.
 */

const axios = require('axios');
const { db } = require('./server/db');
const { deals, dealToUserAssignments, closeUsers } = require('./shared/schema');
const { eq, and } = require('drizzle-orm');
require('dotenv').config();

// Helper function for logging with colors
function log(message, type = 'info') {
  const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
  };
  
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
  };
  
  console.log(`${colorMap[type] || ''}${message}${colors.reset}`);
}

// Get Close API key
const closeApiKey = process.env.CLOSE_API_KEY;

if (!closeApiKey) {
  log('Close API key not found in environment variables', 'error');
  process.exit(1);
}

// Function to fetch deals from Close
async function fetchDealsFromClose() {
  try {
    log('Fetching April 2025 won deals from Close API...');
    
    const response = await axios.get('https://api.close.com/api/v1/opportunity', {
      auth: {
        username: closeApiKey,
        password: '',
      },
      params: {
        date_won__gte: '2025-04-01',
        date_won__lte: '2025-04-30',
        status_type: 'won',
        _limit: 100,
      },
    });
    
    if (response.status !== 200) {
      throw new Error(`Close API returned status ${response.status}`);
    }
    
    log(`Successfully fetched ${response.data.data.length} deals from Close`, 'success');
    return response.data.data;
  } catch (error) {
    log(`Error fetching deals from Close: ${error.message}`, 'error');
    if (error.response) {
      log(`Response status: ${error.response.status}`, 'error');
      log(`Response data: ${JSON.stringify(error.response.data, null, 2)}`, 'error');
    }
    throw error;
  }
}

// Function to update deals in our database
async function updateDealUserAssignments(closeDeals) {
  try {
    log('\nUpdating deal user assignments in our database...');
    
    // Get all Close users from our database
    const allUsers = await db.select().from(closeUsers);
    log(`Found ${allUsers.length} users in our database`, 'info');
    
    // Map Close user IDs to our internal user IDs
    const userMap = new Map();
    allUsers.forEach(user => {
      userMap.set(user.closeId, user);
    });
    
    // Track stats
    let directAssignmentsUpdated = 0;
    let junctionAssignmentsCreated = 0;
    let junctionAssignmentsUpdated = 0;
    let usersByRevenue = new Map();
    
    for (const closeDeal of closeDeals) {
      log(`Processing deal: ${closeDeal.id} (${closeDeal.value_formatted || '$0'})`, 'info');
      
      // Format value and close date
      const dealValue = parseInt(closeDeal.value) || 0;
      const dealCloseDate = closeDeal.date_won 
        ? new Date(closeDeal.date_won) 
        : new Date(closeDeal.date_created);
      
      // Find matching deal in our database
      const ourDeals = await db.select()
        .from(deals)
        .where(deals.closeId === closeDeal.id);
      
      if (ourDeals.length === 0) {
        log(`No matching deal found in our database for Close deal ${closeDeal.id}`, 'warning');
        continue;
      }
      
      const ourDeal = ourDeals[0];
      log(`Found matching deal in our database: ID ${ourDeal.id}`, 'success');
      
      // Get Close user data
      const closeUserId = closeDeal.user_id;
      const closeUserName = closeDeal.user_name;
      
      if (!closeUserId) {
        log(`No user assigned to deal ${closeDeal.id} in Close`, 'warning');
        continue;
      }
      
      // Update revenue tracking for reporting
      if (!usersByRevenue.has(closeUserName)) {
        usersByRevenue.set(closeUserName, { deals: 0, revenue: 0 });
      }
      usersByRevenue.get(closeUserName).deals += 1;
      usersByRevenue.get(closeUserName).revenue += dealValue;
      
      // Get our internal user ID
      const user = userMap.get(closeUserId);
      
      if (!user) {
        log(`User ${closeUserId} (${closeUserName}) not found in our database`, 'warning');
        continue;
      }
      
      // Update direct assigned_to field if needed
      if (ourDeal.assignedTo !== closeUserId) {
        await db.update(deals)
          .set({ assignedTo: closeUserId })
          .where(eq(deals.id, ourDeal.id));
        directAssignmentsUpdated++;
      }
      
      // Check if a junction table assignment exists
      const existingAssignments = await db.select()
        .from(dealToUserAssignments)
        .where(and(
          eq(dealToUserAssignments.dealId, ourDeal.id),
          eq(dealToUserAssignments.assignmentType, 'primary')
        ));
      
      if (existingAssignments.length === 0) {
        // Create new assignment
        await db.insert(dealToUserAssignments)
          .values({
            dealId: ourDeal.id,
            closeUserId: user.id,
            assignmentType: 'primary',
            assignmentDate: new Date()
          });
        junctionAssignmentsCreated++;
      } else if (existingAssignments[0].closeUserId !== user.id) {
        // Update existing assignment
        await db.update(dealToUserAssignments)
          .set({ closeUserId: user.id })
          .where(eq(dealToUserAssignments.id, existingAssignments[0].id));
        junctionAssignmentsUpdated++;
      }
    }
    
    log('\nAssignment update complete!', 'success');
    log(`Updated ${directAssignmentsUpdated} direct assignments`, 'success');
    log(`Created ${junctionAssignmentsCreated} new junction table assignments`, 'success');
    log(`Updated ${junctionAssignmentsUpdated} existing junction table assignments`, 'success');
    
    // Show revenue distribution
    log('\nRevenue Distribution by User:', 'info');
    for (const [userName, data] of usersByRevenue.entries()) {
      log(`${userName}: ${data.deals} deals, $${data.revenue.toLocaleString()} revenue`, 'info');
    }
    
    return {
      directAssignmentsUpdated,
      junctionAssignmentsCreated,
      junctionAssignmentsUpdated,
      usersByRevenue
    };
  } catch (error) {
    log(`Error updating deal assignments: ${error.message}`, 'error');
    throw error;
  }
}

// Function to check current dashboard data
async function checkDashboardData() {
  try {
    log('\nChecking current dashboard data...');
    
    // Get current assignment distribution in our database
    const repDistribution = await db.select({
      firstName: closeUsers.first_name,
      lastName: closeUsers.last_name,
      dealCount: db.sql`count(${dealToUserAssignments.id})`,
      totalValue: db.sql`sum(cast(${deals.value} as numeric))`,
      totalCashCollected: db.sql`sum(cast(${deals.cashCollected} as numeric))`
    })
    .from(dealToUserAssignments)
    .innerJoin(deals, eq(deals.id, dealToUserAssignments.dealId))
    .innerJoin(closeUsers, eq(closeUsers.id, dealToUserAssignments.closeUserId))
    .where(and(
      eq(dealToUserAssignments.assignmentType, 'primary'),
      deals.closeDate >= new Date('2025-04-01'),
      deals.closeDate <= new Date('2025-04-30'),
      eq(deals.status, 'won')
    ))
    .groupBy(closeUsers.first_name, closeUsers.last_name);
    
    log('\nCurrent deal distribution for April 2025:', 'info');
    let totalCashCollected = 0;
    
    for (const rep of repDistribution) {
      log(`${rep.firstName} ${rep.lastName}: ${rep.dealCount} deals, $${rep.totalValue?.toLocaleString() || 0} value, $${rep.totalCashCollected?.toLocaleString() || 0} cash collected`, 'info');
      totalCashCollected += Number(rep.totalCashCollected || 0);
    }
    
    log(`\nTotal Cash Collected: $${totalCashCollected.toLocaleString()}`, 'success');
    
    return {
      repDistribution,
      totalCashCollected
    };
  } catch (error) {
    log(`Error checking dashboard data: ${error.message}`, 'error');
    throw error;
  }
}

// Main function
async function main() {
  try {
    log('Starting Close API deal ownership update...', 'info');
    
    // Check current state
    await checkDashboardData();
    
    // Fetch deals from Close
    const closeDeals = await fetchDealsFromClose();
    
    // Update our database
    await updateDealUserAssignments(closeDeals);
    
    // Check updated state
    await checkDashboardData();
    
    log('\nAll deal ownership updates completed successfully', 'success');
  } catch (error) {
    log(`Failed to complete deal ownership update: ${error.message}`, 'error');
  }
}

// Run the script
main().then(() => {
  log('Script completed', 'success');
  process.exit(0);
}).catch(error => {
  log(`Script failed: ${error.message}`, 'error');
  process.exit(1);
});