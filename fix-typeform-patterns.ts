/**
 * Fix Typeform Gibberish Patterns
 * 
 * This script identifies and fixes Typeform entries with gibberish names,
 * such as random letters, by looking for specific patterns shown in the screenshots.
 */

import { db } from './server/db';
import { forms } from './shared/schema';
import { eq, or, like, sql } from 'drizzle-orm';
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
 * Fix Typeform entries with gibberish patterns like random letter sequences
 */
async function fixTypeformPatterns() {
  log('Starting Typeform gibberish pattern fix process', 'info');
  hr();

  // Get all form entries to check
  const allForms = await db.select().from(forms);
  
  log(`Found ${allForms.length} form entries in database`, 'info');
  
  // Group forms by formId for easier processing
  const formGroups = {};
  
  allForms.forEach(form => {
    if (!formGroups[form.formId]) {
      formGroups[form.formId] = [];
    }
    formGroups[form.formId].push(form);
  });
  
  log(`Found ${Object.keys(formGroups).length} unique form types`, 'info');
  
  // Identify forms with gibberish patterns
  const formsToFix = [];
  
  for (const [formId, formList] of Object.entries(formGroups)) {
    const formName = formList[0].formName || '';
    
    // Skip if already standardized
    if (formName.startsWith('Typeform Submission')) {
      continue;
    }
    
    // Check for gibberish patterns
    const hasTypeformPrefix = formName.startsWith('Typeform ');
    const hasRandomLetterSequence = /([A-Z][a-z]{1,2}){3,}/.test(formName) || 
                                    /([a-z][A-Z]){2,}/.test(formName);
    const hasWeirdWordPattern = formName.split(' ').some(word => 
      (word.length === 1 || word.length === 2) && 
      /[A-Za-z]/.test(word)
    );
    const tooManyConsecutiveConsonants = /[bcdfghjklmnpqrstvwxyz]{4,}/i.test(formName);
    const hasTooManyCapitals = formName.split(' ').some(word => 
      word.length > 3 && 
      (word.match(/[A-Z]/g) || []).length > word.length * 0.5
    );
    
    // If matches any gibberish pattern
    if (hasTypeformPrefix && (
      hasRandomLetterSequence || 
      hasWeirdWordPattern || 
      tooManyConsecutiveConsonants ||
      hasTooManyCapitals
    )) {
      formsToFix.push({
        formId, 
        currentName: formName,
        count: formList.length
      });
    }
  }
  
  log(`Identified ${formsToFix.length} forms with gibberish patterns`, 'warning');
  
  if (formsToFix.length === 0) {
    log('No forms with gibberish patterns found. All form names look good!', 'success');
    hr();
    return;
  }
  
  // Fix each form with a proper name
  let totalUpdatedCount = 0;
  
  for (const form of formsToFix) {
    const newName = `Typeform Submission ${form.formId.substring(0, 6)}`;
    
    log(`Fixing form: "${form.currentName}" → "${newName}"`, 'info');
    
    try {
      await db.update(forms)
        .set({ formName: newName })
        .where(eq(forms.formId, form.formId));
      
      totalUpdatedCount += form.count;
      log(`Updated ${form.count} form entries`, 'success');
    } catch (error) {
      log(`Failed to update form ${form.formId}: ${error.message}`, 'error');
    }
  }
  
  hr();
  log('Typeform pattern fixes completed!', 'success');
  log(`Updated ${totalUpdatedCount} form entries with standardized names`, 'success');
}

// Run the script
fixTypeformPatterns().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});