/**
 * Contact Matching Test Script
 * 
 * This script tests our contact matching service with various scenarios
 * to ensure it correctly handles different matching situations.
 */

import { MatchConfidence, findBestMatchingContact } from './server/services/contact-matcher';
import { storage } from './server/storage';
import { InsertContact } from './shared/schema';

interface TestCase {
  name: string;
  contact: Partial<InsertContact>;
  expectedConfidence: MatchConfidence;
}

// For storing created contacts for cleanup
const createdContacts: number[] = [];

// Generate a random string suffix
function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 10);
}

// Create test data with unique random emails
async function setupTestData() {
  console.log("Creating test contacts...");
  
  const suffix = randomSuffix();
  
  const contacts = [
    {
      name: "John Smith",
      email: `johnsmith.test.${suffix}@gmail.com`,
      phone: "555-123-4567",
      company: "Acme Inc",
      status: "lead",
      leadSource: "test"
    },
    {
      name: "Jane Doe",
      email: `janedoe.test.${suffix}@example.com`,
      phone: "555-987-6543",
      company: "XYZ Corp",
      status: "lead",
      leadSource: "test"
    },
    {
      name: "Michael Johnson",
      email: `michael.johnson.test.${suffix}@hotmail.com`,
      phone: "555-444-3333",
      company: "Johnson Consulting",
      status: "lead",
      leadSource: "test"
    }
  ];
  
  for (const contact of contacts) {
    const created = await storage.createContact(contact);
    createdContacts.push(created.id);
    console.log(`Created test contact: ${created.name} (ID: ${created.id})`);
  }
}

// Clean up test data
async function cleanupTestData() {
  console.log("Cleaning up test contacts...");
  
  for (const id of createdContacts) {
    await storage.deleteContact(id);
    console.log(`Deleted test contact with ID: ${id}`);
  }
}

// Run tests
async function runTests() {
  console.log("\n=== Contact Matching Tests ===\n");
  
  // Get created test contacts
  const allContacts = await storage.getAllContacts();
  
  // Find created test contacts by their IDs
  const testContacts = allContacts.filter(c => createdContacts.includes(c.id));
  
  if (testContacts.length !== 3) {
    console.error(`Expected 3 test contacts, found ${testContacts.length}`);
    return false;
  }
  
  // Destructure test contacts
  const [john, jane, michael] = testContacts;
  
  // Generate test cases based on actual test contacts
  const testCases: TestCase[] = [
    // Exact email matches
    {
      name: "Exact email match",
      contact: {
        name: john.name,
        email: john.email
      },
      expectedConfidence: MatchConfidence.EXACT
    },
    {
      name: "Email case insensitivity",
      contact: {
        name: john.name.toUpperCase(),
        email: john.email.toUpperCase()
      },
      expectedConfidence: MatchConfidence.EXACT
    },
    {
      name: "Gmail plus alias",
      contact: {
        name: john.name,
        email: john.email.replace('@gmail.com', '+calendly@gmail.com')
      },
      expectedConfidence: MatchConfidence.EXACT
    },
    {
      name: "Gmail dots",
      contact: {
        name: john.name,
        email: john.email.replace('@gmail.com', '.test@gmail.com')
      },
      expectedConfidence: MatchConfidence.EXACT
    },
    
    // Phone + name matches
    {
      name: "Phone + name match",
      contact: {
        name: jane.name,
        email: "different.email@example.com",
        phone: jane.phone
      },
      expectedConfidence: MatchConfidence.HIGH
    },
    {
      name: "Phone match with different name format",
      contact: {
        name: jane.name.split(' ')[0] + '. ' + jane.name.split(' ')[1],
        email: "different.email@example.com",
        phone: jane.phone
      },
      expectedConfidence: MatchConfidence.HIGH
    },
    {
      name: "Phone match with formatted phone number",
      contact: {
        name: jane.name,
        email: "different.email@example.com",
        phone: '(' + jane.phone.substring(0, 3) + ') ' + jane.phone.substring(4)
      },
      expectedConfidence: MatchConfidence.HIGH
    },
    
    // Company + name matches
    {
      name: "Company + name match",
      contact: {
        name: michael.name,
        company: michael.company,
        email: "different.email@example.com"
      },
      expectedConfidence: MatchConfidence.MEDIUM
    },
    
    // Name-only matches
    {
      name: "Strong name-only match",
      contact: {
        name: michael.name,
        email: "completely.different@example.com"
      },
      expectedConfidence: MatchConfidence.LOW
    },
    
    // No matches
    {
      name: "No match",
      contact: {
        name: "Someone Else",
        email: "no.match@example.com"
      },
      expectedConfidence: MatchConfidence.NONE
    }
  ];
  
  let passCount = 0;
  let failCount = 0;
  
  for (const test of testCases) {
    try {
      console.log(`Test case: ${test.name}`);
      
      // Run the matcher
      const result = await findBestMatchingContact(test.contact);
      
      // Check result
      const passed = result.confidence === test.expectedConfidence;
      
      if (passed) {
        console.log(`✅ PASS: Got expected confidence level: ${result.confidence}`);
        console.log(`   Reason: ${result.reason || 'No reason provided'}`);
        passCount++;
      } else {
        console.log(`❌ FAIL: Expected ${test.expectedConfidence}, got ${result.confidence}`);
        console.log(`   Reason: ${result.reason || 'No reason provided'}`);
        if (result.contact) {
          console.log(`   Matched with: ${result.contact.name} (${result.contact.email})`);
        }
        failCount++;
      }
      
      console.log(""); // Add spacing
      
    } catch (error) {
      console.error(`Error in test case "${test.name}":`, error);
      failCount++;
    }
  }
  
  console.log(`\nSummary: ${passCount} passed, ${failCount} failed`);
  
  return failCount === 0;
}

// Main function
async function main() {
  try {
    await setupTestData();
    const success = await runTests();
    await cleanupTestData();
    
    if (!success) {
      console.error("Some tests failed!");
      process.exit(1);
    } else {
      console.log("All tests passed!");
      process.exit(0);
    }
  } catch (error) {
    console.error("Error running tests:", error);
    // Still try to clean up
    await cleanupTestData();
    process.exit(1);
  }
}

// Run tests
main();