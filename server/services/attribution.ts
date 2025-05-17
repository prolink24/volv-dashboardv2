/**
 * Attribution Service
 * 
 * This service manages multi-source contact attribution by:
 * 1. Matching contacts across platforms (Close, Calendly, etc.)
 * 2. Analyzing data sources and touchpoints
 * 3. Calculating attribution metrics and statistics
 * 
 * Used by the data enhancement system and dashboard
 */

import { storage } from "../storage";
import { 
  type Contact, 
  type Activity, 
  type Meeting, 
  type Deal, 
  type Form 
} from "@shared/schema";

/**
 * Types for attribution analytics
 */
interface AttributionResults {
  success: boolean;
  baseResults: {
    total: number;
    processed: number;
    attributed: number;
    errors: number;
  };
  detailedAnalytics: {
    contactStats: {
      totalContacts: number;
      contactsWithDeals: number;
      contactsWithMeetings: number;
      contactsWithForms: number;
      conversionRate: number;
    };
    sourceDistribution: {
      singleSource: number;
      multiSource: number;
      multiSourceRate: number;
    };
    fieldCoverage: {
      averageCoverage: number;
      fieldsAbove90Percent: number;
      fieldsBelowThreshold: number;
    };
    channelDistribution: Record<string, number>;
    touchpointStats: {
      totalTouchpoints: number;
      averageTouchpointsPerContact: number;
      maxTouchpoints: number;
      mostEffectiveChannel: string;
    };
  };
}

/**
 * Define certainty levels for attribution matching
 */
export enum MatchConfidence {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  NONE = "none"
}

/**
 * Main service class for attribution
 */
class AttributionService {
  /**
   * Process all contacts for attribution
   */
  async attributeAllContacts(
    sampleSize?: number
  ): Promise<AttributionResults> {
    console.log("Starting attribution process for all contacts...");
    const startTime = Date.now();
    
    // Get contacts (with optional sample limit)
    const contacts = sampleSize 
      ? await storage.getContactSample(sampleSize)
      : await storage.getAllContacts();
      
    console.log(`Processing ${contacts.length} contacts for attribution`);
    
    // Initialize results
    const results: AttributionResults = {
      success: true,
      baseResults: {
        total: contacts.length,
        processed: 0,
        attributed: 0,
        errors: 0
      },
      detailedAnalytics: {
        contactStats: {
          totalContacts: contacts.length,
          contactsWithDeals: 0,
          contactsWithMeetings: 0,
          contactsWithForms: 0,
          conversionRate: 0
        },
        sourceDistribution: {
          singleSource: 0,
          multiSource: 0,
          multiSourceRate: 0
        },
        fieldCoverage: {
          averageCoverage: 0,
          fieldsAbove90Percent: 0,
          fieldsBelowThreshold: 0
        },
        channelDistribution: {},
        touchpointStats: {
          totalTouchpoints: 0,
          averageTouchpointsPerContact: 0,
          maxTouchpoints: 0,
          mostEffectiveChannel: "unknown"
        }
      }
    };
    
    // Channel counts for most effective channel calculation
    const channelCounts = new Map<string, number>();
    let totalFieldCoverage = 0;
    let maxTouchpoints = 0;
    let totalTouchpoints = 0;
    
    // Process each contact
    for (const contact of contacts) {
      try {
        // Get related data for the contact
        const activities = await storage.getActivitiesByContactId(contact.id);
        const meetings = await storage.getMeetingsByContactId(contact.id);
        const deals = await storage.getDealsByContactId(contact.id);
        
        // Update contact stats
        if (deals.length > 0) {
          results.detailedAnalytics.contactStats.contactsWithDeals++;
        }
        
        if (meetings.length > 0) {
          results.detailedAnalytics.contactStats.contactsWithMeetings++;
        }
        
        // Calculate multi-source distribution
        const sources = new Set<string>();
        
        if (activities.length > 0) sources.add("close");
        if (meetings.length > 0) sources.add("calendly");
        
        // Update source distribution
        if (sources.size > 1) {
          results.detailedAnalytics.sourceDistribution.multiSource++;
        } else {
          results.detailedAnalytics.sourceDistribution.singleSource++;
        }
        
        // Update channel distribution
        for (const source of sources) {
          if (!results.detailedAnalytics.channelDistribution[source]) {
            results.detailedAnalytics.channelDistribution[source] = 0;
          }
          results.detailedAnalytics.channelDistribution[source]++;
          
          // Update channel counts for most effective calculation
          const prevCount = channelCounts.get(source) || 0;
          channelCounts.set(source, prevCount + 1);
        }
        
        // Calculate touchpoints
        const touchpointCount = calculateTouchpoints(activities, meetings, deals);
        totalTouchpoints += touchpointCount;
        maxTouchpoints = Math.max(maxTouchpoints, touchpointCount);
        
        // Update field coverage stats
        if (contact.fieldCoverage) {
          totalFieldCoverage += contact.fieldCoverage;
        }
        
        // Mark as attributed
        results.baseResults.attributed++;
      } catch (error) {
        console.error(`Error attributing contact ${contact.id}:`, error);
        results.baseResults.errors++;
      }
      
      // Increment processed counter
      results.baseResults.processed++;
    }
    
    // Find most effective channel
    let maxChannel = "";
    let maxCount = 0;
    
    for (const [channel, count] of channelCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        maxChannel = channel;
      }
    }
    
