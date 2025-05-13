/**
 * API Response Check
 * 
 * This script checks the specific response from both the dashboard
 * and attribution-stats endpoints to diagnose issues.
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

async function checkApiResponses() {
  console.log('Checking API endpoints...');
  
  try {
    // Check dashboard endpoint
    console.log('\nTesting dashboard endpoint...');
    const dashboardResponse = await axios.get(`${API_BASE_URL}/dashboard`);
    console.log(`Status: ${dashboardResponse.status}`);
    
    if (dashboardResponse.data) {
      // Check salesTeam data
      if (dashboardResponse.data.salesTeam) {
        console.log(`SalesTeam entries: ${dashboardResponse.data.salesTeam.length}`);
        
        if (dashboardResponse.data.salesTeam.length > 0) {
          console.log('First salesTeam entry:');
          console.log(JSON.stringify(dashboardResponse.data.salesTeam[0], null, 2));
        } else {
          console.log('WARNING: salesTeam array is empty');
        }
      } else {
        console.log('ERROR: salesTeam property is missing');
      }
      
      // Check KPIs
      if (dashboardResponse.data.kpis) {
        console.log('\nKPIs:');
        console.log(JSON.stringify(dashboardResponse.data.kpis, null, 2));
        
        // Check for undefined values
        const undefinedKpis = [];
        for (const [key, value] of Object.entries(dashboardResponse.data.kpis)) {
          if (value === undefined) {
            undefinedKpis.push(key);
          }
        }
        
        if (undefinedKpis.length > 0) {
          console.log(`\nWARNING: Some KPI values are undefined: ${undefinedKpis.join(', ')}`);
        }
      } else {
        console.log('ERROR: kpis property is missing');
      }
    }
    
    // Check attribution-stats endpoint
    console.log('\nTesting attribution-stats endpoint...');
    const statsResponse = await axios.get(`${API_BASE_URL}/attribution/enhanced-stats`);
    console.log(`Status: ${statsResponse.status}`);
    
    if (statsResponse.data) {
      console.log('Attribution stats data:');
      console.log(JSON.stringify(statsResponse.data, null, 2));
    }
    
  } catch (error) {
    console.error('Error checking API endpoints:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
  }
}

checkApiResponses();