/**
 * Dashboard API Test
 * 
 * Tests just the dashboard API endpoint with detailed error logging
 */

import axios from 'axios';
import chalk from 'chalk';

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';

async function testDashboardAPI() {
  console.log(chalk.blue('Testing dashboard API...'));
  
  try {
    console.log('Sending request to /api/dashboard...');
    const response = await axios.get(`${API_BASE_URL}/dashboard`);
    
    console.log(chalk.green(`✓ Dashboard API request successful: ${response.status}`));
    
    // Check the structure of the response
    if (response.data) {
      console.log('Dashboard data received:');
      
      // Check if essential properties exist
      const keys = Object.keys(response.data);
      console.log(`Data keys: ${keys.join(', ')}`);
      
      // Check for salesTeam data
      if (response.data.salesTeam) {
        console.log(`Sales team data: ${response.data.salesTeam.length} entries`);
        
        if (response.data.salesTeam.length > 0) {
          console.log('First sales team entry keys:', Object.keys(response.data.salesTeam[0]).join(', '));
        } else {
          console.log(chalk.yellow('Warning: Sales team array is empty'));
        }
      } else {
        console.log(chalk.red('Error: No salesTeam property found in dashboard data'));
      }
      
      // Check for KPIs
      if (response.data.kpis) {
        console.log('KPI keys:', Object.keys(response.data.kpis).join(', '));
        
        // Check for undefined values
        const undefinedKpis = [];
        for (const [key, value] of Object.entries(response.data.kpis)) {
          if (value === undefined) {
            undefinedKpis.push(key);
          }
        }
        
        if (undefinedKpis.length > 0) {
          console.log(chalk.yellow(`Warning: Some KPI values are undefined: ${undefinedKpis.join(', ')}`));
        }
      } else {
        console.log(chalk.red('Error: No kpis property found in dashboard data'));
      }
    } else {
      console.log(chalk.red('Error: Dashboard API returned empty response'));
    }
  } catch (error) {
    console.log(chalk.red(`✗ Dashboard API request failed: ${error.message}`));
    
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Status Text: ${error.response.statusText}`);
      console.log(`Data:`, error.response.data);
    }
    
    if (error.stack) {
      console.log('Error stack:');
      console.log(error.stack);
    }
  }
}

testDashboardAPI();