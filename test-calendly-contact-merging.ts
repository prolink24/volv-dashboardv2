/**
 * Test Calendly Contact Merging
 * 
 * This script tests the enhanced contact merging functionality between Calendly
 * and Close CRM to verify proper contact matching with fuzzy matching logic.
 */

import { storage } from './server/storage';
import { Contact, InsertContact } from './shared/schema';
import * as contactMatcher from './server/services/contact-matcher';

/**
 * Run the contact merging tests
 */
async function runContactMergingTests() {
  console.log('Starting Calendly-Contact merging test suite...');
  console.log('===============================================\n');

  // Test 1: Basic email matching
  await testEmailMatching();

  // Test 2: Phone number matching
  await testPhoneMatching();

  // Test 3: Name fuzzy matching
  await testNameFuzzyMatching();

  // Test 4: Smart field merging
  await testSmartFieldMerging();

  console.log('\nAll tests completed!');
}

/**
 * Test email matching logic
 */
async function testEmailMatching() {
  console.log('Test 1: Email Matching');
  console.log('---------------------');

  // Setup test data
  const closeContact: InsertContact = {
    name: 'John Smith',
    email: 'john.smith@gmail.com',
    phone: '555-123-4567',
    company: 'ABC Corp',
    leadSource: 'close'
  };
  
  // Create the initial Close contact
  const contact = await storage.createContact(closeContact);
  console.log(`Created test Close contact: ${contact.name} (${contact.email})`);
  
  // Create test Calendly contact data with same email but different formatting
  const calendlyContactData: InsertContact = {
    name: 'Johnny Smith',
    email: 'johnsmith@gmail.com', // No dots, should match with normalization
    phone: '5551234567',
    company: 'ABC Corporation',
    leadSource: 'calendly'
  };
  
  // Test matching
  const result = await contactMatcher.createOrUpdateContact(
    calendlyContactData,
    true,
    contactMatcher.MatchConfidence.MEDIUM
  );
  
  console.log(`Match result: ${result.created ? 'Created new' : 'Merged with existing'}`);
  console.log(`Reason: ${result.reason}`);
  console.log(`Final contact: ${result.contact.name} (${result.contact.email})`);
  console.log(`Lead Source: ${result.contact.leadSource}`);
  
  if (!result.created && result.contact.leadSource?.includes('close') && result.contact.leadSource?.includes('calendly')) {
    console.log('✅ Test passed: Successfully merged Calendly contact with existing Close contact by email');
  } else {
    console.log('❌ Test failed: Did not properly merge contacts');
  }

  // Clean up
  await storage.deleteContact(contact.id);
}

/**
 * Test phone number matching logic
 */
async function testPhoneMatching() {
  console.log('\nTest 2: Phone Matching');
  console.log('---------------------');

  // Setup test data
  const closeContact: InsertContact = {
    name: 'Bob Johnson',
    email: 'bob@company.com',
    phone: '(800) 555-1234',
    company: 'XYZ Inc',
    leadSource: 'close'
  };
  
  // Create the initial Close contact
  const contact = await storage.createContact(closeContact);
  console.log(`Created test Close contact: ${contact.name} (${contact.phone})`);
  
  // Create test Calendly contact data with different email but same phone
  const calendlyContactData: InsertContact = {
    name: 'Robert Johnson',
    email: 'robert.johnson@gmail.com', // Different email
    phone: '8005551234', // Same phone but different format
    company: 'XYZ Incorporated',
    leadSource: 'calendly'
  };
  
  // Test matching
  const result = await contactMatcher.createOrUpdateContact(
    calendlyContactData,
    true,
    contactMatcher.MatchConfidence.MEDIUM
  );
  
  console.log(`Match result: ${result.created ? 'Created new' : 'Merged with existing'}`);
  console.log(`Reason: ${result.reason}`);
  console.log(`Final contact: ${result.contact.name} (${result.contact.email})`);
  console.log(`Phone: ${result.contact.phone}`);
  console.log(`Lead Source: ${result.contact.leadSource}`);
  
  if (!result.created && result.contact.leadSource?.includes('close') && result.contact.leadSource?.includes('calendly')) {
    console.log('✅ Test passed: Successfully merged Calendly contact with existing Close contact by phone');
  } else {
    console.log('❌ Test failed: Did not properly merge contacts by phone');
  }

  // Clean up
  await storage.deleteContact(contact.id);
}

/**
 * Test fuzzy name matching logic
 */
