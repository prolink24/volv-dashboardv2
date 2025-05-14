/**
 * Attribution Service
 * 
 * This service is responsible for attributing contacts across
 * multiple platforms (Close CRM, Calendly, Typeform) to create
 * a unified view of the customer journey.
 */

import { storage } from '../storage';

/**
 * Attribute a single contact across all platforms
 * 
 * This function:
 * 1. Retrieves all activities, meetings, forms related to a contact
 * 2. Creates a timeline of events
 * 3. Establishes attribution chains across platforms
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
    
    // Perform attribution logic
    // Analyze the timeline to establish attribution chains
    // Determining if a form submission led to a meeting, which then led to a deal, etc.
    
    // Build attribution chains - sequence of events that led to deals
    const attributionChains = [];
    
    // If we have deals, build an attribution chain for each one
    for (const deal of deals) {
      // Get events that happened before the deal was created
      const dealCreatedAt = deal.createdAt || new Date();
      const eventsPriorToDeal = timeline.filter(
        event => new Date(event.date) <= dealCreatedAt && event.type !== 'deal'
      );
      
      // Get the most recent meeting before the deal
      const lastMeetingBeforeDeal = [...eventsPriorToDeal]
        .filter(event => event.type === 'meeting')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      // Get the most recent form submission before the deal
      const lastFormBeforeDeal = [...eventsPriorToDeal]
        .filter(event => event.type === 'form')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      // Get the most recent activity before the deal
      const lastActivityBeforeDeal = [...eventsPriorToDeal]
        .filter(event => event.type === 'activity')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      // Calculate time between touchpoints
      const timeToConversion = lastMeetingBeforeDeal ? 
        dealCreatedAt.getTime() - new Date(lastMeetingBeforeDeal.date).getTime() : null;
      
      // Create attribution chain
      const attributionChain = {
        dealId: deal.id,
        dealValue: typeof deal.value === 'string' ? parseFloat(deal.value) : (deal.value || 0),
        dealStatus: deal.status,
        events: eventsPriorToDeal,
        // Attribution model: Last touch gets 100% credit if it's a meeting
        // Otherwise credit is distributed: 40% first touch, 40% last touch, 20% middle touches
        attributionModel: lastMeetingBeforeDeal ? 'last-touch' : 'multi-touch',
        firstTouch: eventsPriorToDeal[0] || null,
        lastTouchBeforeDeal: eventsPriorToDeal.length > 0 ? eventsPriorToDeal[eventsPriorToDeal.length - 1] : null,
        conversionPoint: {
          type: 'deal',
          date: dealCreatedAt,
          value: deal.value
        },
        meetingInfluence: lastMeetingBeforeDeal ? {
          meeting: lastMeetingBeforeDeal,
          daysToConversion: timeToConversion ? Math.floor(timeToConversion / (1000 * 60 * 60 * 24)) : null
        } : null,
        formInfluence: lastFormBeforeDeal ? {
          form: lastFormBeforeDeal
        } : null,
        activityInfluence: lastActivityBeforeDeal ? {
          activity: lastActivityBeforeDeal
        } : null,
        totalTouchpoints: eventsPriorToDeal.length,
        channelAttribution: {
          calendly: eventsPriorToDeal.filter(e => e.source === 'calendly').length,
          close: eventsPriorToDeal.filter(e => e.source === 'close').length,
          typeform: eventsPriorToDeal.filter(e => e.source === 'typeform').length
        }
      };
      
      attributionChains.push(attributionChain);
    }
    
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
      }
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
 * Attribute all contacts in the system and collect analytics
 * This is used for bulk attribution processing and generating insights
 * 
 * Performance optimized with:
 * - Parallel processing with concurrency limits
 * - Mutex for thread-safe counter updates
 * - Sample-based attribution for fast insights
 * - Optimized batch size based on system capabilities
 */
