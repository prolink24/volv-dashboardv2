/**
 * Field Coverage Report Service
 * 
 * This utility generates comprehensive reports on field coverage across
 * all platforms (Close CRM, Calendly) for each entity type (contacts, deals, activities, meetings).
 * It helps verify that all required fields are properly mapped and identify any gaps.
 */

import { db } from '../db';
import { contacts, deals, activities, meetings, users } from '@shared/schema';
import { sql, eq, and, or, not, isNull } from 'drizzle-orm';

// Required fields for each entity type
const REQUIRED_FIELDS = {
  contacts: [
    'name', 'email', 'company', 'leadSource', 'status', 'sourceId', 'sourceData'
  ],
  deals: [
    'contactId', 'title', 'status', 'value', 'closeId', 'metadata'
  ],
  activities: [
    'contactId', 'type', 'title', 'description', 'date', 'source', 'sourceId', 'metadata'
  ],
  meetings: [
    'contactId', 'title', 'startTime', 'endTime', 'calendlyEventId', 'metadata'
  ],
  users: [
    'closeId', 'email', 'first_name', 'last_name', 'role', 'status'
  ]
};

// Enhanced fields we want to track (not required but desired for better data quality)
const ENHANCED_FIELDS = {
  contacts: [
    'title', 'phone', 'secondaryEmail', 'secondaryPhone', 'address', 'city', 'state', 'zipcode', 
    'country', 'linkedInUrl', 'twitterHandle', 'lastActivityDate', 'assignedTo', 'notes'
  ],
  deals: [
    'assignedTo', 'cashCollected', 'contractedValue', 'valueCurrency', 'valuePeriod', 'closeDate'
  ],
  activities: [
    'assignedTo', 'completedBy', 'completedDate', 'dueDate', 'priority', 'status', 'duration', 'direction', 'outcome'
  ],
  meetings: [
    'assignedTo', 'duration', 'timezone', 'canceled', 'canceledAt', 'cancelReason', 'rescheduled',
    'eventType', 'locationType', 'locationUrl', 'locationAddress', 'hostName', 'hostEmail'
  ],
  users: [
    'sourceData', 'createdAt', 'updatedAt'
  ]
};

// Function to get field coverage statistics for a specific entity
export async function getFieldCoverageForEntity(entityType: 'contacts' | 'deals' | 'activities' | 'meetings' | 'users') {
  // Get the appropriate table for the entity type
  let table;
  switch (entityType) {
    case 'contacts':
      table = contacts;
      break;
    case 'deals':
      table = deals;
      break;
    case 'activities':
      table = activities;
      break;
    case 'meetings':
      table = meetings;
      break;
    case 'users':
      table = users;
      break;
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }

  // Get a sample of records to analyze (limit to 1000 for performance)
  const records = await db.select().from(table).limit(1000);
  
  if (records.length === 0) {
    return {
      totalRecords: 0,
      requiredFieldCoverage: {},
      enhancedFieldCoverage: {},
      totalRequiredCoverage: 0,
      totalEnhancedCoverage: 0,
      overallCoverage: 0
    };
  }

  // Calculate coverage for required fields
  const requiredFieldCoverage: Record<string, { count: number, percentage: number }> = {};
  const requiredFields = REQUIRED_FIELDS[entityType];
  
  for (const field of requiredFields) {
    const nonNullCount = records.filter(r => 
      r[field as keyof typeof r] !== null && 
      r[field as keyof typeof r] !== undefined && 
      r[field as keyof typeof r] !== ''
    ).length;
    
    requiredFieldCoverage[field] = {
      count: nonNullCount,
      percentage: Math.round((nonNullCount / records.length) * 100)
    };
  }

  // Calculate coverage for enhanced fields
  const enhancedFieldCoverage: Record<string, { count: number, percentage: number }> = {};
  const enhancedFields = ENHANCED_FIELDS[entityType];
  
  for (const field of enhancedFields) {
    const nonNullCount = records.filter(r => {
      const value = r[field as keyof typeof r];
      return value !== null && value !== undefined && value !== '';
    }).length;
    
    enhancedFieldCoverage[field] = {
      count: nonNullCount,
      percentage: Math.round((nonNullCount / records.length) * 100)
    };
  }

  // Calculate overall coverage percentages
  const totalRequiredValues = Object.values(requiredFieldCoverage).reduce((sum, field) => sum + field.count, 0);
  const totalRequiredFields = requiredFields.length * records.length;
  const totalRequiredCoverage = Math.round((totalRequiredValues / totalRequiredFields) * 100);
  
  const totalEnhancedValues = Object.values(enhancedFieldCoverage).reduce((sum, field) => sum + field.count, 0);
  const totalEnhancedFields = enhancedFields.length * records.length;
  const totalEnhancedCoverage = Math.round((totalEnhancedValues / totalEnhancedFields) * 100);
  
  // Calculate overall weighted coverage (70% required, 30% enhanced)
  const overallCoverage = Math.round((totalRequiredCoverage * 0.7) + (totalEnhancedCoverage * 0.3));

  return {
    totalRecords: records.length,
    requiredFieldCoverage,
    enhancedFieldCoverage,
    totalRequiredCoverage,
    totalEnhancedCoverage,
    overallCoverage
  };
}

