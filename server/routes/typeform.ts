import express from 'express';
import { getForms, syncTypeformResponses, syncSingleForm } from '../api/typeform';

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
 * POST /api/typeform/sync
 * Syncs all Typeform responses to the database
 */
router.post('/sync', async (req, res) => {
  try {
    const result = await syncTypeformResponses();
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