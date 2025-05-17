/**
 * Trigger full sync script
 * 
 * This script triggers a full synchronization from all data sources:
 * - Close CRM (contacts, deals, activities)
 * - Calendly (meetings)
 * - Typeform (form submissions)
 * 
 * Usage: ts-node trigger-full-sync.ts
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_URL || 'http://localhost:3000/api';

async function triggerFullSync() {
  console.log('🔄 Starting full data synchronization from all sources...');
  
  try {
    // Step 1: Sync Close CRM data
    console.log('📊 Syncing Close CRM data (contacts, deals, activities)...');
    const closeResult = await fetch(`${API_BASE}/sync/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!closeResult.ok) {
      throw new Error(`Close sync failed with status ${closeResult.status}`);
    }
    
    const closeData = await closeResult.json();
    console.log(`✅ Close sync complete! Synced ${closeData.contacts || 0} contacts, ${closeData.deals || 0} deals`);
    
    // Step 2: Sync Calendly meetings
    console.log('📅 Syncing Calendly meetings...');
    const calendlyResult = await fetch(`${API_BASE}/sync/calendly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!calendlyResult.ok) {
      throw new Error(`Calendly sync failed with status ${calendlyResult.status}`);
    }
    
    const calendlyData = await calendlyResult.json();
    console.log(`✅ Calendly sync complete! Synced ${calendlyData.meetings || 0} meetings`);
    
    // Step 3: Sync Typeform submissions
    console.log('📝 Syncing Typeform submissions...');
    const typeformResult = await fetch(`${API_BASE}/sync/typeform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!typeformResult.ok) {
      throw new Error(`Typeform sync failed with status ${typeformResult.status}`);
    }
    
    const typeformData = await typeformResult.json();
    console.log(`✅ Typeform sync complete! Synced ${typeformData.forms || 0} form submissions`);
    
    // Step 4: Run attribution algorithm to connect data points
    console.log('🧠 Running contact attribution algorithm...');
    const attributionResult = await fetch(`${API_BASE}/attribution/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!attributionResult.ok) {
      throw new Error(`Attribution failed with status ${attributionResult.status}`);
    }
    
    // Step 5: Clear cache to ensure fresh data is shown
    console.log('🧹 Clearing dashboard cache for fresh data...');
    const cacheResult = await fetch(`${API_BASE}/cache/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: 'dashboard' })
    });
    
    if (!cacheResult.ok) {
      throw new Error(`Cache clearing failed with status ${cacheResult.status}`);
    }
    
    console.log('✨ Full sync complete! Your dashboard now has fresh data.');
    console.log(`
----------------------------------------------------
📊 DATA SYNC SUMMARY
----------------------------------------------------
Close CRM:
  - Contacts: ${closeData.contacts || 0}
  - Deals: ${closeData.deals || 0}
  - Activities: ${closeData.activities || 0}
  
Calendly:
  - Meetings: ${calendlyData.meetings || 0}
  
Typeform:
  - Forms: ${typeformData.forms || 0}
  
✅ All data is now ready to be viewed in your dashboard
----------------------------------------------------
`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run the sync
triggerFullSync(); 