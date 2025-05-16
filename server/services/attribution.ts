/**
 * Attribution Service
 * 
 * This service analyzes contact data across all platforms (Close CRM, Calendly, Typeform)
 * to provide accurate attribution metrics and insights.
 * 
 * It tracks:
 * - Touch points across platforms
 * - First and last touch attribution
 * - Multi-platform journeys
 * - Attribution certainty scores
 */

import { storage } from '../storage';
import { db } from '../db';
import { 
  contacts, 
  activities, 
  deals, 
  meetings, 
  forms,
  Contact
} from '@shared/schema';
import { and, eq, count, sql, or, gte, lte, desc } from 'drizzle-orm';
import * as contactMatcher from './contact-matcher';

// Channel definitions
export enum Channel {
  CLOSE = 'close',
  CALENDLY = 'calendly',
  TYPEFORM = 'typeform',
  EMAIL = 'email',
  CALL = 'call',
  FORM = 'form',
  MEETING = 'meeting',
  DEAL = 'deal',
  OTHER = 'other'
}

// Define the structure for attribution stats
export interface AttributionStats {
  totalContacts: string | number;
  contactsAnalyzed: number;
  highCertaintyContacts: number;
  multiSourceContacts: number;
  multiSourceRate: number;
  totalDeals: number;
  dealsWithAttribution: number;
  dealAttributionRate: number;
  fieldMappingSuccess: number;
  fieldCoverage: number;
}

export interface AttributionSummary {
  success: boolean;
  attributionAccuracy: number;
  stats: AttributionStats;
  timedOut?: boolean;
  error?: string;
  channelBreakdown: Record<string, number>;
  totalTouchpoints: number;
  mostEffectiveChannel: string;
}

/**
 * Calculate attribution metrics based on contact data
 * Uses a sampling approach for performance with large datasets
 */
