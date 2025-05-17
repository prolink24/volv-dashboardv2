/**
 * Generate Test Data Script
 * 
 * This script generates realistic test data for the dashboard:
 * - Close CRM contacts, deals, and activities
 * - Calendly meetings
 * - Typeform submissions
 * 
 * Usage: ts-node generate-test-data.ts
 */

import fetch from 'node-fetch';
import { faker } from '@faker-js/faker';

const API_BASE = process.env.API_URL || 'http://localhost:3000/api';

// Configuration
const CONFIG = {
  contacts: 100,
  deals: 50,
  activities: 300,
  meetings: 80,
  forms: 40,
  dateRangeStart: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
  dateRangeEnd: new Date()
};

/**
 * Generate a random date between start and end
 */
function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Generate a deal status weighted towards more realistic distribution
 */
function randomDealStatus() {
  const rand = Math.random();
  if (rand < 0.2) return 'won';
  if (rand < 0.5) return 'active';
  if (rand < 0.7) return 'lost';
  return 'pending';
}

/**
 * Generate a random deal value with realistic distribution
 */
function randomDealValue() {
  // 80% of deals between $5k and $30k, 20% between $30k and $100k
  if (Math.random() < 0.8) {
    return Math.round(5000 + Math.random() * 25000);
  } else {
    return Math.round(30000 + Math.random() * 70000);
  }
}

/**
 * Generate an activity type with realistic distribution
 */
function randomActivityType() {
  const types = ['email', 'call', 'meeting', 'note', 'task'];
  const weights = [0.4, 0.3, 0.2, 0.05, 0.05]; // Email and calls more common
  
  const rand = Math.random();
  let cumulativeWeight = 0;
  
  for (let i = 0; i < types.length; i++) {
    cumulativeWeight += weights[i];
    if (rand < cumulativeWeight) {
      return types[i];
    }
  }
  
  return types[0]; // Fallback
}

/**
 * Generate simulated test data for all sources
 */
async function generateTestData() {
  console.log('🔍 Generating test data for dashboard...');
  
  try {
    // Step 1: Generate Close contacts
    console.log(`📊 Generating ${CONFIG.contacts} Close CRM contacts...`);
    const contacts = Array.from({ length: CONFIG.contacts }, () => ({
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      title: faker.person.jobTitle(),
      company: faker.company.name(),
      created_date: randomDate(CONFIG.dateRangeStart, CONFIG.dateRangeEnd).toISOString()
    }));
    
    // Step 2: Generate deals
    console.log(`💰 Generating ${CONFIG.deals} deals...`);
    const deals = Array.from({ length: CONFIG.deals }, (_, i) => ({
      name: faker.commerce.productName(),
      status: randomDealStatus(),
      value: randomDealValue(),
      created_date: randomDate(CONFIG.dateRangeStart, CONFIG.dateRangeEnd).toISOString(),
      contact_id: Math.floor(Math.random() * CONFIG.contacts) + 1 // Random contact association
    }));
    
    // Step 3: Generate activities
    console.log(`📝 Generating ${CONFIG.activities} activities...`);
    const activities = Array.from({ length: CONFIG.activities }, () => ({
      type: randomActivityType(),
      date: randomDate(CONFIG.dateRangeStart, CONFIG.dateRangeEnd).toISOString(),
      contact_id: Math.floor(Math.random() * CONFIG.contacts) + 1, // Random contact association
      user_id: Math.floor(Math.random() * 5) + 1, // Random user association
      note: faker.lorem.paragraph()
    }));
    
    // Step 4: Generate Calendly meetings
    console.log(`📅 Generating ${CONFIG.meetings} Calendly meetings...`);
    const meetings = Array.from({ length: CONFIG.meetings }, () => {
      const startTime = randomDate(CONFIG.dateRangeStart, CONFIG.dateRangeEnd);
      const endTime = new Date(startTime.getTime() + (60 * 60 * 1000)); // 1 hour later
      
      return {
        event_type: Math.random() < 0.7 ? 'Discovery Call' : 'Demo Meeting',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: Math.random() < 0.8 ? 'completed' : 'canceled',
        invitee_email: faker.internet.email(),
        name: `${faker.person.firstName()} ${faker.person.lastName()}`,
        contact_id: Math.floor(Math.random() * CONFIG.contacts) + 1 // Random contact association
      };
    });
    
    // Step 5: Generate Typeform submissions
    console.log(`📋 Generating ${CONFIG.forms} Typeform submissions...`);
    const forms = Array.from({ length: CONFIG.forms }, () => {
      const formType = Math.random() < 0.6 ? 'Contact Request' : 'Demo Request';
      
      return {
        form_name: formType,
        submitted_at: randomDate(CONFIG.dateRangeStart, CONFIG.dateRangeEnd).toISOString(),
        email: faker.internet.email(),
        name: `${faker.person.firstName()} ${faker.person.lastName()}`,
        company: faker.company.name(),
        message: faker.lorem.paragraph(),
        contact_id: Math.floor(Math.random() * CONFIG.contacts) + 1 // Random contact association
      };
    });
    
    // Step 6: Submit test data to API
    console.log('🔄 Submitting test data to API...');
    
    const result = await fetch(`${API_BASE}/test-data/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contacts,
        deals,
        activities,
        meetings,
        forms
      })
    });
    
    if (!result.ok) {
      throw new Error(`API returned ${result.status}`);
    }
    
    const data = await result.json();
    
    console.log(`✅ Test data generation complete!`);
    console.log(`
----------------------------------------------------
📊 TEST DATA SUMMARY
----------------------------------------------------
Close CRM:
  - Contacts: ${data.imported.contacts || 0}
  - Deals: ${data.imported.deals || 0}
  - Activities: ${data.imported.activities || 0}
  
Calendly:
  - Meetings: ${data.imported.meetings || 0}
  
Typeform:
  - Forms: ${data.imported.forms || 0}
  
✅ All test data has been imported and is ready for use
----------------------------------------------------
`);
    
  } catch (error) {
    console.error('❌ Test data generation failed:', error);
    console.log('If this is a test endpoint issue, you may need to implement the /api/test-data/import endpoint');
    process.exit(1);
  }
}

// Run the test data generator
generateTestData(); 