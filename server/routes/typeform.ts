import express from 'express';
import { getForms, syncTypeformResponses, syncSingleForm } from '../api/typeform';
import { db } from '../db';
import { forms, contacts } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';

const router = express.Router();

/**
 * GET /api/typeform/forms
 * Returns a list of all available Typeform forms
 */
router.get('/forms', async (req, res) => {
  try {
    const forms = await getForms();
    res.json({ success: true, forms });
  } catch (error) {
    console.error('Error fetching Typeform forms:', error);
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message || 'Failed to fetch Typeform forms'
    });
  }
});

/**
 * GET /api/typeform/submissions
 * Returns all form submissions with contact information
 */
router.get('/submissions', async (req, res) => {
  try {
    // Get the form submissions with join to contacts to get contact info
    const formSubmissions = await db
      .select({
        id: forms.id,
        contactId: forms.contactId,
        typeformResponseId: forms.typeformResponseId,
        formName: forms.formName,
        formId: forms.formId,
        submittedAt: forms.submittedAt,
        answers: forms.answers,
        hiddenFields: forms.hiddenFields,
        calculatedFields: forms.calculatedFields,
        completionPercentage: forms.completionPercentage,
        formCategory: forms.formCategory,
        formTags: forms.formTags,
        contactName: contacts.name,
        contactEmail: contacts.email
      })
      .from(forms)
      .leftJoin(contacts, eq(forms.contactId, contacts.id))
      .orderBy(sql`${forms.submittedAt} DESC`);

    res.json({ 
      success: true, 
      forms: formSubmissions,
      count: formSubmissions.length
    });
  } catch (error) {
    console.error('Error fetching form submissions:', error);
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message || 'Failed to fetch form submissions'
    });
  }
});

/**
 * POST /api/typeform/sync
 * Syncs all Typeform responses to the database
 */
router.post('/sync', async (req, res) => {
  try {
    console.log('Received request to sync Typeform data');
    const result = await syncTypeformResponses();
    console.log('Typeform sync completed:', result);
    res.json(result);
  } catch (error) {
    console.error('Error syncing Typeform responses:', error);
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message || 'Failed to sync Typeform responses'
    });
  }
});

/**
 * POST /api/typeform/sync/:formId
 * Syncs responses from a specific form
 */
router.post('/sync/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    console.log(`Syncing specific form: ${formId}`);
    const result = await syncSingleForm(formId);
    res.json(result);
  } catch (error) {
    console.error('Error syncing specific form:', error);
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message || 'Failed to sync form'
    });
  }
});

export default router;