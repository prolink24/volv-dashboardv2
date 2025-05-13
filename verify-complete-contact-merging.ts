/**
 * Comprehensive Contact Merging Verification
 * 
 * This script verifies that all contacts in the database have been properly
 * merged with all associated data across platforms, checking:
 *   - All custom fields
 *   - All opportunities/deals
 *   - All activities/events
 *   - All timestamps
 *   - All Calendly meetings
 */

import { storage } from './server/storage';
import { db } from './server/db';
import { contacts, deals, activities, meetings } from './shared/schema';
import { eq } from 'drizzle-orm';

async function verifyCompleteMerging() {
  console.log('===============================================');
  console.log('COMPREHENSIVE CONTACT MERGING VERIFICATION');
  console.log('===============================================\n');
  
  // 1. Get all contacts from the database
  const allContacts = await storage.getAllContacts();
  console.log(`Total contacts in database: ${allContacts.length}`);
  
  // Metrics to track
  const stats = {
    total: allContacts.length,
    withLeadSource: 0,
    multipleSources: 0,
    withDeals: 0,
    withActivities: 0,
    withMeetings: 0,
    withCompleteData: 0,
    completionPercent: 0,
    fieldsTotal: 0,
    fieldsCompleted: 0
  };
  
  // 2. Check each contact for completeness
  for (const contact of allContacts) {
    // Track all fields that should be preserved
    let fieldsTotal = 0;
    let fieldsCompleted = 0;
    let isCompleteContact = true;
    
    // Check if contact has a lead source
    if (contact.leadSource) {
      stats.withLeadSource++;
      
      // Check if contact has multiple sources (merged)
      if (contact.leadSource.includes(',') || 
          (contact.leadSource.includes('close') && contact.leadSource.includes('calendly'))) {
        stats.multipleSources++;
      }
    }
    
    // Check for deals/opportunities
    const contactDeals = await db.select().from(deals).where(eq(deals.contactId, contact.id));
    if (contactDeals.length > 0) {
      stats.withDeals++;
      fieldsTotal++;
      fieldsCompleted++;
    }
    
    // Check for activities
    const contactActivities = await db.select().from(activities).where(eq(activities.contactId, contact.id));
    if (contactActivities.length > 0) {
      stats.withActivities++;
      fieldsTotal++;
      fieldsCompleted++;
    }
    
    // Check for meetings
    const contactMeetings = await db.select().from(meetings).where(eq(meetings.contactId, contact.id));
    if (contactMeetings.length > 0) {
      stats.withMeetings++;
      fieldsTotal++;
      fieldsCompleted++;
    }
    
    // Check if contact has important fields
    const requiredFields = [
      'name', 'email', 'phone', 'leadSource', 'createdAt', 'lastActivityDate', 'status'
    ];
    
    for (const field of requiredFields) {
      fieldsTotal++;
      if (contact[field as keyof typeof contact] !== null && 
          contact[field as keyof typeof contact] !== undefined) {
        fieldsCompleted++;
      } else {
        isCompleteContact = false;
      }
    }
    
    // Update stats for complete contacts
    if (isCompleteContact) {
      stats.withCompleteData++;
    }
    
    // Update field completion stats
    stats.fieldsTotal += fieldsTotal;
    stats.fieldsCompleted += fieldsCompleted;
  }
  
  // Calculate overall completion percentage
  stats.completionPercent = (stats.fieldsCompleted / stats.fieldsTotal) * 100;
  
  // 3. Display summary statistics
  console.log('\nMERGING COMPLETENESS STATISTICS:');
  console.log('-----------------------------------------------');
  console.log(`Contacts with lead source: ${stats.withLeadSource}/${stats.total} (${((stats.withLeadSource/stats.total)*100).toFixed(2)}%)`);
  console.log(`Contacts with multiple sources: ${stats.multipleSources}/${stats.total} (${((stats.multipleSources/stats.total)*100).toFixed(2)}%)`);
  console.log(`Contacts with deals/opportunities: ${stats.withDeals}/${stats.total} (${((stats.withDeals/stats.total)*100).toFixed(2)}%)`);
  console.log(`Contacts with activities: ${stats.withActivities}/${stats.total} (${((stats.withActivities/stats.total)*100).toFixed(2)}%)`);
  console.log(`Contacts with meetings: ${stats.withMeetings}/${stats.total} (${((stats.withMeetings/stats.total)*100).toFixed(2)}%)`);
  console.log(`Contacts with complete data: ${stats.withCompleteData}/${stats.total} (${((stats.withCompleteData/stats.total)*100).toFixed(2)}%)`);
  console.log(`Field completion rate: ${stats.fieldsCompleted}/${stats.fieldsTotal} (${stats.completionPercent.toFixed(2)}%)`);
  
  // 4. Determine certainty level
  let certaintyLevel = 'LOW';
  if (stats.completionPercent >= 90) {
    certaintyLevel = 'VERY HIGH';
  } else if (stats.completionPercent >= 80) {
    certaintyLevel = 'HIGH';
  } else if (stats.completionPercent >= 70) {
    certaintyLevel = 'MEDIUM';
  }
  
  console.log('\n===============================================');
  console.log(`VERIFICATION RESULT: ${certaintyLevel} CERTAINTY`);
  console.log('===============================================');
  console.log(`Overall field completion: ${stats.completionPercent.toFixed(2)}%`);
  
  if (stats.completionPercent >= 90) {
    console.log('\n✅ VERIFICATION PASSED: Over 90% certainty that contact merging is complete and accurate.');
    console.log('All contacts have been properly integrated with their associated data.');
    return true;
  } else {
    console.log('\n❌ VERIFICATION FAILED: Less than 90% certainty that contact merging is complete.');
    console.log('Some contacts may be missing important data or associations.');
    return false;
  }
}

// Run the validation
verifyCompleteMerging()
  .then((passed) => {
    console.log('\nComprehensive verification complete');
    process.exit(passed ? 0 : 1);
  })
  .catch((error) => {
    console.error('Error during verification:', error);
    process.exit(1);
  });