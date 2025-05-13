/**
 * Verify Contact Merging
 * 
 * This script tests the real-world performance of our contact merging functionality
 * by simulating Calendly contacts and seeing if they match with Close CRM contacts.
 */

import { storage } from './server/storage';
import contactMatcher, { MatchConfidence } from './server/services/contact-matcher';

async function verifyContactMerging() {
  console.log("=== Contact Merging Verification ===\n");
  
  // Get a sample of real contacts from the database
  const allContacts = await storage.getAllContacts();
  
  // Select 5 random contacts to test against
  const sampleSize = Math.min(5, allContacts.length);
  const sampleContacts = [];
  
  for (let i = 0; i < sampleSize; i++) {
    const randomIndex = Math.floor(Math.random() * allContacts.length);
    sampleContacts.push(allContacts[randomIndex]);
    allContacts.splice(randomIndex, 1); // Remove to avoid duplicates
  }
  
  // Test variations of each contact
  for (const originalContact of sampleContacts) {
    console.log(`\nTesting variations for contact: ${originalContact.name} (${originalContact.email})\n`);
    
    // Test case 1: Exact match
    await testMatchCase(originalContact, "Exact match", {
      name: originalContact.name,
      email: originalContact.email
    });
    
    // Test case 2: Email case difference
    await testMatchCase(originalContact, "Email case difference", {
      name: originalContact.name,
      email: originalContact.email.toUpperCase()
    });
    
    // Test case 3: Gmail alias (if Gmail address)
    if (originalContact.email.includes('@gmail.com')) {
      const [username, domain] = originalContact.email.split('@');
      await testMatchCase(originalContact, "Gmail alias", {
        name: originalContact.name,
        email: `${username}+calendly@${domain}`
      });
    }
    
    // Test case 4: Name variation (if name has space)
    if (originalContact.name && originalContact.name.includes(' ')) {
      const nameParts = originalContact.name.split(' ');
      let altName = "";
      
      if (nameParts.length >= 2) {
        // For "First Last", try "F. Last"
        altName = `${nameParts[0][0]}. ${nameParts.slice(1).join(' ')}`;
      }
      
      if (altName) {
        await testMatchCase(originalContact, "Name variation", {
          name: altName,
          email: originalContact.email
        });
      }
    }
    
    // Test case 5: Different email but same phone
    if (originalContact.phone) {
      await testMatchCase(originalContact, "Different email but same phone", {
        name: originalContact.name,
        email: `${originalContact.name.replace(/\s/g, '').toLowerCase()}@example.com`,
        phone: originalContact.phone
      });
    }
  }
}

async function testMatchCase(originalContact: any, testName: string, testContact: any) {
  try {
    console.log(`Test case: ${testName}`);
    console.log(`  Original: ${originalContact.name} (${originalContact.email})`);
    console.log(`  Testing:  ${testContact.name} (${testContact.email})`);
    
    // Normalize emails for debug output
    const originalNormalized = contactMatcher.normalizeEmail(originalContact.email);
    const testNormalized = contactMatcher.normalizeEmail(testContact.email);
    
    console.log(`  Normalized emails: ${originalNormalized} vs ${testNormalized}`);
    
    // Run the matcher
    const matchResult = await contactMatcher.findBestMatchingContact(testContact);
    
    // Display results
    console.log(`  Match result: ${matchResult.confidence}`);
    console.log(`  Match reason: ${matchResult.reason || 'No reason provided'}`);
    
    if (matchResult.contact && matchResult.contact.id === originalContact.id) {
      console.log(`  ✅ Correctly matched to original contact`);
    } else if (matchResult.confidence !== MatchConfidence.NONE) {
      console.log(`  ⚠️ Matched to different contact: ${matchResult.contact?.name} (${matchResult.contact?.email})`);
    } else {
      console.log(`  ❌ No match found`);
    }
    
    console.log(""); // Add spacing
  } catch (error) {
    console.error(`  ❌ Error testing case ${testName}:`, error);
  }
}

// Run the verification
verifyContactMerging().then(() => {
  console.log("Contact merging verification complete");
  process.exit(0);
}).catch(error => {
  console.error("Error during verification:", error);
  process.exit(1);
});