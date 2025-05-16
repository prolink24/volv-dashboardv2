/**
 * Contact Matcher Service
 * 
 * This service provides advanced contact matching functionality to ensure we properly
 * identify the same contact across different systems (Close CRM, Calendly, Typeform).
 * 
 * It includes:
 * - Email normalization for handling case differences, Gmail aliases, etc.
 * - Fuzzy name matching with confidence levels
 * - Phone number matching with normalization
 * - Multi-criteria matching with weighted scoring
 */

import { storage } from '../storage';
import { InsertContact, Contact } from '@shared/schema';
import { eq, or, ilike, and } from 'drizzle-orm';
import { db } from '../db';
import { contacts } from '@shared/schema';

export enum MatchConfidence {
  EXACT = 'exact',
  HIGH = 'high',
  MEDIUM = 'medium', 
  LOW = 'low',
  NONE = 'none'
}

export interface MatchResult {
  contact?: Contact;
  confidence: MatchConfidence;
  reason?: string;
  score?: number;
}

/**
 * Normalize email address for consistent matching
 * Handles case, Gmail aliases (+), dots in Gmail, etc.
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  
  email = email.toLowerCase().trim();
  
  // Handle Gmail aliases (remove everything after +)
  if (email.includes('@gmail.com')) {
    const [localPart, domain] = email.split('@');
    
    // Remove dots in Gmail local part (they're ignored by Gmail)
    let normalizedLocal = localPart.replace(/\./g, '');
    
    // Remove everything after + for Gmail aliases
    if (normalizedLocal.includes('+')) {
      normalizedLocal = normalizedLocal.split('+')[0];
    }
    
    return `${normalizedLocal}@${domain}`;
  }
  
  // Handle other email providers with + aliases
  if (email.includes('+') && email.includes('@')) {
    const [localPart, domain] = email.split('@');
    
    // Remove everything after + for aliases
    const normalizedLocal = localPart.split('+')[0];
    
    return `${normalizedLocal}@${domain}`;
  }
  
  return email;
}

/**
 * Normalize phone number for consistent matching
 * Keeps only digits and adds standardized formatting
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Handle country codes
  if (digitsOnly.length > 10) {
    // If US number with country code
    if (digitsOnly.startsWith('1') && digitsOnly.length === 11) {
      return digitsOnly.substring(1); // remove leading 1
    }
    return digitsOnly; // Keep international format for other countries
  }
  
  return digitsOnly;
}

/**
 * Calculate string similarity score (0-1)
 * Uses Levenshtein distance with length normalization
 */
export function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  str1 = str1.toLowerCase().trim();
  str2 = str2.toLowerCase().trim();
  
  // Calculate Levenshtein distance
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
  
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  
  // Normalize to a similarity score (0-1)
  return maxLen === 0 ? 1 : 1 - (distance / maxLen);
}

/**
 * Calculate name similarity with special handling
 * Accounts for nicknames, name order, and partial matches
 */
