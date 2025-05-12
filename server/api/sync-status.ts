/**
 * Sync Status API
 * 
 * This module tracks the status of all sync operations across
 * Close CRM, Calendly, and Typeform. It maintains real-time
 * state about progress, errors, and completion for each platform.
 */

// Initial sync status
let syncStatus = {
  inProgress: false,
  startTime: null as string | null,
  endTime: null as string | null,
  currentPhase: null as string | null,
  error: null as string | null,
  overallProgress: 0,
  totalContactsAfterSync: 0,
  
  // Close CRM sync status
  close: {
    totalLeads: 0,
    processedLeads: 0,
    importedContacts: 0,
    errors: 0
  },
  
  // Calendly sync status
  calendly: {
    totalEvents: 0,
    processedEvents: 0,
    importedMeetings: 0,
    errors: 0
  },
  
  // Typeform sync status
  typeform: {
    totalForms: 0,
    totalResponses: 0,
    processedResponses: 0,
    importedSubmissions: 0,
    errors: 0
  }
};

/**
 * Start a sync operation
 * @param phase The current phase of sync (e.g., "close", "calendly", "typeform")
 */
export function startSync(phase: string) {
  syncStatus.inProgress = true;
  syncStatus.startTime = new Date().toISOString();
  syncStatus.endTime = null;
  syncStatus.currentPhase = phase;
  syncStatus.error = null;
  syncStatus.overallProgress = 0;
  
  // Reset counters for the specific phase
  if (phase === 'close') {
    syncStatus.close = {
      totalLeads: 0,
      processedLeads: 0,
      importedContacts: 0,
      errors: 0
    };
  } else if (phase === 'calendly') {
    syncStatus.calendly = {
      totalEvents: 0,
      processedEvents: 0,
      importedMeetings: 0,
      errors: 0
    };
  } else if (phase === 'typeform') {
    syncStatus.typeform = {
      totalForms: 0,
      totalResponses: 0,
      processedResponses: 0,
      importedSubmissions: 0,
      errors: 0
    };
  }
}

/**
 * Complete a sync operation
 * @param totalContacts The total number of contacts after sync
 */
export function completeSync(totalContacts: number) {
  syncStatus.inProgress = false;
  syncStatus.endTime = new Date().toISOString();
  syncStatus.overallProgress = 100;
  syncStatus.totalContactsAfterSync = totalContacts;
}

/**
 * Set error state for sync
 * @param error The error message
 */
export function setSyncError(error: string) {
  syncStatus.inProgress = false;
  syncStatus.endTime = new Date().toISOString();
  syncStatus.error = error;
}

/**
 * Update Close CRM sync status
 */
export function updateCloseSyncStatus(status: {
  totalLeads: number;
  processedLeads: number;
  importedContacts: number;
  errors: number;
}) {
  syncStatus.close = status;
  
  // Calculate progress percentage
  if (status.totalLeads > 0) {
    const progress = Math.min(
      Math.round((status.processedLeads / status.totalLeads) * 100),
      100
    );
    
    // Update overall progress (weighted by phase)
    if (syncStatus.currentPhase === 'close') {
      syncStatus.overallProgress = progress;
    }
  }
}

/**
 * Update Calendly sync status
 */
export function updateCalendlySyncStatus(status: {
  totalEvents: number;
  processedEvents: number;
  importedMeetings: number;
  errors: number;
}) {
  syncStatus.calendly = status;
  
  // Calculate progress percentage
  if (status.totalEvents > 0) {
    const progress = Math.min(
      Math.round((status.processedEvents / status.totalEvents) * 100),
      100
    );
    
    // Update overall progress (weighted by phase)
    if (syncStatus.currentPhase === 'calendly') {
      syncStatus.overallProgress = progress;
    }
  }
}

/**
 * Update Typeform sync status
 */
export function updateTypeformSyncStatus(status: {
  totalForms: number;
  totalResponses: number;
  processedResponses: number;
  importedSubmissions: number;
  errors: number;
}) {
  syncStatus.typeform = status;
  
  // Calculate progress percentage
  if (status.totalResponses > 0) {
    const progress = Math.min(
      Math.round((status.processedResponses / status.totalResponses) * 100),
      100
    );
    
    // Update overall progress (weighted by phase)
    if (syncStatus.currentPhase === 'typeform') {
      syncStatus.overallProgress = progress;
    }
  }
}

/**
 * Get the current sync status
 */
export function getSyncStatus() {
  return { ...syncStatus };
}

export default {
  startSync,
  completeSync,
  setSyncError,
  updateCloseSyncStatus,
  updateCalendlySyncStatus,
  updateTypeformSyncStatus,
  getSyncStatus
};