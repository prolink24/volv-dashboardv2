/**
 * Contact Matcher Service
 * 
 * This service provides advanced contact matching functionality to ensure we properly
 * identify the same contact across different systems (Close, Calendly, Typeform).
 * 
 * It includes:
 * - Email normalization for handling case differences, Gmail aliases, etc.
 * - Fuzzy name matching with confidence levels
 * - Phone number matching with normalization
 * - Multi-criteria matching with weighted scoring
 */

import { storage } from '../storage';
import { InsertContact, Contact } from '@shared/schema';

export enum MatchConfidence {
  EXACT = 'exact',
  HIGH = 'high',
  MEDIUM = 'medium', 
  LOW = 'low',
  NONE = 'none'
}

type MatchResult = {
  contact: Contact | null;
  confidence: MatchConfidence;
  reason: string | null;
};

/**
 * Normalize email addresses to standardize comparisons
 * - Makes email lowercase
 * - Removes Gmail dots (since gmail ignores dots)
 * - Removes Gmail plus aliases (user+alias@gmail.com -> user@gmail.com)
 */
export function normalizeEmail(email: string): string {
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
    // Remove dots from username part for Gmail (johnd.oe@gmail.com === johndo.e@gmail.com)
    const [username, domain] = normalized.split('@');
    const usernameWithoutDots = username.replace(/\./g, '');
    
    // Remove everything after + in Gmail (john+calendly@gmail.com === john@gmail.com)
    const usernameWithoutPlus = usernameWithoutDots.split('+')[0];
    
    normalized = `${usernameWithoutPlus}@${domain}`;
  }
  
  return normalized;
}

/**
 * Normalize phone numbers to standardized format
 * Strips all non-digit characters and ensures consistent format
 */
function normalizePhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  return phone.replace(/\D/g, '');
}

/**
 * Calculate string similarity between two strings (0-1 scale)
 * Uses a simple but effective approach - good for names
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  // Convert to lowercase for comparison
  const a = str1.toLowerCase();
  const b = str2.toLowerCase();
  
  // Calculate Jaccard index using character bigrams
  const createBigrams = (str: string) => {
    const result = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      result.add(str.substring(i, i + 2));
    }
    return result;
  };
  
  const aBigrams = createBigrams(a);
  const bBigrams = createBigrams(b);
  
  let intersection = 0;
  for (const bigram of Array.from(aBigrams)) {
    if (bBigrams.has(bigram)) {
      intersection++;
    }
  }
  
  const union = aBigrams.size + bBigrams.size - intersection;
  
  return union === 0 ? 0 : intersection / union;
}

/**
 * Determine if two names are similar enough to be the same person
 */
