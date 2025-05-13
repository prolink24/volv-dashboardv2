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
  
  // Get all contacts
  const allContacts = await storage.getAllContacts(1000);
  console.log(`Total contacts: ${allContacts.length}`);
  
  // Keep track of contacts with and without opportunities
  const contactsWithoutOpportunities: Contact[] = [];
  
  // Check which contacts don't have opportunities
  for (const contact of allContacts) {
    const deals = await storage.getDealsByContactId(contact.id);
    
    if (deals.length === 0) {
      contactsWithoutOpportunities.push(contact);
    }
  }
  
  console.log(`Contacts without opportunities: ${contactsWithoutOpportunities.length}`);
  
  if (contactsWithoutOpportunities.length === 0) {
    console.log('All contacts have opportunities. Nothing to do.');
    return;
  }
  
  // Add opportunities to contacts without any
  let opportunitiesAdded = 0;
  
  for (const contact of contactsWithoutOpportunities) {
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
      console.log(`Progress: ${opportunitiesAdded}/${contactsWithoutOpportunities.length} opportunities added`);
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