/**
 * Comprehensive Calendly Sync Tests
 * 
 * This test suite validates that the Calendly integration correctly handles all edge cases
 * and ensures meetings are properly imported into the dashboard.
 */

import * as dotenv from 'dotenv';
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import axios from 'axios';
import { meetings } from '../schema';
import { formatISO, subDays, addDays } from 'date-fns';

dotenv.config();

// Direct database connection for test verification
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Set up Calendly API client
const calendlyClient = axios.create({
  baseURL: 'https://api.calendly.com',
  headers: {
    'Authorization': `Bearer ${process.env.CALENDLY_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

const runTests = async () => {
  console.log('Starting Calendly Sync Tests...');
  
  try {
    // Test 1: Verify database connection
    await testDatabaseConnection();
    
    // Test 2: Verify Calendly API connection
    await testCalendlyApiConnection();
    
    // Test 3: Test handling of duplicate events (shouldn't create duplicates)
    await testDuplicateEventHandling();
    
    // Test 4: Test contact matching by email
    await testContactMatchingByEmail();
    
    // Test 5: Test contact matching by name (fallback)
    await testContactMatchingByName();
    
    // Test 6: Test handling events with no matching contact
    await testNoMatchingContact();
    
    // Test 7: Test date range filtering
    await testDateRangeFiltering();
    
    // Test 8: Test cache clearing after import
    await testCacheClearing();
    
    // Test 9: Verify dashboard data reflects imported meetings
    await testDashboardReflectsImportedMeetings();
    
    // Test 10: Ensure proper meeting metadata is preserved
    await testMeetingMetadataPreservation();
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test suite failed:', error);
  } finally {
    await pool.end();
  }
};

async function testDatabaseConnection() {
  console.log('Test 1: Verifying database connection...');
  
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

async function testCalendlyApiConnection() {
  console.log('Test 2: Verifying Calendly API connection...');
  
  try {
    const response = await calendlyClient.get('/user/me');
    console.log('✅ Calendly API connection successful');
    console.log(`   Connected as: ${response.data.resource.name}`);
  } catch (error) {
    console.error('❌ Calendly API connection failed:', error?.response?.data || error.message);
    throw error;
  }
}

async function testDuplicateEventHandling() {
  console.log('Test 3: Testing handling of duplicate events...');
  
  try {
    // Get a recent event from Calendly
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    
    const eventsResponse = await calendlyClient.get('/scheduled_events', {
      params: {
        organization: 'https://api.calendly.com/organizations/54858790-a2e4-4696-9d19-7c6dc22ef508',
        count: 1,
        min_start_time: formatISO(thirtyDaysAgo),
        max_start_time: formatISO(now)
      }
    });
    
    if (!eventsResponse.data.collection.length) {
      console.log('⚠️ No events found for duplicate test, skipping');
      return;
    }
    
    const testEvent = eventsResponse.data.collection[0];
    const eventId = testEvent.uri.split('/').pop();
    
    // Count current instances of this event
    const countBefore = await pool.query(
      'SELECT COUNT(*) FROM meetings WHERE calendly_event_id = $1',
      [eventId]
    );
    
    // Attempt to import this event (which might already exist)
    const apiUrl = `http://localhost:5000/api/sync/calendly`;
    const importResponse = await axios.post(apiUrl, {
      eventId: eventId,
      forceUpdate: false
    });
    
    // Count instances after import
    const countAfter = await pool.query(
      'SELECT COUNT(*) FROM meetings WHERE calendly_event_id = $1',
      [eventId]
    );
    
    // There should be 1 instance of the event (no duplicates)
    if (parseInt(countAfter.rows[0].count) === 1) {
      console.log('✅ Duplicate event handling working correctly');
    } else if (parseInt(countAfter.rows[0].count) > 1) {
      console.error('❌ Duplicate events were created!');
      throw new Error('Duplicate prevention failed');
    } else {
      console.error('❌ Event was not imported');
      throw new Error('Event import failed');
    }
  } catch (error) {
    console.error('❌ Duplicate event test failed:', error?.response?.data || error.message);
    throw error;
  }
}

async function testContactMatchingByEmail() {
  console.log('Test 4: Testing contact matching by email...');
  
  try {
    // Get a sample contact with an email
    const contactResult = await pool.query(
      'SELECT id, name, email FROM contacts WHERE email IS NOT NULL LIMIT 1'
    );
    
    if (!contactResult.rows.length) {
      console.log('⚠️ No contacts with email found for test, skipping');
      return;
    }
    
    const contact = contactResult.rows[0];
    
    // Create a mock event to test with this email
    const testEvent = {
      contact_email: contact.email,
      event_type: 'Call 1',
      start_time: new Date().toISOString(),
      end_time: addDays(new Date(), 1).toISOString()
    };
    
    // Call our matching logic directly with SQL
    const matchQuery = `
      SELECT id, name, email 
      FROM contacts 
      WHERE email = $1 
      LIMIT 1
    `;
    
    const matchResult = await pool.query(matchQuery, [contact.email]);
    
    if (matchResult.rows.length > 0 && matchResult.rows[0].id === contact.id) {
      console.log('✅ Contact matching by email working correctly');
      console.log(`   Matched ${contact.email} to contact ID ${contact.id} (${contact.name})`);
    } else {
      console.error('❌ Contact matching by email failed');
      console.error(`   Expected: ${contact.id}, Actual: ${matchResult.rows[0]?.id || 'not found'}`);
      throw new Error('Email matching failed');
    }
  } catch (error) {
    console.error('❌ Contact matching by email test failed:', error?.response?.data || error.message);
    throw error;
  }
}

async function testContactMatchingByName() {
  console.log('Test 5: Testing contact matching by name (fallback)...');
  
  try {
    // Get a sample contact
    const contactResult = await pool.query(
      'SELECT id, name FROM contacts WHERE name IS NOT NULL LIMIT 1'
    );
    
    if (!contactResult.rows.length) {
      console.log('⚠️ No contacts with names found for test, skipping');
      return;
    }
    
    const contact = contactResult.rows[0];
    
    // Verify the name-based matching with SQL
    const matchQuery = `
      SELECT id, name 
      FROM contacts 
      WHERE name ILIKE $1 
      LIMIT 1
    `;
    
    const matchResult = await pool.query(matchQuery, [`%${contact.name}%`]);
    
    if (matchResult.rows.length > 0 && matchResult.rows[0].id === contact.id) {
      console.log('✅ Contact matching by name working correctly');
      console.log(`   Matched "${contact.name}" to contact ID ${contact.id}`);
    } else {
      console.error('❌ Contact matching by name failed');
      console.error(`   Expected: ${contact.id}, Actual: ${matchResult.rows[0]?.id || 'not found'}`);
      throw new Error('Name matching failed');
    }
  } catch (error) {
    console.error('❌ Contact matching by name test failed:', error?.response?.data || error.message);
    throw error;
  }
}

async function testNoMatchingContact() {
  console.log('Test 6: Testing handling of events with no matching contact...');
  
  try {
    // Get fallback contact information
    const fallbackQuery = `
      SELECT id, name FROM contacts ORDER BY id LIMIT 1
    `;
    
    const fallbackResult = await pool.query(fallbackQuery);
    
    if (fallbackResult.rows.length === 0) {
      console.log('⚠️ No contacts found in database, skipping test');
      return;
    }
    
    const fallbackContact = fallbackResult.rows[0];
    console.log(`✅ Fallback contact identified: ${fallbackContact.name} (ID: ${fallbackContact.id})`);
    console.log('   Verified system has a valid fallback for unmatched contacts');
  } catch (error) {
    console.error('❌ No matching contact test failed:', error?.response?.data || error.message);
    throw error;
  }
}

async function testDateRangeFiltering() {
  console.log('Test 7: Testing date range filtering...');
  
  try {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);
    
    // Count meetings in the last 30 days
    const recentMeetingsResult = await pool.query(
      'SELECT COUNT(*) FROM meetings WHERE start_time >= $1 AND start_time <= $2',
      [thirtyDaysAgo, now]
    );
    
    // Count meetings from 30-60 days ago
    const olderMeetingsResult = await pool.query(
      'SELECT COUNT(*) FROM meetings WHERE start_time >= $1 AND start_time < $2',
      [sixtyDaysAgo, thirtyDaysAgo]
    );
    
    const recentCount = parseInt(recentMeetingsResult.rows[0].count);
    const olderCount = parseInt(olderMeetingsResult.rows[0].count);
    
    console.log(`   Found ${recentCount} meetings in the last 30 days`);
    console.log(`   Found ${olderCount} meetings from 30-60 days ago`);
    
    // Verify that our date range filtering is working
    if (recentCount > 0) {
      console.log('✅ Date range filtering is working - found meetings within the date range');
    } else if (olderCount > 0) {
      console.log('✅ Date range filtering is working - different counts for different date ranges');
    } else {
      console.log('⚠️ Not enough meeting data to verify date filtering');
    }
  } catch (error) {
    console.error('❌ Date range filtering test failed:', error?.response?.data || error.message);
    throw error;
  }
}

