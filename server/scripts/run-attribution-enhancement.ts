/**
 * Attribution Enhancement Script
 * 
 * This script performs a comprehensive enhancement of contact attribution
 * across all platforms (Close CRM, Calendly, Typeform) to achieve 100% certainty.
 * 
 * It runs the following processes:
 * 1. Enhanced contact matching to identify and merge duplicate contacts
 * 2. Cross-platform journey linking for unattributed activities
 * 3. Field mapping improvement to ensure complete data
 * 4. Validation metrics to confirm attribution quality
 */

import attributionService from '../services/attribution';
import { MatchConfidence } from '../services/contact-matcher';
import { storage } from '../storage';
import { db } from '../db';
import { contacts } from '@shared/schema';
import { count, sql } from 'drizzle-orm';

// Configuration
const TARGET_ATTRIBUTION_RATE = 100; // Target 100% attribution
const BATCH_SIZE = 500; // Process contacts in batches for performance
const MAX_PROCESSING_TIME = 60 * 60 * 1000; // 1 hour max processing time

/**
 * Main function to run the attribution enhancement process
 */
async function runAttributionEnhancement() {
  console.log('=== Starting Attribution Enhancement Process ===');
  const startTime = Date.now();
  let isComplete = false;
  
  try {
    // Step 1: Get current attribution metrics
    console.log('Step 1: Getting current attribution metrics...');
    const initialStats = await attributionService.calculateAttributionStats();
    
    console.log('Initial attribution stats:');
    console.log(`- Multi-source contact rate: ${initialStats.stats.multiSourceRate}%`);
    console.log(`- Total contacts: ${initialStats.stats.totalContacts}`);
    console.log(`- Multi-source contacts: ${initialStats.stats.multiSourceContacts}`);
    console.log(`- Deal attribution rate: ${initialStats.stats.dealAttributionRate}%`);
    console.log(`- Field coverage: ${initialStats.stats.fieldCoverage}%`);
    console.log(`- Overall attribution accuracy: ${initialStats.attributionAccuracy.toFixed(2)}%`);
    
    // Step 2: Run bulk attribution process
    console.log('\nStep 2: Running bulk attribution process...');
    console.log('This will enhance multi-source attribution and merge duplicate contacts...');
    
    // Process in batches until we reach target or timeout
    let batchCounter = 0;
    let totalProcessed = 0;
    let enhancementComplete = false;
    
    while (!enhancementComplete && (Date.now() - startTime < MAX_PROCESSING_TIME)) {
      batchCounter++;
      console.log(`\nProcessing batch ${batchCounter}...`);
      
      // Run the bulk attribution process with appropriate confidence threshold
      const result = await attributionService.runBulkAttributionProcess({
        enhanceMultiSource: true,
        resolveUnattributed: true,
        matchThreshold: MatchConfidence.MEDIUM,
        limit: BATCH_SIZE
      });
      
      if (result.success) {
        totalProcessed += result.contactsProcessed;
        
        console.log(`Batch ${batchCounter} results:`);
        console.log(`- Contacts processed: ${result.contactsProcessed}`);
        console.log(`- Contacts enhanced: ${result.contactsEnhanced}`);
        console.log(`- Contacts merged: ${result.contactsMerged}`);
        console.log(`- Errors encountered: ${result.errorsEncountered}`);
        
        // Get updated stats
        const currentStats = await attributionService.calculateAttributionStats();
        console.log(`\nCurrent attribution rate: ${currentStats.stats.multiSourceRate}%`);
        
        // Check if we've reached our target
        if (currentStats.stats.multiSourceRate >= TARGET_ATTRIBUTION_RATE || 
            (result.contactsEnhanced === 0 && result.contactsMerged === 0)) {
          console.log('Target attribution rate reached or no more contacts to enhance.');
          enhancementComplete = true;
        }
        
        // Print processing time
        const elapsedMinutes = Math.round((Date.now() - startTime) / 1000 / 60);
        console.log(`Elapsed time: ${elapsedMinutes} minutes`);
      } else {
        console.error('Error in bulk attribution process:', result.error);
        break;
      }
    }
    
    // Step 3: Cleanup and cross-check results
    console.log('\nStep 3: Performing final validation and cleanup...');
    
    // Get final attribution stats
    const finalStats = await attributionService.calculateAttributionStats();
    
    console.log('\nFinal attribution stats:');
    console.log(`- Multi-source contact rate: ${finalStats.stats.multiSourceRate}%`);
    console.log(`- Total contacts: ${finalStats.stats.totalContacts}`);
    console.log(`- Multi-source contacts: ${finalStats.stats.multiSourceContacts}`);
    console.log(`- Deal attribution rate: ${finalStats.stats.dealAttributionRate}%`);
    console.log(`- Field coverage: ${finalStats.stats.fieldCoverage}%`);
    console.log(`- Overall attribution accuracy: ${finalStats.attributionAccuracy.toFixed(2)}%`);
    
    // Calculate improvement
    const multiSourceImprovement = finalStats.stats.multiSourceRate - initialStats.stats.multiSourceRate;
    const accuracyImprovement = finalStats.attributionAccuracy - initialStats.attributionAccuracy;
    
    console.log('\nImprovements:');
    console.log(`- Multi-source rate: +${multiSourceImprovement.toFixed(2)}%`);
    console.log(`- Attribution accuracy: +${accuracyImprovement.toFixed(2)}%`);
    
    // Update platform distribution breakdown
    console.log('\nPlatform distribution:');
    const platformCounts = await db.select({
      platforms: sql<string>`lead_source`,
      count: count()
    })
    .from(contacts)
    .groupBy(sql`lead_source`);
    
    for (const platform of platformCounts) {
      if (platform.platforms) {
        console.log(`- ${platform.platforms}: ${platform.count} contacts`);
      }
    }
    
    isComplete = true;
    
    // Total processing time
    const totalMinutes = Math.round((Date.now() - startTime) / 1000 / 60);
    console.log(`\nTotal processing time: ${totalMinutes} minutes`);
    console.log('=== Attribution Enhancement Process Complete ===');
    
    return {
      success: true,
      initialStats,
      finalStats,
      multiSourceImprovement,
      accuracyImprovement,
      totalProcessed,
      processingTimeMinutes: totalMinutes
    };
  } catch (error) {
    console.error('Error in attribution enhancement process:', error);
    
    // Total processing time
    const totalMinutes = Math.round((Date.now() - startTime) / 1000 / 60);
    console.log(`\nTotal processing time before error: ${totalMinutes} minutes`);
    console.log('=== Attribution Enhancement Process Failed ===');
    
    return {
      success: false,
      error: (error as Error).message,
      isComplete
    };
  }
}

// Run the script
if (require.main === module) {
  runAttributionEnhancement().then((result) => {
    console.log('Script execution complete');
    if (!result.success) {
      process.exit(1);
    }
    process.exit(0);
  }).catch(err => {
    console.error('Unhandled error in script:', err);
    process.exit(1);
  });
}