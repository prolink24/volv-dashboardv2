/**
 * Sync Status API
 * 
 * This module tracks the current status of data synchronization processes
 * across all integrations (Close CRM, Calendly, Typeform).
 */

// Global sync status object
const syncStatus = {
  inProgress: false,
  startTime: null as number | null,
  endTime: null as number | null,
  close: {
    totalLeads: 0,
    processedLeads: 0,
    importedContacts: 0,
    errors: 0,
    percentComplete: 0
  },
  calendly: {
    totalEvents: 0,
    processedEvents: 0,
    importedMeetings: 0,
    errors: 0,
    percentComplete: 0
  },
  typeform: {
    totalForms: 0,
    totalResponses: 0,
    processedResponses: 0,
    importedSubmissions: 0,
    errors: 0,
    percentComplete: 0
  },
  totalContactsAfterSync: 0,
  overallProgress: 0,
  currentPhase: 'idle' as 'idle' | 'close' | 'calendly' | 'typeform' | 'attribution' | 'metrics' | 'completed',
  error: null as string | null
};

// Start a sync process
export function startSync() {
  // Reset all values and mark sync as in progress
  syncStatus.inProgress = true;
  syncStatus.startTime = Date.now();
  syncStatus.endTime = null;
  syncStatus.close = {
    totalLeads: 0,
    processedLeads: 0,
    importedContacts: 0,
    errors: 0,
    percentComplete: 0
  };
  syncStatus.calendly = {
    totalEvents: 0,
    processedEvents: 0,
    importedMeetings: 0,
    errors: 0,
    percentComplete: 0
  };
  syncStatus.typeform = {
    totalForms: 0,
    totalResponses: 0,
    processedResponses: 0,
    importedSubmissions: 0,
    errors: 0,
    percentComplete: 0
  };
  syncStatus.totalContactsAfterSync = 0;
  syncStatus.overallProgress = 0;
  syncStatus.currentPhase = 'close';
  syncStatus.error = null;
  
  return syncStatus;
}

// Complete a sync process
export function completeSync(totalContacts: number, error?: string) {
  syncStatus.inProgress = false;
  syncStatus.endTime = Date.now();
  syncStatus.totalContactsAfterSync = totalContacts;
  syncStatus.currentPhase = error ? 'idle' : 'completed';
  syncStatus.overallProgress = error ? syncStatus.overallProgress : 100;
  syncStatus.error = error || null;
  
  return syncStatus;
}

// Update the status of Close CRM sync
export function updateCloseSyncStatus({
  totalLeads = 0,
  processedLeads = 0,
  importedContacts = 0,
  errors = 0
}) {
  syncStatus.close.totalLeads = totalLeads;
  syncStatus.close.processedLeads = processedLeads;
  syncStatus.close.importedContacts = importedContacts;
  syncStatus.close.errors = errors;
  
  // Calculate percentage complete
  syncStatus.close.percentComplete = totalLeads > 0
    ? Math.min(100, Math.round((processedLeads / totalLeads) * 100))
    : 0;
  
  // Update overall progress (Close is 40% of total sync)
  syncStatus.overallProgress = Math.min(40, Math.round(syncStatus.close.percentComplete * 0.4));
  
  return syncStatus;
}

// Update the status of Calendly sync
export function updateCalendlySyncStatus({
  totalEvents = 0,
  processedEvents = 0,
  importedMeetings = 0,
  errors = 0
}) {
  syncStatus.currentPhase = 'calendly';
  syncStatus.calendly.totalEvents = totalEvents;
  syncStatus.calendly.processedEvents = processedEvents;
  syncStatus.calendly.importedMeetings = importedMeetings;
  syncStatus.calendly.errors = errors;
  
  // Calculate percentage complete
  syncStatus.calendly.percentComplete = totalEvents > 0
    ? Math.min(100, Math.round((processedEvents / totalEvents) * 100))
    : 0;
  
  // Update overall progress (Calendly is 30% of total sync, after Close's 40%)
  syncStatus.overallProgress = 40 + Math.min(30, Math.round(syncStatus.calendly.percentComplete * 0.3));
  
  return syncStatus;
}

// Update the status of Typeform sync
export function updateTypeformSyncStatus({
  totalForms = 0,
  totalResponses = 0,
  processedResponses = 0,
  importedSubmissions = 0,
  errors = 0
}) {
  syncStatus.currentPhase = 'typeform';
  syncStatus.typeform.totalForms = totalForms;
  syncStatus.typeform.totalResponses = totalResponses;
  syncStatus.typeform.processedResponses = processedResponses;
  syncStatus.typeform.importedSubmissions = importedSubmissions;
  syncStatus.typeform.errors = errors;
  
  // Calculate percentage complete
  syncStatus.typeform.percentComplete = totalResponses > 0
    ? Math.min(100, Math.round((processedResponses / totalResponses) * 100))
    : 0;
  
  // Update overall progress (Typeform is 20% of total sync, after Close's 40% and Calendly's 30%)
  syncStatus.overallProgress = 70 + Math.min(20, Math.round(syncStatus.typeform.percentComplete * 0.2));
  
  return syncStatus;
}

// Update attribution phase status
export function updateAttributionStatus(percentComplete: number) {
  syncStatus.currentPhase = 'attribution';
  
  // Update overall progress (Attribution is 10% of total sync, after the other phases)
  syncStatus.overallProgress = 90 + Math.min(10, Math.round(percentComplete * 0.1));
  
  return syncStatus;
}

// Get current sync status
export function getSyncStatus() {
  return { ...syncStatus };
}