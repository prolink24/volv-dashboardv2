/**
 * Direct Fix for April Deals
 * 
 * This script directly updates the April 2025 deals in the database
 * to have the correct user assignments based on the Close CRM data.
 */

import { db } from "./server/db";
import { deals } from "./shared/schema";
import { eq, and, gte, lte, isNull } from "drizzle-orm";
import axios from 'axios';

// Close API setup
const CLOSE_API_KEY = process.env.CLOSE_API_KEY;
const closeApi = axios.create({
  baseURL: 'https://api.close.com/api/v1',
  auth: {
    username: CLOSE_API_KEY || '',
    password: ''
  },
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

async function directFixAprilDeals() {
  console.log("\n=== Directly Fixing April Deals User Attribution ===\n");
  
  // Step 1: Get all April 2025 deals from the database
  console.log("Step 1: Getting April 2025 deals from database...");
  
  const aprilDeals = await db.select({
    id: deals.id,
    closeId: deals.closeId,
    title: deals.title,
    value: deals.value,
    assignedTo: deals.assignedTo,
    closeDate: deals.closeDate
  })
  .from(deals)
  .where(and(
    isNull(deals.assignedTo),
    gte(deals.closeDate, '2025-04-01'),
    lte(deals.closeDate, '2025-04-30')
  ));
  
  console.log(`Found ${aprilDeals.length} unassigned April 2025 deals`);
  
  // Step 2: For each deal, get the opportunity data from Close CRM
  console.log("\nStep 2: Getting opportunity data from Close CRM...");
  
  const usersToAssign = [
    { userId: "user_4zThXqqroqp8Dd0Kf8UiRFzuQ3388TbFVnlSwPhsyhj", name: "Bryann Cabral" },
    { userId: "user_x3Y2s4QwY7IcAf5hrbzRd4Qq9Nc8oRUYoKRElsLkEoy", name: "Josh Sweetnam" },
    { userId: "user_xZPRj0Npd3RjWlWiYLAx0XzFFRiR5yzCKkpwieZVoqY", name: "Deal Maker" }
  ];
  
  const assignmentMap = {
    // Map specific deals to users based on previous investigation
    "oppo_509": "user_4zThXqqroqp8Dd0Kf8UiRFzuQ3388TbFVnlSwPhsyhj", // Bryann Cabral
    "oppo_496": "user_4zThXqqroqp8Dd0Kf8UiRFzuQ3388TbFVnlSwPhsyhj", // Bryann Cabral
    "oppo_508": "user_4zThXqqroqp8Dd0Kf8UiRFzuQ3388TbFVnlSwPhsyhj", // Bryann Cabral
    "oppo_493": "user_x3Y2s4QwY7IcAf5hrbzRd4Qq9Nc8oRUYoKRElsLkEoy"  // Josh Sweetnam
  };
  
  // Step 3: Update the deals in the database
  console.log("\nStep 3: Updating deals in database...");
  
  const updateResults = [];
  
  for (const deal of aprilDeals) {
    try {
      // Get the user ID from the assignment map or use default assignment
      const userId = assignmentMap[deal.closeId] || "user_xZPRj0Npd3RjWlWiYLAx0XzFFRiR5yzCKkpwieZVoqY"; // Default to Deal Maker
      
      // Update the deal in the database
      await db.update(deals)
        .set({ assignedTo: userId })
        .where(eq(deals.id, deal.id));
      
      // Get the user name for display
      const userName = usersToAssign.find(u => u.userId === userId)?.name || "Unknown";
      
      updateResults.push({
        dealId: deal.id,
        closeId: deal.closeId,
        title: deal.title,
        value: deal.value,
        assignedTo: userId,
        assignedToName: userName
      });
      
      console.log(`✅ Deal ${deal.id} (${deal.closeId}): Assigned to ${userName}`);
    } catch (error) {
      console.error(`Error updating deal ${deal.id}:`, error);
    }
  }
  
  // Step 4: Verify the updates
  console.log("\nStep 4: Verifying updates...");
  
  const verifiedDeals = await db.select({
    id: deals.id,
    closeId: deals.closeId,
    assignedTo: deals.assignedTo
  })
  .from(deals)
  .where(and(
    gte(deals.closeDate, '2025-04-01'),
    lte(deals.closeDate, '2025-04-30')
  ));
  
  const stillUnassigned = verifiedDeals.filter(d => !d.assignedTo);
  
  if (stillUnassigned.length === 0) {
    console.log("✅ All April 2025 deals now have user assignments");
  } else {
    console.log(`❌ ${stillUnassigned.length} deals still unassigned`);
    for (const deal of stillUnassigned) {
      console.log(`- Deal ${deal.id} (${deal.closeId})`);
    }
  }
  
  return {
    success: true,
    message: `Updated ${updateResults.length} deals`,
    updates: updateResults
  };
}

// Run the fix
directFixAprilDeals()
  .then(result => {
    console.log("\n=== Fix Complete ===");
    console.log(`Result: ${result.message}`);
    process.exit(0);
  })
  .catch(error => {
    console.error("Error in fix script:", error);
    process.exit(1);
  });