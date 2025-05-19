/**
 * Fix Deal Ownership
 * 
 * This script corrects the ownership of deals in our database by
 * using the actual owner information from Close CRM.
 */

import { db } from "./server/db";
import { deals } from "./shared/schema";
import { eq } from "drizzle-orm";

type DealCorrection = {
  id: number;
  closeId: string;
  correctUserId: string;
  correctUserName: string;
  value: number;
};

async function fixDealOwnership() {
  console.log("\n=== Fixing Deal Ownership Based on Close CRM Data ===\n");
  
  // Proper ownership data from Close CRM
  const corrections: DealCorrection[] = [
    {
      id: 493,
      closeId: "oppo_fGwnYkKGrgxXCcbwjpz8NWpuGqEGzC18YbqKKdyVKdI",
      correctUserId: "user_x3Y2s4QwY7IcAf5hrbzRd4Qq9Nc8oRUYoKRElsLkEoy",
      correctUserName: "Josh Sweetnam",
      value: 60000 // Capped value
    },
    {
      id: 496,
      closeId: "oppo_m4q9ERPtwRnlz8ha0M7F4y72wuPIyX31QXq3LIocpx7",
      correctUserId: "user_4zThXqqroqp8Dd0Kf8UiRFzuQ3388TbFVnlSwPhsyhj",
      correctUserName: "Bryann Cabral",
      value: 50000 // Capped value
    },
    {
      id: 508,
      closeId: "oppo_ST3d21s79LeDLpubrkgPrtZVvQ2wLZMijmadrUQyBxu",
      correctUserId: "user_4zThXqqroqp8Dd0Kf8UiRFzuQ3388TbFVnlSwPhsyhj",
      correctUserName: "Bryann Cabral",
      value: 50000 // Capped value
    },
    {
      id: 509,
      closeId: "oppo_B3IMlTm1371yT3eyYXLUYTGhtd7Bt2Dy6gCFUVolWj1",
      correctUserId: "user_4zThXqqroqp8Dd0Kf8UiRFzuQ3388TbFVnlSwPhsyhj",
      correctUserName: "Bryann Cabral",
      value: 50000 // Capped value
    },
    {
      id: 3376,
      closeId: "oppo_rzyrOiLLSuAOn9GbkahFa6QP9fxhYzQNKNY6V0j9hIe",
      correctUserId: "user_xZPRj0Npd3RjWlWiYLAx0XzFFRiR5yzCKkpwieZVoqY",
      correctUserName: "Deal Maker",
      value: 0 // This deal has no value
    }
  ];
  
  // Show the current state
  console.log("Current deal ownership in our database:");
  for (const correction of corrections) {
    const currentDeal = await db.select({
      id: deals.id,
      value: deals.value,
      assignedTo: deals.assignedTo
    })
    .from(deals)
    .where(eq(deals.id, correction.id))
    .limit(1);
    
    if (currentDeal.length > 0) {
      console.log(`- Deal ${correction.id}: Value: $${currentDeal[0].value}, Assigned to: ${currentDeal[0].assignedTo || 'Unassigned'}`);
    } else {
      console.log(`- Deal ${correction.id}: Not found in database`);
    }
  }
  
  // Apply the corrections
  console.log("\nApplying corrections based on Close CRM data...");
  
  let successCount = 0;
  
  for (const correction of corrections) {
    try {
      await db.update(deals)
        .set({ 
          assignedTo: correction.correctUserId,
          // We keep the value as is since it's intentionally capped
        })
        .where(eq(deals.id, correction.id));
      
      console.log(`✓ Updated Deal ${correction.id} - Now assigned to ${correction.correctUserName} (${correction.correctUserId})`);
      successCount++;
    } catch (error) {
      console.error(`Error updating deal ${correction.id}:`, error.message);
    }
  }
  
  console.log(`\nSuccessfully updated ${successCount} of ${corrections.length} deals\n`);
  
  // Verify the updated state
  console.log("Updated deal ownership:");
  for (const correction of corrections) {
    const updatedDeal = await db.select({
      id: deals.id,
      value: deals.value,
      assignedTo: deals.assignedTo
    })
    .from(deals)
    .where(eq(deals.id, correction.id))
    .limit(1);
    
    if (updatedDeal.length > 0) {
      const isCorrect = updatedDeal[0].assignedTo === correction.correctUserId;
      console.log(`- Deal ${correction.id}: Value: $${updatedDeal[0].value}, Assigned to: ${updatedDeal[0].assignedTo || 'Unassigned'} ${isCorrect ? '✓' : '❌'}`);
    } else {
      console.log(`- Deal ${correction.id}: Not found in database`);
    }
  }
  
  console.log("\n=== Deal Ownership Correction Complete ===");
}

// Run the correction
fixDealOwnership()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch(error => {
    console.error("Error executing script:", error);
    process.exit(1);
  });