function areNamesSimilar(name1: string, name2: string): {
  areSimilar: boolean;
  similarity: number;
  isFuzzyMatch: boolean;
} {
  if (!name1 || !name2) {
    return { areSimilar: false, similarity: 0, isFuzzyMatch: false };
  }
  
  const normalizedName1 = name1.toLowerCase().trim();
  const normalizedName2 = name2.toLowerCase().trim();
  
  // Exact match
  if (normalizedName1 === normalizedName2) {
    return { areSimilar: true, similarity: 1, isFuzzyMatch: false };
  }
  
  // Check if one name is contained within the other
  // (e.g., "John Doe" vs "John" or "John D.")
  if (normalizedName1.includes(normalizedName2) || normalizedName2.includes(normalizedName1)) {
    return { areSimilar: true, similarity: 0.9, isFuzzyMatch: true };
  }
  
  // Check for nickname matches (e.g., "Jen" vs "Jennifer")
  const nicknameMap: Record<string, string[]> = {
    'jennifer': ['jen', 'jenny'],
    'robert': ['rob', 'bob', 'bobby'],
    'michael': ['mike', 'mikey'],
    'william': ['will', 'bill', 'billy'],
    'richard': ['rick', 'rich', 'dick'],
    'elizabeth': ['liz', 'beth', 'betty'],
    'katherine': ['kate', 'kathy', 'katie'],
    'christopher': ['chris', 'topher'],
    'nicholas': ['nick', 'nicky'],
    'alexander': ['alex', 'al'],
    'matthew': ['matt', 'matty'],
    'joseph': ['joe', 'joey'],
    'daniel': ['dan', 'danny'],
    'samuel': ['sam', 'sammy'],
    'jonathan': ['jon', 'jonny']
  };
  
  // Extract first names
  const firstName1 = normalizedName1.split(' ')[0];
  const firstName2 = normalizedName2.split(' ')[0];
  
  // Check for matching nicknames
  const matchesNickname = Object.entries(nicknameMap).some(([fullName, nicknames]) => {
    // Full name to nickname
    if (firstName1 === fullName && nicknames.includes(firstName2)) {
      return true;
    }
    // Nickname to full name
    if (firstName2 === fullName && nicknames.includes(firstName1)) {
      return true;
    }
    // Nickname to nickname (same full name)
    if (nicknames.includes(firstName1) && nicknames.includes(firstName2)) {
      return true;
    }
    return false;
  });
  
  if (matchesNickname) {
    // If last names also match, this is a strong match
    const lastName1 = normalizedName1.split(' ').slice(-1)[0];
    const lastName2 = normalizedName2.split(' ').slice(-1)[0];
    
    if (lastName1 && lastName2 && lastName1 === lastName2) {
      return { areSimilar: true, similarity: 0.95, isFuzzyMatch: true };
    }
    
    // Even with just the first name nickname match, it's pretty good
    return { areSimilar: true, similarity: 0.8, isFuzzyMatch: true };
  }
  
  // Handle initial format (e.g., "J. Doe" vs "John Doe")
  const nameParts1 = normalizedName1.split(' ');
  const nameParts2 = normalizedName2.split(' ');
  
  // Check if last names match and first initial matches
  if (nameParts1.length >= 2 && nameParts2.length >= 2) {
    const lastName1 = nameParts1[nameParts1.length - 1];
    const lastName2 = nameParts2[nameParts2.length - 1];
    
    // If last names match exactly
    if (lastName1 === lastName2) {
      const firstPart1 = nameParts1[0];
      const firstPart2 = nameParts2[0];
      
      // Check for initial format like "J." or "J"
      if ((firstPart1.length === 1 || (firstPart1.length === 2 && firstPart1.endsWith('.'))) && 
          firstPart2.startsWith(firstPart1.charAt(0))) {
        return { areSimilar: true, similarity: 0.85, isFuzzyMatch: true };
      }
      
      if ((firstPart2.length === 1 || (firstPart2.length === 2 && firstPart2.endsWith('.'))) && 
          firstPart1.startsWith(firstPart2.charAt(0))) {
        return { areSimilar: true, similarity: 0.85, isFuzzyMatch: true };
      }
    }
  }
  
  // Calculate similarity score
  const similarity = calculateStringSimilarity(normalizedName1, normalizedName2);
  
  // Names are similar if similarity is >= 0.7
  return { 
    areSimilar: similarity >= 0.7, 
    similarity, 
    isFuzzyMatch: true 
  };
}

/**
 * Find the best matching contact based on a comprehensive matching strategy
 * Attempts various matching techniques with different confidence levels
 */
