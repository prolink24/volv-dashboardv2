/**
 * Opportunity Coverage Check
 * 
 * This script checks all contacts to ensure they have properly imported 
 * opportunities/deals with complete custom fields.
 */

import { storage } from './server/storage';

async function checkOpportunityCoverage() {
  console.log('Checking opportunity coverage for all contacts...');
  
  try {
    // Get all contacts
    const allContacts = await storage.getAllContacts();
    console.log(`Total contacts: ${allContacts.length}`);
    
    // Get all opportunities
    const allOpportunities = await storage.getAllOpportunities();
    console.log(`Total opportunities: ${allOpportunities.length}`);
    
    // Count contacts with opportunities
    const contactsWithOpportunities = new Set();
    let totalDealValue = 0;
    let opportunitiesWithCustomFields = 0;
    let missingCustomFieldsCount = 0;
    
    const customFieldCounts: Record<string, number> = {};
    
    for (const opportunity of allOpportunities) {
      contactsWithOpportunities.add(opportunity.contactId);
      // Handle string values for the opportunity value
      let dealValue = 0;
      if (opportunity.value) {
        if (typeof opportunity.value === 'number') {
          dealValue = opportunity.value;
        } else if (typeof opportunity.value === 'string') {
          // Try to convert string to number, handle currency symbols like $
          const numericValue = parseFloat(opportunity.value.replace(/[^0-9.-]+/g, ''));
          if (!isNaN(numericValue)) {
            dealValue = numericValue;
          }
        }
      }
      totalDealValue += dealValue;
      
      // Check custom fields
      if (opportunity.metadata) {
        let metadata: any = {};
        try {
          if (typeof opportunity.metadata === 'string') {
            metadata = JSON.parse(opportunity.metadata);
          } else {
            metadata = opportunity.metadata;
          }
          
          // Count custom fields
          const customFieldsPresent = Object.keys(metadata).length;
          if (customFieldsPresent > 0) {
            opportunitiesWithCustomFields++;
            
            // Track which custom fields are present
            for (const field of Object.keys(metadata)) {
              customFieldCounts[field] = (customFieldCounts[field] || 0) + 1;
            }
          } else {
            missingCustomFieldsCount++;
          }
        } catch (error) {
          console.error(`Error parsing metadata for opportunity ${opportunity.id}:`, error);
          missingCustomFieldsCount++;
        }
      } else {
        missingCustomFieldsCount++;
      }
    }
    
    const opportunityCoverageRate = (contactsWithOpportunities.size / allContacts.length) * 100;
    console.log(`Contacts with opportunities: ${contactsWithOpportunities.size}`);
    console.log(`Opportunity coverage rate: ${opportunityCoverageRate.toFixed(2)}%`);
    console.log(`Total deal value: $${typeof totalDealValue === 'number' ? totalDealValue.toFixed(2) : '0.00'}`);
    console.log(`Opportunities with custom fields: ${opportunitiesWithCustomFields}`);
    console.log(`Opportunities missing custom fields: ${missingCustomFieldsCount}`);
    
    // Display custom field coverage
    console.log('\nCustom field coverage:');
    const sortedFields = Object.entries(customFieldCounts)
      .sort((a, b) => b[1] - a[1]);
    
    for (const [field, count] of sortedFields) {
      const coverageRate = (count / allOpportunities.length) * 100;
      console.log(`  ${field}: ${count} (${coverageRate.toFixed(2)}%)`);
    }
    
    // Find contacts without opportunities
    const contactsWithoutOpportunities = allContacts.filter(
      contact => !Array.from(contactsWithOpportunities).includes(contact.id)
    );
    
    console.log(`\nContacts without opportunities: ${contactsWithoutOpportunities.length}`);
    
    // Sample of contacts without opportunities
    if (contactsWithoutOpportunities.length > 0) {
      console.log('\nSample of contacts without opportunities:');
      const sampleSize = Math.min(10, contactsWithoutOpportunities.length);
      
      for (let i = 0; i < sampleSize; i++) {
        const contact = contactsWithoutOpportunities[i];
        console.log(`  ${contact.id}: ${contact.name} (${contact.email})`);
        console.log(`    Source: ${contact.sourceId}`);
        console.log(`    Lead Source: ${contact.leadSource}`);
      }
    }
    
  } catch (error) {
    console.error('Error checking opportunity coverage:', error);
  }
}

// Run the script
checkOpportunityCoverage().catch(console.error);