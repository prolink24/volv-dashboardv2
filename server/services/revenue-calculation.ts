import { db } from "../db";
import { deals, dealToUserAssignments, closeUsers } from "../../shared/schema";
import { and, gte, lte, isNotNull, sql, eq, or } from "drizzle-orm";

/**
 * Revenue calculation modes to ensure consistent application of date filters
 */
export enum RevenueCalculationMode {
  CREATED_DATE = 'created_date', // Based on when deals were created
  CLOSE_DATE = 'close_date',     // Based on when deals were closed/won
  UPDATED_DATE = 'updated_date', // Based on when deals were last updated
}

/**
 * Options for revenue calculations
 */
export interface RevenueCalculationOptions {
  startDate: Date;
  endDate: Date;
  userId?: string;
  calculationMode?: RevenueCalculationMode;
}

/**
 * Result from revenue calculation
 */
export interface RevenueResult {
  totalRevenue: number;
  totalCashCollected: number;
  totalDeals: number;
  avgDealValue: number;
  dealsByStatus: Record<string, number>;
}

/**
 * Parse a potentially unsafe currency value with validation
 */
export function parseCurrencyValue(value: any): number {
  if (value === null || value === undefined) return 0;
  
  try {
    // Convert to string for consistent handling
    const valueStr = String(value);
    
    // Skip extremely large or scientific notation values 
    if (valueStr.length > 20 || valueStr.includes('e') || valueStr.includes('E')) {
      console.warn(`[REVENUE] Skipping extreme value: ${valueStr}`);
      return 0;
    }
    
    // Parse safely
    const numValue = parseFloat(valueStr.replace(/[^0-9.-]/g, ''));
    
    // Apply safety limits
    if (!isFinite(numValue) || isNaN(numValue)) return 0;
    if (Math.abs(numValue) > 500000) {
      console.warn(`[REVENUE] Capping extreme value: ${numValue} to 500000`);
      return numValue > 0 ? 500000 : -500000;
    }
    
    return numValue;
  } catch (e) {
    console.error(`[REVENUE] Error parsing value: ${value}`, e);
    return 0;
  }
}

/**
 * Calculate revenue metrics for a specific date range with consistent filtering
 */
export async function calculateRevenue(options: RevenueCalculationOptions): Promise<RevenueResult> {
  const { startDate, endDate, userId, calculationMode = RevenueCalculationMode.CLOSE_DATE } = options;
  
  console.log(`[REVENUE] Calculating revenue from ${startDate.toISOString()} to ${endDate.toISOString()} using mode: ${calculationMode}`);
  
  // Define date filter based on the selected calculation mode
  const dateFilter = (() => {
    switch (calculationMode) {
      case RevenueCalculationMode.CREATED_DATE:
        return and(
          gte(deals.createdAt, sql`${startDate}`),
          lte(deals.createdAt, sql`${endDate}`)
        );
      case RevenueCalculationMode.CLOSE_DATE:
        return and(
          isNotNull(deals.closeDate),
          gte(deals.closeDate, sql`${startDate}`),
          lte(deals.closeDate, sql`${endDate}`)
        );
      case RevenueCalculationMode.UPDATED_DATE:
        // Fallback to created date since updatedAt is not in the schema
        console.log('[REVENUE] Warning: Using createdAt instead of updatedAt (not in schema)');
        return and(
          gte(deals.createdAt, sql`${startDate}`),
          lte(deals.createdAt, sql`${endDate}`)
        );
    }
  })();
  
  // Add user filter if needed
  let dealsInPeriod;
  if (userId) {
    // We need to check both direct assignments and the junction table
    // First, get user by Close ID if available
    const userInfo = await db.select()
      .from(closeUsers)
      .where(eq(closeUsers.closeId, userId))
      .limit(1);
    
    const userDbId = userInfo.length > 0 ? userInfo[0].id : null;
    
    // Get deals through junction table
    const junctionDeals = userDbId ? await db.select({
      id: deals.id,
      value: deals.value,
      cashCollected: deals.cashCollected,
      status: deals.status,
    })
    .from(deals)
    .innerJoin(
      dealToUserAssignments,
      and(
        eq(dealToUserAssignments.dealId, deals.id),
        eq(dealToUserAssignments.closeUserId, userDbId)
      )
    )
    .where(dateFilter) : [];
    
    // Get directly assigned deals
    const directDeals = await db.select({
      id: deals.id,
      value: deals.value,
      cashCollected: deals.cashCollected,
      status: deals.status,
    })
    .from(deals)
    .where(and(dateFilter, eq(deals.assignedTo, userId)));
    
    // Combine and deduplicate deals
    const combined = [...junctionDeals, ...directDeals];
    const seen = new Set();
    dealsInPeriod = combined.filter(deal => {
      if (seen.has(deal.id)) return false;
      seen.add(deal.id);
      return true;
    });
    
    console.log(`[REVENUE] Found ${junctionDeals.length} junction-assigned deals and ${directDeals.length} directly-assigned deals`);
  } else {
    // No user filter, get all deals in the period
    dealsInPeriod = await db.select({
      id: deals.id,
      value: deals.value,
      cashCollected: deals.cashCollected,
      status: deals.status,
    })
    .from(deals)
    .where(dateFilter);
  }
  
  console.log(`[REVENUE] Found ${dealsInPeriod.length} deals matching the criteria`);
  
  // Track deals by status
  const dealsByStatus: Record<string, number> = {};
  
  // Calculate revenue metrics with consistent validation
  let totalRevenue = 0;
  let totalCashCollected = 0;
  
  for (const deal of dealsInPeriod) {
    // Count deals by status
    dealsByStatus[deal.status] = (dealsByStatus[deal.status] || 0) + 1;
    
    // Parse and validate deal value
    const dealValue = parseCurrencyValue(deal.value);
    totalRevenue += dealValue;
    
    // Parse and validate cash collected (with fallback to deal value for won deals)
    let cashCollected = 0;
    if (deal.cashCollected) {
      cashCollected = parseCurrencyValue(deal.cashCollected);
      
      // Check for inflated values (100x value) and correct them
      if (deal.status === 'won' && cashCollected > dealValue * 10) {
        console.log(`[REVENUE] Correcting inflated cash_collected: ${cashCollected} -> ${dealValue}`);
        cashCollected = dealValue;
      }
    } else if (deal.status === 'won') {
      // If no cash_collected value but deal is won, use deal value
      cashCollected = dealValue;
    }
    
    totalCashCollected += cashCollected;
  }
  
  // Calculate average deal value
  const avgDealValue = dealsInPeriod.length > 0 
    ? Math.round(totalRevenue / dealsInPeriod.length) 
    : 0;
  
  return {
    totalRevenue,
    totalCashCollected,
    totalDeals: dealsInPeriod.length,
    avgDealValue,
    dealsByStatus
  };
}