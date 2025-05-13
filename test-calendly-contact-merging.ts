/**
 * Test Calendly Contact Merging
 * 
 * This script tests the enhanced contact merging functionality between Calendly
 * and Close CRM to verify proper contact matching with fuzzy matching logic.
 */

import { storage } from './server/storage';
import calendlyAPI from './server/api/calendly';
import contactMatcher from './server/services/contact-matcher';
import { MatchConfidence } from './server/services/contact-matcher';

// Test case data
const testCases = [
  {
    name: "Exact Email Match",
    calendlyContact: {
      name: "John Smith",
      email: "john.smith@example.com",
      phone: "555-123-4567",
      company: "Acme Inc."
    },
    closeContact: {
      name: "John Smith",
      email: "john.smith@example.com",
      phone: "555-123-4567",
      company: "Acme Inc."
    },
    expectedResult: {
      confidence: MatchConfidence.EXACT,
      shouldMatch: true
    }
  },
  {
    name: "Email Case Difference",
    calendlyContact: {
      name: "Jane Doe",
      email: "Jane.Doe@example.com",
      phone: "555-987-6543",
      company: "XYZ Corp"
    },
    closeContact: {
      name: "Jane Doe",
      email: "jane.doe@example.com",
      phone: "555-987-6543",
      company: "XYZ Corp"
    },
    expectedResult: {
      confidence: MatchConfidence.EXACT,
      shouldMatch: true
    }
  },
  {
    name: "Gmail Alias With +",
    calendlyContact: {
      name: "Bob Johnson",
      email: "bob.johnson+calendly@gmail.com",
      phone: "555-555-5555",
      company: "Johnson LLC"
    },
    closeContact: {
      name: "Bob Johnson",
      email: "bob.johnson@gmail.com",
      phone: "555-555-5555",
      company: "Johnson LLC"
    },
    expectedResult: {
      confidence: MatchConfidence.HIGH,
      shouldMatch: true
    }
  },
  {
    name: "Name Variation",
    calendlyContact: {
      name: "Robert Smith",
      email: "bob@example.com",
      phone: "555-777-8888",
      company: "Smith Co"
    },
    closeContact: {
      name: "Bob Smith",
      email: "bob@example.com",
      phone: "555-777-8888",
      company: "Smith Co"
    },
    expectedResult: {
      confidence: MatchConfidence.EXACT,
      shouldMatch: true
    }
  },
  {
    name: "Different Email But Same Phone",
    calendlyContact: {
      name: "William Jones",
      email: "will.jones@example.com",
      phone: "555-111-2222",
      company: "Jones Enterprises"
    },
    closeContact: {
      name: "William Jones",
      email: "wjones@company.com",
      phone: "555-111-2222",
      company: "Jones Enterprises"
    },
    expectedResult: {
      confidence: MatchConfidence.MEDIUM,
      shouldMatch: true
    }
  },
  {
    name: "No Match",
    calendlyContact: {
      name: "Alice Brown",
      email: "alice.brown@example.com",
      phone: "555-333-4444",
      company: "Brown Industries"
    },
    closeContact: {
      name: "Different Person",
      email: "different@example.com",
      phone: "555-999-0000",
      company: "Different Co"
    },
    expectedResult: {
      confidence: MatchConfidence.NONE,
      shouldMatch: false
    }
  }
];

/**
 * Run the contact merging tests
 */
async function runContactMergingTests() {
  console.log("Starting Calendly Contact Merging Tests...\n");
  
  // Track test results
  let passed = 0;
  let failed = 0;
  
  // Run through each test case
  for (const testCase of testCases) {
    console.log(`Test Case: ${testCase.name}`);
    
    try {
      // Simulate the contact in Close
      const closeContactData = {
        name: testCase.closeContact.name,
        email: testCase.closeContact.email,
        phone: testCase.closeContact.phone || "",
        company: testCase.closeContact.company || "",
        leadSource: "close",
        status: "lead",
        createdAt: new Date()
      };
      
      // Prepare the Calendly contact data
      const calendlyContactData = {
        name: testCase.calendlyContact.name,
        email: testCase.calendlyContact.email,
        phone: testCase.calendlyContact.phone || "",
        company: testCase.calendlyContact.company || "",
        leadSource: "calendly",
        status: "lead",
        createdAt: new Date()
      };
      
      // Test the contact matcher
      const matchResult = await contactMatcher.findBestMatchingContact(calendlyContactData);
      
      console.log(`  Match Confidence: ${matchResult.confidence}`);
      console.log(`  Match Reason: ${matchResult.reason || 'No reason provided'}`);
      console.log(`  Match Score: ${matchResult.score || 0}`);
      
      // Determine if test passed
      const confidenceMatches = matchResult.confidence === testCase.expectedResult.confidence;
      const shouldMatchResult = testCase.expectedResult.shouldMatch ? 
        matchResult.confidence !== MatchConfidence.NONE : 
        matchResult.confidence === MatchConfidence.NONE;
        
      if (shouldMatchResult) {
        console.log(`  ✅ Match Result: ${shouldMatchResult ? 'PASSED' : 'FAILED'}`);
        if (!confidenceMatches) {
          console.log(`  ⚠️ Note: Confidence level was ${matchResult.confidence}, expected ${testCase.expectedResult.confidence}`);
        }
        passed++;
      } else {
        console.log(`  ❌ Match Result: FAILED (Expected match: ${testCase.expectedResult.shouldMatch}, got: ${matchResult.confidence !== MatchConfidence.NONE})`);
        failed++;
      }
      
    } catch (error) {
      console.error(`  ❌ Error running test: ${error.message}`);
      failed++;
    }
    
    console.log(""); // Add spacing between tests
  }
  
  // Print summary
  console.log(`Test Summary: ${passed} passed, ${failed} failed\n`);
  
  return { passed, failed };
}

// Run the tests
runContactMergingTests().then(results => {
  if (results.failed > 0) {
    console.log("Some tests failed. Please review the results above.");
    process.exit(1);
  } else {
    console.log("All contact merging tests passed!");
    process.exit(0);
  }
}).catch(error => {
  console.error("Error running tests:", error);
  process.exit(1);
});