async function testNameFuzzyMatching() {
  console.log('\nTest 3: Fuzzy Name Matching');
  console.log('--------------------------');

  // Setup test data with similar names but slightly different
  const closeContact: InsertContact = {
    name: 'Jennifer L. Williams',
    email: 'jwilliams@company.com',
    phone: '555-987-6543',
    company: 'Acme Corp',
    leadSource: 'close'
  };
  
  // Create the initial Close contact
  const contact = await storage.createContact(closeContact);
  console.log(`Created test Close contact: ${contact.name}`);
  
  // Create test Calendly contact data with different email/phone but similar name
  const calendlyContactData: InsertContact = {
    name: 'Jen Williams', // Shortened first name, same last name
    email: 'jennifer.williams@gmail.com', // Different email
    phone: '5559876543', // Similar phone without formatting
    company: 'Acme Corporation',
    leadSource: 'calendly'
  };
  
  // Test matching
  const result = await contactMatcher.createOrUpdateContact(
    calendlyContactData,
    true,
    contactMatcher.MatchConfidence.MEDIUM
  );
  
  console.log(`Match result: ${result.created ? 'Created new' : 'Merged with existing'}`);
  console.log(`Reason: ${result.reason}`);
  console.log(`Final contact: ${result.contact.name} (${result.contact.email})`);
  console.log(`Lead Source: ${result.contact.leadSource}`);
  
  if (!result.created && result.reason?.includes('name similarity')) {
    console.log('✅ Test passed: Successfully matched contacts with fuzzy name matching');
  } else {
    console.log('❌ Test failed: Fuzzy name matching did not work as expected');
  }

  // Clean up
  await storage.deleteContact(contact.id);
}

/**
 * Test smart field merging logic
 */
async function testSmartFieldMerging() {
  console.log('\nTest 4: Smart Field Merging');
  console.log('-------------------------');

  // Setup test data with partial info
  const closeContact: InsertContact = {
    name: 'M. Thompson',
    email: 'mthompson@work.com',
    phone: '', // Missing phone
    company: 'Global Industries',
    leadSource: 'close',
    title: '',
    notes: 'Called about enterprise plan'
  };
  
  // Create the initial Close contact
  const contact = await storage.createContact(closeContact);
  console.log(`Created test Close contact with partial data: ${contact.name}`);
  
  // Create test Calendly contact data with complementary info
  const calendlyContactData: InsertContact = {
    name: 'Michael Thompson', // More complete name
    email: 'michael.thompson@gmail.com', // Personal email
    phone: '555-333-9876', // Has phone
    company: '', // Missing company
    leadSource: 'calendly',
    title: 'VP of Sales', // Has title
    notes: 'Scheduled demo call'
  };
  
  // Test matching
  const result = await contactMatcher.createOrUpdateContact(
    calendlyContactData,
    true,
    contactMatcher.MatchConfidence.MEDIUM
  );
  
  console.log(`Match result: ${result.created ? 'Created new' : 'Merged with existing'}`);
  console.log(`Reason: ${result.reason}`);
  console.log(`Final contact: ${result.contact.name} (${result.contact.email})`);
  console.log(`Phone: ${result.contact.phone}`);
  console.log(`Company: ${result.contact.company}`);
  console.log(`Title: ${result.contact.title}`);
  console.log(`Notes: ${result.contact.notes}`);
  console.log(`Lead Source: ${result.contact.leadSource}`);
  
  const merged = !result.created && 
                result.contact.name === 'Michael Thompson' && // Took better name
                result.contact.email === 'mthompson@work.com' && // Kept work email
                result.contact.phone === '555-333-9876' && // Added missing phone
                result.contact.company === 'Global Industries' && // Kept company
                result.contact.title === 'VP of Sales' && // Added missing title
                result.contact.notes?.includes('Called about enterprise plan') && // Merged notes
                result.contact.notes?.includes('Scheduled demo call');
  
  if (merged) {
    console.log('✅ Test passed: Successfully merged contact data with smart field selection');
  } else {
    console.log('❌ Test failed: Smart field merging did not work as expected');
  }

  // Clean up
  await storage.deleteContact(contact.id);
}

// Add a deleteContact method to storage if it doesn't exist (for test cleanup)
if (!storage.deleteContact) {
  storage.deleteContact = async (id: number): Promise<boolean> => {
    try {
      const contacts = await storage.getAllContacts();
      const updatedContacts = contacts.filter(c => c.id !== id);
      console.log(`[Test mode] Simulated deletion of contact ID ${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting contact ${id}:`, error);
      return false;
    }
  };
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runContactMergingTests()
    .then(() => {
      console.log('Tests completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error running tests:', err);
      process.exit(1);
    });
}

export default runContactMergingTests;