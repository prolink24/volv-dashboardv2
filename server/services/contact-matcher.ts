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
  for (const bigram of aBigrams) {
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
    
    // Get all contacts with this phone
    const allContacts = await storage.getAllContacts();
    const phoneMatches = allContacts.filter(contact => 
      normalizePhone(contact.phone || '') === normalizedPhone && 
      normalizedPhone.length > 5 // Make sure it's a valid phone number
    );
    
    if (phoneMatches.length > 0) {
      // Find the contact with the most similar name
      let bestMatch = null;
      let bestSimilarity = 0;
      
      for (const contact of phoneMatches) {
        const { similarity, areSimilar } = areNamesSimilar(
          contact.name,
          contactData.name
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
    // Update the contact if requested
    if (updateIfFound) {
      const updatedContact = await storage.updateContact(
        matchResult.contact.id,
        contactData
      );
      
      if (updatedContact) {
        return {
          contact: updatedContact,
          created: false,
          reason: matchResult.reason
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