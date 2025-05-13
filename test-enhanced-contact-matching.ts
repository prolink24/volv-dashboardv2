/**
 * Enhanced Contact Matching Test Script
 * 
 * This script tests the enhanced contact matching algorithm across different
 * scenarios to verify our improvements meet the project requirements.
 */

import { MatchConfidence, findBestMatchingContact, normalizeEmail } from './server/services/contact-matcher';
import { storage } from './server/storage';
import { InsertContact } from './shared/schema';

// Store created test contacts for cleanup
const testContactIds: number[] = [];

// Generate a random string for test email uniqueness
function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 10);
}

// Create test contacts with various formats
async function setupTestContacts() {
  console.log("Creating test contacts...");
  
  const suffix = randomSuffix();
  
  // Base test contacts
  const contacts = [
    {
      name: "John Smith",
      email: `johnsmith.test.${suffix}@gmail.com`,
      phone: "555-123-4567",
      company: "ABC Company",
      status: "lead",
      leadSource: "test"
    },
    {
      name: "Jane Doe",
      email: `jane.doe.test.${suffix}@example.com`,
      phone: "555-987-6543",
      company: "XYZ Corporation",
      status: "lead", 
      leadSource: "test"
    },
    {
      name: "Robert Johnson",
      email: `robert.johnson.test.${suffix}@hotmail.com`,
      phone: "555-444-3333",
      company: "Johnson Consulting",
      status: "lead",
      leadSource: "test"
    },
    // Add a contact with non-standard formatting (lowercase, no spaces)
      {
      name: "michaelwilliams",
      email: `michael.williams.test.${suffix}@gmail.com`,
      phone: "555-222-1111",
      company: "Williams Enterprises",
      status: "lead",
      leadSource: "test"
    },
    // Add a contact with name in ALL CAPS
    {
      name: "DAVID BROWN",
      email: `david.brown.test.${suffix}@yahoo.com`,
      phone: "555-888-9999",
      company: "Brown Industries",
      status: "lead",
      leadSource: "test"
    }
  ];
  
  // Create each contact and store its ID
  for (const contact of contacts) {
    try {
      const created = await storage.createContact(contact);
      testContactIds.push(created.id);
      console.log(`Created: ${created.name} (ID: ${created.id}, Email: ${created.email})`);
    } catch (error) {
      console.error(`Failed to create contact: ${contact.name}`, error);
    }
  }
  
  console.log(`Created ${testContactIds.length} test contacts\n`);
}

// Clean up test contacts
async function cleanupTestContacts() {
  console.log("\nCleaning up test contacts...");
  
  for (const id of testContactIds) {
    try {
      await storage.deleteContact(id);
      console.log(`Deleted contact ID: ${id}`);
    } catch (error) {
      console.error(`Failed to delete contact ID: ${id}`, error);
    }
  }
}