    // Calculate final analytics
    if (contacts.length > 0) {
      // Source distribution rate
      results.detailedAnalytics.sourceDistribution.multiSourceRate = 
        (results.detailedAnalytics.sourceDistribution.multiSource / contacts.length) * 100;
      
      // Field coverage average
      results.detailedAnalytics.fieldCoverage.averageCoverage = 
        totalFieldCoverage / contacts.length;
      
      // Touchpoint averages
      results.detailedAnalytics.touchpointStats.totalTouchpoints = totalTouchpoints;
      results.detailedAnalytics.touchpointStats.averageTouchpointsPerContact = 
        totalTouchpoints / contacts.length;
      results.detailedAnalytics.touchpointStats.maxTouchpoints = maxTouchpoints;
      
      // Conversion rate (contacts with deals)
      results.detailedAnalytics.contactStats.conversionRate = 
        (results.detailedAnalytics.contactStats.contactsWithDeals / contacts.length) * 100;
      
      // Most effective channel
      if (maxChannel) {
        results.detailedAnalytics.touchpointStats.mostEffectiveChannel = maxChannel;
      }
    }
    
    const endTime = Date.now();
    console.log(`Attribution process completed in ${(endTime - startTime) / 1000} seconds`);
    console.log(`Processed ${results.baseResults.processed} contacts`);
    console.log(`Multi-source rate: ${results.detailedAnalytics.sourceDistribution.multiSourceRate.toFixed(2)}%`);
    
    return results;
  }
  
  /**
   * Calculate attribution accuracy based on field coverage and source distribution
   */
  calculateAttributionAccuracy(
    fieldCoverage: number,
    multiSourceRate: number,
    dealAttributionRate: number
  ): number {
    // Weight the factors that contribute to attribution accuracy
    const weights = {
      fieldCoverage: 0.5,    // 50% weight for field completeness
      multiSourceRate: 0.3,  // 30% weight for multi-source rate
      dealAttribution: 0.2   // 20% weight for deal attribution
    };
    
    // Calculate weighted accuracy score
    const accuracyScore = 
      (fieldCoverage * weights.fieldCoverage) +
      (multiSourceRate * weights.multiSourceRate) +
      (dealAttributionRate * weights.dealAttribution);
    
    // Apply a scaling factor to convert to a 0-100 scale
    // This assumes the input rates are also on a 0-100 scale
    return accuracyScore;
  }
}

/**
 * Calculate total touchpoints for a contact
 */
function calculateTouchpoints(
  activities: Activity[],
  meetings: Meeting[],
  deals: Deal[]
): number {
  let count = 0;
  
  // Count activities
  count += activities.length;
  
  // Count meetings
  count += meetings.length;
  
  // Count deals (but don't double-count activities related to deals)
  count += deals.length;
  
  return count;
}

/**
 * Match contacts across systems by email, name, and other attributes
 */