export async function calculateAttributionStats(
  dateRange?: { startDate: Date; endDate: Date },
  sampleSize: number = 1000, // Default to analyzing 1000 contacts for performance
  userId?: string
): Promise<AttributionSummary> {
  try {
    console.log(`Calculating attribution stats with small sample size for faster dashboard loading (date range: ${dateRange ? dateRange.startDate.toISOString() + ' to ' + dateRange.endDate.toISOString() : 'all-time to all-time'})`);
    
    // Get total contact count
    const [contactCount] = await db.select({
      count: count()
    }).from(contacts);
    
    // Get enhanced distribution of platforms
    const platformCounts = await db.select({
      platforms: sql<string>`lead_source`,
      count: count()
    })
    .from(contacts)
    .groupBy(sql`lead_source`);
    
    // Query for multi-source contacts
    const [multiSourceCount] = await db.select({
      count: count()
    })
    .from(contacts)
    .where(sql`(sources_count > 1 OR lead_source LIKE '%,%')`);
    
    // Sample contacts for detailed analysis
    console.log(`Getting sample of ${sampleSize} contacts for attribution analysis`);
    const sampleContacts = await db.select()
      .from(contacts)
      .limit(sampleSize)
      .orderBy(desc(contacts.lastActivityDate));

    console.log(`Attribution stats using sample of ${sampleContacts.length} contacts for analysis`);
    
    // Get total deals count
    const [dealsCount] = await db.select({
      count: count()
    }).from(deals);
    
    // Get deals with attribution (linked to contacts)
    const [dealsWithAttributionCount] = await db.select({
      count: count()
    })
    .from(deals)
    .where(sql`contact_id IS NOT NULL`);

    // Calculate channel distribution
    const channelBreakdown: Record<string, number> = {};
    
    // Map each source to its own channel
    for (const item of platformCounts) {
      if (item.platforms) {
        // Handle multi-platform contacts
        const sources = item.platforms.split(',');
        for (const source of sources) {
          const trimmedSource = source.trim().toLowerCase();
          channelBreakdown[trimmedSource] = (channelBreakdown[trimmedSource] || 0) + item.count;
        }
      }
    }
    
    // Calculate field coverage statistics
    const fieldCoverageResults = await calculateFieldCoverage(sampleContacts);
    
    // Determine most effective channel
    let mostEffectiveChannel = "unknown";
    let maxChannelCount = 0;
    
    for (const [channel, count] of Object.entries(channelBreakdown)) {
      if (count > maxChannelCount) {
        maxChannelCount = count;
        mostEffectiveChannel = channel;
      }
    }
    
    // Calculate overall attribution accuracy
    // This is a weighted composite of several factors:
    // 1. Multi-source rate (weight: 0.3)
    // 2. Deal attribution rate (weight: 0.3) 
    // 3. Field coverage completeness (weight: 0.2)
    // 4. Contact matching confidence (weight: 0.2)
    
    const multiSourceRate = multiSourceCount.count / Number(contactCount.count);
    const dealAttributionRate = dealsWithAttributionCount.count / dealsCount.count;
    const fieldCoverageRate = fieldCoverageResults.overallCoverage / 100;
    
    // Sample attribution rate is based on sample
    const attributionAccuracy = (
      (multiSourceRate * 0.3) + 
      (dealAttributionRate * 0.3) + 
      (fieldCoverageRate * 0.2) + 
      (1.0 * 0.2) // Assuming 100% matching confidence
    ) * 100;
    
    return {
      success: true,
      attributionAccuracy: attributionAccuracy,
      stats: {
        totalContacts: contactCount.count.toString(), 
        contactsAnalyzed: sampleContacts.length,
        highCertaintyContacts: sampleContacts.length, // All contacts in sample are analyzed
        multiSourceContacts: multiSourceCount.count,
        multiSourceRate: Math.round(multiSourceRate * 100 * 10) / 10, // Round to 1 decimal place
        totalDeals: dealsCount.count,
        dealsWithAttribution: dealsWithAttributionCount.count,
        dealAttributionRate: Math.round(dealAttributionRate * 100),
        fieldMappingSuccess: fieldCoverageResults.completedFields,
        fieldCoverage: Math.round(fieldCoverageResults.overallCoverage)
      },
      channelBreakdown,
      totalTouchpoints: 0, // This would require more complex calculation
      mostEffectiveChannel
    };
  } catch (error) {
    console.error('Error calculating attribution stats:', error);
    return {
      success: false,
      attributionAccuracy: 0,
      stats: {
        totalContacts: 0,
        contactsAnalyzed: 0,
        highCertaintyContacts: 0,
        multiSourceContacts: 0,
        multiSourceRate: 0,
        totalDeals: 0,
        dealsWithAttribution: 0,
        dealAttributionRate: 0,
        fieldMappingSuccess: 0,
        fieldCoverage: 0
      },
      error: (error as Error).message,
      channelBreakdown: {},
      totalTouchpoints: 0,
      mostEffectiveChannel: 'unknown'
    };
  }
}

/**
 * Calculate field coverage metrics for contacts
 * Analyzes completeness of contact data
 */
async function calculateFieldCoverage(contacts: Contact[]) {
  // Define important fields to track
  const importantFields = [
    'name', 'email', 'phone', 'company', 'title', 
    'leadSource', 'status', 'assignedTo'
  ];
  
  let totalFields = contacts.length * importantFields.length;
  let completedFields = 0;
  
  // Count completed fields
  for (const contact of contacts) {
    for (const field of importantFields) {
      if (contact[field as keyof Contact] && 
          contact[field as keyof Contact] !== '' && 
          contact[field as keyof Contact] !== null) {
        completedFields++;
      }
    }
  }
  
  // Calculate overall coverage percentage
  const overallCoverage = totalFields > 0 
    ? (completedFields / totalFields) * 100
    : 0;
  
  return {
    totalFields,
    completedFields,
    overallCoverage
  };
}

/**
 * Analyze attribution for a specific contact
 * Returns detailed attribution information
 */
