/**
 * Clean Incomplete Typeform Contacts
 * 
 * This script identifies and removes incomplete Typeform contacts:
 * 1. Finds contacts that came only from Typeform
 * 2. Checks if they have proper identifying information (name, email, phone)
 * 3. Merges those with matching emails to existing contacts
 * 4. Removes those without any identifying information
 */

import { db } from './server/db';
import { contacts, forms } from './shared/schema';
import { and, eq, or, isNotNull, isNull, ne, like, sql } from 'drizzle-orm';
import chalk from 'chalk';

function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  const colors = {
    info: chalk.blue,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
  };
  console.log(colors[type](message));
}

function hr(): void {
  console.log(chalk.gray('─'.repeat(70)));
}

interface ContactData {
  id: number;
  email: string | null;
  name: string | null;
  phone: string | null;
  leadSource: string | null;
  hasEmail: boolean;
  hasName: boolean;
  hasPhone: boolean;
}

/**
 * Normalize email for comparison
 */
function normalizeEmail(email: string): string {
  return email?.trim().toLowerCase() || '';
}

/**
 * Normalize phone for comparison by removing all non-numeric characters
 */
function normalizePhone(phone: string): string {
  return phone?.replace(/[^0-9]/g, '') || '';
}

/**
 * Clean up incomplete Typeform contacts
 */
async function cleanIncompleteTypeformContacts() {
  log('Starting incomplete Typeform contact cleanup process', 'info');
  hr();

  // 1. Get all contacts that came from Typeform
  const typeformContacts = await db
    .select({
      id: contacts.id,
      email: contacts.email,
      name: contacts.name,
      phone: contacts.phone,
      leadSource: contacts.leadSource,
    })
    .from(contacts)
    .where(
      like(contacts.leadSource, '%typeform%')
    );

  // Enhance with status flags
  const enhancedContacts: ContactData[] = typeformContacts.map(contact => ({
    ...contact,
    hasEmail: !!contact.email && contact.email.includes('@'),
    hasName: !!contact.name && contact.name.length > 1 && !contact.name.includes('Unknown'),
    hasPhone: !!contact.phone && contact.phone.length > 5,
  }));

  log(`Found ${enhancedContacts.length} total Typeform contacts`, 'info');

  // 2. Identify incomplete records (missing name OR email)
  const incompleteContacts = enhancedContacts.filter(
    contact => !contact.hasName || !contact.hasEmail
  );

  log(`Found ${incompleteContacts.length} incomplete Typeform contacts`, 'warning');

  // 3. Identify contacts to delete (no name AND no email AND no phone)
  const contactsToDelete = incompleteContacts.filter(
    contact => !contact.hasName && !contact.hasEmail && !contact.hasPhone
  );

  log(`Found ${contactsToDelete.length} contacts with no identifying information to remove`, 'warning');

  // 4. Find potential duplicates (missing name but has email or phone)
  const potentialDuplicates = incompleteContacts.filter(
    contact => !contact.hasName && (contact.hasEmail || contact.hasPhone)
  );

  log(`Found ${potentialDuplicates.length} potential duplicates to merge`, 'info');

  // 5. Merge duplicates with existing contacts
  let mergedCount = 0;

  for (const duplicateContact of potentialDuplicates) {
    let matchingContacts = [];
    
    // Find by email if available
    if (duplicateContact.hasEmail && duplicateContact.email) {
      // Find all contacts with the same email that have complete information
      const emailMatches = await db
        .select()
        .from(contacts)
        .where(
          and(
            sql`LOWER(${contacts.email}) = ${normalizeEmail(duplicateContact.email)}`,
            isNotNull(contacts.name),
            ne(contacts.id, duplicateContact.id)
          )
        );
      
      matchingContacts = [...matchingContacts, ...emailMatches];
    }
    
    // If no email match and phone is available, find by phone
    if (matchingContacts.length === 0 && duplicateContact.hasPhone && duplicateContact.phone) {
      const normalizedPhone = normalizePhone(duplicateContact.phone);
      if (normalizedPhone.length > 5) {
        const phoneMatches = await db
          .select()
          .from(contacts)
          .where(
            and(
              sql`REPLACE(REPLACE(REPLACE(REPLACE(${contacts.phone}, '-', ''), ' ', ''), '(', ''), ')', '') = ${normalizedPhone}`,
              isNotNull(contacts.name),
              ne(contacts.id, duplicateContact.id)
            )
          );
        
        matchingContacts = [...matchingContacts, ...phoneMatches];
      }
    }

    if (matchingContacts.length > 0) {
      // Found a match - merge the contacts
      const primaryContact = matchingContacts[0];
      
      log(`Merging contact ID ${duplicateContact.id} into ${primaryContact.id} (${primaryContact.name})`, 'info');
      
      try {
        // Update any form submissions linked to the duplicate contact
        await db
          .update(forms)
          .set({ contactId: primaryContact.id })
          .where(eq(forms.contactId, duplicateContact.id));
        
        // Delete the duplicate contact
        await db
          .delete(contacts)
          .where(eq(contacts.id, duplicateContact.id));
        
        mergedCount++;
        log(`Successfully merged contact`, 'success');
      } catch (error) {
        log(`Failed to merge contact: ${error.message}`, 'error');
      }
    }
  }

  // 6. Delete contacts with no identifying information
  let deletedCount = 0;
  
  for (const contactToDelete of contactsToDelete) {
    try {
      log(`Removing contact ID ${contactToDelete.id} with no identifying information`, 'info');
      
      // Update any forms to remove contact association before deleting contact
      await db
        .update(forms)
        .set({ contactId: null })
        .where(eq(forms.contactId, contactToDelete.id));
      
      // Delete the contact
      await db
        .delete(contacts)
        .where(eq(contacts.id, contactToDelete.id));
      
      deletedCount++;
      log(`Successfully removed contact`, 'success');
    } catch (error) {
      log(`Failed to remove contact: ${error.message}`, 'error');
    }
  }

  hr();
  log('Typeform contact cleanup completed!', 'success');
  log(`Merged ${mergedCount} duplicate contacts with existing records`, 'success');
  log(`Removed ${deletedCount} contacts with no identifying information`, 'success');
}

// Run the script
cleanIncompleteTypeformContacts().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});