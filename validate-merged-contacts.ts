/**
 * Validate Contact Merging Completeness
 * 
 * This script validates that our contact merging functionality is working correctly
 * by checking for contacts with multiple lead sources (close,calendly) to ensure
 * proper data integration.
 */

import { storage } from './server/storage';
import { Contact } from './shared/schema';

// Minimum percentage required to pass validation
const MIN_REQUIRED_ACCURACY = 90; 

/**
 * Main validation function
 */
async function validateMergedContacts() {
  console.log('Starting merged contact validation...');
  console.log('======================================\n');
  
  // Get all contacts from database
  const allContacts = await storage.getAllContacts();
  console.log(`Total contacts in database: ${allContacts.length}`);
  
  // Identify contacts with multiple lead sources
  const mergedContacts = allContacts.filter(contact => {
    return contact.leadSource && 
           contact.leadSource.includes('close') && 
           contact.leadSource.includes('calendly');
  });
  
  console.log(`Found ${mergedContacts.length} contacts with both Close and Calendly data\n`);
  
  // If we have no merged contacts, we can't validate
  if (mergedContacts.length === 0) {
    console.log('❌ VALIDATION FAILED: No contacts with merged data found');
    return;
  }
  
  // Track field completeness for merged contacts
  const fieldStats = analyzeFieldCompleteness(mergedContacts);
  
  // Calculate overall accuracy
  const overallAccuracy = calculateOverallAccuracy(fieldStats, mergedContacts.length);
  
  // Display detailed results
  displayResults(fieldStats, overallAccuracy, mergedContacts.length);
}

/**
 * Analyze field completeness for merged contacts
 */
function analyzeFieldCompleteness(mergedContacts: Contact[]) {
  // Fields we expect to be present in properly merged contacts
  const criticalFields = ['name', 'email', 'phone', 'company', 'leadSource'];
  const importantFields = ['title', 'notes', 'lastActivityDate', 'status', 'createdAt'];
  
  // Track statistics for each field
  const fieldStats: Record<string, { present: number, percentage: number }> = {};
  
  // Initialize stats
  [...criticalFields, ...importantFields].forEach(field => {
    fieldStats[field] = { present: 0, percentage: 0 };
  });
  
  // Count presence of each field
  mergedContacts.forEach(contact => {
    [...criticalFields, ...importantFields].forEach(field => {
      if (contact[field] !== null && contact[field] !== undefined) {
        fieldStats[field].present += 1;
      }
    });
    
    // Special case for leadSource - check if it contains both sources
    if (fieldStats['leadSource'] && contact.leadSource) {
      const hasCloseCRM = contact.leadSource.includes('close');
      const hasCalendly = contact.leadSource.includes('calendly');
      
      if (hasCloseCRM && hasCalendly) {
        // Already counted in main loop, nothing to do here
      } else if (fieldStats['leadSource'].present > 0) {
        // Doesn't have both sources, decrement count
        fieldStats['leadSource'].present -= 1;
      }
    }
  });
  
  // Calculate percentages
  Object.keys(fieldStats).forEach(field => {
    fieldStats[field].percentage = (fieldStats[field].present / mergedContacts.length) * 100;
  });
  
  return { criticalFields, importantFields, fieldStats };
}

/**
 * Calculate overall accuracy based on field completeness
 */
function calculateOverallAccuracy(
  fieldStats: { criticalFields: string[], importantFields: string[], fieldStats: Record<string, { present: number, percentage: number }> },
  totalContacts: number
) {
  // Critical fields have higher weight (70%) than important fields (30%)
  let criticalScore = 0;
  let importantScore = 0;
  
  fieldStats.criticalFields.forEach(field => {
    criticalScore += fieldStats.fieldStats[field].percentage;
  });
  
  fieldStats.importantFields.forEach(field => {
    importantScore += fieldStats.fieldStats[field].percentage;
  });
  
  // Calculate weighted scores
  criticalScore = criticalScore / fieldStats.criticalFields.length;
  importantScore = importantScore / fieldStats.importantFields.length;
  
  // Final weighted accuracy
  return (criticalScore * 0.7) + (importantScore * 0.3);
}

/**
 * Display validation results
 */
function displayResults(
  fieldStats: { criticalFields: string[], importantFields: string[], fieldStats: Record<string, { present: number, percentage: number }> },
  overallAccuracy: number,
  totalContacts: number
) {
  console.log('============================================');
  console.log('VALIDATION RESULTS:');
  console.log('============================================');
  console.log(`Overall Contact Merging Accuracy: ${overallAccuracy.toFixed(2)}%`);
  
  console.log('\nCritical Field Completeness:');
  fieldStats.criticalFields.forEach(field => {
    const stats = fieldStats.fieldStats[field];
    console.log(`- ${field}: ${stats.percentage.toFixed(2)}% (${stats.present}/${totalContacts})`);
  });
  
  console.log('\nImportant Field Completeness:');
  fieldStats.importantFields.forEach(field => {
    const stats = fieldStats.fieldStats[field];
    console.log(`- ${field}: ${stats.percentage.toFixed(2)}% (${stats.present}/${totalContacts})`);
  });
  
  // Final assessment
  if (overallAccuracy >= MIN_REQUIRED_ACCURACY) {
    console.log(`\n✅ VALIDATION PASSED: Overall accuracy ${overallAccuracy.toFixed(2)}% exceeds the required ${MIN_REQUIRED_ACCURACY}% threshold`);
  } else {
    console.log(`\n❌ VALIDATION FAILED: Overall accuracy ${overallAccuracy.toFixed(2)}% is below the required ${MIN_REQUIRED_ACCURACY}% threshold`);
  }
}

// Run the validation
validateMergedContacts()
  .then(() => {
    console.log('\nValidation complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during validation:', error);
    process.exit(1);
  });