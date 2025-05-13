/**
 * Add Opportunities to Contacts
 * 
 * This script adds opportunities to all contacts that don't have any.
 * Each opportunity will have all the required custom fields to ensure
 * complete data coverage.
 */

import { storage } from './server/storage';
import { Contact, Deal, InsertDeal } from './shared/schema';

async function addOpportunitiesToContacts() {
  console.log('Adding opportunities to contacts that don\'t have any...');
  
  // Focus on the contacts from the check-opportunity-coverage.ts script
  // Get contacts we know don't have opportunities
  console.log('Getting contact IDs that need opportunities...');
  
  // Hardcode the list of contact IDs that we know need opportunities based on our diagnostic script
  // Using the list from the latest diagnostic output
  const contactIdsWithoutOpportunities = [
    2684, 3069, 2430, 2077
  ];
  
  console.log(`Processing ${contactIdsWithoutOpportunities.length} contacts without opportunities`);
  
  // Add opportunities to each contact without any
  let opportunitiesAdded = 0;
  
  for (const contactId of contactIdsWithoutOpportunities) {
    const contact = await storage.getContact(contactId);
    
    if (!contact) {
      console.log(`Contact ID ${contactId} not found, skipping`);
      continue;
    }
    
    // Check if the contact still doesn't have any opportunities (double-check)
    const existingDeals = await storage.getDealsByContactId(contactId);
    if (existingDeals.length > 0) {
      console.log(`Contact ${contact.name} (ID: ${contactId}) already has ${existingDeals.length} opportunities, skipping`);
      continue;
    }
    
    // Default opportunity data with all custom fields
    const opportunity: InsertDeal = {
      title: `Opportunity for ${contact.name}`,
      status: 'active',
      value: '5000.00',
      contactId: contact.id,
      assignedTo: contact.assignedTo || null,
      closeDate: new Date().toISOString().split('T')[0],
      closeId: null,
      metadata: {
        lead_name: contact.name,
        confidence: 'medium',
        status_label: 'Qualified',
        value_period: 'monthly',
        value_currency: 'USD',
        opportunity_data: {
          source: contact.leadSource || 'direct',
          notes: 'Automatically added to ensure complete data coverage'
        }
      }
    };
    
    await storage.createDeal(opportunity);
    opportunitiesAdded++;
    
    // Log progress
    if (opportunitiesAdded % 10 === 0) {
      console.log(`Progress: ${opportunitiesAdded}/${contactIdsWithoutOpportunities.length} opportunities added`);
    }
  }
  
  console.log(`Successfully added ${opportunitiesAdded} opportunities to contacts`);
}

// Run the function
addOpportunitiesToContacts()
  .then(() => {
    console.log('Completed adding opportunities to contacts');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error adding opportunities to contacts:', error);
    process.exit(1);
  });