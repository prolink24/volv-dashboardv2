import { test, expect } from '@playwright/test';
import { skipTest, skipIf, asyncUtils } from './utils/test-helpers';

test.describe('API Tests', () => {
  test('should return enhanced dashboard data', async ({ request }) => {
    const response = await request.get('/api/enhanced-dashboard');
    const data = await response.json();

    expect(response.status()).toBe(200);
    
    // Check for expected dashboard sections
    expect(data.kpis).toBeDefined();
    expect(data.salesTeam).toBeDefined();
    expect(data.attribution).toBeDefined();
    
    // Verify attribution section contains expected data
    expect(data.attribution.summary).toBeDefined();
    expect(data.attribution.contactStats).toBeDefined();
    expect(data.attribution.dealStats).toBeDefined();
    
    // Verify KPI data
    expect(data.kpis).toBeDefined();
    
    // Verify sales team data
    expect(Array.isArray(data.salesTeam)).toBe(true);
    if (data.salesTeam.length > 0) {
      const teamMember = data.salesTeam[0];
      expect(teamMember.name).toBeDefined();
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
    // Test filtering by source
    const source = 'close';
    const response = await request.get(`/api/contacts?source=${source}`);
    const data = await response.json();

    expect(response.status()).toBe(200);
    expect(data.contacts).toBeDefined();
    expect(Array.isArray(data.contacts)).toBe(true);
    expect(data.totalCount).toBeDefined();
    
    // Check that all returned contacts have the requested source in their leadSource
    if (data.contacts.length > 0) {
      for (const contact of data.contacts) {
        expect(contact.leadSource).toContain(source);
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
    expect(data.contact).toBeDefined();
    
    // Validate detailed contact data structure
    const contact = data.contact;
    expect(contact.id).toBe(contactId);
    expect(contact.name).toBeDefined();
    expect(contact.email).toBeDefined();
    
    // Check for related data arrays
    expect(Array.isArray(data.activities)).toBe(true);
    expect(Array.isArray(data.deals)).toBe(true);
    expect(Array.isArray(data.meetings)).toBe(true);
    expect(Array.isArray(data.forms)).toBe(true);
  });

  test('should return KPI configuration', async ({ request }) => {
    const response = await request.get('/api/settings/kpi-configuration');
    const data = await response.json();

    expect(response.status()).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    
    // Should have categories
    expect(data.length).toBeGreaterThan(0);
    
    // Validate category structure
    const category = data[0];
    expect(category.id).toBeDefined();
    expect(category.name).toBeDefined();
    expect(category.description).toBeDefined();
    expect(Array.isArray(category.kpis)).toBe(true);
    
    // Validate KPI structure if present
    if (category.kpis && category.kpis.length > 0) {
      const kpi = category.kpis[0];
      expect(kpi.id).toBeDefined();
      expect(kpi.name).toBeDefined();
      expect(kpi.description).toBeDefined();
      expect(kpi.formula).toBeDefined();
      expect(kpi.category).toBeDefined();
      expect(kpi.enabled).toBeDefined();
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