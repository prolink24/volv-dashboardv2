/**
 * Synchronization Service
 * 
 * This service coordinates the synchronization of data from all platforms
 * (Close CRM, Calendly, Typeform) and maintains the sync status.
 * It handles sequential execution, error handling, and reporting.
 */

import closeAPI from '../api/close';
import calendlyAPI from '../api/calendly';
import typeformAPI from '../api/typeform';
import * as syncStatus from '../api/sync-status';
import { storage } from '../storage';

// Cache schedule state
let syncIntervalId: NodeJS.Timeout | null = null;
let isInitialSyncCompleted = false;

/**
 * Start an automatic sync schedule
 * This will sync data periodically (every hour by default)
 * 
 * @param intervalMinutes Time between syncs in minutes (default: 60)
 */
export function startSyncSchedule(intervalMinutes = 60) {
  // Clear any existing schedule
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
  }
  
  // Convert minutes to milliseconds
  const intervalMs = intervalMinutes * 60 * 1000;
  
  console.log(`Scheduling regular data sync every ${intervalMinutes} minutes`);
  
  // Run the first sync immediately if we've never synced
  if (!isInitialSyncCompleted) {
    // We'll run initial sync async to not block startup
    setTimeout(() => {
      syncAll()
        .then(() => {
          isInitialSyncCompleted = true;
        })
        .catch(error => {
          console.error('Initial data sync failed:', error);
          // We'll try again on the next scheduled interval
        });
    }, 10000); // Small delay to ensure server is fully up
  }
  
  // Schedule regular syncs
  syncIntervalId = setInterval(() => {
    console.log('Running scheduled data sync...');
    syncAll()
      .then(() => {
        console.log('Scheduled data sync completed');
      })
      .catch(error => {
        console.error('Scheduled data sync failed:', error);
      });
  }, intervalMs);
  
  return { 
    success: true, 
    message: `Sync scheduled every ${intervalMinutes} minutes` 
  };
}

/**
 * Stop the automatic sync schedule
 */
export function stopSyncSchedule() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    return { success: true, message: 'Sync schedule stopped' };
  }
  
  return { success: false, message: 'No sync schedule was active' };
}

/**
 * Synchronize data from all platforms
 * This is the main entry point for data synchronization
 */
export async function syncAll() {
  let totalContacts = 0;
  
  try {
    // Sync Close CRM
    try {
      syncStatus.startSync('close');
      console.log('Starting Close CRM sync...');
      
      const closeSyncResult = await closeAPI.syncAllLeads();
      
      if (!closeSyncResult.success) {
        throw new Error(`Close CRM sync failed: ${closeSyncResult.error}`);
      }
      
      console.log(`Close CRM sync completed. Imported ${closeSyncResult.count} contacts`);
    } catch (error: any) {
      console.error('Close CRM sync error:', error);
      syncStatus.setSyncError(`Close CRM sync error: ${error.message}`);
      throw error;
    }
    
    // Sync Calendly
    try {
      syncStatus.startSync('calendly');
      console.log('Starting Calendly sync...');
      
      const calendlySyncResult = await calendlyAPI.syncAllEvents();
      
      if (!calendlySyncResult.success) {
        throw new Error(`Calendly sync failed: ${calendlySyncResult.error}`);
      }
      
      console.log(`Calendly sync completed. Imported ${calendlySyncResult.count} meetings`);
    } catch (error: any) {
      console.error('Calendly sync error:', error);
      syncStatus.setSyncError(`Calendly sync error: ${error.message}`);
      throw error;
    }
    
    // Sync Typeform
    try {
      syncStatus.startSync('typeform');
      console.log('Starting Typeform sync...');
      
      const typeformSyncResult = await typeformAPI.syncAllResponses();
      
      if (!typeformSyncResult.success) {
        throw new Error(`Typeform sync failed: ${typeformSyncResult.error}`);
      }
      
      console.log(`Typeform sync completed. Imported ${typeformSyncResult.syncedCount} form submissions`);
    } catch (error: any) {
      console.error('Typeform sync error:', error);
      syncStatus.setSyncError(`Typeform sync error: ${error.message}`);
      throw error;
    }
    
    // Get the total contacts count after sync
    const allContacts = await storage.getAllContacts();
    totalContacts = allContacts.length;
    
    // Mark sync as complete
    syncStatus.completeSync(totalContacts);
    
    return {
      success: true,
      message: 'Data sync completed successfully',
      totalContacts
    };
    
  } catch (error: any) {
    console.error('Data sync error:', error);
    
    return {
      success: false,
      error: error.message || 'Unknown sync error',
      totalContacts
    };
  }
}

/**
 * Synchronize only Close CRM data
 */
export async function syncCloseCRM() {
  try {
    syncStatus.startSync('close');
    console.log('Starting Close CRM sync...');
    
    const syncResult = await closeAPI.syncAllLeads();
    
    if (!syncResult.success) {
      syncStatus.setSyncError(syncResult.error || 'Unknown Close CRM sync error');
      return syncResult;
    }
    
    const allContacts = await storage.getAllContacts();
    syncStatus.completeSync(allContacts.length);
    
    return {
      ...syncResult,
      totalContacts: allContacts.length
    };
    
  } catch (error: any) {
    console.error('Close CRM sync error:', error);
    syncStatus.setSyncError(error.message || 'Unknown Close CRM sync error');
    
    return {
      success: false,
      error: error.message || 'Unknown Close CRM sync error'
    };
  }
}

/**
 * Synchronize only Calendly data
 */
export async function syncCalendly() {
  try {
    syncStatus.startSync('calendly');
    console.log('Starting Calendly sync...');
    
    const syncResult = await calendlyAPI.syncAllEvents();
    
    if (!syncResult.success) {
      syncStatus.setSyncError(syncResult.error || 'Unknown Calendly sync error');
      return syncResult;
    }
    
    const allContacts = await storage.getAllContacts();
    syncStatus.completeSync(allContacts.length);
    
    return {
      ...syncResult,
      totalContacts: allContacts.length
    };
    
  } catch (error: any) {
    console.error('Calendly sync error:', error);
    syncStatus.setSyncError(error.message || 'Unknown Calendly sync error');
    
    return {
      success: false,
      error: error.message || 'Unknown Calendly sync error'
    };
  }
}

/**
 * Synchronize only Typeform data
 */
export async function syncTypeform() {
  try {
    syncStatus.startSync('typeform');
    console.log('Starting Typeform sync...');
    
    const syncResult = await typeformAPI.syncAllResponses();
    
    if (!syncResult.success) {
      syncStatus.setSyncError(syncResult.error || 'Unknown Typeform sync error');
      return syncResult;
    }
    
    const allContacts = await storage.getAllContacts();
    syncStatus.completeSync(allContacts.length);
    
    return {
      ...syncResult,
      totalContacts: allContacts.length
    };
    
  } catch (error: any) {
    console.error('Typeform sync error:', error);
    syncStatus.setSyncError(error.message || 'Unknown Typeform sync error');
    
    return {
      success: false,
      error: error.message || 'Unknown Typeform sync error'
    };
  }
}

export default {
  syncAll,
  syncCloseCRM,
  syncCalendly,
  syncTypeform,
  startSyncSchedule,
  stopSyncSchedule
};