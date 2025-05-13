/**
 * Multi-Source Contact Diagnosis
 * 
 * This script diagnoses why we have 0% multi-source contacts (contacts with both
 * activities from Close CRM and meetings from Calendly) even though all meetings
 * are linked to contacts.
 */

import { storage } from './server/storage';

async function diagnoseMultiSourceContacts() {
  console.log('Starting multi-source contact diagnosis...');
  
  try {
    // Get all contacts
    const allContacts = await storage.getAllContacts();
    console.log(`Total contacts: ${allContacts.length}`);
    
    // Get contacts with activities (from Close CRM)
    const contactsWithActivities = [];
    for (const contact of allContacts) {
      const activities = await storage.getActivitiesByContactId(contact.id);
      if (activities.length > 0) {
        contactsWithActivities.push(contact);
      }
    }
    console.log(`Contacts with activities: ${contactsWithActivities.length}`);
    
    // Get contacts with meetings (from Calendly)
    const contactsWithMeetings = [];
    for (const contact of allContacts) {
      const meetings = await storage.getMeetingsByContactId(contact.id);
      if (meetings.length > 0) {
        contactsWithMeetings.push(contact);
      }
    }
    console.log(`Contacts with meetings: ${contactsWithMeetings.length}`);
    
    // Check for any overlap (multi-source contacts)
    const multiSourceContacts = contactsWithActivities.filter(activityContact => {
      return contactsWithMeetings.some(meetingContact => meetingContact.id === activityContact.id);
    });
    console.log(`Contacts with both activities and meetings: ${multiSourceContacts.length}`);
    
    // Analyze why there's no overlap
    console.log('\nDetailed analysis:');
    
    // Show details about contacts with meetings
    console.log('\nContacts with meetings:');
    for (const contact of contactsWithMeetings) {
      const meetings = await storage.getMeetingsByContactId(contact.id);
      console.log(`- Contact ID ${contact.id}: ${contact.name} (${contact.email})`);
      console.log(`  Meetings: ${meetings.length}`);
      console.log(`  Source: ${contact.sourceId}`);
      console.log(`  Lead Source: ${contact.leadSource}`);
      
      // Check if there's a similar contact in the activities list
      const similarContacts = contactsWithActivities.filter(c => {
        // Check for email similarity
        return c.email.toLowerCase() === contact.email.toLowerCase() ||
               normalizeEmail(c.email) === normalizeEmail(contact.email);
      });
      
      if (similarContacts.length > 0) {
        console.log('  Similar contacts with activities:');
        for (const similar of similarContacts) {
          const activities = await storage.getActivitiesByContactId(similar.id);
          console.log(`  - ID ${similar.id}: ${similar.name} (${similar.email})`);
          console.log(`    Activities: ${activities.length}`);
          console.log(`    Source: ${similar.sourceId}`);
          console.log(`    Lead Source: ${similar.leadSource}`);
          
          // Check why they weren't merged
          console.log(`    Email normalized: ${normalizeEmail(similar.email)}`);
          console.log(`    Meeting contact email normalized: ${normalizeEmail(contact.email)}`);
          console.log(`    Emails match: ${normalizeEmail(similar.email) === normalizeEmail(contact.email)}`);
          
          // Additional checking
          if (normalizeEmail(similar.email) === normalizeEmail(contact.email)) {
            console.log('    These contacts should have been merged!');
          }
        }
      } else {
        console.log('  No similar contacts found with activities');
      }
      
      console.log('');
    }
    
    // Recommend solutions
    console.log('\nRecommended solutions:');
    
    if (multiSourceContacts.length === 0 && similarContacts.length > 0) {
      console.log('1. Implement a contact merging tool to combine similar contacts');
      console.log('2. Ensure email normalization is consistent across the application');
      console.log('3. Modify the contact matcher to use more fuzzy matching for existing data');
    } else if (contactsWithMeetings.length === 0) {
      console.log('1. Ensure Calendly integration is properly fetching and storing meetings');
      console.log('2. Check that meetings are being properly linked to contacts');
    } else {
      console.log('1. Generate more test data with multiple sources');
      console.log('2. Verify that both Close CRM and Calendly integrations are working correctly');
    }
    
  } catch (error) {
    console.error('Error diagnosing multi-source contacts:', error);
  }
}

// Helper function for email normalization
function normalizeEmail(email: string): string {
  if (!email) return '';
  
  // Convert to lowercase
  let normalized = email.toLowerCase();
  
  // Handle invalid emails with multiple @ symbols
  const atSymbolCount = (normalized.match(/@/g) || []).length;
  if (atSymbolCount !== 1) {
    return normalized; // Return as-is for invalid emails
  }
  
  // Handle Gmail-specific normalization
  if (normalized.endsWith('@gmail.com')) {
    // Remove dots from username part (Gmail ignores dots)
    const [username, domain] = normalized.split('@');
    const usernameWithoutDots = username.replace(/\./g, '');
    
    // Remove the +alias part if present (user+alias@gmail.com -> user@gmail.com)
    const usernameWithoutAlias = usernameWithoutDots.split('+')[0];
    
    normalized = `${usernameWithoutAlias}@${domain}`;
  }
  
  return normalized;
}

// Run the diagnostic tool
let similarContacts = []; // Global for use in recommended solutions
diagnoseMultiSourceContacts().catch(console.error);