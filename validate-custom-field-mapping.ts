/**
 * Custom Field Mapping Validation
 * 
 * This script validates that all custom fields are properly mapped during contact merging
 * to ensure accurate attribution across platforms (Close CRM, Calendly, Typeform).
 * 
 * It checks that all the required custom fields are preserved and correctly merged
 * at the contact level, which is critical for comprehensive KPI reporting.
 */

import { storage } from './server/storage';
import { Contact, InsertContact, Deal } from './shared/schema';
import { createOrUpdateContact } from './server/services/contact-matcher';
import { MatchConfidence } from './server/services/contact-matcher';

// Define the custom fields we need to validate
const REQUIRED_CONTACT_FIELDS = [
  'name', 'email', 'phone', 'company', 'title', 'leadSource', 
  'status', 'notes', 'lastActivityDate', 'assignedTo'
];

const REQUIRED_DEAL_FIELDS = [
  'lead_name', 'confidence', 'status_label', 'value_period', 
  'value_currency', 'opportunity_data'
];

interface ValidationStats {
  contactsChecked: number;
  fieldMappingSuccess: number;
  fieldMappingFailures: { [key: string]: number };
  opportunitiesChecked: number;
  opportunityFieldSuccess: number;
  opportunityFieldFailures: { [key: string]: number };
  multiSourceContacts: number;
  platformCoverage: {
    close: number;
    calendly: number;
    typeform: number;
  };
}