export function nameSimilarity(name1: string, name2: string): number {
  if (!name1 || !name2) return 0;
  if (name1 === name2) return 1;
  
  // Normalize and split into parts
  const parts1 = name1.toLowerCase().trim().split(/\s+/);
  const parts2 = name2.toLowerCase().trim().split(/\s+/);
  
  // Common nickname mappings
  const nicknames: {[key: string]: string[]} = {
    'robert': ['rob', 'bob', 'bobby'],
    'william': ['will', 'bill', 'billy'],
    'richard': ['rick', 'rich', 'dick'],
    'michael': ['mike', 'mikey'],
    'james': ['jim', 'jimmy'],
    'thomas': ['tom', 'tommy'],
    'christopher': ['chris', 'topher'],
    'joseph': ['joe', 'joey'],
    'daniel': ['dan', 'danny'],
    'david': ['dave', 'davy'],
    'nicholas': ['nick', 'nicky'],
    'matthew': ['matt', 'matty'],
    'elizabeth': ['liz', 'beth', 'betty'],
    'margaret': ['maggie', 'peggy'],
    'katherine': ['kathy', 'kate', 'katy'],
    'jennifer': ['jen', 'jenny'],
    'deborah': ['deb', 'debbie'],
    'susan': ['sue', 'susie'],
    'patricia': ['pat', 'patty', 'trish'],
    'catherine': ['cathy', 'kate'],
    'alexandria': ['alex', 'lexi']
  };
  
  // Create expanded sets of name parts with nicknames
  const expandedParts1 = [...parts1];
  const expandedParts2 = [...parts2];
  
  // Add potential nicknames for better matching
  for (const part of parts1) {
    if (nicknames[part]) {
      expandedParts1.push(...nicknames[part]);
    }
    for (const [name, nicks] of Object.entries(nicknames)) {
      if (nicks.includes(part)) {
        expandedParts1.push(name);
      }
    }
  }
  
  for (const part of parts2) {
    if (nicknames[part]) {
      expandedParts2.push(...nicknames[part]);
    }
    for (const [name, nicks] of Object.entries(nicknames)) {
      if (nicks.includes(part)) {
        expandedParts2.push(name);
      }
    }
  }
  
  // Calculate maximum similarity between any name parts
  let maxPartSimilarity = 0;
  let exactMatches = 0;
  
  for (const part1 of expandedParts1) {
    for (const part2 of expandedParts2) {
      if (part1 === part2) {
        exactMatches++;
        continue;
      }
      
      const similarity = stringSimilarity(part1, part2);
      maxPartSimilarity = Math.max(maxPartSimilarity, similarity);
    }
  }
  
  // Calculate overall name similarity
  const uniqueParts1 = new Set(parts1).size;
  const uniqueParts2 = new Set(parts2).size;
  const totalUniqueParts = Math.max(uniqueParts1, uniqueParts2);
  
  // Weight exact matches more heavily
  const exactMatchScore = totalUniqueParts > 0 ? exactMatches / totalUniqueParts : 0;
  
  // Final score combines exact matches with fuzzy matching
  return Math.max(
    exactMatchScore,
    maxPartSimilarity * 0.8 // Fuzzy matches are worth 80% of exact matches
  );
}

/**
 * Find the best matching contact in the database
 * Performs multi-criteria matching with configurable confidence thresholds
 */
