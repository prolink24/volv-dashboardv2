/**
 * Sync Routes
 * 
 * API endpoints for syncing external services like Calendly
 */

import { Router } from 'express';
import calendlySyncService from '../services/calendly-sync-service';

const router = Router();

/**
 * Endpoint to sync Calendly events
 * GET /api/sync/calendly
 */
router.get('/calendly', async (req, res) => {
  try {
    const includeHistorical = req.query.includeHistorical === 'true';
    const daysBack = req.query.daysBack ? parseInt(req.query.daysBack as string) : 30;
    
    console.log(`Calendly sync requested (includeHistorical: ${includeHistorical}, daysBack: ${daysBack})`);
    
    // Run the sync process
    const result = await calendlySyncService.syncCalendlyEvents({
      includeHistorical,
      daysBack
    });
    
    // Return the results
    res.json({
      success: true,
      message: `Calendly sync completed successfully. Processed ${result.totalEvents} events, imported ${result.importedEvents} new events.`,
      data: result
    });
  } catch (error: any) {
    console.error('Calendly sync failed:', error);
    res.status(500).json({ 
      success: false, 
      message: `Calendly sync failed: ${error.message}` 
    });
  }
});

export default router;