async function validateCustomFieldMapping() {
  console.log('🔍 Starting Custom Field Mapping Validation...');
  console.log('==============================================');
  
  const stats: ValidationStats = {
    contactsChecked: 0,
    fieldMappingSuccess: 0,
    fieldMappingFailures: {},
    opportunitiesChecked: 0,
    opportunityFieldSuccess: 0,
    opportunityFieldFailures: {},
    multiSourceContacts: 0,
    platformCoverage: {
      close: 0,
      calendly: 0,
      typeform: 0
    }
  };
  
  // Initialize field failure counters
  REQUIRED_CONTACT_FIELDS.forEach(field => {
    stats.fieldMappingFailures[field] = 0;
  });
  
  REQUIRED_DEAL_FIELDS.forEach(field => {
    stats.opportunityFieldFailures[field] = 0;
  });
  
  try {
    // Get all contacts
    const contacts = await storage.getAllContacts();
    console.log(`Found ${contacts.length} contacts to validate`);
    
    // Validate each contact
    for (const contact of contacts) {
      stats.contactsChecked++;
      
      // Check leadSource to identify multi-source contacts
      if (contact.leadSource) {
        if (contact.leadSource.includes('close')) {
          stats.platformCoverage.close++;
        }
        if (contact.leadSource.includes('calendly')) {
          stats.platformCoverage.calendly++;
        }
        if (contact.leadSource.includes('typeform')) {
          stats.platformCoverage.typeform++;
        }
        
        // Count multi-source contacts
        const sourcesCount = [
          contact.leadSource.includes('close'),
          contact.leadSource.includes('calendly'),
          contact.leadSource.includes('typeform')
        ].filter(Boolean).length;
        
        if (sourcesCount > 1) {
          stats.multiSourceContacts++;
        }
      }
      
      // Check required contact fields
      let contactFieldsValid = true;
      for (const field of REQUIRED_CONTACT_FIELDS) {
        const fieldKey = field as keyof Contact;
        if (contact[fieldKey] === undefined || contact[fieldKey] === null) {
          stats.fieldMappingFailures[field]++;
          contactFieldsValid = false;
        }
      }
      
      if (contactFieldsValid) {
        stats.fieldMappingSuccess++;
      }
      
      // Check opportunities and their required fields
      const opportunities = await storage.getDealsByContactId(contact.id);
      
      if (opportunities.length > 0) {
        stats.opportunitiesChecked += opportunities.length;
        
        for (const opportunity of opportunities) {
          // Extract metadata for validation
          let metadata: any = {};
          if (opportunity.metadata) {
            try {
              if (typeof opportunity.metadata === 'string') {
                metadata = JSON.parse(opportunity.metadata);
              } else {
                metadata = opportunity.metadata;
              }
              
              // Check required deal fields
              let opportunityFieldsValid = true;
              for (const field of REQUIRED_DEAL_FIELDS) {
                if (metadata[field] === undefined) {
                  stats.opportunityFieldFailures[field]++;
                  opportunityFieldsValid = false;
                }
              }
              
              if (opportunityFieldsValid) {
                stats.opportunityFieldSuccess++;
              }
            } catch (error) {
              console.error(`Error parsing metadata for opportunity ${opportunity.id}:`, error);
              // Count this as failures for all fields
              REQUIRED_DEAL_FIELDS.forEach(field => {
                stats.opportunityFieldFailures[field]++;
              });
            }
          } else {
            // Missing metadata entirely
            REQUIRED_DEAL_FIELDS.forEach(field => {
              stats.opportunityFieldFailures[field]++;
            });
          }
        }
      }
      
      // Log progress for every 10 contacts
      if (stats.contactsChecked % 10 === 0) {
        console.log(`Processed ${stats.contactsChecked}/${contacts.length} contacts...`);
      }
    }
    
    // Calculate success rates
    const contactFieldSuccessRate = stats.fieldMappingSuccess / stats.contactsChecked * 100;
    const opportunityFieldSuccessRate = stats.opportunityFieldSuccess / (stats.opportunitiesChecked || 1) * 100;
    const multiSourceRate = stats.multiSourceContacts / stats.contactsChecked * 100;
    
    // Display detailed results
    console.log('\n📊 VALIDATION RESULTS:');
    console.log('==============================================');
    console.log(`Total Contacts Checked: ${stats.contactsChecked}`);
    console.log(`Contact Field Mapping Success Rate: ${contactFieldSuccessRate.toFixed(2)}%`);
    console.log(`Multi-Source Contact Rate: ${multiSourceRate.toFixed(2)}%`);
    console.log('\nPlatform Coverage:');
    console.log(`  • Close CRM: ${stats.platformCoverage.close} contacts (${(stats.platformCoverage.close / stats.contactsChecked * 100).toFixed(2)}%)`);
    console.log(`  • Calendly: ${stats.platformCoverage.calendly} contacts (${(stats.platformCoverage.calendly / stats.contactsChecked * 100).toFixed(2)}%)`);
    console.log(`  • Typeform: ${stats.platformCoverage.typeform} contacts (${(stats.platformCoverage.typeform / stats.contactsChecked * 100).toFixed(2)}%)`);
    
    console.log('\nContact Field Mapping Issues:');
    let hasContactFieldIssues = false;
    for (const field of REQUIRED_CONTACT_FIELDS) {
      const failureRate = stats.fieldMappingFailures[field] / stats.contactsChecked * 100;
      if (failureRate > 0) {
        hasContactFieldIssues = true;
        console.log(`  • ${field}: ${stats.fieldMappingFailures[field]} failures (${failureRate.toFixed(2)}%)`);
      }
    }
    if (!hasContactFieldIssues) {
      console.log('  ✅ No issues found with contact field mapping!');
    }
    
    console.log('\nOpportunity Field Mapping:');
    console.log(`Total Opportunities Checked: ${stats.opportunitiesChecked}`);
    console.log(`Opportunity Field Success Rate: ${opportunityFieldSuccessRate.toFixed(2)}%`);
    
    console.log('\nOpportunity Field Mapping Issues:');
    let hasOpportunityFieldIssues = false;
    for (const field of REQUIRED_DEAL_FIELDS) {
      const failureRate = stats.opportunityFieldFailures[field] / (stats.opportunitiesChecked || 1) * 100;
      if (failureRate > 0) {
        hasOpportunityFieldIssues = true;
        console.log(`  • ${field}: ${stats.opportunityFieldFailures[field]} failures (${failureRate.toFixed(2)}%)`);
      }
    }
    if (!hasOpportunityFieldIssues) {
      console.log('  ✅ No issues found with opportunity field mapping!');
    }
    
    // Overall assessment
    console.log('\n📋 OVERALL ASSESSMENT:');
    console.log('==============================================');
    if (contactFieldSuccessRate >= 95 && opportunityFieldSuccessRate >= 95) {
      console.log('✅ PASSED: Custom field mapping is functioning correctly (>95% success rate)');
      console.log('All required fields are properly mapped during contact merging.');
    } else if (contactFieldSuccessRate >= 90 && opportunityFieldSuccessRate >= 90) {
      console.log('⚠️ ACCEPTABLE: Custom field mapping is working (>90% success rate)');
      console.log('Some minor issues were detected that should be addressed.');
    } else {
      console.log('❌ FAILED: Custom field mapping has significant issues (<90% success rate)');
      console.log('Critical problems were detected that must be fixed for accurate attribution.');
    }
    
    // Check multi-source rate
    if (multiSourceRate < 5) {
      console.log('\n⚠️ WARNING: Low multi-source contact rate detected');
      console.log('This may indicate issues with cross-platform attribution or data synchronization.');
    }
    
    return {
      success: contactFieldSuccessRate >= 90 && opportunityFieldSuccessRate >= 90,
      contactFieldSuccessRate,
      opportunityFieldSuccessRate,
      multiSourceRate,
      stats
    };
  
  } catch (error) {
    console.error('Error validating custom field mapping:', error);
    return {
      success: false,
      contactFieldSuccessRate: 0,
      opportunityFieldSuccessRate: 0,
      multiSourceRate: 0,
      stats,
      error
    };
  }
}

// Run the validation
validateCustomFieldMapping()
  .then((result) => {
    if (result.success) {
      console.log('\nValidation completed successfully!');
      process.exit(0);
    } else {
      console.error('\nValidation completed with failures.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Error running validation:', error);
    process.exit(1);
  });