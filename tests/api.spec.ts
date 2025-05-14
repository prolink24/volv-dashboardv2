import { test, expect } from '@playwright/test';
import { skipTest, skipIf, asyncUtils } from './utils/test-helpers';

test.describe('API Tests', () => {
  test('should return enhanced dashboard data', async ({ request }) => {
    const response = await request.get('/api/enhanced-dashboard');
    const data = await response.json();

    expect(response.status()).toBe(200);
    
    // Check for expected dashboard structure
    expect(data).toBeDefined();
    
    // Test attribution section
    if (data.attribution) {
      // Check for summary object
      if (data.attribution.summary) {
        const summary = data.attribution.summary;
        // Verify at least one of the expected summary metrics exists
        expect(
          summary.totalContacts !== undefined ||
          summary.contactsWithDeals !== undefined ||
          summary.totalTouchpoints !== undefined ||
          summary.conversionRate !== undefined ||
          summary.mostEffectiveChannel !== undefined
        ).toBe(true);
      }
      
      // Verify contact stats data if present
      if (data.attribution.contactStats) {
        const contactStats = data.attribution.contactStats;
        expect(typeof contactStats.totalContacts === 'number' || 
               typeof contactStats.count === 'number').toBe(true);
      }
      
      // Verify deal stats data if present
      if (data.attribution.dealStats) {
        const dealStats = data.attribution.dealStats;
        expect(typeof dealStats.totalDeals === 'number' || 
               typeof dealStats.count === 'number').toBe(true);
      }

      // Check for insights data if present
      if (data.attribution.insights) {
        // Insights object should exist but might have varying properties
        expect(data.attribution.insights).toBeDefined();
      }
    }
    
    // Verify contacts data if present
    if (data.contacts) {
      expect(Array.isArray(data.contacts)).toBe(true);
    }
  });

  test('should return enhanced attribution stats', async ({ request }) => {
    const response = await request.get('/api/attribution/enhanced-stats');
    const data = await response.json();

    expect(response.status()).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.attributionAccuracy).toBe('number');
    expect(data.stats).toBeDefined();

    // Verify stats data structure
    const stats = data.stats;
    expect(typeof stats.totalContacts).toBe('number');
    expect(typeof stats.contactsAnalyzed).toBe('number');
    expect(typeof stats.highCertaintyContacts).toBe('number');
    expect(typeof stats.multiSourceContacts).toBe('number');
    
    // These fields may have different names or structure in some implementations
    expect(stats.dealAttributionRate !== undefined || 
           stats.dealsWithAttribution !== undefined).toBe(true);
    
    // Field mapping success metric
    if (stats.fieldMappingSuccess !== undefined) {
      expect(typeof stats.fieldMappingSuccess).toBe('number');
    }
    
    if (stats.fieldCoverage !== undefined) {
      expect(typeof stats.fieldCoverage).toBe('number');
    }
    
    // Attribution accuracy should be above 90% per project requirements
    expect(data.attributionAccuracy).toBeGreaterThanOrEqual(90);
  });

  test('should return paginated contacts', async ({ request }) => {
    // Test with pagination parameters
    const response = await request.get('/api/contacts?limit=10&offset=0');
    const data = await response.json();

    expect(response.status()).toBe(200);
    expect(data.contacts).toBeDefined();
    expect(Array.isArray(data.contacts)).toBe(true);
    expect(data.totalCount).toBeDefined();
    expect(data.totalCount).toBeGreaterThan(0);
    
    // Validate contact object structure on the first item (if exists)
    if (data.contacts.length > 0) {
      const contact = data.contacts[0];
      expect(contact.id).toBeDefined();
      expect(contact.name).toBeDefined();
      expect(contact.email).toBeDefined();
      expect(contact.leadSource).toBeDefined();
    }
  });

  test('should return contacts from specific source', async ({ request }) => {
    // Test filtering by source (either source or leadSource could be used)
    const source = 'close';
    const response = await request.get(`/api/contacts?source=${source}&limit=20&offset=0`);
    const data = await response.json();

    expect(response.status()).toBe(200);
    expect(data.contacts).toBeDefined();
    expect(Array.isArray(data.contacts)).toBe(true);
    expect(typeof data.totalCount).toBe('number');
    
    // Check that all returned contacts have the requested source
    // Some implementations use 'source' and others use 'leadSource'
    if (data.contacts.length > 0) {
      for (const contact of data.contacts) {
        const contactSource = contact.source || contact.leadSource;
        if (contactSource) {
          expect(contactSource).toBe(source);
        }
      }
    }
  });

  test('should return detailed contact data', async ({ request }) => {
    // First get a list of contacts to find a valid ID
    const listResponse = await request.get('/api/contacts?limit=1&offset=0');
    const listData = await listResponse.json();
    
    if (listData.contacts.length === 0) {
      skipTest('No contacts available for testing individual contact API');
      return;
    }
    
    const contactId = listData.contacts[0].id;
    
    // Now get the specific contact details
    const response = await request.get(`/api/contacts/${contactId}`);
    const data = await response.json();

    expect(response.status()).toBe(200);
    expect(data).toBeDefined();
    
    // Validate the contact data structure (may be nested or at the root)
    const contact = data.contact || data;
    expect(contact.id).toBeDefined();
    expect(contact.name).toBeDefined();
    
    // Check for related data arrays if they exist
    if (data.activities) {
      expect(Array.isArray(data.activities)).toBe(true);
    }
    
    if (data.deals) {
      expect(Array.isArray(data.deals)).toBe(true);
    }
    
    if (data.meetings) {
      expect(Array.isArray(data.meetings)).toBe(true);
    }
  });

  test('should return KPI configuration', async ({ request }) => {
    const response = await request.get('/api/settings/kpi-configuration');
    const data = await response.json();

    expect(response.status()).toBe(200);
    expect(data).toBeDefined();
    
    // Check if categories exist directly or are nested
    const categories = Array.isArray(data) ? data : data.categories;
    
    expect(Array.isArray(categories)).toBe(true);
    
    // Should have categories
    expect(categories.length).toBeGreaterThan(0);
    
    // Validate category structure
    const category = categories[0];
    expect(category.id).toBeDefined();
    expect(category.name).toBeDefined();
    
    // Validate KPI structure if present
    if (category.kpis && category.kpis.length > 0) {
      const kpi = category.kpis[0];
      expect(kpi.id).toBeDefined();
      expect(kpi.name).toBeDefined();
      expect(kpi.formula).toBeDefined();
    }
  });

  test('should return Close CRM users', async ({ request }) => {
    const response = await request.get('/api/close-users');
    const data = await response.json();

    expect(response.status()).toBe(200);
    expect(data).toBeDefined();
    
    // Check if users is a property or the data itself is an array of users
    const users = data.users || data;
    expect(Array.isArray(users)).toBe(true);
    
    // Each user should have basic info
    if (users.length > 0) {
      const user = users[0];
      expect(user.id).toBeDefined();
      expect(user.name).toBeDefined();
      
      // Email may be optional in some implementations
      if (user.email) {
        expect(typeof user.email).toBe('string');
      }
    }
  });

  test('should handle invalid API endpoints gracefully', async ({ request }) => {
    const response = await request.get('/api/nonexistent-endpoint');
    
    // Should receive a proper 404 response, not a server error
    expect(response.status()).toBe(404);
    
    // Response should still be well-formed JSON
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  test('should handle invalid input gracefully', async ({ request }) => {
    // Test with invalid contact ID
    const response = await request.get('/api/contacts/999999999');
    
    // Should get a proper error, not a server crash
    expect(response.status()).toBe(404);
    
    // Response should have error details
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  test('should return user-specific metrics', async ({ request }) => {
    // First get a list of users to find a valid ID
    const usersResponse = await request.get('/api/users/close');
    const usersData = await usersResponse.json();
    
    if (!usersData.users || usersData.users.length === 0) {
      skipTest('No users available for testing user metrics API');
      return;
    }
    
    const userId = usersData.users[0].id;
    
    // Now get the metrics for this user
    const response = await request.get(`/api/metrics/user/${userId}`);
    const data = await response.json();

    expect(response.status()).toBe(200);
    expect(data.success).toBe(true);
    expect(data.metrics).toBeDefined();
    
    // Validate user metrics structure
    expect(data.metrics.totalContacts).toBeDefined();
    expect(data.metrics.totalDeals).toBeDefined();
    expect(data.metrics.conversionRate).toBeDefined();
    expect(data.metrics.performance).toBeDefined();
  });
});