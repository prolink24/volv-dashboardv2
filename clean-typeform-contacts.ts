/**
 * Clean Typeform Contacts
 * 
 * This script identifies and cleans up incomplete Typeform submissions:
 * 1. Identifies incomplete entries (no name, email, or phone)
 * 2. Merges entries that match existing contacts by email or phone
 * 3. Removes entries that don't have identifying characteristics
 */

import { db } from './server/db';
import { contacts, forms, contactSourcesJunction } from './shared/schema';
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
  formId: string | null;
  formName: string | null;
  hasEmail: boolean;
  hasName: boolean;
  hasPhone: boolean;
}

/**
 * Normalize email for comparison
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Clean up incomplete Typeform contacts
 */
async function cleanTypeformContacts() {
  log('Starting Typeform contact cleanup process', 'info');
  hr();

  // 1. Get all contacts that came from Typeform
  const typeformContacts = await db
    .select({
      id: contacts.id,
      email: contacts.email,
      name: contacts.name,
      phone: contacts.phone,
      formId: forms.formId,
      formName: forms.formName,
    })
    .from(contacts)
    .innerJoin(
      contactSourcesJunction,
      eq(contacts.id, contactSourcesJunction.contactId)
    )
    .innerJoin(
      forms,
      eq(forms.id, contactSourcesJunction.sourceId)
    )
    .where(eq(contactSourcesJunction.sourceType, 'form'));

  // Enhance with status flags
  const enhancedContacts: ContactData[] = typeformContacts.map(contact => ({
    ...contact,
    hasEmail: !!contact.email && contact.email.includes('@'),
    hasName: !!contact.name && contact.name.length > 1 && !contact.name.includes('Unknown'),
    hasPhone: !!contact.phone && contact.phone.length > 5,
  }));

  log(`Found ${enhancedContacts.length} total Typeform contacts`, 'info');

  // 2. Identify incomplete records
  const incompleteContacts = enhancedContacts.filter(
    contact => !contact.hasName || !contact.hasEmail
  );

  log(`Found ${incompleteContacts.length} incomplete Typeform contacts`, 'warning');

  // 3. Identify contacts to delete (no name AND no email AND no phone)
  const contactsToDelete = incompleteContacts.filter(
    contact => !contact.hasName && !contact.hasEmail && !contact.hasPhone
  );

  log(`Found ${contactsToDelete.length} contacts with no identifying information to remove`, 'warning');

  // 4. Find potential duplicates (same email but missing name)
  const potentialDuplicates = incompleteContacts.filter(
    contact => contact.hasEmail && !contact.hasName
  );

  log(`Found ${potentialDuplicates.length} potential duplicates to merge`, 'info');

  // 5. Merge duplicates with existing contacts
  let mergedCount = 0;

  for (const duplicateContact of potentialDuplicates) {
    if (!duplicateContact.email) continue;
    
    // Find all contacts with the same email that have complete information
    const matchingContacts = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(sql`LOWER(${contacts.email})`, normalizeEmail(duplicateContact.email)),
          isNotNull(contacts.name),
          ne(contacts.id, duplicateContact.id)
        )
      );

    if (matchingContacts.length > 0) {
      // Found a match - merge the contacts
      const primaryContact = matchingContacts[0];
      
      log(`Merging contact ID ${duplicateContact.id} into ${primaryContact.id} (${primaryContact.name})`, 'info');
      
      try {
        // Move any unique source connections to the primary contact
        await db.transaction(async (tx) => {
          // Get existing source connections for the primary contact
          const existingSources = await tx
            .select({ sourceId: contactSourcesJunction.sourceId })
            .from(contactSourcesJunction)
            .where(eq(contactSourcesJunction.contactId, primaryContact.id));
          
          const existingSourceIds = existingSources.map(s => s.sourceId);
          
          // Get sources for the duplicate contact
          const duplicateSources = await tx
            .select()
            .from(contactSourcesJunction)
            .where(eq(contactSourcesJunction.contactId, duplicateContact.id));
          
          // Add unique sources to the primary contact
          for (const source of duplicateSources) {
            if (!existingSourceIds.includes(source.sourceId)) {
              await tx.insert(contactSourcesJunction).values({
                contactId: primaryContact.id,
                sourceId: source.sourceId,
                sourceType: source.sourceType
              });
            }
          }
          
          // Delete the duplicate contact's source connections
          await tx
            .delete(contactSourcesJunction)
            .where(eq(contactSourcesJunction.contactId, duplicateContact.id));
          
          // Delete the duplicate contact
          await tx
            .delete(contacts)
            .where(eq(contacts.id, duplicateContact.id));
        });
        
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
      
      await db.transaction(async (tx) => {
        // Delete the source connections first
        await tx
          .delete(contactSourcesJunction)
          .where(eq(contactSourcesJunction.contactId, contactToDelete.id));
        
        // Delete the contact
        await tx
          .delete(contacts)
          .where(eq(contacts.id, contactToDelete.id));
      });
      
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
cleanTypeformContacts().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});