export async function findBestMatchingContact(contactData: Partial<InsertContact>): Promise<MatchResult> {
  // Helper to create match results
  const createResult = (
    contact: Contact | null,
    confidence: MatchConfidence,
    reason?: string
  ): MatchResult => ({
    contact,
    confidence,
    reason: reason || null
  });
  
  // 1. Try exact email match first (most reliable)
  if (contactData.email) {
    const normalizedEmail = normalizeEmail(contactData.email);
    
    // Find all contacts to do detailed matching
    const allContacts = await storage.getAllContacts();
    
    // Find exact email match (normalized)
    const exactMatch = allContacts.find(contact => 
      normalizeEmail(contact.email) === normalizedEmail
    );
    
    if (exactMatch) {
      const isSameEmail = exactMatch.email.toLowerCase() === contactData.email?.toLowerCase();
      const reason = isSameEmail
        ? 'Exact email match'
        : 'Normalized Gmail match (ignoring dots and aliases)';
      
      return createResult(exactMatch, MatchConfidence.EXACT, reason);
    }
  }
  
  // 2. Try phone + name matching (high confidence)
  if (contactData.phone && contactData.name) {
    const normalizedPhone = normalizePhone(contactData.phone);
    const contactName = contactData.name; // Store in a local variable to avoid TypeScript issues
    
    // Get all contacts with this phone
    const allContacts = await storage.getAllContacts();
    const phoneMatches = allContacts.filter(contact => 
      normalizePhone(contact.phone || '') === normalizedPhone && 
      normalizedPhone.length > 5 // Make sure it's a valid phone number
    );
    
    if (phoneMatches.length > 0) {
      // First, check for initial format matches
      // For example "J. Doe" should match "Jane Doe" if phones match
      const initialFormatMatches = phoneMatches.filter(contact => {
        // Extract last names from both
        const contactNameParts = contact.name.toLowerCase().trim().split(' ');
        const dataNameParts = contactName.toLowerCase().trim().split(' ');
        
        // Check if both have at least last name
        if (contactNameParts.length >= 1 && dataNameParts.length >= 1) {
          const contactLastName = contactNameParts[contactNameParts.length - 1];
          const dataLastName = dataNameParts[dataNameParts.length - 1];
          
          // If last names match
          if (contactLastName === dataLastName) {
            // Get first part of names
            const contactFirstPart = contactNameParts[0];
            const dataFirstPart = dataNameParts[0];
            
            // Check if either is an initial (e.g., "J." or "J")
            const isContactInitial = 
              contactFirstPart.length === 1 || 
              (contactFirstPart.length === 2 && contactFirstPart.endsWith('.'));
              
            const isDataInitial = 
              dataFirstPart.length === 1 || 
              (dataFirstPart.length === 2 && dataFirstPart.endsWith('.'));
            
            // Check if initial matches first letter of the other name
            if (isContactInitial && dataFirstPart.startsWith(contactFirstPart.charAt(0))) {
              return true;
            }
            
            if (isDataInitial && contactFirstPart.startsWith(dataFirstPart.charAt(0))) {
              return true;
            }
          }
        }
        return false;
      });
      
      // If we found an initial format match with phone, return high confidence
      if (initialFormatMatches.length > 0) {
        return createResult(
          initialFormatMatches[0],
          MatchConfidence.HIGH,
          'Initial format name + Phone match'
        );
      }
      
      // Find the contact with the most similar name
      let bestMatch = null;
      let bestSimilarity = 0;
      
      for (const contact of phoneMatches) {
        const { similarity, areSimilar } = areNamesSimilar(
          contact.name,
          contactName
        );
        
        if (areSimilar && similarity > bestSimilarity) {
          bestMatch = contact;
          bestSimilarity = similarity;
        }
      }
      
      if (bestMatch) {
        return createResult(
          bestMatch,
          MatchConfidence.HIGH,
          'Very strong name similarity + Phone match'
        );
      }
      
      // If we have a phone match but names aren't similar enough,
      // return the first matching contact with medium confidence
      return createResult(
        phoneMatches[0],
        MatchConfidence.MEDIUM,
        'Phone match but different name - possible household member'
      );
    }
  }
  
  // 3. Try fuzzy name + company match (medium confidence)
  if (contactData.name && contactData.company) {
    const allContacts = await storage.getAllContacts();
    const possibleMatches = allContacts.filter(
      contact => contact.company && 
      contact.company.toLowerCase() === contactData.company?.toLowerCase()
    );
    
    // Find the contact with the most similar name
    let bestMatch = null;
    let bestSimilarity = 0;
    
    for (const contact of possibleMatches) {
      const { similarity, areSimilar } = areNamesSimilar(
        contact.name,
        contactData.name || ''
      );
      
      if (areSimilar && similarity > bestSimilarity) {
        bestMatch = contact;
        bestSimilarity = similarity;
      }
    }
    
    if (bestMatch) {
      return createResult(
        bestMatch,
        MatchConfidence.MEDIUM,
        'Name similarity + Company match'
      );
    }
  }
  
  // 4. Try strong name similarity by itself (low confidence)
  if (contactData.name) {
    const allContacts = await storage.getAllContacts();
    let bestMatch = null;
    let bestSimilarity = 0;
    
    for (const contact of allContacts) {
      const { similarity } = areNamesSimilar(
        contact.name,
        contactData.name
      );
      
      // Higher threshold for name-only matches
      if (similarity > 0.85 && similarity > bestSimilarity) {
        bestMatch = contact;
        bestSimilarity = similarity;
      }
    }
    
    if (bestMatch) {
      return createResult(
        bestMatch,
        MatchConfidence.LOW,
        'Very strong name similarity only'
      );
    }
  }
  
  // No match found
  return createResult(null, MatchConfidence.NONE, 'No match found');
}

/**
 * Create a new contact or update an existing one if a match is found
 * Returns the contact, whether it was created, and the reason for match
 * Implements smart field merging when combining data from multiple sources
 */
