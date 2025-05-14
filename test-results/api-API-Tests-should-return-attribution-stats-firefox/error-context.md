# Test info

- Name: API Tests >> should return attribution stats
- Location: /home/runner/workspace/tests/api.spec.ts:23:3

# Error details

```
Error: expect(received).toBeDefined()

Received: undefined
    at /home/runner/workspace/tests/api.spec.ts:29:30
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 | import { skipTest, skipIf, asyncUtils } from './utils/test-helpers';
   3 |
   4 | test.describe('API Tests', () => {
   5 |   test('should return dashboard stats data', async ({ request }) => {
   6 |     const response = await request.get('/api/dashboard/stats');
   7 |     const data = await response.json();
   8 |
   9 |     expect(response.status()).toBe(200);
   10 |     expect(data.success).toBe(true);
   11 |     expect(data.stats).toBeDefined();
   12 |
   13 |     // Verify the data structure contains expected fields
   14 |     expect(data.stats.totalContacts).toBeDefined();
   15 |     expect(data.stats.totalMeetings).toBeDefined();
   16 |     expect(data.stats.totalDeals).toBeDefined();
   17 |     expect(data.stats.attributionRate).toBeDefined();
   18 |
   19 |     // Attribution rate should be above 90% based on project requirements
   20 |     expect(data.stats.attributionRate).toBeGreaterThanOrEqual(90);
   21 |   });
   22 |
   23 |   test('should return attribution stats', async ({ request }) => {
   24 |     const response = await request.get('/api/attribution/enhanced-stats');
   25 |     const data = await response.json();
   26 |
   27 |     expect(response.status()).toBe(200);
   28 |     expect(data.success).toBe(true);
>  29 |     expect(data.attribution).toBeDefined();
      |                              ^ Error: expect(received).toBeDefined()
   30 |
   31 |     // Verify attribution data structure
   32 |     expect(data.attribution.totalSources).toBeDefined();
   33 |     expect(data.attribution.contactsBySource).toBeDefined();
   34 |     expect(data.attribution.conversionsBySource).toBeDefined();
   35 |     expect(data.attribution.confidenceScores).toBeDefined();
   36 |   });
   37 |
   38 |   test('should return paginated contacts', async ({ request }) => {
   39 |     // Test with pagination parameters
   40 |     const response = await request.get('/api/contacts?page=1&limit=10');
   41 |     const data = await response.json();
   42 |
   43 |     expect(response.status()).toBe(200);
   44 |     expect(data.success).toBe(true);
   45 |     expect(data.contacts).toBeDefined();
   46 |     expect(Array.isArray(data.contacts)).toBe(true);
   47 |     
   48 |     // Should include pagination metadata
   49 |     expect(data.pagination).toBeDefined();
   50 |     expect(data.pagination.page).toBe(1);
   51 |     expect(data.pagination.limit).toBe(10);
   52 |     expect(data.pagination.total).toBeDefined();
   53 |     expect(data.pagination.totalPages).toBeDefined();
   54 |     
   55 |     // Validate contact object structure on the first item (if exists)
   56 |     if (data.contacts.length > 0) {
   57 |       const contact = data.contacts[0];
   58 |       expect(contact.id).toBeDefined();
   59 |       expect(contact.name).toBeDefined();
   60 |       expect(contact.email).toBeDefined();
   61 |       expect(contact.sources).toBeDefined();
   62 |     }
   63 |   });
   64 |
   65 |   test('should return contacts from specific source', async ({ request }) => {
   66 |     // Test filtering by source
   67 |     const source = 'close';
   68 |     const response = await request.get(`/api/contacts?source=${source}`);
   69 |     const data = await response.json();
   70 |
   71 |     expect(response.status()).toBe(200);
   72 |     expect(data.success).toBe(true);
   73 |     expect(data.contacts).toBeDefined();
   74 |     
   75 |     // Check that all returned contacts have the requested source
   76 |     if (data.contacts.length > 0) {
   77 |       for (const contact of data.contacts) {
   78 |         expect(contact.sources).toContain(source);
   79 |       }
   80 |     }
   81 |   });
   82 |
   83 |   test('should return detailed contact data', async ({ request }) => {
   84 |     // First get a list of contacts to find a valid ID
   85 |     const listResponse = await request.get('/api/contacts?limit=1');
   86 |     const listData = await listResponse.json();
   87 |     
   88 |     if (listData.contacts.length === 0) {
   89 |       skipTest('No contacts available for testing individual contact API');
   90 |       return;
   91 |     }
   92 |     
   93 |     const contactId = listData.contacts[0].id;
   94 |     
   95 |     // Now get the specific contact details
   96 |     const response = await request.get(`/api/contacts/${contactId}`);
   97 |     const data = await response.json();
   98 |
   99 |     expect(response.status()).toBe(200);
  100 |     expect(data.success).toBe(true);
  101 |     expect(data.contact).toBeDefined();
  102 |     
  103 |     // Validate detailed contact data structure
  104 |     const contact = data.contact;
  105 |     expect(contact.id).toBe(contactId);
  106 |     expect(contact.name).toBeDefined();
  107 |     expect(contact.email).toBeDefined();
  108 |     
  109 |     // Check for detailed fields that should be present
  110 |     expect(contact.sources).toBeDefined();
  111 |     expect(contact.activities).toBeDefined();
  112 |     expect(contact.meetings).toBeDefined();
  113 |     expect(contact.deals).toBeDefined();
  114 |   });
  115 |
  116 |   test('should return KPI configuration', async ({ request }) => {
  117 |     const response = await request.get('/api/settings/kpi-configuration');
  118 |     const data = await response.json();
  119 |
  120 |     expect(response.status()).toBe(200);
  121 |     expect(data.success).toBe(true);
  122 |     expect(data.kpiConfig).toBeDefined();
  123 |     
  124 |     // Validate KPI configuration structure
  125 |     expect(data.kpiConfig.kpis).toBeDefined();
  126 |     expect(Array.isArray(data.kpiConfig.kpis)).toBe(true);
  127 |     expect(data.kpiConfig.activeKpis).toBeDefined();
  128 |     expect(Array.isArray(data.kpiConfig.activeKpis)).toBe(true);
  129 |     
```