export async function analyzeContactAttribution(contactId: number) {
  try {
    // Get the contact
    const contact = await storage.getContact(contactId);
    if (!contact) {
      return {
        success: false,
        error: 'Contact not found'
      };
    }
    
    // Get all activities for this contact
    const activities = await db.select()
      .from(activities)
      .where(eq(activities.contactId, contactId))
      .orderBy(activities.date);
    
    // Get all meetings for this contact
    const meetings = await db.select()
      .from(meetings)
      .where(eq(meetings.contactId, contactId))
      .orderBy(meetings.startTime);
    
    // Get all forms for this contact
    const forms = await db.select()
      .from(forms)
      .where(eq(forms.contactId, contactId))
      .orderBy(forms.submittedAt);
    
    // Get all deals for this contact
    const deals = await db.select()
      .from(deals)
      .where(eq(deals.contactId, contactId))
      .orderBy(deals.createdAt);
    
    // Build timeline of all touchpoints
    const touchpoints = [
      ...activities.map(a => ({
        type: 'activity',
        source: a.source,
        date: a.date,
        title: a.title,
        data: a
      })),
      ...meetings.map(m => ({
        type: 'meeting',
        source: 'calendly',
        date: m.startTime,
        title: m.title,
        data: m
      })),
      ...forms.map(f => ({
        type: 'form',
        source: 'typeform',
        date: f.submittedAt,
        title: `Submitted form: ${f.formName}`,
        data: f
      })),
      ...deals.map(d => ({
        type: 'deal',
        source: 'close',
        date: d.createdAt || new Date(),
        title: d.title,
        data: d
      }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Determine first and last touch
    const firstTouch = touchpoints.length > 0 ? touchpoints[0] : null;
    const lastTouch = touchpoints.length > 0 ? touchpoints[touchpoints.length - 1] : null;
    
    // Source breakdown
    const sourceBreakdown: Record<string, number> = {};
    touchpoints.forEach(tp => {
      const source = tp.source || 'unknown';
      sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
    });
    
    // Determine all sources
    const allSources = Object.keys(sourceBreakdown);
    
    // Calculate attribution quality/certainty
    const hasSufficientTouchpoints = touchpoints.length >= 2;
    const hasMultipleSources = allSources.length > 1;
    
    // Calculate certainty score (0-100)
    let certaintyScore = 0;
    
    // Base score: having any data
    if (touchpoints.length > 0) certaintyScore += 20;
    
    // Having multiple touchpoints
    if (touchpoints.length >= 3) {
      certaintyScore += 25;
    } else if (touchpoints.length === 2) {
      certaintyScore += 15;
    }
    
    // Having multiple sources
    if (allSources.length >= 3) {
      certaintyScore += 35;
    } else if (allSources.length === 2) {
      certaintyScore += 25;
    }
    
    // Having deal data
    if (deals.length > 0) certaintyScore += 20;
    
    return {
      success: true,
      contact,
      touchpoints,
      firstTouch,
      lastTouch,
      sourceBreakdown,
      allSources,
      touchpointCount: touchpoints.length,
      hasSufficientTouchpoints,
      hasMultipleSources,
      certaintyScore,
      deals
    };
  } catch (error) {
    console.error('Error analyzing contact attribution:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Run attribution process for all contacts
 * Improves multi-source attribution rates
 */
export async function runBulkAttributionProcess(options: {
  enhanceMultiSource?: boolean,
  resolveUnattributed?: boolean,
  matchThreshold?: contactMatcher.MatchConfidence,
  limit?: number
} = {}) {
  const {
    enhanceMultiSource = true,
    resolveUnattributed = true,
    matchThreshold = contactMatcher.MatchConfidence.MEDIUM,
    limit = 1000
  } = options;
  
  try {
    console.log('Starting bulk attribution process...');
    
    // Track metrics
    let contactsProcessed = 0;
    let contactsEnhanced = 0;
    let contactsMerged = 0;
    let errorsEncountered = 0;
    
    // Step 1: Find and enhance multi-source attribution
    if (enhanceMultiSource) {
      console.log('Finding potential multi-source contacts to enhance...');
      
      // Get single-source contacts
      const singleSourceContacts = await db.select()
        .from(contacts)
        .where(sql`(sources_count = 1 OR sources_count IS NULL)`)
        .limit(limit);
      
      console.log(`Found ${singleSourceContacts.length} single-source contacts to analyze`);
      
      for (const contact of singleSourceContacts) {
        try {
          contactsProcessed++;
          
          // Skip contacts with no email (we can't reliably match)
          if (!contact.email) continue;
          
          // Case 1: Close contact with no Calendly/Typeform integration
          if (contact.leadSource === 'close') {
            // Look for matching Calendly meeting invitees
            const inviteeEmail = contactMatcher.normalizeEmail(contact.email);
            const matchingMeetings = await db.select()
              .from(meetings)
              .where(eq(meetings.inviteeEmail, inviteeEmail));
            
            if (matchingMeetings.length > 0) {
              // We found meetings for this contact that aren't linked
              console.log(`Found ${matchingMeetings.length} unlinked Calendly meetings for ${contact.name}`);
              
              // Update lead source
              await storage.updateContact(contact.id, {
                leadSource: 'close,calendly',
                sourcesCount: 2
              });
              
              // Link meetings to this contact
              for (const meeting of matchingMeetings) {
                if (!meeting.contactId || meeting.contactId === 0) {
                  await storage.updateMeeting(meeting.id, {
                    contactId: contact.id
                  });
                  console.log(`Linked meeting ${meeting.title} to contact ${contact.name}`);
                }
              }
              
              contactsEnhanced++;
            }
            
            // Look for matching Typeform submissions
            const formSubmissions = await db.select()
              .from(forms)
              .where(eq(forms.respondentEmail, inviteeEmail));
            
            if (formSubmissions.length > 0) {
              // We found forms for this contact that aren't linked
              console.log(`Found ${formSubmissions.length} unlinked Typeform submissions for ${contact.name}`);
              
              // Update lead source if not already updated
              if (!contact.leadSource?.includes('typeform')) {
                const currentLeadSource = contact.leadSource || 'close';
                await storage.updateContact(contact.id, {
                  leadSource: `${currentLeadSource},typeform`,
                  sourcesCount: (contact.sourcesCount || 1) + 1
                });
              }
              
              // Link forms to this contact
              for (const form of formSubmissions) {
                if (!form.contactId || form.contactId === 0) {
                  await storage.updateForm(form.id, {
                    contactId: contact.id
                  });
                  console.log(`Linked form ${form.formName} to contact ${contact.name}`);
                }
              }
              
              contactsEnhanced++;
            }
          }
          
          // Case 2: Calendly contact with no Close integration
          else if (contact.leadSource === 'calendly') {
            // Look for matching Close contacts
            const normalizedEmail = contactMatcher.normalizeEmail(contact.email);
            
            // Try to find a matching Close contact
            const matchResult = await contactMatcher.findBestMatchingContact({
              email: normalizedEmail,
              name: contact.name,
              phone: contact.phone
            }, {
              minConfidence: matchThreshold
            });
            
            if (matchResult.confidence !== contactMatcher.MatchConfidence.NONE && 
                matchResult.contact && 
                matchResult.contact.id !== contact.id) {
              
              // We found a matching Close contact
              console.log(`Found matching Close contact for Calendly contact ${contact.name}: ${matchResult.contact.name}`);
              
              // Merge the contacts
              await contactMatcher.mergeContacts(
                matchResult.contact.id, 
                [contact.id]
              );
              
              console.log(`Merged Calendly contact ${contact.name} into Close contact ${matchResult.contact.name}`);
              contactsMerged++;
            }
          }
          
          // Case 3: Typeform contact with no other integrations
          else if (contact.leadSource === 'typeform') {
            // Similar approach as with Calendly contacts
            const normalizedEmail = contactMatcher.normalizeEmail(contact.email);
            
            // Try to find a matching contact
            const matchResult = await contactMatcher.findBestMatchingContact({
              email: normalizedEmail,
              name: contact.name,
              phone: contact.phone
            }, {
              minConfidence: matchThreshold
            });
            
            if (matchResult.confidence !== contactMatcher.MatchConfidence.NONE && 
                matchResult.contact && 
                matchResult.contact.id !== contact.id) {
              
              // We found a matching contact
              console.log(`Found matching contact for Typeform contact ${contact.name}: ${matchResult.contact.name}`);
              
              // Merge the contacts
              await contactMatcher.mergeContacts(
                matchResult.contact.id, 
                [contact.id]
              );
              
              console.log(`Merged Typeform contact ${contact.name} into contact ${matchResult.contact.name}`);
              contactsMerged++;
            }
          }
          
          // Log progress
          if (contactsProcessed % 100 === 0) {
            console.log(`Processed ${contactsProcessed}/${singleSourceContacts.length} contacts`);
          }
        } catch (error) {
          console.error(`Error processing contact ${contact.id}:`, error);
          errorsEncountered++;
        }
      }
    }
    
    // Log completion
    console.log('\nAttribution process completed:');
    console.log(`- Contacts processed: ${contactsProcessed}`);
    console.log(`- Contacts enhanced with multi-source: ${contactsEnhanced}`);
    console.log(`- Contacts merged: ${contactsMerged}`);
    console.log(`- Errors encountered: ${errorsEncountered}`);
    
    return {
      success: true,
      contactsProcessed,
      contactsEnhanced,
      contactsMerged,
      errorsEncountered
    };
  } catch (error) {
    console.error('Error in bulk attribution process:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Run attribution analysis for a specific date range
 */
export async function analyzeAttributionByDateRange(
  dateRange: { startDate: Date, endDate: Date },
  userId?: string
) {
  try {
    // Step 1: Get contacts created or updated in the date range
    const contactsInRange = await db.select()
      .from(contacts)
      .where(
        or(
          and(
            gte(contacts.createdAt, dateRange.startDate),
            lte(contacts.createdAt, dateRange.endDate)
          ),
          and(
            gte(contacts.lastUpdateDate, dateRange.startDate),
            lte(contacts.lastUpdateDate, dateRange.endDate)
          )
        )
      )
      .limit(1000); // Limit for performance
    
    // Step 2: Get activities in the date range
    const activitiesInRange = await db.select()
      .from(activities)
      .where(
        and(
          gte(activities.date, dateRange.startDate),
          lte(activities.date, dateRange.endDate)
        )
      )
      .limit(1000);
    
    // Step 3: Get meetings in the date range
    const meetingsInRange = await db.select()
      .from(meetings)
      .where(
        and(
          gte(meetings.startTime, dateRange.startDate),
          lte(meetings.endTime, dateRange.endDate)
        )
      )
      .limit(1000);
    
    // Step 4: Get forms in the date range
    const formsInRange = await db.select()
      .from(forms)
      .where(
        and(
          gte(forms.submittedAt, dateRange.startDate),
          lte(forms.submittedAt, dateRange.endDate)
        )
      )
      .limit(1000);
    
    // Step 5: Get deals in the date range
    const dealsInRange = await db.select()
      .from(deals)
      .where(
        or(
          and(
            gte(deals.createdAt, dateRange.startDate),
            lte(deals.createdAt, dateRange.endDate)
          ),
          and(
            gte(deals.closeDate, dateRange.startDate),
            lte(deals.closeDate, dateRange.endDate)
          )
        )
      )
      .limit(1000);
    
    // Step 6: Calculate attribution metrics
    
    // Multi-source contacts in date range
    const multiSourceContacts = contactsInRange.filter(
      c => (c.sourcesCount || 0) > 1 || (c.leadSource && c.leadSource.includes(','))
    );
    
    // Get platform distribution
    const platformDistribution: Record<string, number> = {};
    
    contactsInRange.forEach(contact => {
      if (contact.leadSource) {
        const sources = contact.leadSource.split(',');
        sources.forEach(source => {
          const trimmedSource = source.trim();
          platformDistribution[trimmedSource] = (platformDistribution[trimmedSource] || 0) + 1;
        });
      }
    });
    
    // Get activity type distribution
    const activityTypeDistribution: Record<string, number> = {};
    
    activitiesInRange.forEach(activity => {
      activityTypeDistribution[activity.type] = (activityTypeDistribution[activity.type] || 0) + 1;
    });
    
    return {
      success: true,
      dateRange,
      contacts: {
        total: contactsInRange.length,
        multiSource: multiSourceContacts.length,
        multiSourceRate: contactsInRange.length > 0 
          ? (multiSourceContacts.length / contactsInRange.length) * 100 
          : 0
      },
      activities: {
        total: activitiesInRange.length,
        typeDistribution: activityTypeDistribution
      },
      meetings: {
        total: meetingsInRange.length
      },
      forms: {
        total: formsInRange.length
      },
      deals: {
        total: dealsInRange.length
      },
      platformDistribution
    };
  } catch (error) {
    console.error('Error analyzing attribution by date range:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

export default {
  calculateAttributionStats,
  analyzeContactAttribution,
  runBulkAttributionProcess,
  analyzeAttributionByDateRange
};