/**
 * Enhanced Attribution Service
 * 
 * This service provides advanced contact-level attribution across
 * multiple platforms (Close CRM, Calendly, Typeform) with sophisticated
 * attribution models, certainty calculations, and weighted influence metrics.
 */

import { storage } from '../storage';

// Define time windows for attribution (in milliseconds)
const ATTRIBUTION_WINDOW = {
  SHORT: 7 * 24 * 60 * 60 * 1000, // 7 days
  MEDIUM: 30 * 24 * 60 * 60 * 1000, // 30 days
  LONG: 90 * 24 * 60 * 60 * 1000  // 90 days
};

// Attribution Models
enum AttributionModel {
  FIRST_TOUCH = 'first-touch',
  LAST_TOUCH = 'last-touch',
  MULTI_TOUCH = 'multi-touch',
  POSITION_BASED = 'position-based',
  TIME_DECAY = 'time-decay',
  MEETING_INFLUENCED = 'meeting-influenced',
  FORM_INFLUENCED = 'form-influenced',
  CUSTOM = 'custom'
}

// Timeline event interface
interface TimelineEvent {
  type: string;
  date: Date | string;
  sourceId: string | null;
  source: string;
  data: any;
}

/**
 * Calculate attribution weights for each touchpoint based on position and time
 */
function calculateTouchpointWeights(
  events: TimelineEvent[],
  conversionDate: Date,
  lastMeeting: TimelineEvent | undefined,
  attributionWindow: typeof ATTRIBUTION_WINDOW
): Record<string, number> {
  if (!events.length) return {};
  
  const weights: Record<string, number> = {};
  const totalEvents = events.length;
  
  // Different weighting strategies based on event patterns and conversion data
  
  // If there's a meeting within 7 days of conversion, it gets highest weight
  if (lastMeeting) {
    const timeSinceMeeting = conversionDate.getTime() - new Date(lastMeeting.date).getTime();
    if (timeSinceMeeting <= attributionWindow.SHORT) {
      // Meeting-dominated weighting: Last meeting gets 70%, first touch 20%, others 10%
      events.forEach((event, index) => {
        if (event === lastMeeting) {
          weights[event.sourceId] = 0.7; // 70% to last meeting
        } else if (index === 0) {
          weights[event.sourceId] = 0.2; // 20% to first touch
        } else {
          weights[event.sourceId] = 0.1 / (totalEvents - 2 || 1); // Remaining 10% distributed
        }
      });
      return weights;
    }
  }
  
  // Time decay model (more recent events get higher weight)
  const conversionTime = conversionDate.getTime();
  const oldestEventTime = new Date(events[0].date).getTime();
  const timeSpan = conversionTime - oldestEventTime;
  
  // If timeSpan is too small, use position-based weighting instead
  if (timeSpan < 24 * 60 * 60 * 1000) { // Less than 1 day
    // Position-based weighting: 40% to first, 40% to last, 20% to middle
    events.forEach((event, index) => {
      if (index === 0) {
        weights[event.sourceId] = 0.4; // 40% to first
      } else if (index === totalEvents - 1) {
        weights[event.sourceId] = 0.4; // 40% to last
      } else {
        weights[event.sourceId] = 0.2 / (totalEvents - 2 || 1); // Remaining 20% distributed
      }
    });
    return weights;
  }
  
  // Time decay implementation
  let totalWeight = 0;
  const rawWeights: Record<string, number> = {};
  
  events.forEach(event => {
    const eventTime = new Date(event.date).getTime();
    const daysBeforeConversion = (conversionTime - eventTime) / (24 * 60 * 60 * 1000);
    
    // Apply exponential decay with half-life of 7 days
    const weight = Math.exp(-0.1 * daysBeforeConversion);
    rawWeights[event.sourceId] = weight;
    totalWeight += weight;
  });
  
  // Normalize weights to sum to 1
  Object.keys(rawWeights).forEach(id => {
    weights[id] = totalWeight > 0 ? rawWeights[id] / totalWeight : 1 / events.length;
  });
  
  return weights;
}

