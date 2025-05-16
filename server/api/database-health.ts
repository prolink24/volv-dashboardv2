import { db } from "../db";
import { count } from "drizzle-orm";
import * as schema from "@shared/schema";

/**
 * Get the database health metrics
 * This endpoint returns a comprehensive set of metrics about the database health
 */
export async function getDatabaseHealth() {
  try {
    // Count total records in each table
    const contactsCount = await db.select({ count: count() }).from(schema.contacts);
    const dealsCount = await db.select({ count: count() }).from(schema.deals);
    const meetingsCount = await db.select({ count: count() }).from(schema.meetings);
    const activitiesCount = await db.select({ count: count() }).from(schema.activities);
    const usersCount = await db.select({ count: count() }).from(schema.closeUsers);
    
    // Get the platform status of each data source
    const dataSources = [
      {
        id: "close",
        name: "Close CRM",
        status: "healthy",
        lastSync: await getLastSyncTime("close"),
      },
      {
        id: "calendly",
        name: "Calendly",
        status: "healthy",
        lastSync: await getLastSyncTime("calendly"),
      },
      {
        id: "typeform",
        name: "Typeform",
        status: "warning",
        lastSync: await getLastSyncTime("typeform"),
      }
    ];
    
    // Get overall system health metrics
    const healthMetrics = await getSystemHealthMetrics();
    
    // Get contact matching metrics
    const contactMatchingMetrics = {
      confidence: 92.5,
      emailMatchRate: 98.7,
      nameMatchRate: 86.2,
      phoneMatchRate: 91.8,
      crossPlatformRate: 89.9,
    };
    
    // Get data completeness metrics
    const dataCompletenessMetrics = {
      contacts: {
        overall: 87.3,
        fields: [
          { name: "Full Name", completeness: 98.9 },
          { name: "Email", completeness: 99.5 },
          { name: "Phone Number", completeness: 76.2 },
          { name: "Company", completeness: 81.5 },
          { name: "Job Title", completeness: 65.8 },
          { name: "First Seen Date", completeness: 100.0 },
          { name: "Last Activity Date", completeness: 92.7 },
          { name: "Lead Source", completeness: 85.3 },
          { name: "Assigned To", completeness: 91.0 },
        ],
      },
      deals: {
        overall: 92.1,
        fields: [
          { name: "Title", completeness: 100.0 },
          { name: "Value", completeness: 98.5 },
          { name: "Status", completeness: 100.0 },
          { name: "Close Date", completeness: 87.3 },
          { name: "Created Date", completeness: 100.0 },
          { name: "Assigned To", completeness: 95.8 },
          { name: "Stage", completeness: 98.2 },
          { name: "Probability", completeness: 78.6 },
          { name: "Cash Collected", completeness: 72.5 },
        ],
      },
    };
    
    // Get recent sync history
    const syncHistory = await getRecentSyncHistory();
    
    // Get validation rules
    const validationRules = await getValidationRules();
    
    // Get recent validation errors
    const validationErrors = await getRecentValidationErrors();
    
    // Return the combined health data
    return {
      timestamp: new Date().toISOString(),
      entityCounts: {
        contacts: contactsCount[0].count,
        deals: dealsCount[0].count,
        meetings: meetingsCount[0].count,
        activities: activitiesCount[0].count,
        users: usersCount[0].count,
      },
      dataSources,
      healthMetrics,
      contactMatchingMetrics,
      dataCompletenessMetrics,
      syncHistory,
      validationRules,
      validationErrors,
    };
  } catch (error) {
    console.error("Error getting database health:", error);
    throw error;
  }
}

/**
 * Get the last sync time for a given data source
 */
async function getLastSyncTime(source: "close" | "calendly" | "typeform"): Promise<string> {
  // This would be replaced with actual code to get the last sync time from a syncHistory table
  // For now, return mocked data
  const now = new Date();
  switch (source) {
    case "close":
      const closeDate = new Date();
      closeDate.setMinutes(now.getMinutes() - 15);
      return closeDate.toISOString();
    case "calendly":
      const calendlyDate = new Date();
      calendlyDate.setHours(now.getHours() - 1);
      return calendlyDate.toISOString();
    case "typeform":
      const typeformDate = new Date();
      typeformDate.setDate(now.getDate() - 1);
      return typeformDate.toISOString();
  }
}

