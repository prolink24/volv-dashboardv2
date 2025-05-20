/**
 * Fix Typeform Names
 * 
 * This script identifies and fixes Typeform entries that have scrambled
 * or garbled names, replacing them with standardized descriptive names.
 */

import { db } from './server/db';
import { forms } from './shared/schema';
import { eq, like } from 'drizzle-orm';
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

/**
 * Identifies form names that likely contain random characters
 * and replaces them with standardized names
 */
async function fixTypeformNames() {
  log('Starting Typeform names fix process', 'info');
  hr();

  // Get all form entries
  const allForms = await db.select()
    .from(forms);

  log(`Found ${allForms.length} form entries in database`, 'info');

  // Group forms by formId to identify variations in naming
  const formsByFormId: Record<string, typeof forms.$inferSelect[]> = {};
  
  allForms.forEach(form => {
    if (!formsByFormId[form.formId]) {
      formsByFormId[form.formId] = [];
    }
    formsByFormId[form.formId].push(form);
  });

  log(`Found ${Object.keys(formsByFormId).length} unique form types`, 'info');

  // Look for forms with garbled names (containing random characters)
  const formNameUpdateMap: Record<string, string> = {};
  const potentiallyGarbledForms: typeof forms.$inferSelect[] = [];

  for (const formId in formsByFormId) {
    const formGroup = formsByFormId[formId];
    const formName = formGroup[0].formName;
    
    // Criteria to identify potentially garbled names:
    // 1. Contains random-looking sequences of characters
    // 2. No spaces between words or irregular spacing
    // 3. Mixed case in unusual patterns

    // Simple heuristic: Check if name has many consecutive consonants or lacks proper spacing
    const hasNormalWords = /^[A-Za-z]+(\s+[A-Za-z]+)*$/.test(formName);
    const hasRandomCharSequence = /[A-Z][a-z][A-Z][a-z]/.test(formName) || 
                                 /[bcdfghjklmnpqrstvwxyz]{4,}/.test(formName.toLowerCase());
    
    if (!hasNormalWords || hasRandomCharSequence) {
      potentiallyGarbledForms.push(...formGroup);
      
      // Assign a standardized name based on formId
      // Remove any 'tf_' prefix that might exist in the formId
      const baseId = formId.replace(/^tf_/, '').substring(0, 6);
      formNameUpdateMap[formId] = `Typeform Submission ${baseId}`;
    }
  }

  log(`Identified ${Object.keys(formNameUpdateMap).length} forms with non-standard names`, 'warning');
  
  // Update form names in the database
  let updatedCount = 0;
  
  for (const [formId, newName] of Object.entries(formNameUpdateMap)) {
    // Display what we're fixing
    const formsToUpdate = formsByFormId[formId];
    const oldName = formsToUpdate[0].formName;
    
    log(`Fixing form: "${oldName}" → "${newName}"`, 'info');
    
    // Update all forms with this formId
    try {
      const result = await db.update(forms)
        .set({ formName: newName })
        .where(eq(forms.formId, formId));
      
      updatedCount += formsToUpdate.length;
      log(`Updated ${formsToUpdate.length} form entries`, 'success');
    } catch (error) {
      log(`Failed to update form ${formId}: ${error.message}`, 'error');
    }
  }

  hr();
  log('Typeform names fix completed!', 'success');
  log(`Updated ${updatedCount} form entries with standardized names`, 'success');
}

// Run the script
fixTypeformNames().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});