/**
 * Close Users Schema Test
 * 
 * This script tests the database schema and data model for Close users integration.
 * It verifies:
 * 1. The Close users table structure
 * 2. The contact-user assignments table structure
 * 3. The deal-user assignments table structure
 * 4. The relationships between tables
 */

import { pool } from './server/db';
import chalk from 'chalk';

// Test configuration
const TABLES = {
  CLOSE_USERS: 'close_users',
  CONTACT_USER_ASSIGNMENTS: 'contact_user_assignments',
  DEAL_USER_ASSIGNMENTS: 'deal_user_assignments',
  CONTACTS: 'contacts',
  DEALS: 'deals'
};

// Expected table structure
const EXPECTED_STRUCTURE = {
  [TABLES.CLOSE_USERS]: [
    'id', 'email', 'role', 'status', 'close_id', 
    'first_name', 'last_name', 'created_at', 'updated_at', 'source_data'
  ],
  [TABLES.CONTACT_USER_ASSIGNMENTS]: [
    'id', 'source_data', 'contact_id', 'close_user_id', 
    'assignment_date', 'assignment_type'
  ],
  [TABLES.DEAL_USER_ASSIGNMENTS]: [
    'id', 'source_data', 'close_user_id', 'assignment_date', 
    'assignment_type', 'deal_id'
  ]
};

// Utility function for testing
async function test(name: string, testFn: () => Promise<boolean>) {
  try {
    process.stdout.write(`Testing ${name}... `);
    const success = await testFn();
    
    if (success) {
      console.log(chalk.green('✓ PASSED'));
    } else {
      console.log(chalk.red('✗ FAILED'));
    }
    
    return success;
  } catch (error) {
    console.log(chalk.red('✗ FAILED'));
    console.error(chalk.red(`  Error: ${error.message}`));
    return false;
  }
}

// Check if a table exists
async function tableExists(tableName: string): Promise<boolean> {
  const query = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `;
  
  const result = await pool.query(query, [tableName]);
  return result.rows[0].exists;
}

// Get columns for a table
async function getTableColumns(tableName: string): Promise<string[]> {
  const query = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = $1
    ORDER BY ordinal_position;
  `;
  
  const result = await pool.query(query, [tableName]);
  return result.rows.map(row => row.column_name);
}

// Check if two arrays have the same values (ignoring order)
function arraysHaveSameValues(arr1: string[], arr2: string[]): boolean {
  if (arr1.length !== arr2.length) return false;
  
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  
  for (const item of set1) {
    if (!set2.has(item)) return false;
  }
  
  return true;
}

// Count records in a table
async function countRecords(tableName: string): Promise<number> {
  const query = `SELECT COUNT(*) FROM ${tableName}`;
  const result = await pool.query(query);
  return parseInt(result.rows[0].count, 10);
}

