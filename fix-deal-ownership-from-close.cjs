/**
 * Fix Deal Ownership From Close CRM Data
 * 
 * This script properly aligns deal ownership in our database with Close CRM by:
 * 1. Fetching the actual ownership data from Close CRM API
 * 2. Updating our database to match Close CRM's ownership assignments
 * 3. Creating proper junction table associations for accurate revenue attribution
 */

const axios = require('axios');
const dotenv = require('dotenv');
const { connect } = require('@neondatabase/serverless');

// Load environment variables
dotenv.config();

// Terminal colors for better readability
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function log(message, type = 'info') {
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
  };
  console.log(`${colorMap[type] || ''}${message}${colors.reset}`);
}

function hr() {
  console.log("\n" + "-".repeat(80) + "\n");
}

/**
 * Initialize database connection
 */
async function connectToDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL not found in environment variables");
  }

  log("Connecting to database...", 'info');
  return connect(dbUrl);
}

/**
 * Fetch deal data from Close CRM API
 */
async function fetchDealsFromClose(dateStart, dateEnd) {
  try {
    // Get API key from environment variables
    const apiKey = process.env.CLOSE_API_KEY;
    if (!apiKey) {
      throw new Error("Close API key not found in environment variables");
    }
    
    log(`Fetching deal data from Close CRM for ${dateStart} to ${dateEnd}...`, 'info');
    
    // Use Close API to fetch deals in date range
    const dealsResponse = await axios.get('https://api.close.com/api/v1/opportunity', {
      auth: {
        username: apiKey,
        password: ''
      },
      params: {
        date_won__gte: dateStart,
        date_won__lte: dateEnd,
        status_type: 'won',
        _limit: 100
      }
    });
    
    if (dealsResponse.status !== 200) {
      throw new Error(`Close API returned status ${dealsResponse.status}`);
    }
    
    const deals = dealsResponse.data.data;
    log(`Successfully fetched ${deals.length} deals from Close CRM`, 'success');
    
    return deals;
  } catch (error) {
    log(`Error fetching deals from Close: ${error.message}`, 'error');
    if (error.response) {
      log(`Response status: ${error.response.status}`, 'error');
      log(`Response data: ${JSON.stringify(error.response.data)}`, 'error');
    }
    throw error;
  }
}

/**
 * Get deal ownership data for April 2025
 */
