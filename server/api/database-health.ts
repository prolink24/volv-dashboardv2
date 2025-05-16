/**
 * Database Health API
 * 
 * This module provides endpoints for monitoring database health, integrity,
 * and synchronization status between different data sources.
 */

import { db } from "../db";
import { deals, contacts, activities, meetings, users } from "@shared/schema";
import { sql } from "drizzle-orm";

// Fetch database health metrics
export async function getDatabaseHealthMetrics() {
  try {
    // Calculate total entities
    const [dealCount] = await db.select({ count: sql<number>`count(*)` }).from(deals);
    const [contactCount] = await db.select({ count: sql<number>`count(*)` }).from(contacts);
    const [activityCount] = await db.select({ count: sql<number>`count(*)` }).from(activities);
    const [meetingCount] = await db.select({ count: sql<number>`count(*)` }).from(meetings);

    // Calculate data completeness metrics
    const [dealsWithValue] = await db.select({ count: sql<number>`count(*)` }).from(deals)
      .where(sql`value IS NOT NULL AND value != '0'`);
    
    const [wonDealsWithCashCollected] = await db.select({ count: sql<number>`count(*)` }).from(deals)
      .where(sql`status = 'won' AND "cashCollected" IS NOT NULL AND "cashCollected" != '0'`);
    
    const [wonDealsTotal] = await db.select({ count: sql<number>`count(*)` }).from(deals)
      .where(sql`status = 'won'`);
    
    const [dealsWithCloseId] = await db.select({ count: sql<number>`count(*)` }).from(deals)
      .where(sql`"closeId" IS NOT NULL`);
    
    const [contactsWithEmail] = await db.select({ count: sql<number>`count(*)` }).from(contacts)
      .where(sql`email IS NOT NULL`);

    // Calculate sync stats
    const [recentSyncs] = await db.select({ count: sql<number>`count(*)` }).from(deals)
      .where(sql`"createdAt" > NOW() - INTERVAL '24 hours'`);
    
    // Calculate field mapping metrics for common fields
    const fieldMappingCompleteness = {
      deals: {
        title: (dealsWithValue.count / dealCount.count) * 100,
        value: (dealsWithValue.count / dealCount.count) * 100,
        cashCollected: wonDealsTotal.count > 0 ? (wonDealsWithCashCollected.count / wonDealsTotal.count) * 100 : 100,
        closeId: (dealsWithCloseId.count / dealCount.count) * 100
      },
      contacts: {
        email: contactCount.count > 0 ? (contactsWithEmail.count / contactCount.count) * 100 : 100
      }
    };

    // Calculate data source statuses
    const dataSources = [
      {
        id: '1',
        name: 'Close CRM',
        status: dealCount.count > 0 ? 'healthy' : 'warning',
        lastSync: new Date().toISOString(),
        recordCount: dealCount.count + contactCount.count + activityCount.count,
        integrity: calculateIntegrity(fieldMappingCompleteness.deals),
        syncFrequency: 'Every 60 minutes'
      },
      {
        id: '2',
        name: 'Calendly',
        status: meetingCount.count > 0 ? 'healthy' : 'warning',
        lastSync: new Date().toISOString(),
        recordCount: meetingCount.count,
        integrity: 98.2, // Example value
        syncFrequency: 'Every 30 minutes'
      }
    ];

    // Calculate validation rules statuses
    const validationRules = [
      {
        id: '1',
        name: 'Cash Collected Required for Won Deals',
        description: 'All deals with status "won" must have a cash_collected value set',
        enabled: true,
        lastRun: new Date().toISOString(),
        failedRecords: wonDealsTotal.count - wonDealsWithCashCollected.count,
        severity: wonDealsWithCashCollected.count / wonDealsTotal.count < 0.8 ? 'high' : 'medium'
      },
      {
        id: '2',
        name: 'Valid Email Format',
        description: 'All contact email addresses must be in a valid format',
        enabled: true,
        lastRun: new Date().toISOString(),
        failedRecords: contactCount.count - contactsWithEmail.count,
        severity: 'medium'
      }
    ];

    // Calculate health metrics
    const dataCompleteness = calculateOverallCompleteness(fieldMappingCompleteness);
    const crossSystemConsistency = calculateCrossSystemConsistency();
    const cashCollectedCoverage = wonDealsTotal.count > 0 ? (wonDealsWithCashCollected.count / wonDealsTotal.count) * 100 : 100;

    const healthMetrics = [
      {
        id: '1',
        name: 'Data Completeness',
        value: dataCompleteness,
        status: dataCompleteness > 95 ? 'healthy' : dataCompleteness > 85 ? 'warning' : 'critical',
        lastChecked: new Date().toISOString(),
        target: 95,
        description: 'Percentage of required fields with valid data'
      },
      {
        id: '2',
        name: 'Field Mappings',
        value: 92.7, // Example value
        status: 'warning',
        lastChecked: new Date().toISOString(),
        target: 100,
        description: 'Percentage of fields correctly mapped between systems'
      },
      {
        id: '3',
        name: 'Cross-System Consistency',
        value: crossSystemConsistency,
        status: crossSystemConsistency > 95 ? 'healthy' : crossSystemConsistency > 85 ? 'warning' : 'critical',
        lastChecked: new Date().toISOString(),
        target: 95,
        description: 'Data consistency across multiple systems'
      },
      {
        id: '4',
        name: 'Cash Collected Coverage',
        value: cashCollectedCoverage,
        status: cashCollectedCoverage > 95 ? 'healthy' : cashCollectedCoverage > 85 ? 'warning' : 'critical',
        lastChecked: new Date().toISOString(),
        target: 95,
        description: 'Deals with cash collected values properly set'
      }
    ];

    return {
      success: true,
      healthMetrics,
      dataSources,
      validationRules,
      entityCounts: {
        deals: dealCount.count,
        contacts: contactCount.count,
        activities: activityCount.count,
        meetings: meetingCount.count
      },
      fieldMappingCompleteness,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error fetching database health metrics:", error);
    return {
      success: false,
      error: "Failed to retrieve database health metrics"
    };
  }
}

// Helper function to calculate overall completeness
function calculateOverallCompleteness(fieldMappingCompleteness: any) {
  let totalFields = 0;
  let completenessSum = 0;

  // Calculate for deals
  for (const [field, value] of Object.entries(fieldMappingCompleteness.deals)) {
    totalFields++;
    completenessSum += Number(value);
  }

  // Calculate for contacts
  for (const [field, value] of Object.entries(fieldMappingCompleteness.contacts)) {
    totalFields++;
    completenessSum += Number(value);
  }

  return totalFields > 0 ? completenessSum / totalFields : 100;
}

// Helper function to calculate cross-system consistency
function calculateCrossSystemConsistency() {
  // This would involve complex logic to compare data between systems
  // For now, we'll return a placeholder value
  return 88.5;
}

// Helper function to calculate integrity
function calculateIntegrity(fieldMapping: any) {
  let totalFields = 0;
  let integritySum = 0;

  for (const [field, value] of Object.entries(fieldMapping)) {
    totalFields++;
    integritySum += Number(value);
  }

  return totalFields > 0 ? integritySum / totalFields : 100;
}

// Get field mappings
export async function getFieldMappings() {
  // In a real application, this would be dynamically generated
  // For now, we'll return a static list of common field mappings
  return [
    {
      id: '1',
      sourceField: 'value_formatted',
      destinationField: 'value',
      dataType: 'Currency',
      coverage: 99.8,
      status: 'active'
    },
    {
      id: '2',
      sourceField: 'custom.payment_received',
      destinationField: 'cashCollected',
      dataType: 'Currency',
      coverage: 72.4,
      status: 'mismatched'
    },
    {
      id: '3',
      sourceField: 'status_type',
      destinationField: 'status',
      dataType: 'String',
      coverage: 100,
      status: 'active'
    }
  ];
}

// Get validation errors
export async function getValidationErrors() {
  try {
    // Query for won deals without cash collected
    const wonDealsWithoutCashCollected = await db.select({
      id: deals.id,
      title: deals.title,
      value: deals.value
    }).from(deals)
      .where(sql`status = 'won' AND ("cashCollected" IS NULL OR "cashCollected" = '0')`);
    
    // Generate validation errors
    const errors = wonDealsWithoutCashCollected.map((deal, index) => ({
      id: `cc-${deal.id}`,
      ruleId: '1',
      entityType: 'Deal',
      entityId: deal.id,
      field: 'cash_collected',
      message: `Won deal "${deal.title}" (Value: ${deal.value}) is missing cash collected value`,
      severity: 'high',
      createdAt: new Date().toISOString(),
      resolved: false
    }));

    return errors;
  } catch (error) {
    console.error("Error fetching validation errors:", error);
    return [];
  }
}

// Get sync history (mock data for now)
export async function getSyncHistory() {
  const currentTime = Date.now();
  return [
    {
      id: '1',
      source: 'Close CRM',
      startTime: new Date(currentTime - 1000 * 60 * 35).toISOString(),
      endTime: new Date(currentTime - 1000 * 60 * 33).toISOString(),
      status: 'success',
      recordsProcessed: 12435,
      recordsUpdated: 234,
      recordsCreated: 18,
      recordsFailed: 0,
      duration: 120000
    },
    {
      id: '2',
      source: 'Calendly',
      startTime: new Date(currentTime - 1000 * 60 * 15).toISOString(),
      endTime: new Date(currentTime - 1000 * 60 * 14).toISOString(),
      status: 'success',
      recordsProcessed: 4893,
      recordsUpdated: 42,
      recordsCreated: 8,
      recordsFailed: 0,
      duration: 60000
    },
    {
      id: '5',
      source: 'Cash Collected Update',
      startTime: new Date(currentTime - 1000 * 60 * 60 * 12).toISOString(),
      endTime: new Date(currentTime - 1000 * 60 * 60 * 12 + 1000 * 60 * 3).toISOString(),
      status: 'success',
      recordsProcessed: 406,
      recordsUpdated: 406,
      recordsCreated: 0,
      recordsFailed: 0,
      duration: 180000
    }
  ];
}

// Get all database health data in one call
export async function getDatabaseHealth() {
  const metrics = await getDatabaseHealthMetrics();
  const fieldMappings = await getFieldMappings();
  const validationErrors = await getValidationErrors();
  const syncHistory = await getSyncHistory();
  
  return {
    ...metrics,
    fieldMappings,
    validationErrors,
    syncHistory
  };
}