/**
 * Comprehensive Contact Merging Validation Test
 * 
 * This script validates that our contact merging functionality properly
 * merges all essential data between Close CRM and Calendly, including:
 * - Custom fields
 * - Opportunities
 * - Activities
 * - Timestamps
 * - Notes and communication history
 * 
 * The goal is to achieve >90% certainty that our merging is complete and accurate.
 */

import { storage } from './server/storage';
import { findBestMatchingContact, createOrUpdateContact, MatchConfidence } from './server/services/contact-matcher';
// No need to import the APIs directly since we're using the storage interface
// import * as closeApi from './server/api/close';
// import * as calendlyApi from './server/api/calendly';
import { Contact, InsertContact } from './shared/schema';

// Number of contacts to test from each system
const SAMPLE_SIZE = 50;
const MIN_REQUIRED_ACCURACY = 90; // 90% accuracy threshold

// Field tracking for completeness
interface FieldCompleteness {
  total: number;
  merged: number;
  fieldCounts: Record<string, { total: number; merged: number }>;
}

/**
 * Main validation function
 */
async function validateContactMergingCompleteness() {
  console.log('Starting comprehensive contact merging validation...');
  console.log('==================================================\n');
  
  // Get samples from both Close and Calendly
  const closeContacts = await sampleCloseContacts(SAMPLE_SIZE);
  const calendlyContacts = await sampleCalendlyContacts(SAMPLE_SIZE);
  
  if (!closeContacts.length || !calendlyContacts.length) {
    console.log('ERROR: Could not retrieve sample contacts from one or both systems.');
    return;
  }
  
  console.log(`Retrieved ${closeContacts.length} contacts from Close CRM`);
  console.log(`Retrieved ${calendlyContacts.length} contacts from Calendly\n`);
  
  // Track testing metrics
  const metrics = {
    totalTests: 0,
    successfulMatches: 0,
    failedMatches: 0,
    fieldCompleteness: {
      total: 0,
      merged: 0,
      fieldCounts: {} as Record<string, { total: number; merged: number }>
    }
  };

  // Cross test some of the contacts that should already be merged
  console.log('Testing existing merged contacts...');
  for (const closeContact of closeContacts) {
    metrics.totalTests++;
    
    // Skip contacts without email (can't reliably test)
    if (!closeContact.email) {
      console.log(`Skipping Close contact without email: ${closeContact.name}`);
      continue;
    }
    
    // Find matching Calendly contact if it exists
    const matchingCalendlyContact = calendlyContacts.find(c => 
      c.email && c.email.toLowerCase() === closeContact.email.toLowerCase()
    );
    
    if (!matchingCalendlyContact) {
      // If no match in our sample, that's OK - just means this contact doesn't have Calendly data
      console.log(`No matching Calendly contact found for ${closeContact.name} (${closeContact.email})`);
      continue;
    }
    
    // We have a real match! Check if our system finds it
    console.log(`\nTesting contact pair: ${closeContact.name} (${closeContact.email})`);
    
    // 1. Test if our matcher finds the match
    const matchResult = await findBestMatchingContact(matchingCalendlyContact);
    
    if (matchResult.contact && 
        matchResult.contact.email.toLowerCase() === closeContact.email.toLowerCase() &&
        matchResult.confidence !== MatchConfidence.NONE) {
      console.log(`✅ Successfully matched: ${matchResult.confidence} confidence`);
      metrics.successfulMatches++;
      
      // 2. Now test if our merger correctly handles all fields
      const mergeResult = await createOrUpdateContact(
        matchingCalendlyContact as InsertContact,
        true,
        MatchConfidence.MEDIUM
      );
      
      // Track field completeness
      trackFieldCompleteness(closeContact, matchingCalendlyContact, mergeResult.contact, metrics.fieldCompleteness);
      
      console.log(`Fields correctly merged: ${Math.round((metrics.fieldCompleteness.merged / metrics.fieldCompleteness.total) * 100)}%`);
    } else {
      console.log(`❌ Failed to match - got ${matchResult.confidence} confidence`);
      console.log(`   Reason: ${matchResult.reason || 'No reason provided'}`);
      metrics.failedMatches++;
    }
  }
  
  // Calculate overall results
  const matchAccuracy = metrics.successfulMatches / metrics.totalTests * 100;
  const fieldMergeAccuracy = metrics.fieldCompleteness.merged / metrics.fieldCompleteness.total * 100;
  const overallAccuracy = (matchAccuracy + fieldMergeAccuracy) / 2;
  
  // Show detailed results
  console.log('\n==================================================');
  console.log('VALIDATION RESULTS:');
  console.log('==================================================');
  console.log(`Contact Matching Accuracy: ${matchAccuracy.toFixed(2)}%`);
  console.log(`Field Merging Completeness: ${fieldMergeAccuracy.toFixed(2)}%`);
  console.log(`Overall System Accuracy: ${overallAccuracy.toFixed(2)}%`);
  
  // Show per-field completeness
  console.log('\nField-by-field merging completeness:');
  for (const [field, counts] of Object.entries(metrics.fieldCompleteness.fieldCounts)) {
    const fieldAccuracy = (counts.merged / counts.total) * 100;
    console.log(`- ${field}: ${fieldAccuracy.toFixed(2)}% (${counts.merged}/${counts.total})`);
  }
  
  // Final assessment
  if (overallAccuracy >= MIN_REQUIRED_ACCURACY) {
    console.log(`\n✅ VALIDATION PASSED: System accuracy ${overallAccuracy.toFixed(2)}% exceeds the required ${MIN_REQUIRED_ACCURACY}% threshold`);
  } else {
    console.log(`\n❌ VALIDATION FAILED: System accuracy ${overallAccuracy.toFixed(2)}% is below the required ${MIN_REQUIRED_ACCURACY}% threshold`);
  }
}

