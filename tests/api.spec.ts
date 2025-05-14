import { test, expect } from '@playwright/test';
import { customMatchers } from './utils/test-matchers';
import { skipTest, skipIf, asyncUtils } from './utils/test-helpers';

test.describe('API Tests', () => {
  const BASE_URL = 'http://localhost:5000';

  test('should fetch dashboard data successfully', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/dashboard`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // Check that the dashboard data has the expected structure
    expect(data).toHaveProperty('stats');
    expect(data).toHaveProperty('teamPerformance');
    expect(data).toHaveProperty('recentActivity');
  });

  test('should fetch attribution stats with required fields', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/attribution/stats`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // Check for the key attribution metrics
    expect(data).toHaveProperty('attributionAccuracy');
    expect(data).toHaveProperty('stats');
    expect(data.stats).toHaveProperty('totalContacts');
    expect(data.stats).toHaveProperty('multiSourceRate');
    expect(data.stats).toHaveProperty('dealAttributionRate');
    
    // Verify attribution accuracy is above 90%
    expect(data.attributionAccuracy).toBeGreaterThanOrEqual(90);
  });

  test('should fetch enhanced attribution stats', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/attribution/enhanced-stats`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // Check for enhanced metrics
    expect(data).toHaveProperty('attributionAccuracy');
    expect(data).toHaveProperty('stats');
    expect(data.stats).toHaveProperty('highCertaintyContacts');
    expect(data.stats).toHaveProperty('fieldCoverage');
  });

  test('should fetch contacts paginated', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/contacts?page=1&limit=10`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // Check pagination data
    expect(data).toHaveProperty('contacts');
    expect(data).toHaveProperty('pagination');
    expect(data.pagination).toHaveProperty('currentPage');
    expect(data.pagination).toHaveProperty('totalPages');
    expect(data.pagination).toHaveProperty('totalItems');
    
    // Check contact data shape
    expect(Array.isArray(data.contacts)).toBe(true);
    if (data.contacts.length > 0) {
      const firstContact = data.contacts[0];
      expect(firstContact).toHaveProperty('id');
      expect(firstContact).toHaveProperty('name');
      expect(firstContact).toHaveProperty('email');
    }
  });

  test('should filter contacts by search term', async ({ request }) => {
    // First get a contact to use as a search term
    const allResponse = await request.get(`${BASE_URL}/api/contacts?page=1&limit=1`);
    const allData = await allResponse.json();
    
    if (allData.contacts.length === 0) {
      skipTest('No contacts available to test search');
      return;
    }
    
    const searchTerm = allData.contacts[0].name.split(' ')[0]; // Use first name
    
    // Now search using that term
    const response = await request.get(`${BASE_URL}/api/contacts?page=1&limit=10&search=${encodeURIComponent(searchTerm)}`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // Verify search results contain the search term
    if (data.contacts.length > 0) {
      const matchesFound = data.contacts.some(contact => 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      expect(matchesFound).toBe(true);
    }
  });

  test('should fetch KPI configuration', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/settings/kpi-configuration`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // Check KPI configuration structure
    expect(data).toHaveProperty('kpis');
    expect(data).toHaveProperty('activeKpis');
    expect(data).toHaveProperty('customFields');
    
    // Verify arrays
    expect(Array.isArray(data.kpis)).toBe(true);
    expect(Array.isArray(data.activeKpis)).toBe(true);
    expect(Array.isArray(data.customFields)).toBe(true);
    
    // Check KPI properties
    if (data.kpis.length > 0) {
      const firstKpi = data.kpis[0];
      expect(firstKpi).toHaveProperty('id');
      expect(firstKpi).toHaveProperty('name');
      expect(firstKpi).toHaveProperty('description');
    }
  });

  test('should handle error responses appropriately', async ({ request }) => {
    // Test with an invalid endpoint
    const response = await request.get(`${BASE_URL}/api/invalid-endpoint`);
    
    // Should return 404 or error status
    expect(response.status()).not.toBe(200);
    
    // If it returns JSON, check error structure
    try {
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
    } catch (e) {
      // If not JSON, that's also acceptable as long as it's an error status
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  });

  test('should handle server-side validation', async ({ request }) => {
    // Try to create a KPI with invalid data
    const invalidData = {
      name: '', // Empty name should be invalid
      description: 'Test description',
      formula: 'SUM(contacts)'
    };
    
    const response = await request.post(`${BASE_URL}/api/settings/kpi-configuration/kpis`, {
      data: invalidData
    });
    
    // Should return validation error
    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('validation');
  });
  
  test('should respect API caching headers', async ({ request }) => {
    // Make first request
    const response1 = await request.get(`${BASE_URL}/api/attribution/stats`);
    expect(response1.status()).toBe(200);
    
    // Check for caching headers
    const cacheControl = response1.headers()['cache-control'];
    if (cacheControl) {
      expect(cacheControl).toContain('max-age=');
    }
    
    // Make second request immediately
    const response2 = await request.get(`${BASE_URL}/api/attribution/stats`);
    expect(response2.status()).toBe(200);
    
    // Both should have the same data
    const data1 = await response1.json();
    const data2 = await response2.json();
    
    expect(JSON.stringify(data1)).toBe(JSON.stringify(data2));
  });
});