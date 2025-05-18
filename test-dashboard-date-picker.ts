/**
 * Test Dashboard Date Picker
 * 
 * This script tests the dashboard API with different date ranges
 * to verify correct handling of financial metrics with date filtering.
 */

import axios from 'axios';
import chalk from 'chalk';

interface DateTest {
  name: string;
  dateRange: string;
  expectedDeals?: number;
  expectedTotalValue?: number;
}

async function testDashboardDateFiltering() {
  console.log(chalk.blue('Starting dashboard date filtering tests...'));
  
  // Determine the base URL for the API
  // In Replit, we can use the current origin
  let baseUrl = '';
  
  // Use the server running in the Replit workflow
  if (process.env.REPL_ID) {
    baseUrl = 'https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co';
    console.log(`Using Replit URL: ${baseUrl}`);
  } else {
    baseUrl = 'http://localhost:3000';
    console.log(`Using localhost URL: ${baseUrl}`);
  }
  
  const tests: DateTest[] = [
    {
      name: 'April 2025 (Fixed cash_collected values)',
      dateRange: '2025-04-01_2025-04-30',
      expectedDeals: 5, 
      expectedTotalValue: 210000
    },
    {
      name: 'First Quarter 2025 (Jan-Mar)',
      dateRange: '2025-01-01_2025-03-31'
    },
    {
      name: 'All of 2025 so far',
      dateRange: '2025-01-01_2025-05-18'
    },
    {
      name: 'Previous week',
      dateRange: '2025-05-11_2025-05-17'
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(chalk.cyan(`\nRunning test: ${test.name}`));
      console.log(`Date range: ${test.dateRange}`);
      
      // Call the dashboard API with the date range
      const apiUrl = `${baseUrl}/api/dashboard?dateRange=${test.dateRange}`;
      console.log(`Making API request to: ${apiUrl}`);
      const response = await axios.get(apiUrl);
      
      if (response.status === 200) {
        const data = response.data;
        
        console.log(chalk.green('✓ API returned 200 OK'));
        
        // Display response summary
        console.log('Summary of deals in this date range:');
        console.log(`- Total deals: ${data.dealCount || 'N/A'}`);
        console.log(`- Total deal value: $${formatNumber(data.totalDealValue || 0)}`);
        console.log(`- Total cash collected: $${formatNumber(data.totalCashCollected || 0)}`);
        
        // For April 2025, verify the expected values
        if (test.name.includes('April 2025')) {
          if (data.dealCount === test.expectedDeals) {
            console.log(chalk.green(`✓ Correct number of deals: ${data.dealCount}`));
          } else {
            console.log(chalk.red(`✗ Expected ${test.expectedDeals} deals, got ${data.dealCount}`));
          }
          
          if (Math.abs(data.totalDealValue - test.expectedTotalValue!) < 1) {
            console.log(chalk.green(`✓ Correct total deal value: $${formatNumber(data.totalDealValue)}`));
          } else {
            console.log(chalk.red(`✗ Expected total value of $${formatNumber(test.expectedTotalValue!)}, got $${formatNumber(data.totalDealValue)}`));
          }
          
          // Cash collected should now match deal value (or be slightly lower)
          if (data.totalCashCollected <= data.totalDealValue && data.totalCashCollected > 0) {
            console.log(chalk.green(`✓ Cash collected value is reasonable: $${formatNumber(data.totalCashCollected)}`));
          } else {
            console.log(chalk.red(`✗ Cash collected value is suspicious: $${formatNumber(data.totalCashCollected)}`));
          }
        }
      } else {
        console.log(chalk.red(`✗ API returned status: ${response.status}`));
      }
    } catch (error) {
      console.error(chalk.red(`Error testing ${test.name}:`), error.message);
      
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    }
  }
  
  console.log(chalk.blue('\nDate filtering tests completed'));
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

// Run the test
testDashboardDateFiltering()
  .then(() => console.log('All tests completed'))
  .catch(err => console.error('Test failed:', err));