export async function findBestMatchingContact(
  contactInfo: Partial<InsertContact>,
  options: {
    minConfidence?: MatchConfidence,
    includeLinks?: boolean
  } = {}
): Promise<MatchResult> {
  const { minConfidence = MatchConfidence.LOW, includeLinks = true } = options;
  
  const minConfidenceScores = {
    [MatchConfidence.EXACT]: 1.0,
    [MatchConfidence.HIGH]: 0.8,
    [MatchConfidence.MEDIUM]: 0.6,
    [MatchConfidence.LOW]: 0.4,
    [MatchConfidence.NONE]: 0
  };
  
  const minRequiredScore = minConfidenceScores[minConfidence];
  let bestMatch: Contact | undefined;
  let bestScore = 0;
  let matchReason = '';
  let matchConfidence = MatchConfidence.NONE;
  
  try {
    // Step 1: Try to find by exact email match
    if (contactInfo.email) {
      const normalizedEmail = normalizeEmail(contactInfo.email);
      const emailMatchQuery = await db.select().from(contacts).where(eq(contacts.email, normalizedEmail));
      if (emailMatchQuery.length > 0) {
        bestMatch = emailMatchQuery[0];
        bestScore = 1.0;
        matchReason = 'Exact email match';
        matchConfidence = MatchConfidence.EXACT;
        
        return {
          contact: bestMatch,
          confidence: matchConfidence,
          reason: matchReason,
          score: bestScore
        };
      }
      
      // Try fuzzy email matching (for common typos)
      const emailParts = normalizedEmail.split('@');
      if (emailParts.length === 2) {
        const [localPart, domain] = emailParts;
        // Only do fuzzy matching if local part is long enough
        if (localPart.length > 3) {
          // Look for emails with up to 1 character difference in local part but same domain
          const fuzzyEmailMatches = await db.select().from(contacts).where(
            and(
              eq(contacts.email, ilike(`%@${domain}`)),
              contacts.email !== normalizedEmail
            )
          );
          
          for (const contact of fuzzyEmailMatches) {
            const contactEmailParts = contact.email.split('@');
            if (contactEmailParts.length === 2) {
              const contactLocalPart = contactEmailParts[0];
              const similarity = stringSimilarity(localPart, contactLocalPart);
              if (similarity > 0.9) { // Very close match
                bestMatch = contact;
                bestScore = 0.95;
                matchReason = 'Very similar email (possible typo)';
                matchConfidence = MatchConfidence.HIGH;
                
                return {
                  contact: bestMatch,
                  confidence: matchConfidence,
                  reason: matchReason,
                  score: bestScore
                };
              }
            }
          }
        }
      }
    }
    
    // Step 2: Try to find by phone number
    if (contactInfo.phone) {
      const normalizedPhone = normalizePhone(contactInfo.phone);
      if (normalizedPhone.length >= 10) { // Only match if we have enough digits
        const phoneMatches = await storage.getContactsByPhone(normalizedPhone);
        
        if (phoneMatches.length > 0) {
          bestMatch = phoneMatches[0];
          bestScore = 0.9;
          matchReason = 'Phone number match';
          matchConfidence = MatchConfidence.HIGH;
          
          // If we have a name to compare, verify it's a closer match
          if (contactInfo.name && bestMatch.name) {
            const nameSim = nameSimilarity(contactInfo.name, bestMatch.name);
            if (nameSim > 0.6) {
              bestScore = 0.95; // Increase confidence when name also matches
              matchReason = 'Phone number match with similar name';
            } else if (nameSim < 0.2) {
              bestScore = 0.6; // Decrease confidence if names are very different
              matchReason = 'Phone number match with different name';
              matchConfidence = MatchConfidence.MEDIUM;
            }
          }
          
          return {
            contact: bestMatch,
            confidence: matchConfidence,
            reason: matchReason,
            score: bestScore
          };
        }
      }
    }
    
    // Step 3: Try name + company matching
    if (contactInfo.name && contactInfo.company) {
      const possibleMatches = await db.select().from(contacts).where(
        and(
          contacts.name !== '',
          contacts.company !== '',
          or(
            ilike(contacts.name, `%${contactInfo.name}%`),
            ilike(contacts.company, `%${contactInfo.company}%`)
          )
        )
      );
      
      for (const match of possibleMatches) {
        // Calculate combined similarity score 
        const nameSim = nameSimilarity(contactInfo.name, match.name);
        const companySim = stringSimilarity(contactInfo.company, match.company || '');
        
        // Weight name more heavily than company
        const combinedScore = (nameSim * 0.7) + (companySim * 0.3);
        
        if (combinedScore > bestScore && combinedScore >= 0.7) {
          bestMatch = match;
          bestScore = combinedScore;
          matchReason = `Name and company match (${Math.round(combinedScore * 100)}% similarity)`;
          
          // Set confidence level based on score
          if (combinedScore >= 0.9) {
            matchConfidence = MatchConfidence.HIGH;
          } else if (combinedScore >= 0.7) {
            matchConfidence = MatchConfidence.MEDIUM;
          } else {
            matchConfidence = MatchConfidence.LOW;
          }
        }
      }
      
      if (bestMatch) {
        return {
          contact: bestMatch,
          confidence: matchConfidence,
          reason: matchReason,
          score: bestScore
        };
      }
    }
    
    // Step 4: Try just name matching if score is still low and we have a name
    if (contactInfo.name && (!bestMatch || bestScore < 0.5)) {
      const nameMatches = await db.select().from(contacts).where(
        ilike(contacts.name, `%${contactInfo.name}%`)
      );
      
      for (const match of nameMatches) {
        const nameSim = nameSimilarity(contactInfo.name, match.name);
        
        if (nameSim > bestScore && nameSim >= 0.8) { // Need high confidence for name-only matches
          bestMatch = match;
          bestScore = nameSim;
          matchReason = `Strong name match (${Math.round(nameSim * 100)}% similarity)`;
          
          if (nameSim >= 0.9) {
            matchConfidence = MatchConfidence.HIGH;
          } else {
            matchConfidence = MatchConfidence.MEDIUM;
          }
        }
      }
    }
    
    // Return the best match if it meets the minimum confidence threshold
    if (bestMatch && bestScore >= minRequiredScore) {
      return {
        contact: bestMatch,
        confidence: matchConfidence,
        reason: matchReason,
        score: bestScore
      };
    }
    
    // No good match found
    return {
      confidence: MatchConfidence.NONE,
      reason: 'No matching contact found',
      score: bestScore
    };
  } catch (error) {
    console.error('Error in findBestMatchingContact:', error);
    return {
      confidence: MatchConfidence.NONE,
      reason: `Error during matching: ${(error as Error).message}`,
      score: 0
    };
  }
}

