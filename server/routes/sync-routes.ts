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
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 0;
    
    console.log(`Calendly sync requested (includeHistorical: ${includeHistorical}, daysBack: ${daysBack}, limit: ${limit})`);
    
    // Run the sync process
    const result = await calendlySyncService.syncCalendlyEvents({
      includeHistorical,
      daysBack,
      limit
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

/**
 * Special endpoint to sync just the most recent Calendly events (last 7 days)
 * GET /api/sync/recent-calendly
 */
router.get('/recent-calendly', async (req, res) => {
  try {
    console.log('Recent Calendly sync requested (last 7 days only)');
    
    // Run a quick sync with just recent events
    const result = await calendlySyncService.syncCalendlyEvents({
      includeHistorical: false,
      daysBack: 7,
      limit: 10
    });
    
    // Return the results
    res.json({
      success: true,
      message: `Recent Calendly sync completed. Processed ${result.totalEvents} events, imported ${result.importedEvents} new events.`,
      data: result
    });
  } catch (error: any) {
    console.error('Recent Calendly sync failed:', error);
    res.status(500).json({ 
      success: false, 
      message: `Recent Calendly sync failed: ${error.message}` 
    });
  }
});

export default router;