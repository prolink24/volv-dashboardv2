/**
 * Contact Matcher Service
 * 
 * This service provides advanced contact matching and merging capabilities
 * to properly link contacts across different platforms (Close CRM, Calendly, Typeform)
 */

import { storage } from '../storage';
import type { Contact, InsertContact } from '@shared/schema';

// Match confidence levels
export enum MatchConfidence {
  EXACT = 'exact',        // 100% certain match (e.g., identical email)
  HIGH = 'high',          // 90%+ confidence (e.g., similar name + phone number)
  MEDIUM = 'medium',      // 75%+ confidence (e.g., similar name, different format email)
  LOW = 'low',            // 50%+ confidence (e.g., only similar name)
  NONE = 'none'           // No match found
}

// Match result with confidence level
export interface MatchResult {
  confidence: MatchConfidence;
  contact?: Contact;
  reason?: string;
  score?: number;
}

/**
 * Normalize an email address for comparison
 * - Convert to lowercase
 * - Remove common aliases (e.g., + suffix in Gmail)
 * - Handle common typos and variations
 */
function normalizeEmail(email: string): string {
  if (!email) return '';
  
  // Convert to lowercase
  let normalized = email.toLowerCase().trim();
  
  // Remove Gmail aliases (everything after + before @)
  normalized = normalized.replace(/(\+[^@]+)(?=@gmail\.com)/g, '');
  
  // Handle common domain typos
  const domainFixes: Record<string, string> = {
    'gmail.co': 'gmail.com',
    'gmail.con': 'gmail.com',
    'gamil.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'hotmail.co': 'hotmail.com',
    'yaho.com': 'yahoo.com',
    'yahooo.com': 'yahoo.com',
    'yahoo.co': 'yahoo.com',
    'outlook.co': 'outlook.com',
    'live.co': 'live.com',
    'icloud.co': 'icloud.com'
  };
  
  // Apply domain fixes
  for (const [typo, fix] of Object.entries(domainFixes)) {
    if (normalized.endsWith(`@${typo}`)) {
      normalized = normalized.replace(`@${typo}`, `@${fix}`);
      break;
    }
  }
  
  return normalized;
}

/**
 * Normalize a name for comparison
 * - Convert to lowercase
 * - Remove whitespace, punctuation, suffixes
 * - Extract first and last name for partial matching
 */
