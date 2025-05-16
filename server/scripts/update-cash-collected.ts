/**
 * Update Cash Collected Fields
 * 
 * This script updates the cash_collected field for all deals in the database
 * by extracting information from the metadata. It handles various field formats
 * and ensures proper currency handling.
 */

import { db } from "../db";
import { deals } from "@shared/schema";
import { eq } from "drizzle-orm";

// Helper function to parse currency values
function parseCurrencyValue(value: string | null | undefined): string | null {
  if (!value) return null;
  
  // Convert to string if needed
  const valueStr = String(value).trim();
  
  // Remove all non-numeric characters except decimal point
  return valueStr.replace(/[^0-9.]/g, '');
}

// Function to extract cash collected from opportunity metadata
function extractCashCollected(metadata: any): string | null {
  // If no metadata, return null
  if (!metadata) return null;
  
  // Parse the metadata if it's a string
  const metadataObj = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
  
  // Try to find cash collected in various locations
  
  // 1. First check if we have explicit cash_collected in metadata
  if (metadataObj.cash_collected) {
    return parseCurrencyValue(metadataObj.cash_collected);
  }
  
  // 2. Check in opportunity_data - various possible field names
  if (metadataObj.opportunity_data) {
    const opportunity = metadataObj.opportunity_data;
    
    // Check for possible field names
    const possibleFields = [
      'cash_collected', 'cash_collection', 'collected_amount',
      'payment_received', 'payment_amount', 'paid_amount',
      'revenue_collected', 'actual_revenue', 'cash_value'
    ];
    
    for (const field of possibleFields) {
      if (opportunity[field]) {
        return parseCurrencyValue(opportunity[field]);
      }
    }
    
    // If nothing found and it's a won deal, use the value as fallback
    if (opportunity.status_type === 'won' && opportunity.value) {
      return parseCurrencyValue(opportunity.value);
    }
  }
  
  // If we get here, we couldn't find a cash collected value
  return null;
}

async function updateCashCollectedFields() {
  try {
    console.log('Starting cash collected field update...');
    
    // Get all deals
    const allDeals = await db.select().from(deals);
    console.log(`Found ${allDeals.length} deals to process`);
    
    let updatedCount = 0;
    
    // Process each deal
    for (const deal of allDeals) {
      try {
        // Extract cash collected from metadata
        const cashCollected = extractCashCollected(deal.metadata);
        
        // Skip if we found nothing or if it's already set
        if (!cashCollected && (!deal.cashCollected || deal.cashCollected === '0')) {
          continue;
        }
        
        // Update the record
        await db.update(deals)
          .set({ cashCollected: cashCollected })
          .where(eq(deals.id, deal.id));
        
        updatedCount++;
        
        if (updatedCount % 100 === 0) {
          console.log(`Updated ${updatedCount} deals so far...`);
        }
      } catch (err) {
        console.error(`Error processing deal ID ${deal.id}:`, err);
      }
    }
    
    console.log(`Completed! Updated cash_collected field for ${updatedCount} deals`);
  } catch (err) {
    console.error('Error updating cash collected fields:', err);
  }
}

// Run the function immediately
updateCashCollectedFields().then(() => {
  console.log('Script completed successfully');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

export { updateCashCollectedFields };