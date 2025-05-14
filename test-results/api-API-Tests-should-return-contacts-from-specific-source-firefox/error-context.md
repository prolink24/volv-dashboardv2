# Test info

- Name: API Tests >> should return contacts from specific source
- Location: /home/runner/workspace/tests/api.spec.ts:79:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: undefined
    at /home/runner/workspace/tests/api.spec.ts:86:26
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 | import { skipTest, skipIf, asyncUtils } from './utils/test-helpers';
   3 |
   4 | test.describe('API Tests', () => {
   5 |   test('should return enhanced dashboard data', async ({ request }) => {
   6 |     const response = await request.get('/api/enhanced-dashboard');
   7 |     const data = await response.json();
   8 |
   9 |     expect(response.status()).toBe(200);
   10 |     
   11 |     // Check for expected dashboard sections
   12 |     expect(data.kpis).toBeDefined();
   13 |     expect(data.salesTeam).toBeDefined();
   14 |     expect(data.attribution).toBeDefined();
   15 |     
   16 |     // Verify attribution section contains expected data
   17 |     expect(data.attribution.summary).toBeDefined();
   18 |     expect(data.attribution.contactStats).toBeDefined();
   19 |     expect(data.attribution.dealStats).toBeDefined();
   20 |     
   21 |     // Verify KPI data
   22 |     expect(data.kpis).toBeDefined();
   23 |     
   24 |     // Verify sales team data
   25 |     expect(Array.isArray(data.salesTeam)).toBe(true);
   26 |     if (data.salesTeam.length > 0) {
   27 |       const teamMember = data.salesTeam[0];
   28 |       expect(teamMember.name).toBeDefined();
   29 |     }
   30 |   });
   31 |
   32 |   test('should return enhanced attribution stats', async ({ request }) => {
   33 |     const response = await request.get('/api/attribution/enhanced-stats');
   34 |     const data = await response.json();
   35 |
   36 |     expect(response.status()).toBe(200);
   37 |     expect(data.success).toBe(true);
   38 |     expect(data.attributionAccuracy).toBeDefined();
   39 |     expect(data.stats).toBeDefined();
   40 |
   41 |     // Verify stats data structure
   42 |     expect(data.stats.totalContacts).toBeDefined();
   43 |     expect(data.stats.contactsAnalyzed).toBeDefined();
   44 |     expect(data.stats.highCertaintyContacts).toBeDefined();
   45 |     expect(data.stats.multiSourceContacts).toBeDefined();
   46 |     expect(data.stats.dealAttributionRate).toBeDefined();
   47 |     
   48 |     // Attribution accuracy should be above 90% per project requirements
   49 |     expect(data.attributionAccuracy).toBeGreaterThanOrEqual(90);
   50 |   });
   51 |
   52 |   test('should return paginated contacts', async ({ request }) => {
   53 |     // Test with pagination parameters
   54 |     const response = await request.get('/api/contacts?page=1&limit=10');
   55 |     const data = await response.json();
   56 |
   57 |     expect(response.status()).toBe(200);
   58 |     expect(data.success).toBe(true);
   59 |     expect(data.contacts).toBeDefined();
   60 |     expect(Array.isArray(data.contacts)).toBe(true);
   61 |     
   62 |     // Should include pagination metadata
   63 |     expect(data.pagination).toBeDefined();
   64 |     expect(data.pagination.page).toBe(1);
   65 |     expect(data.pagination.limit).toBe(10);
   66 |     expect(data.pagination.total).toBeDefined();
   67 |     expect(data.pagination.totalPages).toBeDefined();
   68 |     
   69 |     // Validate contact object structure on the first item (if exists)
   70 |     if (data.contacts.length > 0) {
   71 |       const contact = data.contacts[0];
   72 |       expect(contact.id).toBeDefined();
   73 |       expect(contact.name).toBeDefined();
   74 |       expect(contact.email).toBeDefined();
   75 |       expect(contact.sources).toBeDefined();
   76 |     }
   77 |   });
   78 |
   79 |   test('should return contacts from specific source', async ({ request }) => {
   80 |     // Test filtering by source
   81 |     const source = 'close';
   82 |     const response = await request.get(`/api/contacts?source=${source}`);
   83 |     const data = await response.json();
   84 |
   85 |     expect(response.status()).toBe(200);
>  86 |     expect(data.success).toBe(true);
      |                          ^ Error: expect(received).toBe(expected) // Object.is equality
   87 |     expect(data.contacts).toBeDefined();
   88 |     
   89 |     // Check that all returned contacts have the requested source
   90 |     if (data.contacts.length > 0) {
   91 |       for (const contact of data.contacts) {
   92 |         expect(contact.sources).toContain(source);
   93 |       }
   94 |     }
   95 |   });
   96 |
   97 |   test('should return detailed contact data', async ({ request }) => {
   98 |     // First get a list of contacts to find a valid ID
   99 |     const listResponse = await request.get('/api/contacts?limit=1');
  100 |     const listData = await listResponse.json();
  101 |     
  102 |     if (listData.contacts.length === 0) {
  103 |       skipTest('No contacts available for testing individual contact API');
  104 |       return;
  105 |     }
  106 |     
  107 |     const contactId = listData.contacts[0].id;
  108 |     
  109 |     // Now get the specific contact details
  110 |     const response = await request.get(`/api/contacts/${contactId}`);
  111 |     const data = await response.json();
  112 |
  113 |     expect(response.status()).toBe(200);
  114 |     expect(data.success).toBe(true);
  115 |     expect(data.contact).toBeDefined();
  116 |     
  117 |     // Validate detailed contact data structure
  118 |     const contact = data.contact;
  119 |     expect(contact.id).toBe(contactId);
  120 |     expect(contact.name).toBeDefined();
  121 |     expect(contact.email).toBeDefined();
  122 |     
  123 |     // Check for detailed fields that should be present
  124 |     expect(contact.sources).toBeDefined();
  125 |     expect(contact.activities).toBeDefined();
  126 |     expect(contact.meetings).toBeDefined();
  127 |     expect(contact.deals).toBeDefined();
  128 |   });
  129 |
  130 |   test('should return KPI configuration', async ({ request }) => {
  131 |     const response = await request.get('/api/settings/kpi-configuration');
  132 |     const data = await response.json();
  133 |
  134 |     expect(response.status()).toBe(200);
  135 |     expect(data.success).toBe(true);
  136 |     expect(data.kpiConfig).toBeDefined();
  137 |     
  138 |     // Validate KPI configuration structure
  139 |     expect(data.kpiConfig.kpis).toBeDefined();
  140 |     expect(Array.isArray(data.kpiConfig.kpis)).toBe(true);
  141 |     expect(data.kpiConfig.activeKpis).toBeDefined();
  142 |     expect(Array.isArray(data.kpiConfig.activeKpis)).toBe(true);
  143 |     
  144 |     // Each KPI should have basic metadata
  145 |     if (data.kpiConfig.kpis.length > 0) {
  146 |       const kpi = data.kpiConfig.kpis[0];
  147 |       expect(kpi.id).toBeDefined();
  148 |       expect(kpi.name).toBeDefined();
  149 |       expect(kpi.description).toBeDefined();
  150 |       expect(kpi.formula).toBeDefined();
  151 |     }
  152 |   });
  153 |
  154 |   test('should return Close CRM users', async ({ request }) => {
  155 |     const response = await request.get('/api/users/close');
  156 |     const data = await response.json();
  157 |
  158 |     expect(response.status()).toBe(200);
  159 |     expect(data.success).toBe(true);
  160 |     expect(data.users).toBeDefined();
  161 |     expect(Array.isArray(data.users)).toBe(true);
  162 |     
  163 |     // Each user should have basic info
  164 |     if (data.users.length > 0) {
  165 |       const user = data.users[0];
  166 |       expect(user.id).toBeDefined();
  167 |       expect(user.name).toBeDefined();
  168 |       expect(user.email).toBeDefined();
  169 |     }
  170 |   });
  171 |
  172 |   test('should handle invalid API endpoints gracefully', async ({ request }) => {
  173 |     const response = await request.get('/api/nonexistent-endpoint');
  174 |     
  175 |     // Should receive a proper 404 response, not a server error
  176 |     expect(response.status()).toBe(404);
  177 |     
  178 |     // Response should still be well-formed JSON
  179 |     const data = await response.json();
  180 |     expect(data.success).toBe(false);
  181 |     expect(data.error).toBeDefined();
  182 |   });
  183 |
  184 |   test('should handle invalid input gracefully', async ({ request }) => {
  185 |     // Test with invalid contact ID
  186 |     const response = await request.get('/api/contacts/999999999');
```