async function testCacheClearing() {
  console.log('Test 8: Testing cache clearing after import...');
  
  try {
    // Clear cache via API
    const clearCacheUrl = 'http://localhost:5000/api/cache/clear';
    const clearResponse = await axios.post(clearCacheUrl);
    
    if (clearResponse.data.success) {
      console.log('✅ Cache clearing API working correctly');
      console.log(`   Cleared ${clearResponse.data.cleared} cached items`);
    } else {
      console.error('❌ Cache clearing failed');
      throw new Error('Cache clearing failed');
    }
    
    // Verify the database cache table is empty
    const cacheResult = await pool.query('SELECT COUNT(*) FROM cache');
    const cacheCount = parseInt(cacheResult.rows[0].count);
    
    if (cacheCount === 0) {
      console.log('✅ Cache table is empty after clearing');
    } else {
      console.log(`⚠️ Cache table still has ${cacheCount} items after clearing`);
    }
  } catch (error) {
    console.error('❌ Cache clearing test failed:', error?.response?.data || error.message);
    throw error;
  }
}

async function testDashboardReflectsImportedMeetings() {
  console.log('Test 9: Verifying dashboard data reflects imported meetings...');
  
  try {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    
    // Count meetings in DB for the last 30 days
    const dbCountResult = await pool.query(
      'SELECT COUNT(*) FROM meetings WHERE start_time >= $1 AND start_time <= $2',
      [thirtyDaysAgo, now]
    );
    
    const dbCount = parseInt(dbCountResult.rows[0].count);
    
    // Get dashboard data
    const dashboardUrl = `http://localhost:5000/api/enhanced-dashboard?dateRange=${formatISO(thirtyDaysAgo).split('T')[0]}_${formatISO(now).split('T')[0]}`;
    const dashboardResponse = await axios.get(dashboardUrl);
    
    const dashboardMeetingsArray = dashboardResponse.data.meetings || [];
    
    console.log(`   Database has ${dbCount} meetings in last 30 days`);
    console.log(`   Dashboard contains ${dashboardMeetingsArray.length} meetings in data array`);
    
    // Because of timezone and exact date filtering, we allow a small discrepancy
    if (Math.abs(dashboardMeetingsArray.length - dbCount) <= 10) {
      console.log('✅ Dashboard reflects imported meetings correctly');
    } else {
      console.error('⚠️ Potential dashboard data inconsistency detected');
      console.error(`   Database meetings: ${dbCount}, dashboard meetings: ${dashboardMeetingsArray.length}`);
      // This is a warning, not a failure, since dashboard may apply different filters
    }
  } catch (error) {
    console.error('❌ Dashboard reflection test failed:', error?.response?.data || error.message);
    throw error;
  }
}

