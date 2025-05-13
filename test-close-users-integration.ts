/**
 * Close Users Integration Test
 * 
 * This script tests the integration of Close CRM users, contacts, and deals
 * to verify the complete functionality of the user integration.
 */

import axios from 'axios';
import chalk from 'chalk';

const API_BASE_URL = 'http://localhost:5000/api';

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  total: 0
};

// Utility function for testing
async function test(name: string, testFn: () => Promise<boolean>) {
  results.total++;
  
  try {
    process.stdout.write(`Testing ${name}... `);
    const success = await testFn();
    
    if (success) {
      results.passed++;
      console.log(chalk.green('✓ PASSED'));
    } else {
      results.failed++;
      console.log(chalk.red('✗ FAILED'));
    }
  } catch (error) {
    results.failed++;
    console.log(chalk.red('✗ FAILED'));
    console.error(chalk.red(`  Error: ${error.message}`));
  }
}

// Helper to check array data
function validateArray(data: any[], minLength: number = 1) {
  return Array.isArray(data) && data.length >= minLength;
}

// Helper to validate Close user object
function validateCloseUser(user: any) {
  return (
    user &&
    typeof user === 'object' &&
    typeof user.id === 'number' &&
    typeof user.closeId === 'string' &&
    typeof user.email === 'string' &&
    user.email.includes('@') &&
    typeof user.sourceData === 'object'
  );
}

// Tests
async function runTests() {
  console.log(chalk.blue('=== Starting Close Users Integration Tests ==='));
  
  // Test getting all Close users
  await test('Get all Close users', async () => {
    const response = await axios.get(`${API_BASE_URL}/close-users`);
    const { users, totalCount } = response.data;
    
    console.log(`  Retrieved ${users.length} users out of ${totalCount} total`);
    
    // Validate response
    if (!validateArray(users)) {
      console.log(chalk.yellow('  Warning: No users found'));
      return false;
    }
    
    // Validate the first user
    if (!validateCloseUser(users[0])) {
      console.log(chalk.red('  Error: Invalid user object structure'));
      console.log(users[0]);
      return false;
    }
    
    return true;
  });
  
  // Find a valid user to use for other tests
  let testUserId: number | null = null;
  
  await test('Find a valid user for testing', async () => {
    const response = await axios.get(`${API_BASE_URL}/close-users`);
    const { users } = response.data;
    
    if (validateArray(users)) {
      testUserId = users[0].id;
      console.log(`  Selected user ID ${testUserId} (${users[0].email}) for testing`);
      return true;
    }
    
    return false;
  });
  
  // Skip remaining tests if we don't have a valid user
  if (!testUserId) {
    console.log(chalk.yellow('Skipping remaining tests as no valid user found'));
    return;
  }
  
  // Test getting a specific Close user
  await test('Get specific Close user', async () => {
    const response = await axios.get(`${API_BASE_URL}/close-users/${testUserId}`);
    const { user, contacts, deals } = response.data;
    
    // Validate the user
    if (!validateCloseUser(user)) {
      console.log(chalk.red('  Error: Invalid user object structure'));
      return false;
    }
    
    console.log(`  Retrieved user: ${user.first_name} ${user.last_name} (${user.email})`);
    console.log(`  Associated with ${contacts.length} contacts and ${deals.length} deals`);
    
    return true;
  });
  
  // Test getting contacts for a specific Close user
  await test('Get contacts for specific Close user', async () => {
    const response = await axios.get(`${API_BASE_URL}/close-users/${testUserId}/contacts`);
    const { closeUser, contacts, totalCount } = response.data;
    
    // Validate the user
    if (!validateCloseUser(closeUser)) {
      console.log(chalk.red('  Error: Invalid user object structure'));
      return false;
    }
    
    console.log(`  Retrieved ${totalCount} contacts for user: ${closeUser.email}`);
    
    // If there are contacts, validate the first one
    if (contacts.length > 0) {
      const contact = contacts[0];
      const isValidContact = (
        contact &&
        typeof contact === 'object' &&
        typeof contact.id === 'number' &&
        typeof contact.email === 'string' &&
        typeof contact.name === 'string'
      );
      
      if (!isValidContact) {
        console.log(chalk.red('  Error: Invalid contact object structure'));
        console.log(contact);
        return false;
      }
      
      console.log(`  First contact: ${contact.name} (${contact.email})`);
    } else {
      console.log(chalk.yellow('  No contacts found for this user'));
    }
    
    return true;
  });
  
  // Test getting deals for a specific Close user
  await test('Get deals for specific Close user', async () => {
    const response = await axios.get(`${API_BASE_URL}/close-users/${testUserId}/deals`);
    const { closeUser, deals, totalCount } = response.data;
    
    // Validate the user
    if (!validateCloseUser(closeUser)) {
      console.log(chalk.red('  Error: Invalid user object structure'));
      return false;
    }
    
    console.log(`  Retrieved ${totalCount} deals for user: ${closeUser.email}`);
    
    // If there are deals, validate the first one
    if (deals.length > 0) {
      const deal = deals[0];
      const isValidDeal = (
        deal &&
        typeof deal === 'object' &&
        typeof deal.id === 'number' &&
        typeof deal.title === 'string' &&
        typeof deal.status === 'string'
      );
      
      if (!isValidDeal) {
        console.log(chalk.red('  Error: Invalid deal object structure'));
        console.log(deal);
        return false;
      }
      
      console.log(`  First deal: ${deal.title} (${deal.status})`);
    } else {
      console.log(chalk.yellow('  No deals found for this user'));
    }
    
    return true;
  });
  
  // Test syncing Close users
  await test('Trigger Close users sync', async () => {
    const response = await axios.post(`${API_BASE_URL}/sync/close-users`, {
      syncContacts: true,
      syncDeals: true
    });
    
    const { success, message, syncContacts, syncDeals } = response.data;
    
    if (!success) {
      console.log(chalk.red(`  Error: ${message}`));
      return false;
    }
    
    console.log(`  Response: ${message}`);
    console.log(`  Syncing contacts: ${syncContacts}`);
    console.log(`  Syncing deals: ${syncDeals}`);
    
    return success === true;
  });
  
  // Summary
  console.log(chalk.blue('\n=== Test Results ==='));
  console.log(`Total tests: ${results.total}`);
  console.log(chalk.green(`Passed: ${results.passed}`));
  console.log(chalk.red(`Failed: ${results.failed}`));
  
  if (results.failed === 0) {
    console.log(chalk.green('\n✓ All tests passed! The Close Users integration is working correctly.'));
  } else {
    console.log(chalk.yellow(`\n⚠ ${results.failed} tests failed. Please check the logs for details.`));
  }
}

// Chalk is already installed as a dependency

// Run the tests
runTests().catch(error => {
  console.error(chalk.red('Error running tests:'));
  console.error(error);
  process.exit(1);
});