// Run the tests
async function runTests() {
  // Retrieve created contacts
  const allContacts = await storage.getAllContacts();
  const testContacts = allContacts.filter(c => testContactIds.includes(c.id));
  
  if (testContacts.length < 5) {
    console.error(`Error: Expected 5 test contacts, found ${testContacts.length}`);
    return false;
  }
  
  // Extract test contacts for easier reference
  const [john, jane, robert, michael, david] = testContacts;
  
  console.log("=== Enhanced Contact Matching Tests ===\n");
  
  // PART 1: Email normalization tests
  console.log("PART 1: Email Normalization Tests\n");
  
  const emailTests = [
    {
      name: "Gmail dots removal",
      input: john.email.replace('@gmail.com', '.test@gmail.com'),
      expected: normalizeEmail(john.email)
    },
    {
      name: "Gmail plus alias handling",
      input: john.email.replace('@gmail.com', '+alias@gmail.com'),
      expected: normalizeEmail(john.email)
    },
    {
      name: "Case insensitivity",
      input: jane.email.toUpperCase(),
      expected: normalizeEmail(jane.email)
    },
    {
      name: "Combined cases (dots + alias + case)",
      input: john.email.replace('@gmail.com', '.Test+CALENDLY@Gmail.com'),
      expected: normalizeEmail(john.email)
    }
  ];
  
  let emailPassCount = 0;
  for (const test of emailTests) {
    const normalized = normalizeEmail(test.input);
    const passed = normalized === test.expected;
    
    console.log(`Test: ${test.name}`);
    console.log(`  Input:    ${test.input}`);
    console.log(`  Expected: ${test.expected}`);
    console.log(`  Got:      ${normalized}`);
    
    if (passed) {
      console.log(`  ✅ PASS`);
      emailPassCount++;
    } else {
      console.log(`  ❌ FAIL`);
    }
    console.log('');
  }
  
  console.log(`Email normalization: ${emailPassCount}/${emailTests.length} tests passed\n`);
  
  // PART 2: Phone matching tests
  console.log("PART 2: Phone Matching Tests\n");
  
  const phoneTests = [
    {
      name: "Exact phone + name match",
      contact: { 
        name: jane.name,
        phone: jane.phone
      },
      expectedContactId: jane.id,
      expectedConfidence: MatchConfidence.HIGH
    },
    {
      name: "Phone match with formatted number",
      contact: { 
        name: robert.name,
        phone: "(" + robert.phone.substring(0, 3) + ") " + robert.phone.substring(4)
      },
      expectedContactId: robert.id,
      expectedConfidence: MatchConfidence.HIGH
    },
    {
      name: "Phone match with initial format name (R. Johnson)",
      contact: { 
        name: robert.name.split(' ')[0].charAt(0) + ". " + robert.name.split(' ')[1],
        phone: robert.phone
      },
      expectedContactId: robert.id,
      expectedConfidence: MatchConfidence.HIGH
    }
  ];
  
  let phonePassCount = 0;
  for (const test of phoneTests) {
    console.log(`Test: ${test.name}`);
    
    const result = await findBestMatchingContact(test.contact);
    const matchedId = result.contact?.id;
    
    console.log(`  Input: ${JSON.stringify(test.contact)}`);
    console.log(`  Expected match ID: ${test.expectedContactId}`);
    console.log(`  Expected confidence: ${test.expectedConfidence}`);
    console.log(`  Got match ID: ${matchedId}`);
    console.log(`  Got confidence: ${result.confidence}`);
    console.log(`  Reason: ${result.reason}`);
    
    const passed = matchedId === test.expectedContactId && 
                   result.confidence === test.expectedConfidence;
    
    if (passed) {
      console.log(`  ✅ PASS`);
      phonePassCount++;
    } else {
      console.log(`  ❌ FAIL`);
    }
    console.log('');
  }
  
  console.log(`Phone matching: ${phonePassCount}/${phoneTests.length} tests passed\n`);
  
  // PART 3: Name formatting tests
  console.log("PART 3: Name Formatting Tests\n");
  
  const nameTests = [
    {
      name: "Lowercase name with email",
      contact: { 
        name: michael.name,
        email: michael.email
      },
      expectedContactId: michael.id,
      expectedConfidence: MatchConfidence.EXACT
    },
    {
      name: "ALL CAPS name with email",
      contact: { 
        name: david.name,
        email: david.email
      },
      expectedContactId: david.id,
      expectedConfidence: MatchConfidence.EXACT
    },
    {
      name: "Mixed case with properly formatted name",
      contact: { 
        name: "MiChAeL WiLLiaMs",
        email: michael.email
      },
      expectedContactId: michael.id,
      expectedConfidence: MatchConfidence.EXACT
    }
  ];
  
  let namePassCount = 0;
  for (const test of nameTests) {
    console.log(`Test: ${test.name}`);
    
    const result = await findBestMatchingContact(test.contact);
    const matchedId = result.contact?.id;
    
    console.log(`  Input: ${JSON.stringify(test.contact)}`);
    console.log(`  Expected match ID: ${test.expectedContactId}`);
    console.log(`  Expected confidence: ${test.expectedConfidence}`);
    console.log(`  Got match ID: ${matchedId}`);
    console.log(`  Got confidence: ${result.confidence}`);
    console.log(`  Reason: ${result.reason}`);
    
    const passed = matchedId === test.expectedContactId && 
                   result.confidence === test.expectedConfidence;
    
    if (passed) {
      console.log(`  ✅ PASS`);
      namePassCount++;
    } else {
      console.log(`  ❌ FAIL`);
    }
    console.log('');
  }
  
  console.log(`Name formatting: ${namePassCount}/${nameTests.length} tests passed\n`);
  
  // PART 4: Company matching tests
  console.log("PART 4: Company + Name Matching Tests\n");
  
  const companyTests = [
    {
      name: "Name + Company match",
      contact: { 
        name: david.name,
        company: david.company
      },
      expectedContactId: david.id,
      expectedConfidence: MatchConfidence.MEDIUM
    }
  ];
  
  let companyPassCount = 0;
  for (const test of companyTests) {
    console.log(`Test: ${test.name}`);
    
    const result = await findBestMatchingContact(test.contact);
    const matchedId = result.contact?.id;
    
    console.log(`  Input: ${JSON.stringify(test.contact)}`);
    console.log(`  Expected match ID: ${test.expectedContactId}`);
    console.log(`  Expected confidence: ${test.expectedConfidence}`);
    console.log(`  Got match ID: ${matchedId}`);
    console.log(`  Got confidence: ${result.confidence}`);
    console.log(`  Reason: ${result.reason}`);
    
    const passed = matchedId === test.expectedContactId && 
                   result.confidence === test.expectedConfidence;
    
    if (passed) {
      console.log(`  ✅ PASS`);
      companyPassCount++;
    } else {
      console.log(`  ❌ FAIL`);
    }
    console.log('');
  }
  
  console.log(`Company matching: ${companyPassCount}/${companyTests.length} tests passed\n`);
  
  // SUMMARY
  const totalTests = emailTests.length + phoneTests.length + nameTests.length + companyTests.length;
  const totalPassed = emailPassCount + phonePassCount + namePassCount + companyPassCount;
  const passPercentage = Math.round((totalPassed / totalTests) * 100);
  
  console.log(`=== Test Summary ===`);
  console.log(`Email Normalization: ${emailPassCount}/${emailTests.length} passed`);
  console.log(`Phone Matching: ${phonePassCount}/${phoneTests.length} passed`);
  console.log(`Name Formatting: ${namePassCount}/${nameTests.length} passed`);
  console.log(`Company Matching: ${companyPassCount}/${companyTests.length} passed`);
  console.log(`OVERALL: ${totalPassed}/${totalTests} tests passed (${passPercentage}%)`);
  
  return totalPassed === totalTests;
}

// Main function
async function main() {
  try {
    // Setup test data
    await setupTestContacts();
    
    // Run tests
    const success = await runTests();
    
    // Clean up test data
    await cleanupTestContacts();
    
    // Exit with success or failure
    if (success) {
      console.log("\n✅ ALL TESTS PASSED!");
      process.exit(0);
    } else {
      console.error("\n❌ SOME TESTS FAILED");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ TEST EXECUTION ERROR:", error);
    
    // Attempt cleanup even on error
    try {
      await cleanupTestContacts();
    } catch (cleanupError) {
      console.error("Failed to clean up test contacts:", cleanupError);
    }
    
    process.exit(1);
  }
}

// Run the tests
main();