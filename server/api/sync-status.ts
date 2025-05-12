/**
 * This module provides sync status tracking functionality for the comprehensive data sync
 */

// Status tracking object with initial values
let syncStatus = {
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
  currentPhase: 'idle', // idle, close, calendly, typeform, attribution, metrics, completed
  error: null as string | null
};

/**
 * Initialize the sync status for a new sync cycle
 */
export function initializeSyncStatus() {
  syncStatus = {
    inProgress: true,
    startTime: Date.now(),
    endTime: null,
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
    currentPhase: 'close',
    error: null
  };
  
  return syncStatus;
}

/**
 * Update Close CRM sync status
 */
export function updateCloseStatus(update: Partial<typeof syncStatus.close>) {
  syncStatus.close = { ...syncStatus.close, ...update };
  
  if (syncStatus.close.totalLeads > 0) {
    syncStatus.close.percentComplete = Math.round((syncStatus.close.processedLeads / syncStatus.close.totalLeads) * 100);
  }
  
  updateOverallProgress();
  return syncStatus;
}

/**
 * Update Calendly sync status
 */
export function updateCalendlyStatus(update: Partial<typeof syncStatus.calendly>) {
  syncStatus.calendly = { ...syncStatus.calendly, ...update };
  
  if (syncStatus.calendly.totalEvents > 0) {
    syncStatus.calendly.percentComplete = Math.round((syncStatus.calendly.processedEvents / syncStatus.calendly.totalEvents) * 100);
  }
  
  updateOverallProgress();
  return syncStatus;
}

/**
 * Update Typeform sync status
 */
export function updateTypeformStatus(update: Partial<typeof syncStatus.typeform>) {
  syncStatus.typeform = { ...syncStatus.typeform, ...update };
  
  if (syncStatus.typeform.totalResponses > 0) {
    syncStatus.typeform.percentComplete = Math.round((syncStatus.typeform.processedResponses / syncStatus.typeform.totalResponses) * 100);
  }
  
  updateOverallProgress();
  return syncStatus;
}

/**
 * Set the current phase of sync process
 */
export function setCurrentPhase(phase: typeof syncStatus.currentPhase) {
  syncStatus.currentPhase = phase;
  
  // Update overall progress based on phase
  switch (phase) {
    case 'idle':
      syncStatus.overallProgress = 0;
      break;
    case 'close':
      syncStatus.overallProgress = Math.min(25, syncStatus.close.percentComplete / 4);
      break;
    case 'calendly':
      syncStatus.overallProgress = 25 + Math.min(25, syncStatus.calendly.percentComplete / 4);
      break;
    case 'typeform':
      syncStatus.overallProgress = 50 + Math.min(25, syncStatus.typeform.percentComplete / 4);
      break;
    case 'attribution':
      syncStatus.overallProgress = 75;
      break;
    case 'metrics':
      syncStatus.overallProgress = 90;
      break;
    case 'completed':
      syncStatus.overallProgress = 100;
      syncStatus.inProgress = false;
      syncStatus.endTime = Date.now();
      break;
  }
  
  return syncStatus;
}

/**
 * Set total contact count after sync
 */
export function setTotalContacts(count: number) {
  syncStatus.totalContactsAfterSync = count;
  return syncStatus;
}

/**
 * Set error state
 */
export function setSyncError(error: string) {
  syncStatus.error = error;
  syncStatus.inProgress = false;
  syncStatus.endTime = Date.now();
  return syncStatus;
}

/**
 * Calculate overall progress based on components
 */
function updateOverallProgress() {
  if (syncStatus.currentPhase === 'close') {
    syncStatus.overallProgress = Math.min(25, syncStatus.close.percentComplete / 4);
  } else if (syncStatus.currentPhase === 'calendly') {
    syncStatus.overallProgress = 25 + Math.min(25, syncStatus.calendly.percentComplete / 4);
  } else if (syncStatus.currentPhase === 'typeform') {
    syncStatus.overallProgress = 50 + Math.min(25, syncStatus.typeform.percentComplete / 4);
  }
}

/**
 * Get current sync status
 */
export function getSyncStatus() {
  return { ...syncStatus };
}

export default {
  initializeSyncStatus,
  updateCloseStatus,
  updateCalendlyStatus,
  updateTypeformStatus,
  setCurrentPhase,
  setTotalContacts,
  setSyncError,
  getSyncStatus
};