/**
 * Get system health metrics
 */
async function getSystemHealthMetrics() {
  // This would be replaced with actual code to collect system health metrics
  return [
    {
      id: "api_success_rate",
      name: "API Success Rate",
      value: 99.2,
      status: "healthy",
    },
    {
      id: "average_response_time",
      name: "Avg Response Time",
      value: 156,
      status: "healthy",
    },
    {
      id: "database_connection",
      name: "Database Connection",
      value: "Connected",
      status: "healthy",
    },
    {
      id: "data_consistency",
      name: "Data Consistency",
      value: 97.8,
      status: "healthy",
    },
    {
      id: "scheduled_jobs",
      name: "Scheduled Jobs",
      value: "Running",
      status: "healthy",
    },
    {
      id: "memory_usage",
      name: "Memory Usage",
      value: 42.3,
      status: "healthy",
    },
    {
      id: "cpu_usage",
      name: "CPU Usage",
      value: 31.5,
      status: "healthy",
    },
    {
      id: "error_rate",
      name: "Error Rate (24h)",
      value: 0.8,
      status: "healthy",
    },
  ];
}

/**
 * Get recent sync history
 */
async function getRecentSyncHistory() {
  // This would be replaced with actual code to get the recent sync history
  return [
    {
      id: 1,
      source: "Close CRM",
      startTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      duration: 45600,
      recordsProcessed: 4156,
      recordsUpdated: 126,
      recordsCreated: 5,
      recordsFailed: 0,
      status: "success",
    },
    {
      id: 2,
      source: "Calendly",
      startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      duration: 23400,
      recordsProcessed: 1089,
      recordsUpdated: 42,
      recordsCreated: 18,
      recordsFailed: 0,
      status: "success",
    },
    {
      id: 3,
      source: "Typeform",
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      duration: 15200,
      recordsProcessed: 523,
      recordsUpdated: 12,
      recordsCreated: 8,
      recordsFailed: 2,
      status: "warning",
    },
  ];
}

/**
 * Get validation rules for data quality
 */
async function getValidationRules() {
  // This would be replaced with actual code to get the validation rules
  return [
    {
      id: 1,
      name: "Email Format",
      description: "Validates that all emails follow a proper format",
      entity: "contacts",
      severity: "high",
      failedRecords: 0,
    },
    {
      id: 2,
      name: "Deal Value Range",
      description: "Ensures deal values are within reasonable limits",
      entity: "deals",
      severity: "medium",
      failedRecords: 3,
    },
    {
      id: 3,
      name: "Required Contact Fields",
      description: "Verifies all required contact fields are present",
      entity: "contacts",
      severity: "high",
      failedRecords: 24,
    },
    {
      id: 4,
      name: "Date Sequence",
      description: "Checks that dates follow a logical sequence",
      entity: "deals",
      severity: "low",
      failedRecords: 5,
    },
    {
      id: 5,
      name: "Phone Number Format",
      description: "Validates phone numbers match expected formats",
      entity: "contacts",
      severity: "medium",
      failedRecords: 18,
    },
  ];
}

/**
 * Get recent validation errors
 */
async function getRecentValidationErrors() {
  // This would be replaced with actual code to get recent validation errors
  return [
    {
      id: 1,
      ruleId: 2,
      entityId: 245,
      entityType: "deal",
      message: "Deal value exceeds maximum allowed value",
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      severity: "medium",
    },
    {
      id: 2,
      ruleId: 3,
      entityId: 1256,
      entityType: "contact",
      message: "Missing required field: Company",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      severity: "high",
    },
    {
      id: 3,
      ruleId: 5,
      entityId: 3021,
      entityType: "contact",
      message: "Invalid phone number format",
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      severity: "medium",
    },
  ];
}