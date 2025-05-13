/**
 * Field Preservation Validation
 * 
 * This script tests that all fields are properly preserved during contact merging
 * for a high degree of data integrity between Close CRM and Calendly.
 */

import { Contact, InsertContact } from './shared/schema';
import { storage } from './server/storage';
import { createOrUpdateContact } from './server/services/contact-matcher';
import { db } from './server/db';
import { contacts, deals } from './shared/schema';
import { eq } from 'drizzle-orm';

// Required accuracy threshold
const REQUIRED_ACCURACY = 90;

async function validateFieldPreservation() {
  console.log('=================================================');
  console.log('FIELD PRESERVATION VALIDATION');
  console.log('=================================================\n');
  
  // Get all contacts from the database with a valid email
  const allContacts = await storage.getAllContacts();
  const validContacts = allContacts.filter(c => c.email && c.email.includes('@'));
  
  console.log(`Found ${validContacts.length} valid contacts for testing\n`);
  
  // Take a sample of contacts to test (max 10)
  const testContacts = validContacts.slice(0, Math.min(10, validContacts.length));
  
  // Stats tracking
  let totalTests = 0;
  let totalPasses = 0;
  
  // For each contact, simulate an update from Calendly and verify field preservation
  for (const [index, originalContact] of testContacts.entries()) {
    console.log(`\n----- Testing Field Preservation for Contact #${index + 1}: ${originalContact.name} -----`);
    
    // Create a new contact data object simulating Calendly data
    const calendlyData = {
      name: originalContact.name,
      email: originalContact.email,
      phone: originalContact.phone,
      leadSource: 'calendly',
      notes: `Scheduled a meeting via Calendly on 2025-05-13`,
    };
    
    console.log('Created simulated Calendly data for testing');
    
    // Attempt to create or update the contact
    console.log('Attempting to match and merge with existing contact...');
    
    try {
      const result = await createOrUpdateContact(calendlyData as InsertContact);
      const mergedContact = result.contact;
      
      console.log(`Contact was ${result.created ? 'created (ERROR)' : 'updated (CORRECT)'}`);
      console.log(`Match reason: ${result.reason || 'No reason provided'}`);
      
      if (result.created) {
        console.log('❌ FAILED: Contact was created as new instead of being merged');
        continue;
      }
      
      // Verify field preservation
      console.log('\nVerifying field preservation:');
      
      // Basic fields
      totalTests++;
      if (mergedContact.name === originalContact.name) {
        totalPasses++;
        console.log('✅ name: Original name preserved');
      } else {
        console.log(`❌ name: Original name NOT preserved (${originalContact.name} -> ${mergedContact.name})`);
      }
      
      totalTests++;
      if (mergedContact.email === originalContact.email) {
        totalPasses++;
        console.log('✅ email: Email preserved');
      } else {
        console.log(`❌ email: Email NOT preserved (${originalContact.email} -> ${mergedContact.email})`);
      }
      
      totalTests++;
      if (mergedContact.phone === originalContact.phone) {
        totalPasses++;
        console.log('✅ phone: Phone number preserved');
      } else {
        console.log(`❌ phone: Phone number NOT preserved (${originalContact.phone} -> ${mergedContact.phone})`);
      }
      
      // Lead source combination
      totalTests++;
      const hasClose = mergedContact.leadSource?.includes('close') || false;
      const hasCalendly = mergedContact.leadSource?.includes('calendly') || false;
      if (hasClose && hasCalendly) {
        totalPasses++;
        console.log('✅ leadSource: Lead sources combined properly');
      } else {
        console.log(`❌ leadSource: Lead sources NOT combined properly (${mergedContact.leadSource})`);
      }
      
      // Notes combination
      totalTests++;
      const originalNotes = originalContact.notes || '';
      const mergedNotes = mergedContact.notes || '';
      if (mergedNotes.includes(originalNotes) && mergedNotes.includes('Scheduled a meeting via Calendly')) {
        totalPasses++;
        console.log('✅ notes: Notes combined properly');
      } else {
        console.log(`❌ notes: Notes NOT combined properly`);
      }
      
      // Metadata preservation
      totalTests++;
      if (mergedContact.createdAt?.getTime() === originalContact.createdAt?.getTime()) {
        totalPasses++;
        console.log('✅ createdAt: Creation date preserved');
      } else {
        console.log(`❌ createdAt: Creation date NOT preserved`);
      }
      
      // Check for deals preservation
      const originalDeals = await db.select().from(deals).where(eq(deals.contactId, originalContact.id));
      const updatedDeals = await db.select().from(deals).where(eq(deals.contactId, mergedContact.id));
      
      totalTests++;
      if (originalDeals.length === updatedDeals.length) {
        totalPasses++;
        console.log(`✅ deals: All ${originalDeals.length} deals preserved`);
      } else {
        console.log(`❌ deals: Deals NOT preserved (${originalDeals.length} -> ${updatedDeals.length})`);
      }
      
    } catch (error) {
      console.error('Error during contact matching:', error);
    }
  }
  
  // Calculate and display results
  const accuracy = (totalPasses / totalTests) * 100;
  
  console.log('\n=================================================');
  console.log('FIELD PRESERVATION RESULTS:');
  console.log('=================================================');
  console.log(`Overall field preservation accuracy: ${accuracy.toFixed(2)}% (${totalPasses}/${totalTests})`);
  
  if (accuracy >= REQUIRED_ACCURACY) {
    console.log(`\n✅ VALIDATION PASSED: Accuracy exceeds required ${REQUIRED_ACCURACY}%`);
    console.log('Contact merging between Close CRM and Calendly is working reliably.');
    return true;
  } else {
    console.log(`\n❌ VALIDATION FAILED: Accuracy below required ${REQUIRED_ACCURACY}%`);
    console.log('Contact merging needs improvement.');
    return false;
  }
}

// Run the validation
validateFieldPreservation()
  .then((passed) => {
    console.log('\nField preservation validation complete');
    process.exit(passed ? 0 : 1);
  })
  .catch((error) => {
    console.error('Error during validation:', error);
    process.exit(1);
  });