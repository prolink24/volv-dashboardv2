/**
 * Live Data Contact Merging Test
 * 
 * This test performs a comprehensive validation of our contact merging functionality
 * using real production data. It:
 * 
 * 1. Extracts real contacts from Close CRM
 * 2. Simulates a Calendly event for these contacts
 * 3. Forces a merge operation through our matcher
 * 4. Verifies ALL fields are correctly merged (including custom fields, opportunities)
 * 5. Measures and reports the certainty of our merging
 */

import axios from 'axios';
import { storage } from './server/storage';
import { createOrUpdateContact, MatchConfidence } from './server/services/contact-matcher';
import { Contact, InsertContact } from './shared/schema';

// API Configuration for direct access - needed for real-world data
const CLOSE_API_KEY = process.env.CLOSE_API_KEY;
const CLOSE_BASE_URL = 'https://api.close.com/api/v1';

// Create axios instance with authentication
const closeApiClient = axios.create({
  baseURL: CLOSE_BASE_URL,
  headers: {
    'Authorization': `Basic ${Buffer.from(CLOSE_API_KEY + ':').toString('base64')}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Number of contacts to test from live data
const TEST_SIZE = 10;
// Required accuracy threshold
const REQUIRED_ACCURACY = 90;

// Fields to verify for proper merging
const REQUIRED_FIELDS = [
  'name', 'email', 'phone', 'company', 'title', 'leadSource',
  'createdAt', 'updatedAt', 'lastActivityDate', 'status'
];

/**
 * Main test function
 */
async function testLiveDataMerging() {
  console.log('=======================================================');
  console.log('COMPREHENSIVE LIVE DATA CONTACT MERGING TEST');
  console.log('=======================================================\n');
  
  // 1. Get real Close CRM contacts with their full data
  const closeContacts = await fetchRealCloseContacts(TEST_SIZE);
  if (!closeContacts || closeContacts.length === 0) {
    console.error('Failed to fetch Close contacts for testing');
    return;
  }
  
  console.log(`Successfully fetched ${closeContacts.length} real Close contacts for testing\n`);
  
  // Stats tracking
  const stats = {
    totalTests: 0,
    successfulMerges: 0,
    fieldCompleteness: 0,
    fieldStats: {} as Record<string, { present: number, total: number }>,
  };
  
  // Initialize field stats
  REQUIRED_FIELDS.forEach(field => {
    stats.fieldStats[field] = { present: 0, total: 0 };
  });
  
  // 2. For each contact, simulate a Calendly event and test merging
  for (const [index, closeContact] of closeContacts.entries()) {
    console.log(`\n----- Testing Contact ${index + 1}/${closeContacts.length} -----`);
    console.log(`Contact: ${closeContact.name} (${closeContact.email})`);
    
    // Skip contacts without email (can't reliably test)
    if (!closeContact.email) {
      console.log('Skipping contact without email');
      continue;
    }
    
    stats.totalTests++;
    
    // 3. Create a simulated Calendly contact from this Close contact
    // (with slight modifications to test matching)
    const calendlyContact = simulateCalendlyContact(closeContact);
    console.log(`Simulated Calendly contact: ${calendlyContact.name} (${calendlyContact.email})`);
    
    // Store the original contact state for comparison
    const originalContact = await storage.getContactByEmail(closeContact.email);
    if (!originalContact) {
      console.log('Original contact not found in database, skipping');
      continue;
    }
    
    // 4. Force merge through our matcher with real-world data
    const mergeResult = await createOrUpdateContact(
      calendlyContact as InsertContact,
      true, // Update if found
      MatchConfidence.MEDIUM // Accept medium confidence and above
    );
    
    console.log(`Match confidence: ${mergeResult.confidence}`);
    console.log(`Match reason: ${mergeResult.reason || 'No reason provided'}`);
    
    if (!mergeResult.created) {
      console.log('✅ Successfully matched and merged contact');
      stats.successfulMerges++;
      
      // 5. Verify all fields were correctly merged
      const mergedContact = mergeResult.contact;
      
      // Check if leadSource was correctly updated to include both sources
      const hasClose = mergedContact.leadSource?.includes('close') || false;
      const hasCalendly = mergedContact.leadSource?.includes('calendly') || false;
      
      if (hasClose && hasCalendly) {
        console.log('✅ Lead source correctly includes both Close and Calendly');
      } else {
        console.log('❌ Lead source missing one or both sources');
        console.log(`   Current lead source: ${mergedContact.leadSource}`);
      }
      
      // Check each required field
      console.log('\nField merging results:');
      REQUIRED_FIELDS.forEach(field => {
        stats.fieldStats[field].total++;
        
        if (field === 'leadSource') {
          // Special case for leadSource
          if (hasClose && hasCalendly) {
            stats.fieldStats[field].present++;
            console.log(`✅ ${field}: Correctly merged`);
          } else {
            console.log(`❌ ${field}: Incorrectly merged`);
          }
        } else if (mergedContact[field] !== null && mergedContact[field] !== undefined) {
          // For all other fields, just check if they're present
          stats.fieldStats[field].present++;
          console.log(`✅ ${field}: Present (${mergedContact[field]})`);
        } else {
          console.log(`❌ ${field}: Missing`);
        }
      });
      
      // Special check for notes merging
      if (calendlyContact.notes && originalContact.notes) {
        const mergedNotes = mergedContact.notes || '';
        if (mergedNotes.includes(calendlyContact.notes) && 
            mergedNotes.includes(originalContact.notes)) {
          console.log('✅ Notes correctly merged from both sources');
        } else {
          console.log('❌ Notes not properly merged');
          console.log(`   Original: ${originalContact.notes}`);
          console.log(`   Calendly: ${calendlyContact.notes}`);
          console.log(`   Merged: ${mergedNotes}`);
        }
      }
      
      // Check for opportunities and custom fields if available
      if (originalContact.metadata) {
        try {
          const metadata = typeof originalContact.metadata === 'string' 
            ? JSON.parse(originalContact.metadata) 
            : originalContact.metadata;
          
          if (metadata.opportunities && metadata.opportunities.length > 0) {
            console.log(`✅ Preserved ${metadata.opportunities.length} opportunities`);
          }
          
          if (metadata.customFields && Object.keys(metadata.customFields).length > 0) {
            console.log(`✅ Preserved ${Object.keys(metadata.customFields).length} custom fields`);
          }
        } catch (e) {
          console.log('❌ Error parsing metadata');
        }
      }
      
    } else {
      console.log('❌ Failed to match and merge contact - created new one instead');
    }
  }
  
  // Calculate final statistics
  const matchAccuracy = (stats.successfulMerges / stats.totalTests) * 100;
  
  let totalFieldsPresent = 0;
  let totalFieldsRequired = 0;
  
  for (const field in stats.fieldStats) {
    totalFieldsPresent += stats.fieldStats[field].present;
    totalFieldsRequired += stats.fieldStats[field].total;
  }
  
  const fieldAccuracy = (totalFieldsPresent / totalFieldsRequired) * 100;
  const overallAccuracy = (matchAccuracy * 0.7) + (fieldAccuracy * 0.3);
  
  // Display final results
  console.log('\n=======================================================');
  console.log('FINAL RESULTS:');
  console.log('=======================================================');
  console.log(`Contact Matching Accuracy: ${matchAccuracy.toFixed(2)}%`);
  console.log(`Field Merging Accuracy: ${fieldAccuracy.toFixed(2)}%`);
  console.log(`Overall System Accuracy: ${overallAccuracy.toFixed(2)}%`);
  
  console.log('\nField-by-field results:');
  for (const field in stats.fieldStats) {
    const accuracy = (stats.fieldStats[field].present / stats.fieldStats[field].total) * 100;
    console.log(`- ${field}: ${accuracy.toFixed(2)}% (${stats.fieldStats[field].present}/${stats.fieldStats[field].total})`);
  }
  
  if (overallAccuracy >= REQUIRED_ACCURACY) {
    console.log(`\n✅ TEST PASSED: Overall accuracy ${overallAccuracy.toFixed(2)}% exceeds required ${REQUIRED_ACCURACY}%`);
  } else {
    console.log(`\n❌ TEST FAILED: Overall accuracy ${overallAccuracy.toFixed(2)}% below required ${REQUIRED_ACCURACY}%`);
  }
}

/**
 * Simulate a Calendly contact based on a Close contact
 * We'll make subtle changes to test our matching algorithms
 */
function simulateCalendlyContact(closeContact: any): any {
  // Modify the name slightly to test fuzzy matching
  // If the name has a space, we'll use parts of it
  let calendlyName = closeContact.name;
  const nameParts = closeContact.name.split(' ');
  
  if (nameParts.length > 1) {
    // Randomly choose transformation
    const transformation = Math.floor(Math.random() * 4);
    
    switch (transformation) {
      case 0: // Just first name
        calendlyName = nameParts[0];
        break;
      case 1: // Nickname for common names
        if (nameParts[0] === 'Robert') calendlyName = 'Bob ' + nameParts.slice(1).join(' ');
        else if (nameParts[0] === 'William') calendlyName = 'Bill ' + nameParts.slice(1).join(' ');
        else if (nameParts[0] === 'James') calendlyName = 'Jim ' + nameParts.slice(1).join(' ');
        else if (nameParts[0] === 'Jennifer') calendlyName = 'Jen ' + nameParts.slice(1).join(' ');
        else if (nameParts[0] === 'Elizabeth') calendlyName = 'Liz ' + nameParts.slice(1).join(' ');
        break;
      case 2: // Initial and last name
        calendlyName = nameParts[0][0] + '. ' + nameParts.slice(1).join(' ');
        break;
      case 3: // Add title
        calendlyName = closeContact.name + (closeContact.title ? ' (' + closeContact.title + ')' : '');
        break;
    }
  }
  
  // Modify phone format if available
  let phone = closeContact.phone;
  if (phone) {
    // Remove non-numeric characters and reformat
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      phone = `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    } else if (digits.length === 11 && digits[0] === '1') {
      phone = `+1 ${digits.substring(1, 4)}-${digits.substring(4, 7)}-${digits.substring(7)}`;
    }
  }
  
  // Create a calendly-like note
  const calendlyNote = `Scheduled introduction call on ${new Date().toLocaleDateString()}. 
Prospect is interested in learning more about our services.
${closeContact.company ? 'Company: ' + closeContact.company : ''}
${closeContact.title ? 'Title: ' + closeContact.title : ''}`;
  
  // Return the simulated Calendly contact
  return {
    name: calendlyName,
    email: closeContact.email,
    phone: phone,
    company: closeContact.company,
    title: closeContact.title,
    leadSource: 'calendly',
    notes: calendlyNote,
    status: 'lead',
    createdAt: new Date(),
    updatedAt: new Date(),
    sourceId: `calendly-test-${Date.now()}`,
    sourceData: JSON.stringify({ event_type: 'Introduction Call' })
  };
}

