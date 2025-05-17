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

import fieldMappingService from './server/services/field-mapping';
import dealEnhancementService from './server/services/deal-enhancement';
import attributionService from './server/services/attribution';
import { storage } from './server/storage';

async function enhanceData() {
  try {
    console.log('==================================================');
    console.log('Starting data quality enhancement process...');
    console.log('==================================================\n');
    
    // 1. Fix missing contact fields
    console.log('\n--- Step 1: Fixing missing contact fields ---');
    const contactFieldResult = await fieldMappingService.fixAllContactFields();
    
    if (contactFieldResult.success) {
      console.log(`✅ Successfully processed ${contactFieldResult.processed} contacts and updated ${contactFieldResult.updated}`);
    } else {
      console.error(`❌ Failed to fix contact fields: ${contactFieldResult.error}`);
    }
    
    // 2. Update sources count for multi-source attribution
    console.log('\n--- Step 2: Updating sources count for multi-source attribution ---');
    const sourcesCountResult = await fieldMappingService.updateSourcesCount();
    
    if (sourcesCountResult.success) {
      console.log(`✅ Successfully updated ${sourcesCountResult.updated} contacts' source counts`);
      console.log(`Found ${sourcesCountResult.withMultipleSources} contacts with multiple sources`);
    } else {
      console.error(`❌ Failed to update sources count: ${sourcesCountResult.error}`);
    }
    
    // 3. Fix cash collected values for won deals
    console.log('\n--- Step 3: Fixing cash collected values for won deals ---');
    const cashCollectedResult = await dealEnhancementService.fixCashCollectedValues();
    
    if (cashCollectedResult.success) {
      console.log(`✅ Successfully processed ${cashCollectedResult.processed} won deals and updated ${cashCollectedResult.updated} with cash collected values`);
    } else {
      console.error(`❌ Failed to fix cash collected values: ${cashCollectedResult.error}`);
    }
    
    // 4. Classify meetings and set sequence numbers
    console.log('\n--- Step 4: Classifying meetings and setting sequence numbers ---');
    const meetingClassificationResult = await dealEnhancementService.classifyMeetings();
    
    if (meetingClassificationResult.success) {
      console.log(`✅ Successfully classified ${meetingClassificationResult.updated} meetings with sequence numbers`);
    } else {
      console.error(`❌ Failed to classify meetings: ${meetingClassificationResult.error}`);
    }
    
    // 5. Run the attribution service after data is enhanced
    console.log('\n--- Step 5: Running attribution for all contacts with enhanced data ---');
    const attributionResult = await attributionService.attributeAllContacts();
    
    if (attributionResult.success) {
      console.log(`✅ Successfully attributed ${attributionResult.contactsProcessed} contacts`);
      console.log(`Found ${attributionResult.multiSourceContacts} multi-source contacts`);
    } else {
      console.error(`❌ Failed to run attribution: ${attributionResult.error}`);
    }
    
    // 6. Final verification
    console.log('\n--- Final Verification ---');
    
    // Check contact fields
    const contactFieldCoverage = await verifyContactFieldCoverage();
    console.log(`Contact field coverage: ${contactFieldCoverage.title}% title, ${contactFieldCoverage.lastActivity}% lastActivityDate, ${contactFieldCoverage.assignedTo}% assignedTo`);
    
    // Check multi-source rate
    const multiSourceRate = await verifyMultiSourceRate();
    console.log(`Multi-source contact rate: ${multiSourceRate.toFixed(2)}%`);
    
    // Check cash collected coverage
    const cashCollectedCoverage = await verifyCashCollectedCoverage();
    console.log(`Cash collected coverage for won deals: ${cashCollectedCoverage.toFixed(2)}%`);
    
    // Check meeting sequence coverage
    const meetingSequenceCoverage = await verifyMeetingSequenceCoverage();
    console.log(`Meeting sequence coverage: ${meetingSequenceCoverage.toFixed(2)}%`);
    
    console.log('\n==================================================');
    console.log('Data enhancement process completed!');
    console.log('==================================================');
    
  } catch (error: any) {
    console.error('Error during data enhancement:', error.message);
  }
}

async function verifyContactFieldCoverage() {
  const result = await storage.query(`
    SELECT 
      COUNT(*) as total_contacts,
      SUM(CASE WHEN title IS NOT NULL THEN 1 ELSE 0 END) as contacts_with_title,
      SUM(CASE WHEN last_activity_date IS NOT NULL THEN 1 ELSE 0 END) as contacts_with_last_activity,
      SUM(CASE WHEN assigned_to IS NOT NULL THEN 1 ELSE 0 END) as contacts_with_assigned_to
    FROM contacts
  `);
  
  const data = result[0];
  const totalContacts = parseInt(data.total_contacts);
  
  return {
    title: totalContacts > 0 ? (parseInt(data.contacts_with_title) / totalContacts * 100).toFixed(2) : 0,
    lastActivity: totalContacts > 0 ? (parseInt(data.contacts_with_last_activity) / totalContacts * 100).toFixed(2) : 0,
    assignedTo: totalContacts > 0 ? (parseInt(data.contacts_with_assigned_to) / totalContacts * 100).toFixed(2) : 0
  };
}

async function verifyMultiSourceRate() {
  const result = await storage.query(`
    SELECT 
      COUNT(*) as total_contacts,
      SUM(CASE WHEN sources_count > 1 THEN 1 ELSE 0 END) as multi_source_contacts
    FROM contacts
  `);
  
  const data = result[0];
  const totalContacts = parseInt(data.total_contacts);
  const multiSourceContacts = parseInt(data.multi_source_contacts);
  
  return totalContacts > 0 ? (multiSourceContacts / totalContacts * 100) : 0;
}

async function verifyCashCollectedCoverage() {
  const result = await storage.query(`
    SELECT 
      COUNT(*) as total_won_deals,
      SUM(CASE WHEN cash_collected IS NOT NULL AND cash_collected != '' THEN 1 ELSE 0 END) as deals_with_cash_collected
    FROM deals
    WHERE status = 'won'
  `);
  
  const data = result[0];
  const totalWonDeals = parseInt(data.total_won_deals);
  const dealsWithCashCollected = parseInt(data.deals_with_cash_collected);
  
  return totalWonDeals > 0 ? (dealsWithCashCollected / totalWonDeals * 100) : 0;
}

async function verifyMeetingSequenceCoverage() {
  const result = await storage.query(`
    SELECT 
      COUNT(*) as total_meetings,
      SUM(CASE WHEN sequence IS NOT NULL THEN 1 ELSE 0 END) as meetings_with_sequence
    FROM meetings
  `);
  
  const data = result[0];
  const totalMeetings = parseInt(data.total_meetings);
  const meetingsWithSequence = parseInt(data.meetings_with_sequence);
  
  return totalMeetings > 0 ? (meetingsWithSequence / totalMeetings * 100) : 0;
}

// Run the main function
enhanceData().catch(console.error);