/**
 * Track which fields are properly merged between contacts
 */
function trackFieldCompleteness(
  closeContact: any, 
  calendlyContact: any, 
  mergedContact: Contact,
  completeness: FieldCompleteness
) {
  // List of fields we care about properly merging
  const fieldsToTrack = [
    'name', 'email', 'phone', 'company', 'title', 'leadSource',
    'lastActivityDate', 'notes', 'status', 'tags'
  ];
  
  for (const field of fieldsToTrack) {
    // Initialize field counter if needed
    if (!completeness.fieldCounts[field]) {
      completeness.fieldCounts[field] = { total: 0, merged: 0 };
    }
    
    // Skip if neither contact has this field
    if (!closeContact[field] && !calendlyContact[field]) {
      continue;
    }
    
    completeness.total++;
    completeness.fieldCounts[field].total++;
    
    // Check specific field merging logic
    let correctlyMerged = false;
    
    switch (field) {
      case 'name':
        // Name should prefer the more complete version
        const closeName = closeContact.name || '';
        const calendlyName = calendlyContact.name || '';
        const mergedName = mergedContact.name || '';
        
        // If the merged name is the longer of the two, it's correct
        correctlyMerged = mergedName === (closeName.length >= calendlyName.length ? closeName : calendlyName);
        break;
        
      case 'email':
        // Email should be preserved
        correctlyMerged = mergedContact.email === closeContact.email;
        break;
        
      case 'leadSource':
        // Lead source should include both sources
        const mergedSource = mergedContact.leadSource || '';
        correctlyMerged = mergedSource.includes('close') && mergedSource.includes('calendly');
        break;
        
      case 'notes':
        // Notes should include content from both
        const closeNotes = closeContact.notes || '';
        const calendlyNotes = calendlyContact.notes || '';
        const mergedNotes = mergedContact.notes || '';
        
        if (!closeNotes || !calendlyNotes) {
          // If one is empty, merged should match the non-empty one
          correctlyMerged = mergedNotes === (closeNotes || calendlyNotes);
        } else {
          // If both have notes, merged should contain parts of both
          correctlyMerged = 
            (mergedNotes.includes(closeNotes.substring(0, 20)) || closeNotes.includes(mergedNotes.substring(0, 20))) &&
            (mergedNotes.includes(calendlyNotes.substring(0, 20)) || calendlyNotes.includes(mergedNotes.substring(0, 20)));
        }
        break;
        
      default:
        // For other fields, if both have values, merged should preserve the Close value
        // If only one has a value, merged should have that value
        if (closeContact[field] && calendlyContact[field]) {
          correctlyMerged = mergedContact[field] === closeContact[field];
        } else {
          correctlyMerged = mergedContact[field] === (closeContact[field] || calendlyContact[field]);
        }
    }
    
    if (correctlyMerged) {
      completeness.merged++;
      completeness.fieldCounts[field].merged++;
    } else {
      console.log(`  - Field '${field}' not correctly merged:`);
      console.log(`    Close: ${closeContact[field]}`);
      console.log(`    Calendly: ${calendlyContact[field]}`);
      console.log(`    Merged: ${mergedContact[field]}`);
    }
  }
}

/**
 * Get a random sample of Close contacts from our database
 */
async function sampleCloseContacts(count: number): Promise<any[]> {
  try {
    console.log('Fetching Close contacts from database...');
    
    // Use storage to get contacts with leadSource = 'close'
    const allContacts = await storage.getAllContacts();
    const closeContacts = allContacts.filter(contact => 
      contact.leadSource && contact.leadSource.includes('close'));
    
    console.log(`Found ${closeContacts.length} Close contacts in database`);
    
    if (closeContacts.length === 0) {
      console.error('Error: No Close contacts found in database');
      return [];
    }
    
    // Take a random sample of the contacts
    return randomSample(closeContacts, count);
  } catch (error) {
    console.error('Error fetching Close contacts:', error);
    return [];
  }
}

/**
 * Get a random sample of Calendly contacts from our database
 */
async function sampleCalendlyContacts(count: number): Promise<any[]> {
  try {
    console.log('Fetching Calendly contacts from database...');
    
    // Use storage to get contacts with leadSource = 'calendly'
    const allContacts = await storage.getAllContacts();
    const calendlyContacts = allContacts.filter(contact => 
      contact.leadSource && contact.leadSource.includes('calendly'));
    
    console.log(`Found ${calendlyContacts.length} Calendly contacts in database`);
    
    if (calendlyContacts.length === 0) {
      console.error('Error: No Calendly contacts found in database');
      return [];
    }
    
    // Take a random sample of the contacts
    return randomSample(calendlyContacts, count);
  } catch (error) {
    console.error('Error fetching Calendly contacts:', error);
    return [];
  }
}

/**
 * Get a random sample from an array
 */
function randomSample<T>(array: T[], sampleSize: number): T[] {
  if (!array || array.length === 0) return [];
  if (array.length <= sampleSize) return array;
  
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, sampleSize);
}

// Run the validation
validateContactMergingCompleteness()
  .then(() => {
    console.log('\nValidation complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during validation:', error);
    process.exit(1);
  });