function matchContacts(contact1: Contact, contact2: Contact): MatchConfidence {
  // EMAIL MATCH (HIGH)
  if (contact1.email.toLowerCase() === contact2.email.toLowerCase()) {
    return MatchConfidence.HIGH;
  }
  
  // MEDIUM CONFIDENCE MATCHES
  const mediumConfidenceMatches = [
    // Name + phone match
    !!(contact1.name && contact2.name && contact1.phone && contact2.phone &&
       normalizeText(contact1.name) === normalizeText(contact2.name) &&
       normalizePhone(contact1.phone) === normalizePhone(contact2.phone)),
    
    // Secondary email match
    !!(contact1.secondaryEmail && contact2.email &&
       contact1.secondaryEmail.toLowerCase() === contact2.email.toLowerCase()) ||
    !!(contact2.secondaryEmail && contact1.email &&
       contact2.secondaryEmail.toLowerCase() === contact1.email.toLowerCase()),
    
    // Email domain + name match for company addresses
    !!(contact1.email && contact2.email && 
       !isPersonalEmail(contact1.email) && !isPersonalEmail(contact2.email) &&
       getDomain(contact1.email) === getDomain(contact2.email) &&
       contact1.name && contact2.name &&
       normalizeText(contact1.name) === normalizeText(contact2.name))
  ];
  
  if (mediumConfidenceMatches.some(match => match)) {
    return MatchConfidence.MEDIUM;
  }
  
  // LOW CONFIDENCE MATCHES
  const lowConfidenceMatches = [
    // Similar name + company match
    !!(contact1.name && contact2.name && contact1.company && contact2.company &&
       nameSimilarity(contact1.name, contact2.name) > 0.8 &&
       normalizeText(contact1.company) === normalizeText(contact2.company)),
    
    // Email pattern matching (first initial + last name)
    !!(contact1.email && contact2.email && contact1.name && contact2.name &&
       emailPatternMatch(contact1.email, contact1.name, contact2.email, contact2.name))
  ];
  
  if (lowConfidenceMatches.some(match => match)) {
    return MatchConfidence.LOW;
  }
  
  return MatchConfidence.NONE;
}

/**
 * Check if email is from a common personal provider
 */
function isPersonalEmail(email: string): boolean {
  const personalDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
    'aol.com', 'icloud.com', 'mail.com', 'protonmail.com'
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  return personalDomains.includes(domain);
}

/**
 * Get domain from email
 */
function getDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() || '';
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric chars
    .trim();
}

/**
 * Normalize phone number for comparison
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Calculate similarity between names
 */
function nameSimilarity(name1: string, name2: string): number {
  const norm1 = normalizeText(name1);
  const norm2 = normalizeText(name2);
  
  // If exact match after normalization
  if (norm1 === norm2) return 1.0;
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  
  // Convert distance to similarity score (0-1)
  return 1 - (distance / maxLength);
}

/**
 * Calculate Levenshtein distance between strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // Create distance matrix
  const d: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  
  // Fill the matrix
  for (let j = 1; j <= n; j++) {
    for (let i = 1; i <= m; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // deletion
        d[i][j - 1] + 1,      // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return d[m][n];
}

/**
 * Check if emails match a common pattern based on names
 */
function emailPatternMatch(
  email1: string, 
  name1: string, 
  email2: string, 
  name2: string
): boolean {
  // Normalize names
  const normalized1 = normalizeText(name1);
  const normalized2 = normalizeText(name2);
  
  // If names don't match, emails won't match pattern
  if (nameSimilarity(normalized1, normalized2) < 0.7) return false;
  
  // Extract local parts of emails
  const local1 = email1.split('@')[0].toLowerCase();
  const local2 = email2.split('@')[0].toLowerCase();
  
  // Split names into parts
  const nameParts1 = normalized1.split(/[^a-z0-9]+/);
  const nameParts2 = normalized2.split(/[^a-z0-9]+/);
  
  // Common patterns to check
  const patterns = [
    // first initial + last name
    () => {
      if (nameParts1.length > 1 && nameParts2.length > 1) {
        const pattern1 = nameParts1[0][0] + nameParts1[nameParts1.length - 1];
        const pattern2 = nameParts2[0][0] + nameParts2[nameParts2.length - 1];
        return (local1.includes(pattern1) && local2.includes(pattern2));
      }
      return false;
    },
    
    // first name + last initial
    () => {
      if (nameParts1.length > 1 && nameParts2.length > 1) {
        const pattern1 = nameParts1[0] + nameParts1[nameParts1.length - 1][0];
        const pattern2 = nameParts2[0] + nameParts2[nameParts2.length - 1][0];
        return (local1.includes(pattern1) && local2.includes(pattern2));
      }
      return false;
    }
  ];
  
  // Check if any patterns match
  return patterns.some(pattern => pattern());
}

// Export singleton instance
export default new AttributionService();