/**
 * Mock Health Data Provider
 * 
 * This module provides mock health data when the real data is not available
 * to ensure the health dashboard always has something to display.
 */

// Generate a realistic-looking ID
function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 10)}`;
}

// Get current date string
function getNow(): string {
  return new Date().toISOString();
}

// Generate mock health metrics for the database
export function generateHealthMetrics() {
  return [
    {
      id: generateId('metric'),
      name: 'Contact Completeness',
      value: 87,
      status: 'healthy',
      lastChecked: getNow(),
      target: 80,
      description: 'Percentage of contacts with complete required fields'
    },
    {
      id: generateId('metric'),
      name: 'Deal Attribution',
      value: 92,
      status: 'healthy',
      lastChecked: getNow(),
      target: 90,
      description: 'Percentage of deals with proper attribution to users'
    },
    {
      id: generateId('metric'),
      name: 'Source Integrity',
      value: 95,
      status: 'healthy',
      lastChecked: getNow(),
      target: 95,
      description: 'Data consistency across integrated sources'
    },
    {
      id: generateId('metric'),
      name: 'Meeting Linkage',
      value: 78,
      status: 'warning',
      lastChecked: getNow(),
      target: 85,
      description: 'Percentage of meetings successfully linked to contacts'
    }
  ];
}

// Generate mock data source information
export function generateDataSources() {
  return [
    {
      id: generateId('src'),
      name: 'Close CRM',
      status: 'healthy',
      lastSync: getNow(),
      recordCount: 5425,
      integrity: 95,
      syncFrequency: 'Every 15 minutes'
    },
    {
      id: generateId('src'),
      name: 'Calendly',
      status: 'healthy',
      lastSync: getNow(),
      recordCount: 3250,
      integrity: 89,
      syncFrequency: 'Every 30 minutes'
    },
    {
      id: generateId('src'),
      name: 'Typeform',
      status: 'healthy',
      lastSync: getNow(),
      recordCount: 2876,
      integrity: 92,
      syncFrequency: 'Every hour'
    }
  ];
}

// Generate mock field mappings
export function generateFieldMappings() {
  return [
    {
      id: generateId('map'),
      sourceField: 'name',
      destinationField: 'full_name',
      dataType: 'string',
      coverage: 100,
      status: 'active'
    },
    {
      id: generateId('map'),
      sourceField: 'email',
      destinationField: 'email_address',
      dataType: 'string',
      coverage: 100,
      status: 'active'
    },
    {
      id: generateId('map'),
      sourceField: 'phone',
      destinationField: 'phone_number',
      dataType: 'string',
      coverage: 87,
      status: 'active'
    },
    {
      id: generateId('map'),
      sourceField: 'company',
      destinationField: 'organization',
      dataType: 'string',
      coverage: 78,
      status: 'active'
    },
    {
      id: generateId('map'),
      sourceField: 'title',
      destinationField: 'job_title',
      dataType: 'string',
      coverage: 65,
      status: 'active'
    }
  ];
}

// Generate mock validation rules
export function generateValidationRules() {
  return [
    {
      id: generateId('rule'),
      name: 'Email Format',
      description: 'Validates email addresses match standard format',
      status: 'active',
      coverage: 100
    },
    {
      id: generateId('rule'),
      name: 'Phone Format',
      description: 'Validates phone numbers match E.164 format',
      status: 'active',
      coverage: 85
    },
    {
      id: generateId('rule'),
      name: 'Required Fields',
      description: 'Checks that all required fields are populated',
      status: 'active',
      coverage: 92
    }
  ];
}

// Generate mock validation errors
export function generateValidationErrors() {
  return [
    {
      id: generateId('err'),
      entityType: 'contact',
      entityId: generateId('cont'),
      field: 'email',
      error: 'Invalid email format',
      severity: 'medium',
      timestamp: getNow()
    },
    {
      id: generateId('err'),
      entityType: 'deal',
      entityId: generateId('deal'),
      field: 'close_date',
      error: 'Date cannot be in the past',
      severity: 'high',
      timestamp: getNow()
    },
    {
      id: generateId('err'),
      entityType: 'contact',
      entityId: generateId('cont'),
      field: 'phone',
      error: 'Invalid phone number format',
      severity: 'low',
      timestamp: getNow()
    }
  ];
}

// Generate mock sync history
export function generateSyncHistory() {
  return [
    {
      id: generateId('sync'),
      source: 'Close CRM',
      timestamp: getNow(),
      recordsProcessed: 1245,
      duration: 8500,
      status: 'success'
    },
    {
      id: generateId('sync'),
      source: 'Calendly',
      timestamp: getNow(),
      recordsProcessed: 325,
      duration: 4200,
      status: 'success'
    },
    {
      id: generateId('sync'),
      source: 'Typeform',
      timestamp: getNow(),
      recordsProcessed: 178,
      duration: 3100,
      status: 'success'
    }
  ];
}

// Generate complete mock health data
export function generateCompleteHealthData() {
  return {
    success: true,
    healthMetrics: generateHealthMetrics(),
    dataSources: generateDataSources(),
    validationRules: generateValidationRules(),
    entityCounts: {
      deals: 1250,
      contacts: 5425,
      activities: 12500,
      meetings: 3250
    },
    fieldMappings: generateFieldMappings(),
    validationErrors: generateValidationErrors(),
    syncHistory: generateSyncHistory(),
    lastUpdated: getNow(),
    fieldMappingCompleteness: 86
  };
}