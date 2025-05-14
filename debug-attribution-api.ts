/**
 * API Debugging Tool
 * 
 * This tool directly tests the attribution API endpoints and logs the results to help 
 * diagnose problems with data flow in the application
 */

async function testAttributionStatsEndpoint() {
  console.log('===== TESTING ATTRIBUTION STATS ENDPOINT =====');
  try {
    const response = await fetch('/api/attribution/enhanced-stats');
    
    console.log('Response Status:', response.status);
    console.log('Response OK:', response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Data Received:', data);
      
      if (data.success) {
        console.log('Attribution Accuracy:', data.attributionAccuracy);
        if (data.stats) {
          console.log('Stats Present: ✓');
          console.log('Total Contacts:', data.stats.totalContacts);
          console.log('Multi-Source Rate:', data.stats.multiSourceRate);
          console.log('Deal Attribution Rate:', data.stats.dealAttributionRate);
          console.log('Field Coverage:', data.stats.fieldCoverage);
        } else {
          console.log('Stats Present: ✗');
        }
      } else {
        console.log('API reported failure:', data.error);
      }
    } else {
      console.log('Non-OK response:', await response.text());
    }
  } catch (error) {
    console.error('Error testing endpoint:', error);
  }
  console.log('==========================================');
}

// Run the tests
async function runTests() {
  await testAttributionStatsEndpoint();
  console.log('Tests completed.');
}

runTests();