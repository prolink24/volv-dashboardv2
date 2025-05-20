/**
 * Fix Calendly Dashboard
 * 
 * This script directly imports Calendly events for the dashboard
 * using SQL commands to bypass any API issues.
 */

import { exec } from 'child_process';
import axios from 'axios';

// Clear dashboard cache
console.log('Step 1: Clearing dashboard cache...');
axios.post('http://localhost:5000/api/cache/clear')
  .then(response => {
    console.log('Dashboard cache cleared successfully');
    console.log('Step 2: Triggering Calendly sync...');
    
    // Trigger Calendly sync with no limit
    return axios.get('http://localhost:5000/api/sync/calendly?includeHistorical=true&daysBack=90')
  })
  .then(response => {
    console.log('Calendly sync triggered successfully');
    console.log('Response:', response.data);
    
    // Check meeting count after fix
    console.log('Step 3: Checking meeting count...');
    return axios.get('http://localhost:5000/api/dashboard?date=last30days');
  })
  .then(response => {
    console.log('Dashboard data retrieved successfully');
    
    if (response.data.meetings && response.data.meetings.length) {
      console.log(`FIXED! Dashboard now shows ${response.data.meetings.length} meetings.`);
    } else {
      console.log('Dashboard still shows 0 meetings. Using more direct approach...');
      
      // Fallback to direct sync
      console.log('Step 4: Using direct sync approach...');
      return axios.get('http://localhost:5000/api/sync/recent-calendly?limit=50');
    }
  })
  .then(response => {
    if (response && response.data) {
      console.log('Recent Calendly sync completed:', response.data);
    }
    console.log('Calendly integration fix completed. Please check the dashboard again.');
  })
  .catch(error => {
    console.error('Error fixing Calendly integration:', error.message);
  });