/**
 * Create a new contact or update an existing one based on matching
 */
export async function createOrUpdateContact(
  contactInfo: InsertContact,
  updateExisting: boolean = true,
  minConfidence: MatchConfidence = MatchConfidence.MEDIUM
): Promise<{ 
  contact: Contact, 
  created: boolean, 
  merged: boolean,
  reason: string 
}> {
  try {
    // Normalize email for better matching
    if (contactInfo.email) {
      contactInfo.email = normalizeEmail(contactInfo.email);
    }
    
    // Try to find matching contact
    const matchResult = await findBestMatchingContact(contactInfo, { 
      minConfidence 
    });
    
    if (matchResult.confidence !== MatchConfidence.NONE && matchResult.contact) {
      // We found a matching contact
      if (updateExisting) {
        // Prepare merged data
        const mergedData: Partial<InsertContact> = {};
        
        // Track if fields were actually merged
        let fieldsMerged = false;
        
        // Merge lead source
        if (contactInfo.leadSource && 
            (!matchResult.contact.leadSource || 
             !matchResult.contact.leadSource.includes(contactInfo.leadSource))) {
          
          const updatedSource = matchResult.contact.leadSource 
            ? `${matchResult.contact.leadSource},${contactInfo.leadSource}` 
            : contactInfo.leadSource;
          
          mergedData.leadSource = updatedSource;
          
          // Update sources count
          mergedData.sourcesCount = (matchResult.contact.sourcesCount || 1) + 1;
          
          fieldsMerged = true;
        }
        
        // Prefer non-empty fields from the new contact data
        const fieldsToConsider = [
          'name', 'phone', 'company', 'title', 'linkedInUrl', 
          'status', 'notes', 'preferredContactMethod', 'timezone'
        ] as const;
        
        for (const field of fieldsToConsider) {
          if (contactInfo[field] && 
              (!matchResult.contact[field] || matchResult.contact[field] === '')) {
            (mergedData as any)[field] = contactInfo[field];
            fieldsMerged = true;
          }
        }
        
        // Special handling for notes - append instead of replace
        if (contactInfo.notes && matchResult.contact.notes) {
          // Don't duplicate notes if they're exactly the same
          if (contactInfo.notes !== matchResult.contact.notes) {
            mergedData.notes = `${matchResult.contact.notes}\n\n${contactInfo.notes}`;
            fieldsMerged = true;
          }
        }
        
        // Update existing contact if we have fields to merge
        if (fieldsMerged) {
          // Ensure last updated time is set
          mergedData.lastUpdateDate = new Date();
          
          const updatedContact = await storage.updateContact(
            matchResult.contact.id, 
            mergedData
          );
          
          return {
            contact: updatedContact,
            created: false,
            merged: true,
            reason: `${matchResult.reason} - Data merged from multiple sources`
          };
        }
        
        return {
          contact: matchResult.contact,
          created: false,
          merged: false,
          reason: matchResult.reason || 'Matched to existing contact (no data merged)'
        };
      }
      
      // Just return the existing contact without updating
      return {
        contact: matchResult.contact,
        created: false,
        merged: false,
        reason: matchResult.reason || 'Matched to existing contact'
      };
    }
    
    // No match found, create new contact
    // Set appropriate metadata and timestamp
    const newContact = {
      ...contactInfo,
      createdAt: new Date(),
      lastUpdateDate: new Date()
    };
    
    const createdContact = await storage.createContact(newContact);
    
    return {
      contact: createdContact,
      created: true,
      merged: false,
      reason: 'Created new contact'
    };
  } catch (error) {
    console.error('Error in createOrUpdateContact:', error);
    throw error;
  }
}

