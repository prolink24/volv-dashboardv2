import { test, expect } from '@playwright/test';
import { skipTest, skipIf, asyncUtils } from './utils/test-helpers';

test.describe('API Tests', () => {
  test('should return enhanced dashboard data', async ({ request }) => {
    const response = await request.get('/api/enhanced-dashboard');
    const data = await response.json();

    expect(response.status()).toBe(200);
    expect(data.success).toBe(true);
    
    // Check for expected dashboard sections
    expect(data.kpis).toBeDefined();
    expect(data.salesTeam).toBeDefined();
    expect(data.attribution).toBeDefined();
    
    // Verify attribution section contains expected data
    expect(data.attribution.summary).toBeDefined();
    expect(data.attribution.contactStats).toBeDefined();
    expect(data.attribution.dealStats).toBeDefined();
    
    // Verify KPI data
    expect(Array.isArray(data.kpis)).toBe(true);
    if (data.kpis.length > 0) {
      const kpi = data.kpis[0];
      expect(kpi.name).toBeDefined();
      expect(kpi.value).toBeDefined();
    }
    
    // Verify sales team data
    expect(Array.isArray(data.salesTeam)).toBe(true);
    if (data.salesTeam.length > 0) {
      const teamMember = data.salesTeam[0];
      expect(teamMember.name).toBeDefined();
      expect(teamMember.metrics).toBeDefined();
    }
  });

  test('should return enhanced attribution stats', async ({ request }) => {
    const response = await request.get('/api/attribution/enhanced-stats');
    const data = await response.json();

    expect(response.status()).toBe(200);
    expect(data.success).toBe(true);
    expect(data.attributionAccuracy).toBeDefined();
    expect(data.stats).toBeDefined();

    // Verify stats data structure
    expect(data.stats.totalContacts).toBeDefined();
    expect(data.stats.contactsAnalyzed).toBeDefined();
    expect(data.stats.highCertaintyContacts).toBeDefined();
    expect(data.stats.multiSourceContacts).toBeDefined();
    expect(data.stats.dealAttributionRate).toBeDefined();
    
    // Attribution accuracy should be above 90% per project requirements
    expect(data.attributionAccuracy).toBeGreaterThanOrEqual(90);
  });

  test('should return paginated contacts', async ({ request }) => {
    // Test with pagination parameters
    const response = await request.get('/api/contacts?page=1&limit=10');
    const data = await response.json();

    expect(response.status()).toBe(200);
    expect(data.success).toBe(true);
    expect(data.contacts).toBeDefined();
    expect(Array.isArray(data.contacts)).toBe(true);
    
    // Should include pagination metadata
    expect(data.pagination).toBeDefined();
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(10);
    expect(data.pagination.total).toBeDefined();
    expect(data.pagination.totalPages).toBeDefined();
    
    // Validate contact object structure on the first item (if exists)
    if (data.contacts.length > 0) {
      const contact = data.contacts[0];
      expect(contact.id).toBeDefined();
      expect(contact.name).toBeDefined();
      expect(contact.email).toBeDefined();
      expect(contact.sources).toBeDefined();
    }
  });

  test('should return contacts from specific source', async ({ request }) => {
    // Test filtering by source
    const source = 'close';
    const response = await request.get(`/api/contacts?source=${source}`);
    const data = await response.json();

    expect(response.status()).toBe(200);
    expect(data.success).toBe(true);
    expect(data.contacts).toBeDefined();
    
    // Check that all returned contacts have the requested source
    if (data.contacts.length > 0) {
      for (const contact of data.contacts) {
        expect(contact.sources).toContain(source);
      }
    }
  });

  test('should return detailed contact data', async ({ request }) => {
    // First get a list of contacts to find a valid ID
    const listResponse = await request.get('/api/contacts?limit=1');
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
    expect(data.success).toBe(true);
    expect(data.contact).toBeDefined();
    
    // Validate detailed contact data structure
    const contact = data.contact;
    expect(contact.id).toBe(contactId);
    expect(contact.name).toBeDefined();
    expect(contact.email).toBeDefined();
    
    // Check for detailed fields that should be present
    expect(contact.sources).toBeDefined();
    expect(contact.activities).toBeDefined();
    expect(contact.meetings).toBeDefined();
    expect(contact.deals).toBeDefined();
  });

  test('should return KPI configuration', async ({ request }) => {
    const response = await request.get('/api/settings/kpi-configuration');
    const data = await response.json();

    expect(response.status()).toBe(200);
    expect(data.success).toBe(true);
    expect(data.kpiConfig).toBeDefined();
    
    // Validate KPI configuration structure
    expect(data.kpiConfig.kpis).toBeDefined();
    expect(Array.isArray(data.kpiConfig.kpis)).toBe(true);
    expect(data.kpiConfig.activeKpis).toBeDefined();
    expect(Array.isArray(data.kpiConfig.activeKpis)).toBe(true);
    
    // Each KPI should have basic metadata
    if (data.kpiConfig.kpis.length > 0) {
      const kpi = data.kpiConfig.kpis[0];
      expect(kpi.id).toBeDefined();
      expect(kpi.name).toBeDefined();
      expect(kpi.description).toBeDefined();
      expect(kpi.formula).toBeDefined();
    }
  });

  test('should return Close CRM users', async ({ request }) => {
    const response = await request.get('/api/users/close');
    const data = await response.json();

    expect(response.status()).toBe(200);
    expect(data.success).toBe(true);
    expect(data.users).toBeDefined();
    expect(Array.isArray(data.users)).toBe(true);
    
    // Each user should have basic info
    if (data.users.length > 0) {
      const user = data.users[0];
      expect(user.id).toBeDefined();
      expect(user.name).toBeDefined();
      expect(user.email).toBeDefined();
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