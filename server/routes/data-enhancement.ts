/**
 * Data Enhancement API Routes
 * 
 * These routes expose the data enhancement services to improve 
 * the quality of our contact attribution data.
 */

import express from 'express';
import fieldMappingService from '../services/field-mapping';
import dealEnhancementService from '../services/deal-enhancement';
import attributionService from '../services/attribution';

const router = express.Router();

// Run complete data enhancement
router.post('/enhance-all', async (req, res) => {
  try {
    console.log('Starting comprehensive data enhancement process...');
    
    // Step 1: Fix missing contact fields
    console.log('Step 1: Fixing missing contact fields...');
    const contactFieldResult = await fieldMappingService.fixAllContactFields();
    
    // Step 2: Update sources count for multi-source attribution
    console.log('Step 2: Updating sources count...');
    const sourcesCountResult = await fieldMappingService.updateSourcesCount();
    
    // Step 3: Fix cash collected values for won deals
    console.log('Step 3: Fixing cash collected values...');
    const cashCollectedResult = await dealEnhancementService.fixCashCollectedValues();
    
    // Step 4: Classify meetings and set sequence numbers
    console.log('Step 4: Classifying meetings...');
    const meetingClassificationResult = await dealEnhancementService.classifyMeetings();
    
    // Step 5: Run attribution process
    console.log('Step 5: Running attribution process...');
    const attributionResult = await attributionService.attributeAllContacts();
    
    // Build response with results from all steps
    const result = {
      success: true,
      contactFields: contactFieldResult,
      sourcesCount: sourcesCountResult,
      cashCollected: cashCollectedResult,
      meetingClassification: meetingClassificationResult,
      attribution: attributionResult
    };
    
    res.json(result);
  } catch (error: any) {
    console.error('Error in data enhancement process:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Fix contact fields only
router.post('/fix-contact-fields', async (req, res) => {
  try {
    const result = await fieldMappingService.fixAllContactFields();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update sources count only
router.post('/update-sources-count', async (req, res) => {
  try {
    const result = await fieldMappingService.updateSourcesCount();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Fix cash collected values only
router.post('/fix-cash-collected', async (req, res) => {
  try {
    const result = await dealEnhancementService.fixCashCollectedValues();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Classify meetings only
router.post('/classify-meetings', async (req, res) => {
  try {
    const result = await dealEnhancementService.classifyMeetings();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;