/**
 * Merge multiple contacts into a single contact
 * Useful for manual merging or cleanup operations
 */
export async function mergeContacts(
  primaryContactId: number,
  secondaryContactIds: number[]
): Promise<Contact> {
  try {
    // Get primary contact
    const primaryContact = await storage.getContact(primaryContactId);
    if (!primaryContact) {
      throw new Error(`Primary contact with ID ${primaryContactId} not found`);
    }
    
    // Get all secondary contacts
    const secondaryContacts: Contact[] = [];
    for (const id of secondaryContactIds) {
      const contact = await storage.getContact(id);
      if (contact) {
        secondaryContacts.push(contact);
      }
    }
    
    if (secondaryContacts.length === 0) {
      return primaryContact; // Nothing to merge
    }
    
    // Prepare merged data
    const mergedData: Partial<InsertContact> = {
      lastUpdateDate: new Date()
    };
    
    // Combine lead sources
    const leadSources = new Set<string>();
    if (primaryContact.leadSource) {
      primaryContact.leadSource.split(',').forEach(s => leadSources.add(s.trim()));
    }
    
    // Track total sources for sourcesCount
    let totalSources = primaryContact.sourcesCount || 1;
    
    // Merge data from secondary contacts
    for (const contact of secondaryContacts) {
      // Merge lead sources
      if (contact.leadSource) {
        contact.leadSource.split(',').forEach(s => leadSources.add(s.trim()));
      }
      
      // Update sources count
      totalSources += (contact.sourcesCount || 1);
      
      // Prefer non-empty fields from secondary contacts only if primary is empty
      const fieldsToConsider = [
        'phone', 'company', 'title', 'linkedInUrl', 
        'status', 'preferredContactMethod', 'timezone'
      ] as const;
      
      for (const field of fieldsToConsider) {
        if ((!primaryContact[field] || primaryContact[field] === '') && 
            contact[field] && contact[field] !== '') {
          (mergedData as any)[field] = contact[field];
        }
      }
      
      // Special handling for notes - append instead of replace
      if (contact.notes && contact.notes !== '') {
        if (!mergedData.notes) {
          mergedData.notes = primaryContact.notes || '';
        }
        
        if (!mergedData.notes.includes(contact.notes)) {
          mergedData.notes = mergedData.notes 
            ? `${mergedData.notes}\n\n${contact.notes}` 
            : contact.notes;
        }
      }
    }
    
    // Update merged lead sources and count
    mergedData.leadSource = Array.from(leadSources).join(',');
    mergedData.sourcesCount = totalSources;
    
    // Update primary contact with merged data
    const updatedContact = await storage.updateContact(
      primaryContact.id,
      mergedData
    );
    
    // Move all related records (activities, deals, meetings)
    for (const contact of secondaryContacts) {
      // Move activities
      await storage.reassignActivities(contact.id, primaryContact.id);
      
      // Move deals
      await storage.reassignDeals(contact.id, primaryContact.id);
      
      // Move meetings
      await storage.reassignMeetings(contact.id, primaryContact.id);
      
      // Move forms
      await storage.reassignForms(contact.id, primaryContact.id);
      
      // Delete the secondary contact
      await storage.deleteContact(contact.id);
    }
    
    return updatedContact;
  } catch (error) {
    console.error('Error merging contacts:', error);
    throw error;
  }
}

// Default export of all functions
export default {
  findBestMatchingContact,
  createOrUpdateContact,
  mergeContacts,
  normalizeEmail,
  normalizePhone,
  stringSimilarity,
  nameSimilarity,
  MatchConfidence
};