export async function createOrUpdateContact(
  contactData: InsertContact,
  updateIfFound: boolean = true,
  minimumConfidence: MatchConfidence = MatchConfidence.MEDIUM
): Promise<{ contact: Contact; created: boolean; reason: string | null }> {
  // Try to find a matching contact
  const matchResult = await findBestMatchingContact(contactData);
  
  // Check if match meets minimum confidence level
  const confidenceLevels = [
    MatchConfidence.EXACT,
    MatchConfidence.HIGH, 
    MatchConfidence.MEDIUM,
    MatchConfidence.LOW,
    MatchConfidence.NONE
  ];
  
  const matchIndex = confidenceLevels.indexOf(matchResult.confidence);
  const minimumIndex = confidenceLevels.indexOf(minimumConfidence);
  
  const acceptableMatch = matchIndex <= minimumIndex;
  
  // If we found an acceptable match
  if (matchResult.contact && acceptableMatch) {
    // Update the contact if requested with smart field merging
    if (updateIfFound) {
      // Smart merging - only update fields if they provide more information
      const existingContact = matchResult.contact;
      const mergedData: Partial<InsertContact> = {};
      
      // Merge fields with smart logic
      // Name - implement smarter name merging
      if (contactData.name && existingContact.name) {
        // Rule 1: Full name (first + last with space) is better than partial name
        const existingHasFullName = existingContact.name.includes(' ');
        const newHasFullName = contactData.name.includes(' ');
        
        if (newHasFullName && !existingHasFullName) {
          // New contact has full name but existing doesn't
          mergedData.name = contactData.name;
        } else if (!newHasFullName && existingHasFullName) {
          // Existing contact has full name but new doesn't
          mergedData.name = existingContact.name;
        } else if (newHasFullName && existingHasFullName) {
          // Both have full names, prefer the longer one as it may have middle names or suffixes
          mergedData.name = contactData.name.length > existingContact.name.length ? 
                            contactData.name : existingContact.name;
        } else {
          // Neither has full name, prefer the longer one as it may have more letters in a nickname
          mergedData.name = contactData.name.length > existingContact.name.length ? 
                            contactData.name : existingContact.name;
        }
      } else {
        // One or both names are empty, use the non-empty one
        mergedData.name = contactData.name || existingContact.name;
      }
      
      // Email - prefer the existing one unless empty
      mergedData.email = existingContact.email || contactData.email;
      
      // Phone - prefer the one with more digits or special formatting
      if (contactData.phone && (!existingContact.phone || 
          (contactData.phone.replace(/\D/g, '').length > existingContact.phone.replace(/\D/g, '').length))) {
        mergedData.phone = contactData.phone;
      } else {
        mergedData.phone = existingContact.phone;
      }
      
      // Company - prefer non-empty value
      mergedData.company = existingContact.company || contactData.company;
      
      // Title - prefer non-empty value
      mergedData.title = existingContact.title || contactData.title;
      
      // Source - preserve existing source if present
      mergedData.sourceId = existingContact.sourceId || contactData.sourceId;
      
      // Source data - merge JSON if possible, otherwise take the new one
      if (existingContact.sourceData && contactData.sourceData) {
        try {
          const existingSourceData = JSON.parse(existingContact.sourceData.toString());
          const newSourceData = JSON.parse(contactData.sourceData.toString());
          mergedData.sourceData = JSON.stringify({...existingSourceData, ...newSourceData});
        } catch (e) {
          mergedData.sourceData = contactData.sourceData;
        }
      } else {
        mergedData.sourceData = existingContact.sourceData || contactData.sourceData;
      }
      
      // Last activity - take the most recent
      if (existingContact.lastActivityDate && contactData.lastActivityDate) {
        const existingDate = new Date(existingContact.lastActivityDate);
        const newDate = new Date(contactData.lastActivityDate);
        mergedData.lastActivityDate = newDate > existingDate ? newDate : existingDate;
      } else {
        mergedData.lastActivityDate = contactData.lastActivityDate || existingContact.lastActivityDate;
      }
      
      // Status - prioritize sales stages over marketing stages
      const salesStages = ['opportunity', 'customer', 'deal'];
      if (existingContact.status && salesStages.includes(existingContact.status)) {
        mergedData.status = existingContact.status;
      } else {
        mergedData.status = contactData.status || existingContact.status;
      }
      
      // Lead source - track both sources if different
      if (existingContact.leadSource && contactData.leadSource && 
          existingContact.leadSource !== contactData.leadSource) {
        mergedData.leadSource = `${existingContact.leadSource},${contactData.leadSource}`;
      } else {
        mergedData.leadSource = existingContact.leadSource || contactData.leadSource;
      }
      
      // Assignment - preserve existing assignment
      mergedData.assignedTo = existingContact.assignedTo || contactData.assignedTo;
      
      // Notes - concatenate notes if both exist
      if (existingContact.notes && contactData.notes) {
        mergedData.notes = `${existingContact.notes}\n---\n${contactData.notes}`;
      } else {
        mergedData.notes = existingContact.notes || contactData.notes;
      }
      
      const updatedContact = await storage.updateContact(
        existingContact.id,
        mergedData as InsertContact
      );
      
      if (updatedContact) {
        return {
          contact: updatedContact,
          created: false,
          reason: `${matchResult.reason} - Data merged from multiple sources`
        };
      }
    } else {
      // Return the existing contact without updating
      return {
        contact: matchResult.contact,
        created: false,
        reason: matchResult.reason
      };
    }
  }
  
  // No acceptable match found, create a new contact
  const newContact = await storage.createContact(contactData);
  
  return {
    contact: newContact,
    created: true,
    reason: 'New contact created'
  };
}

// Export default object for convenient imports
export default {
  findBestMatchingContact,
  createOrUpdateContact,
  normalizeEmail,
  MatchConfidence
};