/**
 * Determine the most appropriate attribution model based on touchpoint pattern
 */
function determineAttributionModel(
  events: TimelineEvent[],
  meetingsBeforeDeal: TimelineEvent[],
  formsBeforeDeal: TimelineEvent[],
  timeToConversion: number | null,
  attributionWindow: typeof ATTRIBUTION_WINDOW
): AttributionModel {
  if (!events.length) return AttributionModel.CUSTOM;
  
  // Single touchpoint scenario
  if (events.length === 1) {
    return AttributionModel.FIRST_TOUCH; // Same as last touch in this case
  }
  
  // If there's a meeting within SHORT window before conversion
  if (meetingsBeforeDeal.length > 0 && timeToConversion !== null && timeToConversion <= attributionWindow.SHORT) {
    return AttributionModel.MEETING_INFLUENCED;
  }
  
  // If there's a form submission as the first touch and meetings after
  if (events[0].type === 'form' && meetingsBeforeDeal.length > 0) {
    return AttributionModel.FORM_INFLUENCED;
  }
  
  // If conversion happened over a long time period with multiple touches
  if (events.length >= 4 && timeToConversion !== null && timeToConversion > attributionWindow.MEDIUM) {
    return AttributionModel.MULTI_TOUCH;
  }
  
  // Default to time decay if we have multiple events over time
  if (events.length > 1) {
    return AttributionModel.TIME_DECAY;
  }
  
  return AttributionModel.POSITION_BASED;
}

/**
 * Identify the most significant touchpoints in the customer journey
 */
