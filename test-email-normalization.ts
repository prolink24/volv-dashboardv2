/**
 * Email Normalization Test Script
 * 
 * This script verifies that our email normalization functions properly handle
 * different email formats and ensures consistent matching.
 */

import { normalizeEmail } from './server/services/contact-matcher';

interface TestCase {
  name: string;
  input: string;
  expected: string;
}

// Test cases for email normalization
const testCases: TestCase[] = [
  // Basic cases
  {
    name: 'Plain email, no normalization needed',
    input: 'john@example.com',
    expected: 'john@example.com'
  },
  {
    name: 'Uppercase email',
    input: 'JOHN@EXAMPLE.COM',
    expected: 'john@example.com'
  },
  {
    name: 'Mixed case email',
    input: 'John.Doe@Example.com',
    expected: 'john.doe@example.com'
  },
  
  // Gmail-specific cases
  {
    name: 'Gmail with dots',
    input: 'j.o.h.n.doe@gmail.com',
    expected: 'johndoe@gmail.com'
  },
  {
    name: 'Gmail without dots',
    input: 'johndoe@gmail.com',
    expected: 'johndoe@gmail.com'
  },
  {
    name: 'Gmail with plus alias',
    input: 'johndoe+calendly@gmail.com',
    expected: 'johndoe@gmail.com'
  },
  {
    name: 'Gmail with dots and plus alias',
    input: 'john.doe+marketing@gmail.com',
    expected: 'johndoe@gmail.com'
  },
  {
    name: 'Gmail with uppercase, dots and plus',
    input: 'John.Doe+Testing@Gmail.com',
    expected: 'johndoe@gmail.com'
  },
  
  // Edge cases
  {
    name: 'Empty string',
    input: '',
    expected: ''
  },
  {
    name: 'Non-Gmail with plus (should not normalize)',
    input: 'john+test@example.com',
    expected: 'john+test@example.com'
  },
  {
    name: 'Email with multiple @ symbols',
    input: 'john@doe@gmail.com',
    expected: 'john@doe@gmail.com' // Should not break on invalid emails
  }
];

// Run the tests
function runTests() {
  console.log("=== Email Normalization Tests ===\n");
  
  let passCount = 0;
  let failCount = 0;
  
  for (const test of testCases) {
    const result = normalizeEmail(test.input);
    const passed = result === test.expected;
    
    if (passed) {
      console.log(`✅ PASS: ${test.name}`);
      passCount++;
    } else {
      console.log(`❌ FAIL: ${test.name}`);
      console.log(`   Input:    ${test.input}`);
      console.log(`   Expected: ${test.expected}`);
      console.log(`   Actual:   ${result}`);
      failCount++;
    }
  }
  
  console.log(`\nSummary: ${passCount} passed, ${failCount} failed`);
  
  return failCount === 0;
}

// Execute the tests
const success = runTests();

if (!success) {
  console.error("Some tests failed!");
  process.exit(1);
} else {
  console.log("All tests passed!");
  process.exit(0);
}