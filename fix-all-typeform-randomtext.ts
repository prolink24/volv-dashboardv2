/**
 * Fix All Gibberish Typeform Names
 * 
 * This script specifically targets and fixes the Typeform entries with
 * random letters shown in the user's screenshot.
 */

import { db } from './server/db';
import { forms } from './shared/schema';
import { eq, like, sql } from 'drizzle-orm';
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
 * The specific form names to fix directly from the screenshot
 */
async function fixAllTypeformRandomText() {
  log('Starting specific Typeform name fixes for random text entries', 'info');
  hr();

  // The specific entries we saw in the screenshot
  const randomTextEntries = [
    "Typeform Jcfyryf L Aj Vjtn Mw Jcfyryl Gfz",
    "Typeform Qwul Ywr K Kr Fs Qwulw K Rgji",
    "Typeform Ohzmfumzun Opfxwdubeohzmfummz",
    "Typeform Ilr Upw Op Bf Gh Nm Ilr Uy",
    "Typeform Ltp Whnl Sy Uc G Ltp Dqxykam Rq"
  ];

  // Get all form entries that need fixing
  const allForms = await db.select()
    .from(forms)
    .where(
      // Drizzle-orm uses a different syntax for "in" operations
      // We need to use their SQL template literals instead
      sql`${forms.formName} IN (${randomTextEntries.join(', ')})`
    );

  log(`Found ${allForms.length} form entries with random text names`, 'info');

  if (allForms.length === 0) {
    // If we don't find exact matches, try with partial matching
    log('No exact matches found. Trying with partial matching...', 'info');
    
    // Get all form entries to check for pattern matching
    const allFormsToCheck = await db.select()
      .from(forms);
    
    // Identify forms with gibberish by pattern
    const formsToFix = allFormsToCheck.filter(form => {
      // Check for patterns that look like random characters
      const name = form.formName || '';
      const hasTypeformPrefix = name.startsWith('Typeform ');
      const hasRandomLetterSequence = /[A-Z][a-z] [A-Z][a-z]/.test(name);
      const hasOneOrTwoLetterWords = name.split(' ').some(word => word.length === 1 || word.length === 2);
      const hasTooManyUppercaseLetters = (name.match(/[A-Z]/g) || []).length > 3;
      
      return hasTypeformPrefix && (hasRandomLetterSequence || hasOneOrTwoLetterWords || hasTooManyUppercaseLetters);
    });
    
    if (formsToFix.length === 0) {
      log('No forms with random text patterns found either.', 'warning');
      hr();
      return;
    }
    
    log(`Found ${formsToFix.length} forms with random text patterns`, 'info');
    
    // Group by formId to avoid duplicate updates
    const formsByFormId: Record<string, typeof forms.$inferSelect[]> = {};
    
    formsToFix.forEach(form => {
      if (!formsByFormId[form.formId]) {
        formsByFormId[form.formId] = [];
      }
      formsByFormId[form.formId].push(form);
    });
    
    // Update each formId group with a better name
    let totalUpdated = 0;
    
    for (const [formId, formGroup] of Object.entries(formsByFormId)) {
      const currentName = formGroup[0].formName;
      const newName = `Typeform Submission ${formId.substring(0, 6)}`;
      
      log(`Fixing form: "${currentName}" → "${newName}"`, 'info');
      
      try {
        await db.update(forms)
          .set({ formName: newName })
          .where(eq(forms.formId, formId));
        
        totalUpdated += formGroup.length;
        log(`Updated ${formGroup.length} form entries`, 'success');
      } catch (error) {
        log(`Failed to update form ${formId}: ${error.message}`, 'error');
      }
    }
    
    hr();
    log('Random text Typeform name fixes completed!', 'success');
    log(`Updated ${totalUpdated} form entries with proper names`, 'success');
    return;
  }
  
  // Group by formId to avoid duplicate updates
  const formsByFormId: Record<string, typeof forms.$inferSelect[]> = {};
  
  allForms.forEach(form => {
    if (!formsByFormId[form.formId]) {
      formsByFormId[form.formId] = [];
    }
    formsByFormId[form.formId].push(form);
  });
  
  // Update each form with a better name
  let totalUpdated = 0;
  
  for (const [formId, formGroup] of Object.entries(formsByFormId)) {
    const currentName = formGroup[0].formName;
    const newName = `Typeform Submission ${formId.substring(0, 6)}`;
    
    log(`Fixing form: "${currentName}" → "${newName}"`, 'info');
    
    try {
      await db.update(forms)
        .set({ formName: newName })
        .where(eq(forms.formId, formId));
      
      totalUpdated += formGroup.length;
      log(`Updated ${formGroup.length} form entries`, 'success');
    } catch (error) {
      log(`Failed to update form ${formId}: ${error.message}`, 'error');
    }
  }
  
  hr();
  log('Random text Typeform name fixes completed!', 'success');
  log(`Updated ${totalUpdated} form entries with proper names`, 'success');
}

// Run the script
fixAllTypeformRandomText().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});