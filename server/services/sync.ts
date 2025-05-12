import closeApi from '../api/close';
import calendlyApi from '../api/calendly';
import typeformApi from '../api/typeform';
import attributionService from './attribution';
import { storage } from '../storage';

// Function to sync all data from external systems
export async function syncAllData() {
  try {
    console.log('Starting full data sync...');
    
    // Sync data from Close CRM
    console.log('Syncing data from Close CRM...');
    const closeResult = await closeApi.syncAllLeads();
    console.log(`Synced ${closeResult.count} leads from Close CRM`);
    
    // Sync data from Calendly
    console.log('Syncing data from Calendly...');
    const calendlyResult = await calendlyApi.syncAllEvents();
    console.log(`Synced ${calendlyResult.count} events from Calendly`);
    
    // Sync data from Typeform
    console.log('Syncing data from Typeform...');
    const typeformResult = await typeformApi.syncAllResponses();
    console.log(`Synced ${typeformResult.responsesCount} responses from ${typeformResult.formsCount} Typeform forms`);
    
    // Run attribution on all contacts
    console.log('Attributing all contacts...');
    const attributionResult = await attributionService.attributeAllContacts();
    console.log(`Attributed ${attributionResult.count} contacts`);
    
    // Calculate metrics from synced data
    console.log('Calculating metrics...');
    await calculateMetrics();
    
    return {
      success: true,
      close: closeResult,
      calendly: calendlyResult,
      typeform: typeformResult,
      attribution: attributionResult
    };
  } catch (error) {
    console.error('Error during full data sync:', error);
    throw error;
  }
}

// Calculate metrics from synced data
async function calculateMetrics() {
  try {
    // This would normally calculate metrics from the actual data
    // For this implementation, we'll use the sample data already in storage
    
    // Get current month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Check if metrics for current month already exist
    const existingMetrics = await storage.getMetrics(firstDayOfMonth);
    
    if (!existingMetrics) {
      // In a real implementation, we would calculate metrics from the actual data
      // For now, we'll create a placeholder metrics entry
      await storage.createMetrics({
        date: firstDayOfMonth,
        closedDeals: 4,
        cashCollected: 125500,
        revenueGenerated: 210000,
        totalCalls: 44,
        call1Taken: 30,
        call2Taken: 14,
        closingRate: 37.5,
        avgCashCollected: 80000,
        solutionCallShowRate: 71,
        earningPerCall2: 39970,
        metadata: {}
      });
    }
    
    // Would also calculate per-user metrics
    
    return { success: true };
  } catch (error) {
    console.error('Error calculating metrics:', error);
    throw error;
  }
}

// Schedule regular syncs (e.g., every hour)
export function scheduleRegularSync(intervalMinutes = 60) {
  console.log(`Scheduling regular data sync every ${intervalMinutes} minutes`);
  
  // Initial sync
  syncAllData().catch(console.error);
  
  // Schedule regular syncs
  setInterval(() => {
    syncAllData().catch(console.error);
  }, intervalMinutes * 60 * 1000);
}

export default {
  syncAllData,
  scheduleRegularSync
};
