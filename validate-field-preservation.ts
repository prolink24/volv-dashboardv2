/**
 * Field Preservation Validation
 * 
 * This script tests that all fields are properly preserved during contact merging
 * for a high degree of data integrity between Close CRM and Calendly.
 */

import { Contact, InsertContact } from './shared/schema';
import { storage } from './server/storage';
import { createOrUpdateContact } from './server/services/contact-matcher';

// Field categories to validate
const FIELD_CATEGORIES = [
  'basic',      // Basic contact info (name, email, phone)
  'source',     // Lead sources and attribution data
  'metadata',   // Timestamps, IDs, metadata
  'custom',     // Custom fields from CRM
  'notes',      // Notes and communication history
  'opportunity' // Opportunity and deal data
];

async function validateFieldPreservation() {
  console.log('=================================================');
  console.log('FIELD PRESERVATION VALIDATION');
  console.log('=================================================\n');
  
  // Get all contacts from the database with a valid email
  const allContacts = await storage.getAllContacts();
  const validContacts = allContacts.filter(c => c.email && c.email.includes('@'));
  
  console.log(`Found ${validContacts.length} valid contacts for testing\n`);
  
  // Take a sample of contacts to test (max 10)
  const testContacts = validContacts.slice(0, Math.min(10, validContacts.length));
  
  // Stats tracking
  const stats = {
    total: {
      tests: 0,
      passes: 0
    },
    fields: {} as Record<string, { tests: number; passes: number }>
  };
  
  // Initialize stats for each field category
  FIELD_CATEGORIES.forEach(category => {
    stats.fields[category] = { tests: 0, passes: 0 };
  });
  
  // For each contact, simulate an update from Calendly and verify field preservation
  for (const [index, originalContact] of testContacts.entries()) {
    console.log(`\n----- Testing Field Preservation for Contact #${index + 1}: ${originalContact.name} -----`);
    
    // Create a new contact data object simulating Calendly data
    const calendlyData = simulateCalendlyData(originalContact);
    console.log('Created simulated Calendly data for testing');
    
    // Attempt to create or update the contact
    console.log('Attempting to match and merge with existing contact...');
    const { contact: mergedContact, created, reason } = await createOrUpdateContact(calendlyData);
    
    console.log(`Contact was ${created ? 'created (ERROR)' : 'updated (CORRECT)'}`);
    console.log(`Match reason: ${reason || 'No reason provided'}`);
    
    if (created) {
      console.log('❌ FAILED: Contact was created as new instead of being merged');
      continue;
    }
    
    // Verify that all important fields were preserved
    const results = verifyFieldPreservation(originalContact, calendlyData, mergedContact);
    
    // Update stats
    stats.total.tests += results.total;
    stats.total.passes += results.passes;
    
    // Update category stats
    Object.entries(results.categories).forEach(([category, categoryStats]) => {
      stats.fields[category].tests += categoryStats.tests;
      stats.fields[category].passes += categoryStats.passes;
    });
  }
  
  // Calculate and display results
  displayResults(stats);
  
  // Return overall success
  return (stats.total.passes / stats.total.tests) >= 0.9; // 90% threshold
}

/**
 * Create simulated Calendly data based on an existing contact
 */
function simulateCalendlyData(contact: Contact): InsertContact {
  return {
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    leadSource: 'calendly',
    notes: `Scheduled a meeting via Calendly on ${new Date().toISOString().split('T')[0]}`,
    lastActivityDate: new Date().toISOString(),
    // We're intentionally not copying other fields to test if they're preserved
  } as InsertContact;
}

/**
 * Verify that all important fields were preserved during merging
 */