// Function to get coverage statistics by source platform (Close CRM, Calendly)
export async function getFieldCoverageByPlatform(entityType: 'contacts' | 'deals' | 'activities' | 'meetings', platform: 'close' | 'calendly') {
  // Get the appropriate table for the entity type
  let table;
  let sourceField;
  
  switch (entityType) {
    case 'contacts':
      table = contacts;
      sourceField = 'leadSource';
      break;
    case 'deals':
      table = deals;
      // Deals only come from Close CRM
      if (platform !== 'close') return null;
      break;
    case 'activities':
      table = activities;
      sourceField = 'source';
      break;
    case 'meetings':
      table = meetings;
      // Meetings only come from Calendly
      if (platform !== 'calendly') return null;
      break;
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }

  // For entities with a source field, filter by platform
  let records;
  if (sourceField) {
    records = await db.select().from(table).where(eq(table[sourceField], platform)).limit(1000);
  } else {
    records = await db.select().from(table).limit(1000);
  }
  
  if (records.length === 0) {
    return {
      platform,
      totalRecords: 0,
      fieldCoverage: {}
    };
  }

  // Combine required and enhanced fields for this analysis
  const allFields = [...REQUIRED_FIELDS[entityType], ...ENHANCED_FIELDS[entityType]];
  
  // Calculate coverage for all fields
  const fieldCoverage: Record<string, { count: number, percentage: number }> = {};
  
  for (const field of allFields) {
    const nonNullCount = records.filter(r => 
      r[field as keyof typeof r] !== null && 
      r[field as keyof typeof r] !== undefined && 
      r[field as keyof typeof r] !== ''
    ).length;
    
    fieldCoverage[field] = {
      count: nonNullCount,
      percentage: Math.round((nonNullCount / records.length) * 100)
    };
  }

  return {
    platform,
    totalRecords: records.length,
    fieldCoverage
  };
}

// Function to generate a full coverage report
export async function generateFullCoverageReport() {
  const contactsCoverage = await getFieldCoverageForEntity('contacts');
  const dealsCoverage = await getFieldCoverageForEntity('deals');
  const activitiesCoverage = await getFieldCoverageForEntity('activities');
  const meetingsCoverage = await getFieldCoverageForEntity('meetings');
  const usersCoverage = await getFieldCoverageForEntity('users');
  
  // Get platform-specific reports
  const contactsClose = await getFieldCoverageByPlatform('contacts', 'close');
  const contactsCalendly = await getFieldCoverageByPlatform('contacts', 'calendly');
  const activitiesClose = await getFieldCoverageByPlatform('activities', 'close');
  const meetingsCalendly = await getFieldCoverageByPlatform('meetings', 'calendly');
  
  return {
    summary: {
      contacts: {
        totalRecords: contactsCoverage.totalRecords,
        requiredCoverage: contactsCoverage.totalRequiredCoverage,
        enhancedCoverage: contactsCoverage.totalEnhancedCoverage,
        overallCoverage: contactsCoverage.overallCoverage
      },
      deals: {
        totalRecords: dealsCoverage.totalRecords,
        requiredCoverage: dealsCoverage.totalRequiredCoverage,
        enhancedCoverage: dealsCoverage.totalEnhancedCoverage,
        overallCoverage: dealsCoverage.overallCoverage
      },
      activities: {
        totalRecords: activitiesCoverage.totalRecords,
        requiredCoverage: activitiesCoverage.totalRequiredCoverage,
        enhancedCoverage: activitiesCoverage.totalEnhancedCoverage,
        overallCoverage: activitiesCoverage.overallCoverage
      },
      meetings: {
        totalRecords: meetingsCoverage.totalRecords,
        requiredCoverage: meetingsCoverage.totalRequiredCoverage,
        enhancedCoverage: meetingsCoverage.totalEnhancedCoverage,
        overallCoverage: meetingsCoverage.overallCoverage
      },
      users: {
        totalRecords: usersCoverage.totalRecords,
        requiredCoverage: usersCoverage.totalRequiredCoverage,
        enhancedCoverage: usersCoverage.totalEnhancedCoverage,
        overallCoverage: usersCoverage.overallCoverage
      },
      // Overall weighted average across all entities (weighted by record count)
      overall: {
        totalRecords: 
          contactsCoverage.totalRecords + 
          dealsCoverage.totalRecords + 
          activitiesCoverage.totalRecords + 
          meetingsCoverage.totalRecords +
          usersCoverage.totalRecords,
        overallCoverage: calculateWeightedCoverage([
          { count: contactsCoverage.totalRecords, coverage: contactsCoverage.overallCoverage },
          { count: dealsCoverage.totalRecords, coverage: dealsCoverage.overallCoverage },
          { count: activitiesCoverage.totalRecords, coverage: activitiesCoverage.overallCoverage },
          { count: meetingsCoverage.totalRecords, coverage: meetingsCoverage.overallCoverage },
          { count: usersCoverage.totalRecords, coverage: usersCoverage.overallCoverage }
        ])
      }
    },
    detailed: {
      contacts: contactsCoverage,
      deals: dealsCoverage,
      activities: activitiesCoverage,
      meetings: meetingsCoverage,
      users: usersCoverage
    },
    byPlatform: {
      close: {
        contacts: contactsClose,
        activities: activitiesClose
      },
      calendly: {
        contacts: contactsCalendly,
        meetings: meetingsCalendly
      }
    }
  };
}

// Helper function to calculate weighted average coverage
function calculateWeightedCoverage(items: Array<{ count: number, coverage: number }>): number {
  const totalItems = items.reduce((sum, item) => sum + item.count, 0);
  if (totalItems === 0) return 0;
  
  const weightedSum = items.reduce((sum, item) => {
    return sum + (item.count * item.coverage);
  }, 0);
  
  return Math.round(weightedSum / totalItems);
}

// Export functions
export default {
  getFieldCoverageForEntity,
  getFieldCoverageByPlatform,
  generateFullCoverageReport
};