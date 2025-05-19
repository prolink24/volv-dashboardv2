/**
 * Verify Rep Metrics Fix
 * 
 * This script verifies that the discrepancy between total revenue and rep metrics
 * has been resolved by testing the dashboard API response.
 */

import axios from 'axios';

async function verifyRepMetricsFix() {
  console.log("\n=== Verifying Rep Metrics Fix ===\n");
  
  // Define the date range for April 2025
  const dateRange = "2025-04-01_2025-04-30";
  
  console.log(`Testing dashboard API with date range: ${dateRange}`);
  
  try {
    // Make a request to the dashboard API
    const response = await axios.get(`http://localhost:5000/api/enhanced-dashboard?dateRange=${dateRange}`);
    
    if (!response.data) {
      console.log("Error: No data received from dashboard API");
      return;
    }
    
    // Extract relevant information
    const { kpis, salesTeam, usingEnhancedRevenueCalculation } = response.data;
    
    // Check if the dashboard is using the enhanced revenue calculation
    console.log(`Using enhanced revenue calculation: ${usingEnhancedRevenueCalculation ? "Yes" : "No"}`);
    
    // Calculate total revenue across all reps
    const totalRepRevenue = salesTeam.reduce((sum, rep) => sum + (rep.revenue || 0), 0);
    const totalRepCashCollected = salesTeam.reduce((sum, rep) => sum + (rep.cashCollected || 0), 0);
    
    // Compare with the KPI totals
    console.log("\nRevenue Metrics Comparison:");
    console.log(`- KPI Total Revenue: $${kpis.revenue?.toFixed(2) || "N/A"}`);
    console.log(`- Sum of Rep Revenue: $${totalRepRevenue.toFixed(2)}`);
    console.log(`- Difference: $${Math.abs((kpis.revenue || 0) - totalRepRevenue).toFixed(2)}`);
    
    console.log("\nCash Collected Metrics Comparison:");
    console.log(`- KPI Total Cash Collected: $${kpis.cashCollected?.toFixed(2) || "N/A"}`);
    console.log(`- Sum of Rep Cash Collected: $${totalRepCashCollected.toFixed(2)}`);
    console.log(`- Difference: $${Math.abs((kpis.cashCollected || 0) - totalRepCashCollected).toFixed(2)}`);
    
    // Show Morgan Clark's metrics specifically
    const morganClark = salesTeam.find(rep => rep.name === "Morgan Clark");
    if (morganClark) {
      console.log("\nMorgan Clark's Metrics:");
      console.log(`- Revenue: $${morganClark.revenue?.toFixed(2) || "0.00"}`);
      console.log(`- Cash Collected: $${morganClark.cashCollected?.toFixed(2) || "0.00"}`);
      console.log(`- Deals: ${morganClark.deals || 0}`);
    } else {
      console.log("\nMorgan Clark not found in sales team data");
    }
    
    // Check if the totals match (allowing for small differences due to floating point)
    const revenueMatches = Math.abs((kpis.revenue || 0) - totalRepRevenue) < 1;
    const cashCollectedMatches = Math.abs((kpis.cashCollected || 0) - totalRepCashCollected) < 1;
    
    if (revenueMatches && cashCollectedMatches) {
      console.log("\n✅ SUCCESS: Total metrics match rep-specific metrics!");
    } else {
      console.log("\n❌ ISSUE: Metrics still don't match completely.");
      
      if (!revenueMatches) {
        console.log("- Revenue metrics don't match");
      }
      
      if (!cashCollectedMatches) {
        console.log("- Cash collected metrics don't match");
      }
    }
    
  } catch (error) {
    console.error("Error querying dashboard API:", error.message);
  }
  
  console.log("\n=== Verification Complete ===");
}

// Run the verification
verifyRepMetricsFix()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Error executing verification:", error);
    process.exit(1);
  });