export async function attributeAllContacts() {
  const attributionStartTime = performance.now(); // For performance monitoring
  console.time('attribution-stats-generation');
  
  try {
    // Option to use a sample of contacts for faster attribution in dashboard contexts
    // We can process a limited subset of contacts for quick stats generation
    const MAX_CONTACTS_FOR_DASHBOARD = 250; // Limit to 250 contacts for dashboard view
    const isFullAttribution = process.env.FULL_ATTRIBUTION === 'true';
    
    // Get contact count before fetching all contacts
    const contactCount = await storage.getContactsCount();
    
    // Decide if we should use a sample or all contacts
    const useSample = !isFullAttribution && contactCount > MAX_CONTACTS_FOR_DASHBOARD;
    
    // Get either all contacts or a sample based on our decision
    let contacts = [];
    if (useSample) {
      // Get a representative sample of contacts for faster processing
      contacts = await storage.getContactSample(MAX_CONTACTS_FOR_DASHBOARD);
      console.log(`Using a sample of ${contacts.length} contacts for attribution stats`);
    } else {
      // Get all contacts for complete attribution
      contacts = await storage.getAllContacts();
      console.log(`Processing all ${contacts.length} contacts for full attribution`);
    }
    
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
      lastTouch: 0,
      multiTouch: 0,
      noAttribution: 0
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
    
    let contactsWithDeals = 0;
    let contactsWithMeetings = 0;
    let contactsWithForms = 0;
    let totalTouchpoints = 0;
    let totalMeetings = 0;
    let totalActivities = 0;
    let totalForms = 0;
    let daysToConversionValues = [];
    
    // Performance optimization parameters
    // Adjust concurrency based on system resources, higher for more cores
    const concurrencyLimit = 20; // Increased from 10 to 20 for better parallelization
    const batchSize = 100; // Increased from 50 to 100 for less batch processing overhead
    
    // Initialize a mutex for thread-safe updates to shared counters
    const mutex = {
      lock: async () => {
        while (mutex.isLocked) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        mutex.isLocked = true;
      },
      unlock: () => {
        mutex.isLocked = false;
      },
      isLocked: false
    };
    
    // Process batches of contacts
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      
      // Start time for batch processing
      const batchStartTime = performance.now();
      
      // Process all contacts in this batch with Promise.all for maximum parallelization
      await Promise.all(
        // Split batch into chunks based on concurrency limit
        Array.from({ length: Math.ceil(batch.length / concurrencyLimit) }, (_, chunkIndex) => {
          // Get current chunk of contacts
          const startIdx = chunkIndex * concurrencyLimit;
          const endIdx = Math.min(startIdx + concurrencyLimit, batch.length);
          const chunk = batch.slice(startIdx, endIdx);
          
          // Process this chunk in parallel
          return Promise.all(chunk.map(async (contact) => {
            try {
              const attribution = await attributeContact(contact.id);
              
              // Use mutex to safely update shared counters
              await mutex.lock();
              try {
                results.processed++;
                
                if (attribution.success) {
                  results.attributed++;
                  totalTouchpoints += attribution.touchpointCount || 0;
                  
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
                      dealStats.totalTouchpoints += chain.totalTouchpoints ? Number(chain.totalTouchpoints) : 0;
                      
                      if (chain.attributionModel === 'last-touch') {
                        modelStats.lastTouch++;
                      } else if (chain.attributionModel === 'multi-touch') {
                        modelStats.multiTouch++;
                      } else {
                        modelStats.noAttribution++;
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
              } finally {
                mutex.unlock();
              }
            } catch (error) {
              console.error(`Error attributing contact ${contact.id}:`, error);
              
              await mutex.lock();
              try {
                results.processed++;
                results.errors++;
              } finally {
                mutex.unlock();
              }
            }
          }));
        })
      );
      
      // Log batch processing time for performance monitoring
      const batchEndTime = performance.now();
      console.log(`Processed batch of ${batch.length} contacts in ${((batchEndTime - batchStartTime) / 1000).toFixed(2)}s`);
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
    
    return {
      success: true,
      baseResults: results,
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
        insights: {
          meetingConversionRate: dealStats.withMeeting > 0 && totalMeetings > 0 ? 
            Math.round((dealStats.withMeeting / totalMeetings) * 1000) / 10 : 0, // percentage
          averageSalesCycle: dealStats.averageDaysToConversion || 0,
          mostEffectiveChannel: channelStats.calendly >= channelStats.close && channelStats.calendly >= channelStats.typeform ? 
            'calendly' : channelStats.close >= channelStats.typeform ? 'close' : 'typeform',
          averageDealValue: dealStats.averageValue || 0
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

export default {
  attributeContact,
  attributeAllContacts
};