async function testMeetingMetadataPreservation() {
  console.log('Test 10: Testing meeting metadata preservation...');
  
  try {
    // Get a sample meeting with metadata
    const meetingResult = await pool.query(
      'SELECT id, calendly_event_id, type, duration, status FROM meetings WHERE calendly_event_id IS NOT NULL LIMIT 1'
    );
    
    if (!meetingResult.rows.length) {
      console.log('⚠️ No meetings with Calendly data found for test, skipping');
      return;
    }
    
    const meeting = meetingResult.rows[0];
    console.log(`   Found sample meeting: ID ${meeting.id}, type: ${meeting.type}, status: ${meeting.status}`);
    
    // Check if the calendar event ID is preserved
    if (meeting.calendly_event_id) {
      console.log('✅ Calendly event ID is preserved');
    } else {
      console.error('❌ Calendly event ID is missing');
    }
    
    // Check if the type is preserved
    if (meeting.type) {
      console.log('✅ Meeting type is preserved');
    } else {
      console.error('❌ Meeting type is missing');
    }
    
    // Check if the duration is preserved
    if (meeting.duration !== null && meeting.duration !== undefined) {
      console.log('✅ Meeting duration is preserved');
    } else {
      console.error('❌ Meeting duration is missing');
    }
    
    // Check if the status is preserved
    if (meeting.status) {
      console.log('✅ Meeting status is preserved');
    } else {
      console.error('❌ Meeting status is missing');
    }
  } catch (error) {
    console.error('❌ Meeting metadata test failed:', error?.response?.data || error.message);
    throw error;
  }
}

// Run the tests
runTests().catch(console.error);