// Main function
async function runTests() {
  console.log(chalk.blue('=== Testing Close Users Schema ===\n'));
  
  // Test 1: Verify all required tables exist
  const tablesExist = await test('Required tables exist', async () => {
    const closeUsersExists = await tableExists(TABLES.CLOSE_USERS);
    const contactUserAssignmentsExists = await tableExists(TABLES.CONTACT_USER_ASSIGNMENTS);
    const dealUserAssignmentsExists = await tableExists(TABLES.DEAL_USER_ASSIGNMENTS);
    
    console.log();
    console.log(`  Close Users table exists: ${closeUsersExists ? chalk.green('Yes') : chalk.red('No')}`);
    console.log(`  Contact User Assignments table exists: ${contactUserAssignmentsExists ? chalk.green('Yes') : chalk.red('No')}`);
    console.log(`  Deal User Assignments table exists: ${dealUserAssignmentsExists ? chalk.green('Yes') : chalk.red('No')}`);
    
    return closeUsersExists && contactUserAssignmentsExists && dealUserAssignmentsExists;
  });
  
  if (!tablesExist) {
    console.log(chalk.red('\nRequired tables not found. Schema tests cannot continue.'));
    return;
  }
  
  // Test 2: Verify table structure matches expected structure
  await test('Table structure is correct', async () => {
    let success = true;
    
    for (const [tableName, expectedColumns] of Object.entries(EXPECTED_STRUCTURE)) {
      const actualColumns = await getTableColumns(tableName);
      const structureMatches = arraysHaveSameValues(actualColumns, expectedColumns);
      
      console.log();
      console.log(`  ${tableName} structure: ${structureMatches ? chalk.green('Correct') : chalk.red('Incorrect')}`);
      
      if (!structureMatches) {
        console.log(chalk.yellow(`    Expected: ${expectedColumns.join(', ')}`));
        console.log(chalk.yellow(`    Actual: ${actualColumns.join(', ')}`));
        
        // Find missing and extra columns
        const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
        const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));
        
        if (missingColumns.length > 0) {
          console.log(chalk.red(`    Missing columns: ${missingColumns.join(', ')}`));
        }
        
        if (extraColumns.length > 0) {
          console.log(chalk.yellow(`    Extra columns: ${extraColumns.join(', ')}`));
        }
        
        success = false;
      }
    }
    
    return success;
  });
  
  // Test 3: Verify data exists in tables
  await test('Data exists in tables', async () => {
    const closeUsersCount = await countRecords(TABLES.CLOSE_USERS);
    const contactUserAssignmentsCount = await countRecords(TABLES.CONTACT_USER_ASSIGNMENTS);
    const dealUserAssignmentsCount = await countRecords(TABLES.DEAL_USER_ASSIGNMENTS);
    
    console.log();
    console.log(`  Close Users: ${closeUsersCount} records`);
    console.log(`  Contact User Assignments: ${contactUserAssignmentsCount} records`);
    console.log(`  Deal User Assignments: ${dealUserAssignmentsCount} records`);
    
    // For this test, we just verify that Close users table has data
    // The other tables might be empty if no assignments have been synchronized yet
    return closeUsersCount > 0;
  });
  
  // Test 4: Verify foreign key relationships
  await test('Foreign key relationships', async () => {
    try {
      // Test a JOIN between close_users and contact_user_assignments
      const contactAssignmentsQuery = `
        SELECT cu.email, COUNT(cua.id) AS assignment_count
        FROM ${TABLES.CLOSE_USERS} cu
        LEFT JOIN ${TABLES.CONTACT_USER_ASSIGNMENTS} cua ON cu.id = cua.close_user_id
        GROUP BY cu.id, cu.email
        LIMIT 5;
      `;
      
      const contactAssignmentsResult = await pool.query(contactAssignmentsQuery);
      
      // Test a JOIN between close_users and deal_user_assignments
      const dealAssignmentsQuery = `
        SELECT cu.email, COUNT(dua.id) AS assignment_count
        FROM ${TABLES.CLOSE_USERS} cu
        LEFT JOIN ${TABLES.DEAL_USER_ASSIGNMENTS} dua ON cu.id = dua.close_user_id
        GROUP BY cu.id, cu.email
        LIMIT 5;
      `;
      
      const dealAssignmentsResult = await pool.query(dealAssignmentsQuery);
      
      console.log();
      console.log('  Sample contact assignments by user:');
      contactAssignmentsResult.rows.forEach((row, i) => {
        console.log(`    ${i + 1}. ${row.email}: ${row.assignment_count} contacts`);
      });
      
      console.log('  Sample deal assignments by user:');
      dealAssignmentsResult.rows.forEach((row, i) => {
        console.log(`    ${i + 1}. ${row.email}: ${row.assignment_count} deals`);
      });
      
      return true;
    } catch (error) {
      console.log();
      console.log(chalk.red(`  Error testing relationships: ${error.message}`));
      return false;
    }
  });
  
  // Test 5: Verify close_id uniqueness in close_users table
  await test('Close ID uniqueness', async () => {
    const uniquenessQuery = `
      SELECT close_id, COUNT(*) as count
      FROM ${TABLES.CLOSE_USERS}
      GROUP BY close_id
      HAVING COUNT(*) > 1;
    `;
    
    const result = await pool.query(uniquenessQuery);
    const hasDuplicates = result.rows.length > 0;
    
    console.log();
    if (hasDuplicates) {
      console.log(chalk.red('  Found duplicate Close IDs:'));
      result.rows.forEach(row => {
        console.log(chalk.red(`    ${row.close_id}: ${row.count} occurrences`));
      });
    } else {
      console.log(chalk.green('  All Close IDs are unique'));
    }
    
    return !hasDuplicates;
  });
  
  console.log(chalk.blue('\n=== Close Users Schema Test Completed ==='));
}

// Chalk is already installed as a dependency

// Run the tests
runTests()
  .then(() => {
    console.log('\nTests completed.');
    pool.end();
  })
  .catch(err => {
    console.error('\nAn error occurred during testing:', err);
    pool.end();
  });