async function getAprilDealsOwnershipFromClose() {
  try {
    // For April 2025 deals
    const dateStart = '2025-04-01';
    const dateEnd = '2025-04-30'; 
    
    const closeDeals = await fetchDealsFromClose(dateStart, dateEnd);
    
    // Extract ownership information
    const dealOwnership = closeDeals.map(deal => ({
      closeId: deal.id,
      userId: deal.user_id,
      userName: deal.user_name,
      value: parseFloat(deal.value) || 0,
      status: deal.status_type,
      dateCreated: deal.date_created,
      dateWon: deal.date_won
    }));
    
    log(`Extracted ownership data for ${dealOwnership.length} deals`, 'success');
    return dealOwnership;
  } catch (error) {
    log(`Error getting deal ownership data: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Fix deal ownership in our database based on Close CRM data
 */
async function fixDealOwnershipFromClose() {
  log("Starting to fix deal ownership based on Close CRM data...", 'info');
  hr();
  
  try {
    // Step 1: Connect to database
    const sql = await connectToDatabase();
    
    // Step 2: Get Deal Ownership from Close CRM
    log("Step 1: Getting deal ownership data from Close CRM...", 'info');
    const dealOwnership = await getAprilDealsOwnershipFromClose();
    
    if (dealOwnership.length === 0) {
      log("No deals found in Close CRM for the specified date range", 'warning');
      return;
    }
    
    log(`Found ${dealOwnership.length} deals in Close CRM`, 'info');
    
    // Step 3: Match deals in our database with Close CRM data
    log("\nStep 2: Matching deals in our database with Close CRM data...", 'info');
    
    // Get all deals for April 2025 in our database
    const ourDeals = await sql`
      SELECT * FROM deals 
      WHERE close_date >= '2025-04-01' AND close_date <= '2025-04-30'
    `;
    
    log(`Found ${ourDeals.length} April 2025 deals in our database`, 'info');
    
    // Step 4: Update deal assignments based on Close CRM data
    log("\nStep 3: Updating deal assignments based on Close CRM data...", 'info');
    
    // Get all Close users
    const allUsers = await sql`SELECT * FROM close_users`;
    
    // Create a map for faster lookups
    const userMap = new Map();
    allUsers.forEach(user => {
      userMap.set(user.close_id, user);
    });
    
    // Track which deals are updated
    let dealsUpdated = 0;
    let assignmentsCreated = 0;
    let assignmentsUpdated = 0;
    
    for (const ourDeal of ourDeals) {
      // Find corresponding Close deal by ID if available, or match by other criteria
      const closeDeal = dealOwnership.find(d => 
        (ourDeal.close_id && d.closeId === ourDeal.close_id) || 
        (Math.abs(parseFloat(ourDeal.value) - d.value) < 0.01 && 
         new Date(ourDeal.close_date).toISOString().split('T')[0] === 
         new Date(d.dateWon || d.dateCreated).toISOString().split('T')[0])
      );
      
      if (closeDeal) {
        // Update the deal's assigned_to field
        if (closeDeal.userId && closeDeal.userId !== ourDeal.assigned_to) {
          await sql`
            UPDATE deals 
            SET assigned_to = ${closeDeal.userId} 
            WHERE id = ${ourDeal.id}
          `;
          dealsUpdated++;
        }
        
        // Find the internal user ID
        const user = userMap.get(closeDeal.userId);
        
        if (user) {
          // Check if a primary assignment already exists
          const existingAssignments = await sql`
            SELECT * FROM deal_to_user_assignments 
            WHERE deal_id = ${ourDeal.id} AND assignment_type = 'primary'
          `;
          
          if (existingAssignments.length === 0) {
            // Create a new primary assignment
            await sql`
              INSERT INTO deal_to_user_assignments 
              (deal_id, close_user_id, assignment_type, assignment_date) 
              VALUES (${ourDeal.id}, ${user.id}, 'primary', ${new Date()})
            `;
            assignmentsCreated++;
          } else if (existingAssignments[0].close_user_id !== user.id) {
            // Update existing assignment if user is different
            await sql`
              UPDATE deal_to_user_assignments 
              SET close_user_id = ${user.id} 
              WHERE id = ${existingAssignments[0].id}
            `;
            assignmentsUpdated++;
          }
        } else {
          log(`User not found in our database: ${closeDeal.userId} (${closeDeal.userName})`, 'warning');
        }
      } else {
        log(`No matching Close deal found for our deal ID ${ourDeal.id} (${ourDeal.title || 'Unnamed Deal'})`, 'warning');
      }
    }
    
    log(`Updated ${dealsUpdated} deal assignments in the deals table`, 'success');
    log(`Created ${assignmentsCreated} new primary assignments in the junction table`, 'success');
    log(`Updated ${assignmentsUpdated} existing junction table assignments`, 'success');
    
    // Step 5: Verify the distribution now matches Close CRM
    log("\nStep 4: Verifying deal distribution by rep...", 'info');
    
    const repDistribution = await sql`
      SELECT 
        cu.first_name, 
        cu.last_name, 
        COUNT(dua.id) as deal_count,
        SUM(CAST(d.value AS FLOAT)) as total_value,
        SUM(CAST(d.cash_collected AS FLOAT)) as total_cash_collected
      FROM deal_to_user_assignments dua
      INNER JOIN deals d ON d.id = dua.deal_id
      INNER JOIN close_users cu ON cu.id = dua.close_user_id
      WHERE 
        dua.assignment_type = 'primary' AND
        d.close_date >= '2025-04-01' AND 
        d.close_date <= '2025-04-30' AND
        d.status = 'won'
      GROUP BY cu.first_name, cu.last_name
    `;
    
    log("\nCurrent deal distribution for April 2025:", 'info');
    let totalCashCollected = 0;
    
    for (const rep of repDistribution) {
      log(`${rep.first_name} ${rep.last_name}: ${rep.deal_count} deals, $${parseFloat(rep.total_value).toLocaleString() || 0} value, $${parseFloat(rep.total_cash_collected).toLocaleString() || 0} cash collected`, 'info');
      totalCashCollected += parseFloat(rep.total_cash_collected || 0);
    }
    
    log(`\nTotal Cash Collected: $${totalCashCollected.toLocaleString()}`, 'success');
    
    // Step 6: Clear dashboard cache if available
    try {
      log("\nClearing dashboard cache...", 'info');
      await sql`DELETE FROM cache WHERE key LIKE 'dashboard%'`;
      log("Dashboard cache cleared successfully", 'success');
    } catch (error) {
      log(`Unable to clear dashboard cache: ${error.message}`, 'warning');
    }
    
    hr();
    log("Deal ownership fix completed successfully", 'success');
  } catch (error) {
    log(`Error fixing deal ownership: ${error.message}`, 'error');
    throw error;
  }
}

// Run the function
fixDealOwnershipFromClose()
  .then(() => {
    log("Script completed successfully", 'success');
    process.exit(0);
  })
  .catch(err => {
    log(`Script failed: ${err.message}`, 'error');
    process.exit(1);
  });