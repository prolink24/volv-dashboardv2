/**
 * Fix Gibberish Typeform Names
 * 
 * This script specifically targets and fixes the scrambled Typeform names
 * that appear as random letters without changing legitimate, descriptive form names.
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
 * Identifies form names that contain random-looking characters and lack proper spacing
 */
function isGibberishFormName(formName: string): boolean {
  // Detect gibberish patterns: mix of uppercase/lowercase with spaces in weird places
  // or sequences of random-looking characters
  
  // Look for patterns like "Jcfyryf L Aj Vjtn Mw" or "Qwul Ywr K Kr Fs Qwulw"
  const hasWeirdSpacing = formName.split(' ').some(word => word.length === 1 || word.length === 2);
  const hasRandomLetterGroups = /[A-Z][a-z][A-Z][a-z]/.test(formName);
  const tooManyConsecutiveConsonants = /[bcdfghjklmnpqrstvwxyz]{5,}/i.test(formName);
  const tooManyUppercaseLetters = (formName.match(/[A-Z]/g) || []).length > formName.length * 0.4;
  
  // Normal form names typically have proper title case and descriptive words
  const hasNormalFormNamePattern = /^(Typeform|Lead|Contact|Customer|Form|Application|Survey|Feedback|Deal|Sales)/i.test(formName);
  
  return (hasWeirdSpacing || hasRandomLetterGroups || tooManyConsecutiveConsonants || tooManyUppercaseLetters) 
         && !hasNormalFormNamePattern;
}

/**
 * Fixes gibberish Typeform names
 */
async function fixGibberishTypeformNames() {
  log('Starting gibberish Typeform names fix process', 'info');
  hr();

  // Get all form entries
  const allForms = await db.select()
    .from(forms);

  log(`Found ${allForms.length} form entries in database`, 'info');

  // Group forms by formId
  const formsByFormId: Record<string, typeof forms.$inferSelect[]> = {};
  
  allForms.forEach(form => {
    if (!formsByFormId[form.formId]) {
      formsByFormId[form.formId] = [];
    }
    formsByFormId[form.formId].push(form);
  });

  log(`Found ${Object.keys(formsByFormId).length} unique form types`, 'info');

  // Find forms with gibberish names
  const gibberishForms: {formId: string, currentName: string, formCount: number}[] = [];
  
  for (const formId in formsByFormId) {
    const formGroup = formsByFormId[formId];
    const formName = formGroup[0].formName;
    
    if (isGibberishFormName(formName)) {
      gibberishForms.push({
        formId,
        currentName: formName,
        formCount: formGroup.length
      });
    }
  }

  log(`Identified ${gibberishForms.length} forms with gibberish names`, 'warning');
  
  if (gibberishForms.length === 0) {
    log('No gibberish form names found, nothing to fix', 'success');
    hr();
    return;
  }
  
  // Update form names in the database
  let updatedCount = 0;
  
  for (const form of gibberishForms) {
    // Create a standardized name
    const newName = `Typeform Submission ${form.formId.substring(0, 6)}`;
    
    log(`Fixing form: "${form.currentName}" → "${newName}"`, 'info');
    
    try {
      const result = await db.update(forms)
        .set({ formName: newName })
        .where(eq(forms.formId, form.formId));
      
      updatedCount += form.formCount;
      log(`Updated ${form.formCount} form entries`, 'success');
    } catch (error) {
      log(`Failed to update form ${form.formId}: ${error.message}`, 'error');
    }
  }

  hr();
  log('Typeform name fixes completed!', 'success');
  log(`Updated ${updatedCount} form entries with standardized names`, 'success');
}

// Run the script
fixGibberishTypeformNames().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});