function normalizeName(name: string): { 
  normalized: string, 
  first: string, 
  last: string,
  parts: string[] 
} {
  if (!name) return { normalized: '', first: '', last: '', parts: [] };
  
  // Convert to lowercase and trim
  const normalized = name.toLowerCase().trim()
    // Remove common suffixes
    .replace(/\s+(jr\.?|sr\.?|ii|iii|iv|v|md|phd|esq\.?)$/i, '')
    // Remove extra whitespace and punctuation
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
  
  // Split into parts
  const parts = normalized.split(' ').filter(Boolean);
  
  // Extract first and last name
  const first = parts[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  
  return { normalized, first, last, parts };
}

/**
 * Score the similarity of two names
 * Returns a value between 0 (no match) and 1 (exact match)
 */
function nameSimilarityScore(name1: string, name2: string): number {
  if (!name1 || !name2) return 0;
  
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  // Exact match of normalized name
  if (n1.normalized === n2.normalized) return 1;
  
  // Check for first or last name match
  if ((n1.first && n2.first && n1.first === n2.first) || 
      (n1.last && n2.last && n1.last === n2.last)) {
    // One name component matches exactly
    return 0.8;
  }
  
  // Check for partial match - name parts appearing in other name
  const sharedParts = n1.parts.filter(p => n2.parts.includes(p)).length;
  if (sharedParts > 0) {
    return Math.min(0.7, 0.4 + (sharedParts / Math.max(n1.parts.length, n2.parts.length) * 0.5));
  }

  // No clear match, calculate Levenshtein distance ratio
  const maxLen = Math.max(n1.normalized.length, n2.normalized.length);
  if (maxLen === 0) return 0;
  
  let distance = 0;
  // Simple edit distance calculation
  for (let i = 0; i < Math.min(n1.normalized.length, n2.normalized.length); i++) {
    if (n1.normalized[i] !== n2.normalized[i]) distance++;
  }
  
  distance += Math.abs(n1.normalized.length - n2.normalized.length);
  
  // Convert distance to similarity score
  return Math.max(0, 1 - (distance / maxLen));
}

/**
 * Find the best matching contact from all platforms
 * @param contactData The contact data to match
 * @param searchMode Determines whether to search by name, email, or both
 */
export async function findBestMatchingContact(
  contactData: Partial<InsertContact>,
  searchMode: 'email' | 'name' | 'both' = 'both'
): Promise<MatchResult> {
  // If we don't have either name or email, we can't match
  if (!contactData.name && !contactData.email) {
    return { confidence: MatchConfidence.NONE, reason: 'No name or email provided for matching' };
  }
  
  // Start with empty result
  let bestMatch: Contact | undefined = undefined;
  let bestConfidence = MatchConfidence.NONE;
  let bestScore = 0;
  let bestReason = 'No match found';
  
  // Handle 'email' only mode (fast path)
  if (searchMode === 'email' && contactData.email) {
    const exactMatch = await storage.getContactByEmail(contactData.email);
    if (exactMatch) {
      return { 
        confidence: MatchConfidence.EXACT, 
        contact: exactMatch, 
        reason: 'Exact email match',
        score: 1
      };
    }
    
    // Check for normalized email
    const normalizedEmail = normalizeEmail(contactData.email);
    if (normalizedEmail !== contactData.email) {
      // Need to search all contacts for normalized email
      const allContacts = await storage.getAllContacts();
      for (const contact of allContacts) {
        const contactNormalizedEmail = normalizeEmail(contact.email);
        if (contactNormalizedEmail === normalizedEmail) {
          return {
            confidence: MatchConfidence.HIGH,
            contact,
            reason: 'Normalized email match',
            score: 0.95
          };
        }
      }
    }
    
    return { confidence: MatchConfidence.NONE, reason: 'No email match found' };
  }
  
  // Need to search all contacts for complex matching logic
  const allContacts = await storage.getAllContacts();
  
  // If no contacts, no match
  if (!allContacts.length) {
    return { confidence: MatchConfidence.NONE, reason: 'No contacts available for matching' };
  }
  
  for (const contact of allContacts) {
    let score = 0;
    let confidence = MatchConfidence.NONE;
    let reason = '';
    
    // Email check (if email provided and mode allows)
    if (contactData.email && contact.email && (searchMode === 'both' || searchMode === 'email')) {
      // Exact email match is a definite match
      if (contact.email.toLowerCase() === contactData.email.toLowerCase()) {
        return { 
          confidence: MatchConfidence.EXACT, 
          contact, 
          reason: 'Exact email match',
          score: 1
        };
      }
      
      // Normalized email match is very high confidence
      const normalizedProvidedEmail = normalizeEmail(contactData.email);
      const normalizedContactEmail = normalizeEmail(contact.email);
      
      if (normalizedProvidedEmail === normalizedContactEmail) {
        confidence = MatchConfidence.HIGH;
        score = 0.95;
        reason = 'Normalized email match';
      }
    }
    
    // Name check (if name provided and mode allows)
    if (contactData.name && contact.name && (searchMode === 'both' || searchMode === 'name')) {
      const nameScore = nameSimilarityScore(contactData.name, contact.name);
      
      // If we already have a HIGH confidence email match, name match makes it even stronger
      if (confidence === MatchConfidence.HIGH && nameScore > 0.5) {
        return {
          confidence: MatchConfidence.EXACT, 
          contact,
          reason: 'Normalized email match + Strong name similarity',
          score: 0.98
        };
      }
      
      // Name-only matching
      if (confidence === MatchConfidence.NONE) {
        if (nameScore > 0.9) {
          confidence = MatchConfidence.HIGH;
          score = nameScore;
          reason = 'Very strong name similarity';
        } else if (nameScore > 0.7) {
          confidence = MatchConfidence.MEDIUM;
          score = nameScore;
          reason = 'Strong name similarity';
        } else if (nameScore > 0.5) {
          confidence = MatchConfidence.LOW;
          score = nameScore;
          reason = 'Moderate name similarity';
        }
      }
    }
    
    // Additional signal: phone match (if available)
    if (contactData.phone && contact.phone && contactData.phone === contact.phone) {
      // Upgrade confidence level if we have a phone match
      if (confidence === MatchConfidence.LOW) {
        confidence = MatchConfidence.MEDIUM;
        score += 0.2;
        reason += ' + Phone match';
      } else if (confidence === MatchConfidence.MEDIUM) {
        confidence = MatchConfidence.HIGH;
        score += 0.15;
        reason += ' + Phone match';
      } else if (confidence !== MatchConfidence.EXACT && confidence !== MatchConfidence.NONE) {
        score += 0.1;
        reason += ' + Phone match';
      }
    }
    
    // Additional signal: company match (if available)
    if (contactData.company && contact.company && 
        contactData.company.toLowerCase() === contact.company.toLowerCase()) {
      score += 0.05;
      reason += ' + Company match';
    }
    
    // Update best match if this one is better
    if (confidence !== MatchConfidence.NONE && score > bestScore) {
      bestMatch = contact;
      bestConfidence = confidence;
      bestScore = score;
      bestReason = reason;
    }
  }
  
  return {
    confidence: bestConfidence,
    contact: bestMatch,
    reason: bestReason,
    score: bestScore
  };
}

/**
 * Create or update a contact with proper matching
 * This ensures that we don't create duplicate contacts when data comes from different platforms
 */
export async function createOrUpdateContact(
  contactData: Partial<InsertContact>,
  matchConfidenceThreshold: MatchConfidence = MatchConfidence.HIGH,
  updateExisting: boolean = true
): Promise<{ contact: Contact; created: boolean; reason: string }> {
  // First, try to find matching contact
  const matchResult = await findBestMatchingContact(contactData);
  
  // If we have a match at or above the threshold, use that contact
  const confidencePriority: Record<MatchConfidence, number> = {
    [MatchConfidence.EXACT]: 4,
    [MatchConfidence.HIGH]: 3,
    [MatchConfidence.MEDIUM]: 2,
    [MatchConfidence.LOW]: 1,
    [MatchConfidence.NONE]: 0
  };
  
  if (matchResult.contact && 
      confidencePriority[matchResult.confidence] >= confidencePriority[matchConfidenceThreshold]) {
    // If update is allowed, merge the data
    if (updateExisting) {
      // Only update fields that are provided and different
      const updatedData: Partial<InsertContact> = {};
      let hasChanges = false;
      
      // Check each field for updates
      for (const key of Object.keys(contactData) as Array<keyof InsertContact>) {
        // Only update if the new value exists and is different from current
        // Skip sourceId, sourceData, and createdAt - those should be preserved
        if (contactData[key] !== undefined && 
            key !== 'sourceId' && 
            key !== 'sourceData' &&
            JSON.stringify(contactData[key]) !== JSON.stringify(matchResult.contact[key])) {
          
          // For certain fields, only update if the current value is empty
          if ((key === 'company' || key === 'title' || key === 'phone') && 
              matchResult.contact[key]) {
            // Don't overwrite existing values for these fields
            continue;
          }
          
          updatedData[key] = contactData[key];
          hasChanges = true;
        }
      }
      
      // If we have changes, update the contact
      if (hasChanges) {
        const updatedContact = await storage.updateContact(matchResult.contact.id, updatedData);
        return {
          contact: updatedContact || matchResult.contact,
          created: false,
          reason: `Updated existing contact: ${matchResult.reason}`
        };
      }
      
      // No changes needed
      return {
        contact: matchResult.contact,
        created: false,
        reason: `Used existing contact (no updates needed): ${matchResult.reason}`
      };
    }
    
    // No update, just return the matched contact
    return {
      contact: matchResult.contact,
      created: false,
      reason: `Used existing contact: ${matchResult.reason}`
    };
  }
  
  // No match found or below threshold, create new contact
  // Make sure required fields are present
  if (!contactData.name || !contactData.email) {
    throw new Error('Name and email are required to create a contact');
  }
  
  // Create the contact
  const newContact = await storage.createContact(contactData as InsertContact);
  
  return {
    contact: newContact,
    created: true,
    reason: matchResult.confidence === MatchConfidence.NONE ? 
      'Created new contact (no match found)' : 
      `Created new contact (match confidence ${matchResult.confidence} below threshold)`
  };
}

export default {
  findBestMatchingContact,
  createOrUpdateContact,
  normalizeEmail,
  normalizeName
};