function identifySignificantTouchpoints(
  events: TimelineEvent[],
  conversionDate: Date,
  attributionWindow: typeof ATTRIBUTION_WINDOW
): TimelineEvent[] {
  if (!events.length) return [];
  
  const significant: TimelineEvent[] = [];
  
  // Always include first touch
  significant.push(events[0]);
  
  // Always include last touch if different from first
  if (events.length > 1) {
    significant.push(events[events.length - 1]);
  }
  
  // Include all meetings
  const meetings = events.filter(event => event.type === 'meeting');
  meetings.forEach(meeting => {
    if (!significant.includes(meeting)) {
      significant.push(meeting);
    }
  });
  
  // Include recent form submissions
  const forms = events.filter(event => {
    if (event.type !== 'form') return false;
    const timeDiff = conversionDate.getTime() - new Date(event.date).getTime();
    return timeDiff <= attributionWindow.MEDIUM;
  });
  
  forms.forEach(form => {
    if (!significant.includes(form)) {
      significant.push(form);
    }
  });
  
  // Add any event that occurred very close to conversion
  events.forEach(event => {
    const timeDiff = conversionDate.getTime() - new Date(event.date).getTime();
    if (timeDiff <= attributionWindow.SHORT && !significant.includes(event)) {
      significant.push(event);
    }
  });
  
  // Sort by date
  return significant.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Calculate meeting influence strength (0-1)
 */
function calculateMeetingInfluence(
  meetingsBeforeDeal: TimelineEvent[],
  timeToConversion: number | null,
  attributionWindow: typeof ATTRIBUTION_WINDOW
): number {
  if (!meetingsBeforeDeal.length || timeToConversion === null) return 0;
  
  // Strong influence if meeting happened shortly before conversion
  if (timeToConversion <= attributionWindow.SHORT) {
    return 0.9; // Very high influence
  }
  
  // Medium influence if within medium window
  if (timeToConversion <= attributionWindow.MEDIUM) {
    return 0.7;
  }
  
  // Lower influence if longer ago
  if (timeToConversion <= attributionWindow.LONG) {
    return 0.4;
  }
  
  // Multiple meetings increase influence
  const baseFactor = 0.2;
  return Math.min(0.9, baseFactor + (meetingsBeforeDeal.length - 1) * 0.1);
}

/**
 * Calculate form influence strength (0-1)
 */
function calculateFormInfluence(
  formsBeforeDeal: TimelineEvent[],
  conversionDate: Date,
  attributionWindow: typeof ATTRIBUTION_WINDOW
): number {
  if (!formsBeforeDeal.length) return 0;
  
  // Get the time between the most recent form and conversion
  const mostRecentForm = formsBeforeDeal[0];
  const timeSinceForm = conversionDate.getTime() - new Date(mostRecentForm.date).getTime();
  
  // High influence if form was submitted shortly before conversion
  if (timeSinceForm <= attributionWindow.SHORT) {
    return 0.8;
  }
  
  // Medium influence if within medium window
  if (timeSinceForm <= attributionWindow.MEDIUM) {
    return 0.6;
  }
  
  // Lower influence if longer ago
  if (timeSinceForm <= attributionWindow.LONG) {
    return 0.3;
  }
  
  // Multiple forms increase influence
  const baseFactor = 0.1;
  return Math.min(0.7, baseFactor + (formsBeforeDeal.length - 1) * 0.1);
}

/**
 * Calculate activity influence strength (0-1)
 */
function calculateActivityInfluence(
  activitiesBeforeDeal: TimelineEvent[],
  conversionDate: Date,
  attributionWindow: typeof ATTRIBUTION_WINDOW
): number {
  if (!activitiesBeforeDeal.length) return 0;
  
  // Get the time between the most recent activity and conversion
  const mostRecentActivity = activitiesBeforeDeal[0];
  const timeSinceActivity = conversionDate.getTime() - new Date(mostRecentActivity.date).getTime();
  
  // Activities generally have lower influence than meetings/forms
  
  // Medium influence if activity was very recent
  if (timeSinceActivity <= attributionWindow.SHORT) {
    return 0.5;
  }
  
  // Lower influence if within medium window
  if (timeSinceActivity <= attributionWindow.MEDIUM) {
    return 0.3;
  }
  
  // Minimal influence if longer ago
  if (timeSinceActivity <= attributionWindow.LONG) {
    return 0.1;
  }
  
  // Multiple activities slightly increase influence
  const activityCount = activitiesBeforeDeal.length;
  const frequencyFactor = Math.min(0.3, activityCount * 0.01);
  
  return Math.min(0.5, 0.05 + frequencyFactor);
}

/**
 * Calculate overall attribution certainty (0-1)
 * This represents our confidence in the attribution accuracy
 */
function calculateAttributionCertainty(
  allEvents: TimelineEvent[],
  meetings: TimelineEvent[],
  forms: TimelineEvent[],
  activities: TimelineEvent[],
  timeToConversion: number | null,
  attributionWindow: typeof ATTRIBUTION_WINDOW
): number {
  // Base certainty factors
  let certainty = 0.5; // Start with medium certainty
  
  // Not enough data - low certainty
  if (allEvents.length <= 1) {
    certainty = 0.3;
  }
  
  // Clear meeting influence = high certainty
  if (meetings.length > 0 && timeToConversion !== null && timeToConversion <= attributionWindow.SHORT) {
    certainty = 0.95; // Very high certainty
  }
  
  // Multiple touchpoint types increase certainty
  const touchpointTypes = new Set(allEvents.map(e => e.type)).size;
  if (touchpointTypes >= 2) {
    certainty += 0.1;
  }
  
  // Multiple touchpoints from different sources increase certainty
  const sources = new Set(allEvents.map(e => e.source)).size;
  if (sources >= 2) {
    certainty += 0.1;
  }
  
  // Consistent engagement increases certainty
  if (allEvents.length >= 3) {
    certainty += 0.05;
  }
  
  // Cap certainty at 0.98 (never 100% certain)
  return Math.min(0.98, certainty);
}

/**
 * Attribute a single contact across all platforms with enhanced metrics
 * 
 * @param contactId The ID of the contact to attribute
 */
export async function attributeContact(contactId: number) {
  try {
    // Get the contact and related data
    const contact = await storage.getContact(contactId);
    
    if (!contact) {
      return { 
        success: false, 
        error: "Contact not found" 
      };
    }
    
    // Get all data points for this contact
    const activities = await storage.getActivitiesByContactId(contactId);
    const meetings = await storage.getMeetingsByContactId(contactId);
    const forms = await storage.getFormsByContactId(contactId);
    const deals = await storage.getDealsByContactId(contactId);
    
    // Sort all events by date to create an ordered timeline
    const timeline = [
      ...activities.map(a => ({
        type: 'activity',
        date: a.date,
        sourceId: a.sourceId,
        source: 'close',
        data: a
      })),
      ...meetings.map(m => ({
        type: 'meeting',
        date: m.startTime, // Use startTime instead of date for meetings
        sourceId: m.calendlyEventId, // Use calendlyEventId as sourceId
        source: 'calendly',
        data: m
      })),
      ...forms.map(f => ({
        type: 'form',
        date: f.submittedAt, // Use submittedAt for form submission date
        sourceId: f.typeformResponseId, // Use typeformResponseId as sourceId
        source: 'typeform',
        data: f
      })),
      ...deals.map(d => ({
        type: 'deal',
        date: d.createdAt || new Date(), // Use createdAt for deal creation date
        sourceId: d.closeId || `deal_${d.id}`, // Use closeId or generate an ID
        source: 'close',
        data: d
      }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Build attribution chains - sequence of events that led to deals
    const attributionChains = [];
    
    // If we have deals, build an attribution chain for each one
    for (const deal of deals) {
      // Get events that happened before the deal was created
      const dealCreatedAt = deal.createdAt || new Date();
      const eventsPriorToDeal = timeline.filter(
        event => new Date(event.date) <= dealCreatedAt && event.type !== 'deal'
      );
      
      // Get all meetings before the deal
      const meetingsBeforeDeal = [...eventsPriorToDeal]
        .filter(event => event.type === 'meeting')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Get all form submissions before the deal
      const formsBeforeDeal = [...eventsPriorToDeal]
        .filter(event => event.type === 'form')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Get all activities before the deal
      const activitiesBeforeDeal = [...eventsPriorToDeal]
        .filter(event => event.type === 'activity')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Most recent touchpoints by type
      const lastMeetingBeforeDeal = meetingsBeforeDeal[0];
      const lastFormBeforeDeal = formsBeforeDeal[0];
      const lastActivityBeforeDeal = activitiesBeforeDeal[0];
      
      // Calculate time difference between deal creation and most recent meeting
      const timeToConversion = lastMeetingBeforeDeal ? 
        dealCreatedAt.getTime() - new Date(lastMeetingBeforeDeal.date).getTime() : null;
      
      // Determine attribution weights for each touchpoint
      const touchpointWeights = calculateTouchpointWeights(
        eventsPriorToDeal, 
        dealCreatedAt,
        lastMeetingBeforeDeal,
        ATTRIBUTION_WINDOW
      );
      
      // Advanced attribution model selection based on touchpoint pattern
      const attributionModel = determineAttributionModel(
        eventsPriorToDeal,
        meetingsBeforeDeal,
        formsBeforeDeal,
        timeToConversion,
        ATTRIBUTION_WINDOW
      );
      
      // Process significant touchpoints (identify key events in the journey)
      const significantTouchpoints = identifySignificantTouchpoints(
        eventsPriorToDeal,
        dealCreatedAt,
        ATTRIBUTION_WINDOW
      );
      
      // Create attribution chain with enhanced data
      const attributionChain = {
        dealId: deal.id,
        dealValue: typeof deal.value === 'string' ? parseFloat(deal.value) : (deal.value || 0),
        dealStatus: deal.status,
        events: eventsPriorToDeal,
        attributionModel,
        firstTouch: eventsPriorToDeal[0] || null,
        lastTouchBeforeDeal: eventsPriorToDeal.length > 0 ? eventsPriorToDeal[eventsPriorToDeal.length - 1] : null,
        significantTouchpoints,
        touchpointWeights,
        conversionPoint: {
          type: 'deal',
          date: dealCreatedAt,
          value: deal.value
        },
        meetingInfluence: lastMeetingBeforeDeal ? {
          meeting: lastMeetingBeforeDeal,
          daysToConversion: timeToConversion ? Math.floor(timeToConversion / (1000 * 60 * 60 * 24)) : null,
          meetingCount: meetingsBeforeDeal.length,
          // Calculate meeting influence strength based on recency and number
          strength: calculateMeetingInfluence(meetingsBeforeDeal, timeToConversion, ATTRIBUTION_WINDOW)
        } : null,
        formInfluence: lastFormBeforeDeal ? {
          form: lastFormBeforeDeal,
          formCount: formsBeforeDeal.length,
          // Calculate form influence strength
          strength: calculateFormInfluence(formsBeforeDeal, dealCreatedAt, ATTRIBUTION_WINDOW)
        } : null,
        activityInfluence: lastActivityBeforeDeal ? {
          activity: lastActivityBeforeDeal,
          activityCount: activitiesBeforeDeal.length,
          // Calculate activity influence strength
          strength: calculateActivityInfluence(activitiesBeforeDeal, dealCreatedAt, ATTRIBUTION_WINDOW) 
        } : null,
        totalTouchpoints: eventsPriorToDeal.length,
        channelAttribution: {
          calendly: eventsPriorToDeal.filter(e => e.source === 'calendly').length,
          close: eventsPriorToDeal.filter(e => e.source === 'close').length,
          typeform: eventsPriorToDeal.filter(e => e.source === 'typeform').length
        },
        // Attribution certainty (confidence score)
        attributionCertainty: calculateAttributionCertainty(
          eventsPriorToDeal,
          meetingsBeforeDeal,
          formsBeforeDeal,
          activitiesBeforeDeal,
          timeToConversion,
          ATTRIBUTION_WINDOW
        )
      };
      
      attributionChains.push(attributionChain);
    }
    
    // Calculate overall attribution certainty for this contact
    const overallCertainty = attributionChains.length > 0
      ? attributionChains.reduce((sum, chain) => sum + chain.attributionCertainty, 0) / attributionChains.length
      : (timeline.length > 1 ? 0.7 : 0.5); // Default certainty based on number of touchpoints
    
    return {
      success: true,
      contact,
      timeline,
      attributionChains,
      touchpointCount: timeline.length,
      firstTouch: timeline.length > 0 ? timeline[0] : null,
      lastTouch: timeline.length > 0 ? timeline[timeline.length - 1] : null,
      conversionPoint: deals.length > 0 ? {
        type: 'deal',
        date: deals[0].createdAt || new Date(),
        value: typeof deals[0].value === 'string' ? parseFloat(deals[0].value) : (deals[0].value || 0)
      } : null,
      // Channel statistics
      channelBreakdown: {
        calendly: timeline.filter(e => e.source === 'calendly').length,
        close: timeline.filter(e => e.source === 'close').length,
        typeform: timeline.filter(e => e.source === 'typeform').length
      },
      // Overall attribution certainty
      attributionCertainty: overallCertainty
    };
  } catch (error) {
    console.error(`Error attributing contact ${contactId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Attribute all contacts in the system with enhanced metrics
 * and generate detailed analytics
 */
export async function attributeAllContacts() {
  try {
    const contacts = await storage.getAllContacts();
    
    // Basic processing results
    const results = {
      total: contacts.length,
      processed: 0,
      attributed: 0,
      errors: 0
    };
    
    // Advanced analytics containers
    const channelStats = {
      calendly: 0,
      close: 0,
      typeform: 0
    };
    
    const modelStats = {
      firstTouch: 0,
      lastTouch: 0,
      multiTouch: 0,
      positionBased: 0,
      timeDecay: 0,
      meetingInfluenced: 0,
      formInfluenced: 0,
      custom: 0
    };
    
    const dealStats = {
      total: 0,
      withMeeting: 0,
      withForm: 0,
      withActivity: 0,
      averageValue: 0,
      totalValue: 0,
      averageTouchpoints: 0,
      totalTouchpoints: 0,
      averageDaysToConversion: 0
    };
    
    // Advanced certainty metrics
    const certaintyMetrics = {
      highCertainty: 0, // > 0.8
      mediumCertainty: 0, // 0.5-0.8
      lowCertainty: 0, // < 0.5
      averageCertainty: 0,
      totalCertainty: 0
    };
    
    let contactsWithDeals = 0;
    let contactsWithMeetings = 0;
    let contactsWithForms = 0;
    let totalTouchpoints = 0;
    let totalMeetings = 0;
    let totalActivities = 0;
    let totalForms = 0;
    let daysToConversionValues = [];
    
    // Process contacts in batches to avoid memory issues
    const batchSize = 50;
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      
      // Process each contact in the batch
      for (const contact of batch) {
        try {
          const attribution = await attributeContact(contact.id);
          results.processed++;
          
          if (attribution.success) {
            results.attributed++;
            totalTouchpoints += attribution.touchpointCount || 0;
            
            // Process attribution certainty
            if (attribution.attributionCertainty !== undefined) {
              certaintyMetrics.totalCertainty += attribution.attributionCertainty;
              
              if (attribution.attributionCertainty > 0.8) {
                certaintyMetrics.highCertainty++;
              } else if (attribution.attributionCertainty >= 0.5) {
                certaintyMetrics.mediumCertainty++;
              } else {
                certaintyMetrics.lowCertainty++;
              }
            }
            
            // Channel stats
            if (attribution.channelBreakdown) {
              channelStats.calendly += attribution.channelBreakdown.calendly || 0;
              channelStats.close += attribution.channelBreakdown.close || 0;
              channelStats.typeform += attribution.channelBreakdown.typeform || 0;
              
              if (attribution.channelBreakdown.calendly > 0) {
                contactsWithMeetings++;
                totalMeetings += attribution.channelBreakdown.calendly;
              }
              
              if (attribution.channelBreakdown.typeform > 0) {
                contactsWithForms++;
                totalForms += attribution.channelBreakdown.typeform;
              }
              
              if (attribution.channelBreakdown.close > 0) {
                totalActivities += attribution.channelBreakdown.close;
              }
            }
            
            // Deal attribution stats
            if (attribution.attributionChains && attribution.attributionChains.length > 0) {
              contactsWithDeals++;
              
              for (const chain of attribution.attributionChains) {
                dealStats.total++;
                const dealValue = typeof chain.dealValue === 'string' ? parseFloat(chain.dealValue) : (chain.dealValue || 0);
                dealStats.totalValue += dealValue;
                dealStats.totalTouchpoints += chain.totalTouchpoints || 0;
                
                // Track attribution model usage
                if (chain.attributionModel) {
                  const model = chain.attributionModel.toString();
                  switch (model) {
                    case AttributionModel.FIRST_TOUCH:
                      modelStats.firstTouch++;
                      break;
                    case AttributionModel.LAST_TOUCH:
                      modelStats.lastTouch++;
                      break;
                    case AttributionModel.MULTI_TOUCH:
                      modelStats.multiTouch++;
                      break;
                    case AttributionModel.POSITION_BASED:
                      modelStats.positionBased++;
                      break;
                    case AttributionModel.TIME_DECAY:
                      modelStats.timeDecay++;
                      break;
                    case AttributionModel.MEETING_INFLUENCED:
                      modelStats.meetingInfluenced++;
                      break;
                    case AttributionModel.FORM_INFLUENCED:
                      modelStats.formInfluenced++;
                      break;
                    default:
                      modelStats.custom++;
                  }
                }
                
                if (chain.meetingInfluence) {
                  dealStats.withMeeting++;
                  if (chain.meetingInfluence.daysToConversion) {
                    daysToConversionValues.push(chain.meetingInfluence.daysToConversion);
                  }
                }
                
                if (chain.formInfluence) {
                  dealStats.withForm++;
                }
                
                if (chain.activityInfluence) {
                  dealStats.withActivity++;
                }
              }
            }
          } else {
            results.errors++;
          }
        } catch (error) {
          console.error(`Error attributing contact ${contact.id}:`, error);
          results.processed++;
          results.errors++;
        }
      }
    }
    
    // Calculate averages and percentages
    if (dealStats.total > 0) {
      dealStats.averageValue = Math.round(dealStats.totalValue / dealStats.total);
      dealStats.averageTouchpoints = Math.round((dealStats.totalTouchpoints / dealStats.total) * 100) / 100;
    }
    
    if (daysToConversionValues.length > 0) {
      dealStats.averageDaysToConversion = Math.round(
        (daysToConversionValues.reduce((sum, val) => sum + val, 0) / daysToConversionValues.length) * 10
      ) / 10;
    }
    
    if (results.attributed > 0) {
      certaintyMetrics.averageCertainty = Math.round((certaintyMetrics.totalCertainty / results.attributed) * 100) / 100;
    }
    
    // Calculate overall attribution accuracy
    const attributionAccuracy = certaintyMetrics.averageCertainty * 100;
    
    return {
      success: true,
      baseResults: results,
      attributionAccuracy, // Percentage representation of our attribution confidence
      detailedAnalytics: {
        contactStats: {
          totalContacts: contacts.length,
          contactsWithDeals,
          contactsWithMeetings,
          contactsWithForms,
          conversionRate: Math.round((contactsWithDeals / Math.max(contacts.length, 1)) * 1000) / 10 // percentage with 1 decimal
        },
        touchpointStats: {
          totalTouchpoints,
          totalMeetings,
          totalActivities,
          totalForms,
          averageTouchpointsPerContact: Math.round((totalTouchpoints / Math.max(results.attributed, 1)) * 10) / 10
        },
        channelStats,
        modelStats,
        dealStats,
        certaintyMetrics,
        insights: {
          meetingConversionRate: dealStats.withMeeting > 0 && totalMeetings > 0 ? 
            Math.round((dealStats.withMeeting / totalMeetings) * 1000) / 10 : 0, // percentage
          averageSalesCycle: dealStats.averageDaysToConversion || 0,
          mostEffectiveChannel: channelStats.calendly >= channelStats.close && channelStats.calendly >= channelStats.typeform ? 
            'calendly' : channelStats.close >= channelStats.typeform ? 'close' : 'typeform',
          averageDealValue: dealStats.averageValue || 0,
          mostEffectiveAttributionModel: Object.entries(modelStats)
            .sort((a, b) => b[1] - a[1])
            .filter(([_, value]) => value > 0)[0]?.[0] || 'none'
        }
      }
    };
  } catch (error) {
    console.error("Error attributing all contacts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// Get the attribution timeline for a contact
export async function getAttributionTimeline(contactId: number) {
  try {
    const attribution = await attributeContact(contactId);
    
    if (!attribution.success) {
      return attribution; // Return the error response
    }
    
    return {
      success: true,
      contact: attribution.contact,
      timeline: attribution.timeline,
      firstTouch: attribution.firstTouch,
      lastTouch: attribution.lastTouch,
      attributionChains: attribution.attributionChains,
      channelBreakdown: attribution.channelBreakdown,
      attributionCertainty: attribution.attributionCertainty
    };
  } catch (error) {
    console.error(`Error getting attribution timeline for contact ${contactId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// Generate attribution statistics
export async function getAttributionStats() {
  try {
    const attribution = await attributeAllContacts();
    
    if (!attribution.success) {
      return attribution; // Return the error response
    }
    
    return {
      success: true,
      attributionAccuracy: attribution.attributionAccuracy, 
      stats: attribution.detailedAnalytics
    };
  } catch (error) {
    console.error('Error generating attribution stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export default {
  attributeContact,
  attributeAllContacts,
  getAttributionTimeline,
  getAttributionStats
};