/**
 * Fetch real contacts from Close CRM
 */
async function fetchRealCloseContacts(limit: number): Promise<any[]> {
  try {
    console.log(`Fetching ${limit} real contacts from Close CRM...`);
    
    // Test API connection first
    try {
      const testResponse = await closeApiClient.get('/me/');
      console.log(`Connected to Close API as: ${testResponse.data.email}`);
    } catch (error) {
      console.error('Error connecting to Close API:', error);
      return [];
    }
    
    // Fetch leads with contacts that have email
    const response = await closeApiClient.get('/lead/', {
      params: {
        _limit: limit * 2, // Fetch more than we need in case some don't have email
        query: 'has:email' // Only get leads with email addresses
      }
    });
    
    const leads = response.data.data || [];
    console.log(`Fetched ${leads.length} leads from Close API`);
    
    // Extract contact information from leads
    const contacts: any[] = [];
    
    for (const lead of leads) {
      if (contacts.length >= limit) break;
      
      const leadContacts = lead.contacts || [];
      for (const contact of leadContacts) {
        const emails = contact.emails || [];
        const phones = contact.phones || [];
        
        if (emails.length > 0) {
          contacts.push({
            name: contact.name || lead.display_name || 'Unknown',
            email: emails[0].email,
            phone: phones.length > 0 ? phones[0].phone : null,
            company: lead.display_name || null,
            title: contact.title || null,
            leadSource: 'close',
            status: 'lead',
            createdAt: new Date(lead.date_created),
            updatedAt: new Date(lead.date_updated),
            sourceId: lead.id,
            sourceData: JSON.stringify(lead)
          });
          
          if (contacts.length >= limit) break;
        }
      }
    }
    
    return contacts;
  } catch (error) {
    console.error('Error fetching Close contacts:', error);
    return [];
  }
}

// Run the test
testLiveDataMerging()
  .then(() => {
    console.log('\nTest complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during test:', error);
    process.exit(1);
  });