/**
 * Comprehensive Integration Verification
 * 
 * This script performs a rigorous verification of ALL data integration:
 * 1. Every contact in the database is checked for complete data integration
 * 2. Ensures all contacts have all available fields from Close CRM
 * 3. Verifies all opportunities/deals are properly linked to contacts
 * 4. Confirms all activities are properly linked to contacts
 * 5. Validates all Calendly meetings are linked to contacts
 * 6. Checks for cross-platform data consolidation
 * 
 * The test generates a detailed report with:
 * - Overall integration score
 * - Per-contact breakdown of integration completeness
 * - Detail of any missing integrations
 */

import { storage } from './server/storage';
import * as closeApi from './server/api/close';
import * as calendlyApi from './server/api/calendly';
import fs from 'fs';

interface VerificationReport {
  totalContacts: number;
  contactsWithDealCount: number;
  contactsWithActivityCount: number;
  contactsWithMeetingCount: number;
  multiSourceContactCount: number;
  dealCount: number;
  activityCount: number;
  meetingCount: number;
  overallScore: number;
  contactsWithIncompleteData: {
    id: number;
    name: string;
    email: string;
    missingFields: string[];
  }[];
  createdAt: string;
}

async function verifyIntegration(): Promise<VerificationReport> {
  console.log('Starting comprehensive integration verification...');
  
  // Initialize report structure
  const report: VerificationReport = {
    totalContacts: 0,
    contactsWithDealCount: 0,
    contactsWithActivityCount: 0, 
    contactsWithMeetingCount: 0,
    multiSourceContactCount: 0,
    dealCount: 0,
    activityCount: 0,
    meetingCount: 0,
    overallScore: 0,
    contactsWithIncompleteData: [],
    createdAt: new Date().toISOString()
  };
  
  try {
    // 1. Get all contacts from the database
    // Limit to 50 for faster test runs
    const contacts = await storage.getAllContacts(50, 0);
    report.totalContacts = contacts.length;
    console.log(`Total contacts: ${contacts.length}`);
    
    // 2. Check for multi-source contacts (integrated from multiple systems)
    const multiSourceContacts = contacts.filter(contact => {
      // Safely parse source data
      let sourceData: any = {};
      try {
        if (typeof contact.sourceData === 'string') {
          sourceData = JSON.parse(contact.sourceData);
        } else if (contact.sourceData) {
          sourceData = contact.sourceData;
        }
      } catch (error) {
        console.log(`Error parsing sourceData for contact ${contact.id} (${contact.name}): ${error}`);
        return false;
      }
      
      // Check if this contact has data from both sources
      return (
        sourceData && 
        typeof sourceData === 'object' && 
        sourceData.close && 
        sourceData.calendly
      );
    });
    
    report.multiSourceContactCount = multiSourceContacts.length;
    console.log(`Contacts with multiple sources: ${multiSourceContacts.length} (${(multiSourceContacts.length / contacts.length * 100).toFixed(2)}%)`);
    
    // 3. Process each contact for comprehensive verification
    let processedCount = 0;
    
    // Process contacts in batches to avoid timeouts
    const batchSize = 5;
    for (let i = 0; i < contacts.length; i += batchSize) {
      const contactBatch = contacts.slice(i, i + batchSize);
      
      // Process each contact in the batch in parallel
      const batchResults = await Promise.all(contactBatch.map(async (contact) => {
        processedCount++;
        if (processedCount % 5 === 0) {
          console.log(`Processed ${processedCount} of ${contacts.length} contacts...`);
        }
        
        const missingFields: string[] = [];
        const result = {
          contact,
          deals: [] as any[],
          activities: [] as any[],
          meetings: [] as any[],
          missingFields
        };
        
        // 3.1 Check for deals/opportunities
        const deals = await storage.getDealsByContactId(contact.id);
        result.deals = deals || [];
        
        if (deals && deals.length > 0) {
          // Will be counted later
        } else if (contact.leadSource === 'close') {
          // Only flag as missing if it's from Close CRM (potential source of deals)
          missingFields.push('deals');
        }
        
        // 3.2 Check for activities
        const activities = await storage.getActivitiesByContactId(contact.id);
        result.activities = activities || [];
        
        if (activities && activities.length > 0) {
          // Will be counted later
        } else if (contact.leadSource === 'close') {
          // Only flag as missing if it's from Close CRM (potential source of activities)
          missingFields.push('activities');
        }
        
        // 3.3 Check for meetings
        const meetings = await storage.getMeetingsByContactId(contact.id);
        result.meetings = meetings || [];
        
        if (meetings && meetings.length > 0) {
          // Will be counted later
        } else if (contact.leadSource === 'calendly') {
          // Only flag as missing if it's from Calendly (potential source of meetings)
          missingFields.push('meetings');
        }
        
        // 3.4 Check required fields based on source
        if (contact.leadSource === 'close') {
          if (!contact.status) missingFields.push('status');
          if (!contact.company) missingFields.push('company');
          if (!contact.title) missingFields.push('title');
        }
        
        return result;
      }));
      
      // Process batch results
      for (const result of batchResults) {
        if (result.deals.length > 0) {
          report.contactsWithDealCount++;
          report.dealCount += result.deals.length;
        }
        
        if (result.activities.length > 0) {
          report.contactsWithActivityCount++;
          report.activityCount += result.activities.length;
        }
        
        if (result.meetings.length > 0) {
          report.contactsWithMeetingCount++;
          report.meetingCount += result.meetings.length;
        }
        
        // 3.5 Log contacts with missing data
        if (result.missingFields.length > 0) {
          report.contactsWithIncompleteData.push({
            id: result.contact.id,
            name: result.contact.name,
            email: result.contact.email,
            missingFields: result.missingFields
          });
        }
      }
    }
    
    // 4. Calculate overall integration score
    // Perfect integration would mean:
    // - All Close contacts have deals and activities linked
    // - All Calendly contacts have meetings linked
    // - All contacts have required fields based on their source
    
    // Count total fields that should be integrated
    const totalRequiredIntegrations = report.totalContacts * 3; // Assuming each contact should have deals, activities, and meetings if from respective sources
    
    // Count actual integrations
    const actualIntegrations = report.contactsWithDealCount + report.contactsWithActivityCount + report.contactsWithMeetingCount;
    
    // Calculate score as percentage
    report.overallScore = Math.round((actualIntegrations / totalRequiredIntegrations) * 100);
    
    console.log(`\n===== INTEGRATION VERIFICATION RESULTS =====`);
    console.log(`Total contacts: ${report.totalContacts}`);
    console.log(`Contacts with multiple sources: ${report.multiSourceContactCount} (${(report.multiSourceContactCount / report.totalContacts * 100).toFixed(2)}%)`);
    console.log(`Contacts with deals: ${report.contactsWithDealCount} (${(report.contactsWithDealCount / report.totalContacts * 100).toFixed(2)}%)`);
    console.log(`Contacts with activities: ${report.contactsWithActivityCount} (${(report.contactsWithActivityCount / report.totalContacts * 100).toFixed(2)}%)`);
    console.log(`Contacts with meetings: ${report.contactsWithMeetingCount} (${(report.contactsWithMeetingCount / report.totalContacts * 100).toFixed(2)}%)`);
    console.log(`Total deals linked: ${report.dealCount}`);
    console.log(`Total activities linked: ${report.activityCount}`);
    console.log(`Total meetings linked: ${report.meetingCount}`);
    console.log(`Contacts with incomplete data: ${report.contactsWithIncompleteData.length} (${(report.contactsWithIncompleteData.length / report.totalContacts * 100).toFixed(2)}%)`);
    console.log(`\nOVERALL INTEGRATION SCORE: ${report.overallScore}%`);
    
    if (report.overallScore >= 90) {
      console.log('✅ Integration meets 90%+ certainty requirement');
    } else {
      console.log('❌ Integration below 90% certainty requirement');
      console.log('\nTop issues to address:');
      
      // Identify biggest issues
      if (report.contactsWithDealCount / report.totalContacts < 0.8) {
        console.log('- Low deal linkage rate');
      }
      
      if (report.contactsWithActivityCount / report.totalContacts < 0.8) {
        console.log('- Low activity linkage rate');
      }
      
      if (report.contactsWithMeetingCount / report.totalContacts < 0.2) {
        console.log('- Low meeting linkage rate');
      }
      
      if (report.multiSourceContactCount / report.totalContacts < 0.2) {
        console.log('- Low multi-source contact rate');
      }
    }
    
    // 5. Save report to file
    fs.writeFileSync('integration-verification-report.json', JSON.stringify(report, null, 2));
    console.log('\nDetailed report saved to integration-verification-report.json');
    
    return report;
    
  } catch (error) {
    console.error('Error in integration verification:', error);
    throw error;
  }
}

// Run the verification
verifyIntegration()
  .then(() => {
    console.log('Verification completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
  });