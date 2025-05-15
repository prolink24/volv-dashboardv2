/**
 * Sync Status Tracking Module
 * 
 * This module provides tracking and status reporting for sync operations
 * to help monitor progress and enable resume functionality.
 */

// Type definitions
type CalendlySyncStatus = {
  totalEvents: number;
  processedEvents: number;
  importedMeetings: number;
  errors: number;
  completed: boolean;
  inProgress: boolean;
  startTime: Date | null;
  endTime: Date | null;
  error: string | null;
  lastUpdated?: Date;
  syncState: {
    nextPageToken: string | null;
    batchNumber: number;
    hasMore: boolean;
  };
};

type PlatformStatus = {
  inProgress: boolean;
  completed: boolean;
  startTime: Date | null;
  endTime: Date | null;
  error: string | null;
};

type PlatformSyncStatus = {
  close: PlatformStatus;
  calendly: PlatformStatus;
  typeform: PlatformStatus;
};

// In-memory store for sync status
let calendlySyncStatus: CalendlySyncStatus = {
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

// General sync status for other platforms
const platformSyncStatus: PlatformSyncStatus = {
  close: {
    inProgress: false,
    completed: false,
    startTime: null,
    endTime: null,
    error: null
  },
  calendly: {
    inProgress: false,
    completed: false,
    startTime: null,
    endTime: null,
    error: null
  },
  typeform: {
    inProgress: false,
    completed: false,
    startTime: null,
    endTime: null,
    error: null
  }
};

// Status tracking functions
export function updateCalendlySyncStatus(status: Partial<CalendlySyncStatus>) {
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

/**
 * Start a sync for a specific platform
 * @param platform The platform to start syncing
 */
export function startSync(platform: 'close' | 'calendly' | 'typeform') {
  platformSyncStatus[platform] = {
    inProgress: true,
    completed: false,
    startTime: new Date(),
    endTime: null,
    error: null
  };
}

/**
 * Complete a sync for a specific platform
 * @param platform The platform that completed syncing
 */
export function completeSync(platform: 'close' | 'calendly' | 'typeform') {
  if (platformSyncStatus[platform]) {
    platformSyncStatus[platform].inProgress = false;
    platformSyncStatus[platform].completed = true;
    platformSyncStatus[platform].endTime = new Date();
  }
}

/**
 * Set an error for a specific platform sync
 * @param error The error message
 * @param platform Optional platform to set the error for, defaults to general sync error
 */
export function setSyncError(error: string, platform?: 'close' | 'calendly' | 'typeform') {
  if (platform && platformSyncStatus[platform]) {
    platformSyncStatus[platform].error = error;
    platformSyncStatus[platform].inProgress = false;
  }
}

/**
 * Get sync status for a specific platform or all platforms
 */
export function getSyncStatus(platform?: 'close' | 'calendly' | 'typeform') {
  if (platform) {
    return platformSyncStatus[platform];
  }
  return platformSyncStatus;
}

export default {
  updateCalendlySyncStatus,
  getCalendlySyncStatus,
  resetCalendlySyncStatus,
  getCalendlySyncProgress,
  getCalendlySyncSummary,
  startSync,
  completeSync,
  setSyncError,
  getSyncStatus
};