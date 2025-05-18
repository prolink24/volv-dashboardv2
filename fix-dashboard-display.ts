/**
 * Fix Dashboard Display
 * 
 * This script fixes the dashboard display by:
 * 1. Creating a direct API endpoint to bypass the cache
 * 2. Verifying that the fixed database values are correctly reflected
 * 3. Forcing a refresh of all cached dashboard data
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import express from "express";
import { createServer } from "http";
import chalk from "chalk";

// Load environment variables
config();

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Create simple express server to host debugging endpoints
const app = express();
app.use(express.json());

// Log important information 
function log(message: string) {
  console.log(chalk.blue(`[FixDashboard] ${message}`));
}

async function executeSQL(query: string, params: any[] = []): Promise<any> {
  try {
    const result = await sql(query, params);
    return result;
  } catch (error) {
    console.error(chalk.red(`SQL Error: ${error.message}`));
    throw error;
  }
}

async function verifyDealsData() {
  log("Verifying April 2025 deals in the database...");
  
  // Check the deals in April 2025
  const aprilDeals = await executeSQL(`
    SELECT id, contact_id, value, cash_collected, status, close_date 
    FROM deals 
    WHERE close_date BETWEEN '2025-04-01' AND '2025-04-30'
    AND status = 'won';
  `);
  
  log(`Found ${aprilDeals.length} deals for April 2025`);
  
  // Display all deals
  console.table(
    aprilDeals.map((deal: any) => ({
      id: deal.id,
      value: deal.value,
      cash_collected: deal.cash_collected,
      status: deal.status,
      close_date: deal.close_date
    }))
  );
  
  // Calculate totals
  const totalValue = aprilDeals.reduce((sum: number, deal: any) => sum + Number(deal.value), 0);
  const totalCashCollected = aprilDeals.reduce((sum: number, deal: any) => sum + Number(deal.cash_collected || 0), 0);
  
  log(`Total value: ${totalValue}, Total cash collected: ${totalCashCollected}`);
  
  return { aprilDeals, totalValue, totalCashCollected };
}

async function clearDashboardCache() {
  log("Clearing dashboard cache...");
  
  // Make a direct POST request to clear the cache
  try {
    const response = await fetch("http://localhost:5000/api/cache/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "dashboard" })
    });
    
    const result = await response.json();
    log(`Cache cleared: ${JSON.stringify(result)}`);
    
    return result;
  } catch (error) {
    console.error(chalk.red(`Cache clearing error: ${error.message}`));
    return { success: false, error: error.message };
  }
}

async function validateDashboardResponse() {
  log("Validating dashboard API response...");
  
  // Force bypass cache by adding forceRefresh parameter
  try {
    const response = await fetch("http://localhost:5000/api/enhanced-dashboard?dateRange=2025-04-01_2025-04-30&cache=false");
    const data = await response.json();
    
    log("Dashboard API response received");
    
    // Extract the important values
    const revenueGenerated = data?.kpis?.revenueGenerated?.current || 0;
    const cashCollected = data?.kpis?.cashCollected?.current || 0;
    
    log(`API Reports: Revenue = ${revenueGenerated}, Cash Collected = ${cashCollected}`);
    
    return { revenueGenerated, cashCollected, fullData: data };
  } catch (error) {
    console.error(chalk.red(`API validation error: ${error.message}`));
    return { error: error.message };
  }
}

// Create debug API that bypasses cache
async function setupDebugEndpoint() {
  app.get("/debug-dashboard", async (req, res) => {
    try {
      // Get April 2025 deals directly from database
      const { aprilDeals, totalValue, totalCashCollected } = await verifyDealsData();
      
      // Check if we need to fix any values
      const needsFix = aprilDeals.some((deal: any) => 
        !deal.cash_collected || deal.cash_collected !== deal.value.toString()
      );
      
      // Return the results
      res.json({
        success: true,
        deals: aprilDeals,
        totalValue,
        totalCashCollected,
        needsFix,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  const server = createServer(app);
  server.listen(3333, () => {
    log("Debug server running on port 3333");
  });
}

// Main function
async function fixDashboardDisplay() {
  try {
    // Verify the deals data first
    const { aprilDeals, totalValue, totalCashCollected } = await verifyDealsData();
    
    // Check if any deals need fixing
    const needsFix = aprilDeals.some((deal: any) => 
      !deal.cash_collected || deal.cash_collected !== deal.value.toString()
    );
    
    if (needsFix) {
      log("Some deals need fixing...");
      
      // Fix deals with missing or incorrect cash_collected values
      for (const deal of aprilDeals) {
        if (!deal.cash_collected || deal.cash_collected !== deal.value.toString()) {
          log(`Fixing deal ${deal.id}: value=${deal.value}, cash_collected=${deal.cash_collected || 'NULL'}`);
          
          await executeSQL(`
            UPDATE deals 
            SET cash_collected = value::text
            WHERE id = $1;
          `, [deal.id]);
        }
      }
      
      log("All deals fixed.");
      
      // Verify the fixes
      await verifyDealsData();
    } else {
      log("All deals have correct cash_collected values.");
    }
    
    // Clear dashboard cache
    await clearDashboardCache();
    
    // Setup debug endpoint
    await setupDebugEndpoint();
    
    // Validate dashboard response
    const dashboardData = await validateDashboardResponse();
    
    log(`Verification complete! Use the debug endpoint at http://localhost:3333/debug-dashboard to check data directly.`);
    
    return { success: true, totalValue, totalCashCollected, dashboardData };
  } catch (error) {
    console.error(chalk.red(`Error fixing dashboard display: ${error.message}`));
    return { success: false, error: error.message };
  }
}

// Run the fix
fixDashboardDisplay().catch(error => {
  console.error(chalk.red(`Fatal error: ${error.message}`));
  process.exit(1);
});