import express from 'express';
import * as customerJourney from '../api/customer-journey';

const router = express.Router();

/**
 * Get comprehensive customer journey data for a specific contact
 * GET /api/customer-journey/:contactId
 */
router.get('/:contactId', async (req, res) => {
  try {
    const contactId = parseInt(req.params.contactId, 10);
    const dateRange = req.query.dateRange as string | undefined;
    
    if (isNaN(contactId)) {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }
    
    const journey = await customerJourney.getCustomerJourney(contactId, dateRange);
    
    return res.json(journey);
  } catch (error) {
    console.error('Error fetching customer journey:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch customer journey' });
  }
});

/**
 * Get a list of similar contacts based on journey patterns
 * GET /api/customer-journey/:contactId/similar
 */
router.get('/:contactId/similar', async (req, res) => {
  try {
    const contactId = parseInt(req.params.contactId, 10);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
    
    if (isNaN(contactId)) {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }
    
    const similarContacts = await customerJourney.getSimilarContacts(contactId, limit);
    
    return res.json(similarContacts);
  } catch (error) {
    console.error('Error fetching similar contacts:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch similar contacts' });
  }
});

/**
 * Get aggregate journey analytics for contact segments
 * GET /api/customer-journey/analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const segment = req.query.segment as string | undefined;
    const dateRange = req.query.dateRange as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    
    const analytics = await customerJourney.getJourneyAnalytics(segment, dateRange, limit);
    
    return res.json(analytics);
  } catch (error) {
    console.error('Error fetching journey analytics:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch journey analytics' });
  }
});

export default router;