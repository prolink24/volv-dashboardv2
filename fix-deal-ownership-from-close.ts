/**
 * Fix Deal Ownership From Close CRM Data
 * 
 * This script properly aligns deal ownership in our database with Close CRM by:
 * 1. Fetching the actual ownership data from Close CRM API
 * 2. Updating our database to match Close CRM's ownership assignments
 * 3. Creating proper junction table associations for accurate revenue attribution
 */

import axios from 'axios';
import { db } from './server/db';
import { deals, dealToUserAssignments, closeUsers } from './shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
import * as dotenv from 'dotenv';

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

function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
  };
  console.log(`${colorMap[type]}${message}${colors.reset}`);
}

function hr(): void {
  console.log("\n" + "-".repeat(80) + "\n");
}

/**
 * Fetch deal data from Close CRM API
 */
async function fetchDealsFromClose(dateStart: string, dateEnd: string) {
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
        date_created__gte: new Date(dateStart).toISOString(),
        date_created__lte: new Date(dateEnd).toISOString(),
        _limit: 100
      }
    });
    
    if (dealsResponse.status !== 200) {
      throw new Error(`Close API returned status ${dealsResponse.status}`);
    }
    
    const deals = dealsResponse.data.data;
    log(`Successfully fetched ${deals.length} deals from Close CRM`, 'success');
    
    return deals;
  } catch (error: any) {
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
    const dealOwnership = closeDeals.map((deal: any) => ({
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
  } catch (error: any) {
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
    // Step 1: Get Deal Ownership from Close CRM
    log("Step 1: Getting deal ownership data from Close CRM...", 'info');
    const dealOwnership = await getAprilDealsOwnershipFromClose();
    
    if (dealOwnership.length === 0) {
      log("No deals found in Close CRM for the specified date range", 'warning');
      return;
    }
    
    log(`Found ${dealOwnership.length} deals in Close CRM`, 'info');
    
    // Step 2: Match deals in our database with Close CRM data
    log("\nStep 2: Matching deals in our database with Close CRM data...", 'info');
    
    // Get all deals for April 2025 in our database
    const ourDeals = await db.select()
      .from(deals)
      .where(and(
        deals.closeDate >= new Date('2025-04-01'),
        deals.closeDate <= new Date('2025-04-30')
      ));
    
    log(`Found ${ourDeals.length} April 2025 deals in our database`, 'info');
    
    // Step 3: Update deal assignments based on Close CRM data
    log("\nStep 3: Updating deal assignments based on Close CRM data...", 'info');
    
    // Get all Close users
    const allUsers = await db.select().from(closeUsers);
    
    // Create a map for faster lookups
    const userMap = new Map();
    allUsers.forEach(user => {
      userMap.set(user.closeId, user);
    });
    
    // Track which deals are updated
    let dealsUpdated = 0;
    let assignmentsCreated = 0;
    let assignmentsUpdated = 0;
    
    for (const ourDeal of ourDeals) {
      // Find corresponding Close deal by ID if available, or match by other criteria
      const closeDeal = dealOwnership.find(d => 
        (ourDeal.closeId && d.closeId === ourDeal.closeId) || 
        (Math.abs(parseFloat(ourDeal.value as string) - d.value) < 0.01 && 
         new Date(ourDeal.closeDate as Date).toISOString().split('T')[0] === 
         new Date(d.dateWon || d.dateCreated).toISOString().split('T')[0])
      );
      
      if (closeDeal) {
        // Update the deal's assigned_to field
        if (closeDeal.userId && closeDeal.userId !== ourDeal.assignedTo) {
          await db.update(deals)
            .set({ assignedTo: closeDeal.userId })
            .where(eq(deals.id, ourDeal.id));
          dealsUpdated++;
        }
        
        // Find the internal user ID
        const user = userMap.get(closeDeal.userId);
        
        if (user) {
          // Check if a primary assignment already exists
          const existingAssignments = await db.select()
            .from(dealToUserAssignments)
            .where(and(
              eq(dealToUserAssignments.dealId, ourDeal.id),
              eq(dealToUserAssignments.assignmentType, 'primary')
            ));
          
          if (existingAssignments.length === 0) {
            // Create a new primary assignment
            await db.insert(dealToUserAssignments)
              .values({
                dealId: ourDeal.id,
                closeUserId: user.id,
                assignmentType: 'primary',
                assignmentDate: new Date()
              });
            assignmentsCreated++;
          } else if (existingAssignments[0].closeUserId !== user.id) {
            // Update existing assignment if user is different
            await db.update(dealToUserAssignments)
              .set({ closeUserId: user.id })
              .where(eq(dealToUserAssignments.id, existingAssignments[0].id));
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
    log(`Updated ${assignmentsUpdated} existing assignments in the junction table`, 'success');
    
    // Step 4: Verify the distribution now matches Close CRM
    log("\nStep 4: Verifying deal distribution by rep...", 'info');
    
    const repDistribution = await db.select({
      firstName: closeUsers.first_name,
      lastName: closeUsers.last_name,
      dealCount: db.sql<number>`count(${dealToUserAssignments.id})`,
      totalValue: db.sql<number>`sum(cast(${deals.value} as numeric))`,
      totalCashCollected: db.sql<number>`sum(cast(${deals.cashCollected} as numeric))`
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
    
    log("\nCurrent deal distribution for April 2025:", 'info');
    let totalCashCollected = 0;
    
    for (const rep of repDistribution) {
      log(`${rep.firstName} ${rep.lastName}: ${rep.dealCount} deals, $${rep.totalValue?.toLocaleString() || 0} value, $${rep.totalCashCollected?.toLocaleString() || 0} cash collected`, 'info');
      totalCashCollected += Number(rep.totalCashCollected || 0);
    }
    
    log(`\nTotal Cash Collected: $${totalCashCollected.toLocaleString()}`, 'success');
    
    hr();
    log("Deal ownership fix completed successfully", 'success');
  } catch (error: any) {
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