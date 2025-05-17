/**
 * Data Enhancement Script
 * 
 * This script enhances the data quality in our attribution platform by:
 * 1. Fixing missing contact fields
 * 2. Updating source counts for multi-source attribution
 * 3. Fixing cash collected values for won deals
 * 4. Classifying meetings and setting sequence numbers
 * 
 * Run this script to ensure all KPIs in the dashboard work correctly.
 */

import axios from 'axios';
import chalk from 'chalk';

// Using port 5000 which is the actual server port
const API_URL = 'http://localhost:5000/api/data-enhancement';

async function enhanceData() {
  console.log(chalk.blue.bold('\n=== Data Enhancement Tool ===\n'));
  
  try {
    console.log(chalk.yellow('Starting comprehensive data enhancement process...'));
    
    // Call the enhance-all endpoint which runs all enhancement steps
    const response = await axios.post(`${API_URL}/enhance-all`);
    
    if (response.data.success) {
      console.log(chalk.green.bold('\n✓ Data enhancement process completed successfully.\n'));
      
      // Display detailed results for each enhancement step
      displayResults(response.data);
    } else {
      console.error(chalk.red.bold('\n✗ Data enhancement process failed.\n'));
      console.error(chalk.red(response.data.error || 'Unknown error occurred'));
    }
  } catch (error: any) {
    console.error(chalk.red.bold('\n✗ Error executing data enhancement process.\n'));
    
    if (error.response) {
      console.error(chalk.red(`Status: ${error.response.status}`));
      console.error(chalk.red(`Message: ${JSON.stringify(error.response.data, null, 2)}`));
    } else if (error.request) {
      console.error(chalk.red('No response received from server. Is the server running?'));
    } else {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  }
}

function displayResults(data: any) {
  const { contactFields, sourcesCount, cashCollected, meetingClassification, attribution } = data;
  
  // Contact fields enhancement results
  console.log(chalk.blue.bold('\nContact Field Enhancement:'));
  console.log(`Total contacts: ${chalk.yellow(contactFields.total)}`);
  console.log(`Updated contacts: ${chalk.green(contactFields.updated)}`);
  console.log(`Field coverage improved: ${chalk.green(contactFields.fieldCoverageImproved)}`);
  console.log(`Errors: ${chalk.red(contactFields.errors)}`);
  
  // Source count enhancement results
  console.log(chalk.blue.bold('\nMulti-Source Attribution Enhancement:'));
  console.log(`Total contacts: ${chalk.yellow(sourcesCount.total)}`);
  console.log(`Multi-source contacts: ${chalk.green(sourcesCount.multiSourceUpdated)}`);
  console.log(`Errors: ${chalk.red(sourcesCount.errors)}`);
  
  // Cash collected enhancement results
  console.log(chalk.blue.bold('\nCash Collected Enhancement:'));
  console.log(`Total deals: ${chalk.yellow(cashCollected.total)}`);
  console.log(`Updated deals: ${chalk.green(cashCollected.updated)}`);
  console.log(`Total cash collected: ${chalk.green('$' + cashCollected.totalCashCollected.toLocaleString())}`);
  console.log(`Errors: ${chalk.red(cashCollected.errors)}`);
  
  // Meeting classification results
  console.log(chalk.blue.bold('\nMeeting Classification:'));
  console.log(`Total meetings: ${chalk.yellow(meetingClassification.total)}`);
  console.log(`Updated meetings: ${chalk.green(meetingClassification.updated)}`);
  console.log(`Errors: ${chalk.red(meetingClassification.errors)}`);
  
  // Meeting sequence distribution
  console.log(chalk.blue.bold('\nMeeting Sequence Distribution:'));
  const sequences = meetingClassification.bySequence || {};
  Object.keys(sequences).sort((a, b) => Number(a) - Number(b)).forEach(seq => {
    const count = sequences[seq];
    console.log(`  Meeting #${seq}: ${chalk.yellow(count)}`);
  });
  
  // Attribution results summary
  if (attribution) {
    console.log(chalk.blue.bold('\nAttribution Process:'));
    console.log(`Total contacts: ${chalk.yellow(attribution.baseResults.total)}`);
    console.log(`Processed contacts: ${chalk.green(attribution.baseResults.processed)}`);
    console.log(`Successfully attributed: ${chalk.green(attribution.baseResults.attributed)}`);
    console.log(`Errors: ${chalk.red(attribution.baseResults.errors)}`);
    
    console.log(chalk.blue.bold('\nKey Attribution Metrics:'));
    const contactStats = attribution.detailedAnalytics.contactStats;
    console.log(`Contacts with deals: ${chalk.yellow(contactStats.contactsWithDeals)}`);
    console.log(`Contacts with meetings: ${chalk.yellow(contactStats.contactsWithMeetings)}`);
    console.log(`Contacts with forms: ${chalk.yellow(contactStats.contactsWithForms)}`);
    console.log(`Conversion rate: ${chalk.green((contactStats.conversionRate * 100).toFixed(2) + '%')}`);
    
    console.log(chalk.blue.bold('\nAttribution Insights:'));
    const insights = attribution.detailedAnalytics.insights;
    console.log(`Most effective channel: ${chalk.green(insights.mostEffectiveChannel)}`);
    console.log(`Most common first touch: ${chalk.green(insights.mostCommonFirstTouch)}`);
    console.log(`Most common last touch: ${chalk.green(insights.mostCommonLastTouch)}`);
    console.log(`Avg days to conversion: ${chalk.yellow(insights.avgDaysToConversion)}`);
  }
}

async function verifyContactFieldCoverage() {
  try {
    console.log(chalk.blue.bold('\n=== Contact Field Coverage Verification ===\n'));
    
    // Run a SQL query to check field coverage statistics
    const response = await axios.post(`${API_URL}/fix-contact-fields`);
    
    if (response.data.success) {
      console.log(chalk.green.bold('\n✓ Contact field enhancement complete.\n'));
      console.log(`Total contacts: ${chalk.yellow(response.data.total)}`);
      console.log(`Updated contacts: ${chalk.green(response.data.updated)}`);
      console.log(`Field coverage improved: ${chalk.green(response.data.fieldCoverageImproved)}`);
      console.log(`Errors: ${chalk.red(response.data.errors)}`);
    } else {
      console.error(chalk.red.bold('\n✗ Contact field verification failed.\n'));
      console.error(chalk.red(response.data.error || 'Unknown error occurred'));
    }
  } catch (error: any) {
    console.error(chalk.red.bold('\n✗ Error verifying contact field coverage.\n'));
    console.error(chalk.red(`Message: ${error.message}`));
  }
}

async function verifyMultiSourceRate() {
  try {
    console.log(chalk.blue.bold('\n=== Multi-Source Attribution Verification ===\n'));
    
    // Run a SQL query to check multi-source attribution statistics
    const response = await axios.post(`${API_URL}/update-sources-count`);
    
    if (response.data.success) {
      console.log(chalk.green.bold('\n✓ Multi-source attribution update complete.\n'));
      console.log(`Total contacts: ${chalk.yellow(response.data.total)}`);
      console.log(`Multi-source contacts: ${chalk.green(response.data.multiSourceUpdated)}`);
      console.log(`Errors: ${chalk.red(response.data.errors)}`);
    } else {
      console.error(chalk.red.bold('\n✗ Multi-source verification failed.\n'));
      console.error(chalk.red(response.data.error || 'Unknown error occurred'));
    }
  } catch (error: any) {
    console.error(chalk.red.bold('\n✗ Error verifying multi-source rate.\n'));
    console.error(chalk.red(`Message: ${error.message}`));
  }
}

async function verifyCashCollectedCoverage() {
  try {
    console.log(chalk.blue.bold('\n=== Cash Collected Coverage Verification ===\n'));
    
    // Fix cash collected values for won deals
    const response = await axios.post(`${API_URL}/fix-cash-collected`);
    
    if (response.data.success) {
      console.log(chalk.green.bold('\n✓ Cash collected values fixed.\n'));
      console.log(`Total won deals: ${chalk.yellow(response.data.total)}`);
      console.log(`Updated deals: ${chalk.green(response.data.updated)}`);
      console.log(`Total cash collected: ${chalk.green('$' + response.data.totalCashCollected.toLocaleString())}`);
      console.log(`Errors: ${chalk.red(response.data.errors)}`);
    } else {
      console.error(chalk.red.bold('\n✗ Cash collected verification failed.\n'));
      console.error(chalk.red(response.data.error || 'Unknown error occurred'));
    }
  } catch (error: any) {
    console.error(chalk.red.bold('\n✗ Error verifying cash collected coverage.\n'));
    console.error(chalk.red(`Message: ${error.message}`));
  }
}

async function verifyMeetingSequenceCoverage() {
  try {
    console.log(chalk.blue.bold('\n=== Meeting Sequence Coverage Verification ===\n'));
    
    // Classify meetings and set sequence numbers
    const response = await axios.post(`${API_URL}/classify-meetings`);
    
    if (response.data.success) {
      console.log(chalk.green.bold('\n✓ Meeting classification complete.\n'));
      console.log(`Total meetings: ${chalk.yellow(response.data.total)}`);
      console.log(`Updated meetings: ${chalk.green(response.data.updated)}`);
      console.log(`Errors: ${chalk.red(response.data.errors)}`);
      
      // Display meeting sequence distribution
      console.log(chalk.blue.bold('\nMeeting Sequence Distribution:'));
      const sequences = response.data.bySequence || {};
      Object.keys(sequences).sort((a, b) => Number(a) - Number(b)).forEach(seq => {
        const count = sequences[seq];
        console.log(`  Meeting #${seq}: ${chalk.yellow(count)}`);
      });
    } else {
      console.error(chalk.red.bold('\n✗ Meeting sequence verification failed.\n'));
      console.error(chalk.red(response.data.error || 'Unknown error occurred'));
    }
  } catch (error: any) {
    console.error(chalk.red.bold('\n✗ Error verifying meeting sequence coverage.\n'));
    console.error(chalk.red(`Message: ${error.message}`));
  }
}

// Run the functions based on command-line arguments
const args = process.argv.slice(2);
const command = args[0] || 'all';

async function main() {
  try {
    switch (command) {
      case 'all':
        await enhanceData();
        break;
      case 'contacts':
        await verifyContactFieldCoverage();
        break;
      case 'sources':
        await verifyMultiSourceRate();
        break;
      case 'cash':
        await verifyCashCollectedCoverage();
        break;
      case 'meetings':
        await verifyMeetingSequenceCoverage();
        break;
      default:
        console.log(chalk.yellow(`Unknown command: ${command}`));
        console.log(chalk.blue('Available commands:'));
        console.log('  all - Run all data enhancement processes');
        console.log('  contacts - Verify contact field coverage');
        console.log('  sources - Verify multi-source attribution rate');
        console.log('  cash - Verify cash collected coverage');
        console.log('  meetings - Verify meeting sequence coverage');
    }
  } catch (error: any) {
    console.error(chalk.red.bold('\n✗ Error during data enhancement process.\n'));
    console.error(chalk.red(`Message: ${error.message}`));
  }
}

main();