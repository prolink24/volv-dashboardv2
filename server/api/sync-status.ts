/**
 * Sync Status Tracking Module
 * 
 * This module provides tracking and status reporting for sync operations
 * to help monitor progress and enable resume functionality.
 */

// In-memory store for sync status
let calendlySyncStatus = {
  totalEvents: 0,
  processedEvents: 0,
  importedMeetings: 0,
  errors: 0,
  completed: false,
  inProgress: false,
  startTime: null,
  endTime: null,
  error: null,
  syncState: {
    nextPageToken: null,
    batchNumber: 0,
    hasMore: true
  }
};

// Status tracking functions
export function updateCalendlySyncStatus(status) {
  calendlySyncStatus = {
    ...calendlySyncStatus,
    ...status,
    lastUpdated: new Date()
  };
  
  // Mark as in progress if not completed
  if (!status.completed) {
    calendlySyncStatus.inProgress = true;
  } else {
    calendlySyncStatus.inProgress = false;
    calendlySyncStatus.endTime = new Date();
  }
  
  // Set start time if not already set
  if (!calendlySyncStatus.startTime && calendlySyncStatus.inProgress) {
    calendlySyncStatus.startTime = new Date();
  }
}

export function getCalendlySyncStatus() {
  return {
    ...calendlySyncStatus,
    runningTime: calendlySyncStatus.startTime 
      ? Math.floor((new Date().getTime() - calendlySyncStatus.startTime.getTime()) / 1000) 
      : 0,
    canBeResumed: !calendlySyncStatus.completed && calendlySyncStatus.syncState?.nextPageToken !== null
  };
}

export function resetCalendlySyncStatus() {
  calendlySyncStatus = {
    totalEvents: 0,
    processedEvents: 0,
    importedMeetings: 0,
    errors: 0,
    completed: false,
    inProgress: false,
    startTime: null,
    endTime: null,
    error: null,
    syncState: {
      nextPageToken: null,
      batchNumber: 0,
      hasMore: true
    }
  };
}

// Progress calculation helpers
export function getCalendlySyncProgress() {
  if (calendlySyncStatus.totalEvents === 0) {
    return 0;
  }
  
  const progress = (calendlySyncStatus.processedEvents / calendlySyncStatus.totalEvents) * 100;
  return Math.min(Math.floor(progress), 100); // Cap at 100%
}

export function getCalendlySyncSummary() {
  const progress = getCalendlySyncProgress();
  const runningTime = calendlySyncStatus.startTime 
    ? Math.floor((
        (calendlySyncStatus.endTime || new Date()).getTime() - 
        calendlySyncStatus.startTime.getTime()
      ) / 1000) 
    : 0;
    
  return {
    progress,
    runningTime,
    eventsPerSecond: runningTime > 0 
      ? (calendlySyncStatus.processedEvents / runningTime).toFixed(2) 
      : 0,
    inProgress: calendlySyncStatus.inProgress,
    completed: calendlySyncStatus.completed,
    totalEvents: calendlySyncStatus.totalEvents,
    processedEvents: calendlySyncStatus.processedEvents,
    importedMeetings: calendlySyncStatus.importedMeetings,
    errors: calendlySyncStatus.errors,
    resumeToken: calendlySyncStatus.syncState?.nextPageToken,
    canBeResumed: !calendlySyncStatus.completed && calendlySyncStatus.syncState?.nextPageToken !== null
  };
}

export default {
  updateCalendlySyncStatus,
  getCalendlySyncStatus,
  resetCalendlySyncStatus,
  getCalendlySyncProgress,
  getCalendlySyncSummary
};