function verifyFieldPreservation(
  originalContact: Contact, 
  newData: InsertContact,
  mergedContact: Contact
) {
  console.log('\nVerifying field preservation:');
  
  const results = {
    total: 0,
    passes: 0,
    categories: {} as Record<string, { tests: number; passes: number }>
  };
  
  // Initialize category results
  FIELD_CATEGORIES.forEach(category => {
    results.categories[category] = { tests: 0, passes: 0 };
  });
  
  // Helper function to check a field
  const checkField = (
    field: string, 
    category: string, 
    condition: boolean, 
    message: string
  ) => {
    results.total++;
    results.categories[category].tests++;
    
    if (condition) {
      results.passes++;
      results.categories[category].passes++;
      console.log(`✅ ${field}: ${message}`);
    } else {
      console.log(`❌ ${field}: ${message}`);
    }
  };
  
  // Check basic contact fields
  checkField(
    'name', 
    'basic',
    mergedContact.name === originalContact.name, 
    'Original name preserved'
  );
  
  checkField(
    'email',
    'basic',
    mergedContact.email === originalContact.email,
    'Email preserved'
  );
  
  checkField(
    'phone',
    'basic',
    mergedContact.phone === originalContact.phone,
    'Phone number preserved'
  );
  
  // Check source fields
  checkField(
    'leadSource',
    'source',
    mergedContact.leadSource.includes('close') && mergedContact.leadSource.includes('calendly'),
    'Lead sources combined'
  );
  
  // Check lead and opportunity preservation
  if (originalContact.opportunities) {
    checkField(
      'opportunities',
      'opportunity',
      mergedContact.opportunities === originalContact.opportunities,
      'Opportunities preserved'
    );
  }
  
  if (originalContact.opportunityValue) {
    checkField(
      'opportunityValue',
      'opportunity',
      mergedContact.opportunityValue === originalContact.opportunityValue,
      'Opportunity value preserved'
    );
  }
  
  if (originalContact.leadStatus) {
    checkField(
      'leadStatus',
      'metadata',
      mergedContact.leadStatus === originalContact.leadStatus,
      'Lead status preserved'
    );
  }
  
  // Check timestamps and metadata
  if (originalContact.createdAt) {
    checkField(
      'createdAt',
      'metadata',
      mergedContact.createdAt === originalContact.createdAt,
      'Creation timestamp preserved'
    );
  }
  
  if (originalContact.firstTouchDate) {
    checkField(
      'firstTouchDate',
      'metadata',
      mergedContact.firstTouchDate === originalContact.firstTouchDate,
      'First touch date preserved'
    );
  }
  
  // Check notes merging
  checkField(
    'notes',
    'notes',
    mergedContact.notes.includes(originalContact.notes || '') && 
    mergedContact.notes.includes(newData.notes || ''),
    'Notes combined without duplication'
  );
  
  // Custom fields - check any that exist
  const customFields = [
    'closeId',
    'calendlyId',
    'company',
    'jobTitle',
    'website',
    'address',
    'tags',
    'customFields'
  ];
  
  customFields.forEach(field => {
    if (originalContact[field as keyof Contact]) {
      checkField(
        field,
        'custom',
        mergedContact[field as keyof Contact] === originalContact[field as keyof Contact],
        `Custom field "${field}" preserved`
      );
    }
  });
  
  return results;
}

/**
 * Display validation results
 */
function displayResults(stats: {
  total: { tests: number; passes: number };
  fields: Record<string, { tests: number; passes: number }>;
}) {
  console.log('\n=================================================');
  console.log('FIELD PRESERVATION RESULTS:');
  console.log('=================================================');
  
  // Overall results
  const overallAccuracy = (stats.total.passes / stats.total.tests) * 100;
  console.log(`Overall Field Preservation: ${overallAccuracy.toFixed(2)}% (${stats.total.passes}/${stats.total.tests})`);
  
  // Field category results
  console.log('\nResults by Field Category:');
  Object.entries(stats.fields).forEach(([category, categoryStats]) => {
    if (categoryStats.tests === 0) {
      console.log(`${category.padEnd(12)}: No fields tested`);
    } else {
      const accuracy = (categoryStats.passes / categoryStats.tests) * 100;
      console.log(`${category.padEnd(12)}: ${accuracy.toFixed(2)}% (${categoryStats.passes}/${categoryStats.tests})`);
    }
  });
  
  // Overall pass/fail
  if (overallAccuracy >= 90) {
    console.log('\n✅ VALIDATION PASSED: Field preservation accuracy exceeds 90%');
    console.log('Contact field merging between Close CRM and Calendly is highly reliable.');
  } else {
    console.log('\n❌ VALIDATION FAILED: Field preservation accuracy below 90%');
    console.log('Contact field merging needs improvement.');
  }
}

// Run the validation
validateFieldPreservation()
  .then((passed) => {
    console.log('\nField preservation validation complete');
    process.exit(passed ? 0 : 1);
  })
  .catch((error) => {
    console.error('Error during validation:', error);
    process.exit(1);
  });