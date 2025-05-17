/**
 * Attribution Service
 * 
 * This service handles the attribution of contacts across multiple data sources:
 * - Close CRM
 * - Calendly
 * - Typeform
 * 
 * It creates unified contact profiles with proper attribution of touchpoints,
 * activities, deals, and meetings.
 */

import { storage } from '../storage';
import type { Contact } from '@shared/schema';

/**
 * Attribute all contacts to improve dashboard data quality
 */
export async function attributeAllContacts(): Promise<{
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
    channelStats: Record<string, number>;
    touchpointStats: {
      totalTouchpoints: number;
      avgTouchpointsPerContact: number;
      touchpointsByType: Record<string, number>;
    };
    dealStats: {
      totalDeals: number;
      dealsWithAttribution: number;
      dealAttributionRate: number;
      totalDealValue: number;
      attributedDealValue: number;
    };
    insights: {
      mostEffectiveChannel: string;
      mostCommonFirstTouch: string;
      mostCommonLastTouch: string;
      avgDaysToConversion: number;
    };
  };
}> {
  try {
    // Get all contacts
    const contacts = await storage.getAllContacts();
    
    // Initialize results
    let processed = 0;
    let attributed = 0;
    let errors = 0;
    
    // Channel and touchpoint tracking
    const channels = new Map<string, number>();
    const touchpointTypes = new Map<string, number>();
    let totalTouchpoints = 0;
    
    // Deal statistics
    let dealsWithAttribution = 0;
    let totalDeals = 0;
    let totalDealValue = 0;
    let attributedDealValue = 0;
    
    // Insight tracking
    const firstTouches = new Map<string, number>();
    const lastTouches = new Map<string, number>();
    const conversionDays = [] as number[];
    
    // Process each contact for attribution
    for (const contact of contacts) {
      try {
        // Get all related data for this contact
        const [activities, deals, meetings, forms] = await Promise.all([
          storage.getActivitiesByContactId(contact.id),
          storage.getDealsByContactId(contact.id),
          storage.getMeetingsByContactId(contact.id),
          storage.getFormsByContactId(contact.id)
        ]);
        
        // Count total touchpoints for this contact
        const contactTouchpoints = activities.length + meetings.length + forms.length;
        totalTouchpoints += contactTouchpoints;
        
        // Track touchpoint types
        activities.forEach(activity => {
          const type = activity.type || 'unknown';
          touchpointTypes.set(type, (touchpointTypes.get(type) || 0) + 1);
        });
        
        meetings.forEach(meeting => {
          touchpointTypes.set('meeting', (touchpointTypes.get('meeting') || 0) + 1);
        });
        
        forms.forEach(form => {
          touchpointTypes.set('form', (touchpointTypes.get('form') || 0) + 1);
        });
        
        // Track channels
        if (activities.length > 0) {
          channels.set('close', (channels.get('close') || 0) + 1);
        }
        
        if (meetings.length > 0) {
          channels.set('calendly', (channels.get('calendly') || 0) + 1);
        }
        
        if (forms.length > 0) {
          channels.set('typeform', (channels.get('typeform') || 0) + 1);
        }
        
        // Deal attribution
        if (deals.length > 0) {
          totalDeals += deals.length;
          
          // Calculate deal values
          deals.forEach(deal => {
            if (deal.value) {
              const value = parseFloat(deal.value);
              if (!isNaN(value)) {
                totalDealValue += value;
                
                // Count as attributed if we have activities, meetings or forms
                if (contactTouchpoints > 0) {
                  dealsWithAttribution++;
                  attributedDealValue += value;
                }
              }
            }
          });
          
          // Calculate conversion time if we have deals and first touch
          if (activities.length > 0 || meetings.length > 0 || forms.length > 0) {
            // Find earliest touchpoint date
            const touchpointDates = [
              ...activities.map(a => a.date),
              ...meetings.map(m => m.startTime),
              ...forms.map(f => f.submittedAt)
            ].filter(Boolean) as Date[];
            
            if (touchpointDates.length > 0) {
              // Find first touch
              const firstTouchDate = new Date(Math.min(...touchpointDates.map(d => d.getTime())));
              
              // Find deal creation date
              const dealDates = deals
                .map(d => d.createdAt)
                .filter(Boolean) as Date[];
              
              if (dealDates.length > 0) {
                const firstDealDate = new Date(Math.min(...dealDates.map(d => d.getTime())));
                
                // Calculate days to conversion
                const daysToConversion = Math.floor((firstDealDate.getTime() - firstTouchDate.getTime()) / (1000 * 60 * 60 * 24));
                
                if (daysToConversion >= 0) {
                  conversionDays.push(daysToConversion);
                }
              }
            }
          }
        }
        
        // Track first and last touches
        if (contactTouchpoints > 0) {
          attributed++;
          
          // All touchpoints with dates
          const datedTouchpoints = [
            ...activities.map(a => ({ type: a.type || 'activity', date: a.date })),
            ...meetings.map(m => ({ type: 'meeting', date: m.startTime })),
            ...forms.map(f => ({ type: 'form', date: f.submittedAt }))
          ].filter(t => t.date) as Array<{ type: string; date: Date }>;
          
          if (datedTouchpoints.length > 0) {
            // Sort touchpoints by date
            datedTouchpoints.sort((a, b) => a.date.getTime() - b.date.getTime());
            
            // First touch
            const firstTouch = datedTouchpoints[0].type;
            firstTouches.set(firstTouch, (firstTouches.get(firstTouch) || 0) + 1);
            
            // Last touch
            const lastTouch = datedTouchpoints[datedTouchpoints.length - 1].type;
            lastTouches.set(lastTouch, (lastTouches.get(lastTouch) || 0) + 1);
          }
        }
        
        processed++;
      } catch (error) {
        console.error(`Error attributing contact ${contact.id}:`, error);
        errors++;
      }
    }
    
    // Calculate insights
    let mostEffectiveChannel = 'unknown';
    let maxChannelCount = 0;
    for (const [channel, count] of channels.entries()) {
      if (count > maxChannelCount) {
        mostEffectiveChannel = channel;
        maxChannelCount = count;
      }
    }
    
    let mostCommonFirstTouch = 'unknown';
    let maxFirstTouchCount = 0;
    for (const [touchType, count] of firstTouches.entries()) {
      if (count > maxFirstTouchCount) {
        mostCommonFirstTouch = touchType;
        maxFirstTouchCount = count;
      }
    }
    
    let mostCommonLastTouch = 'unknown';
    let maxLastTouchCount = 0;
    for (const [touchType, count] of lastTouches.entries()) {
      if (count > maxLastTouchCount) {
        mostCommonLastTouch = touchType;
        maxLastTouchCount = count;
      }
    }
    
    // Calculate average days to conversion
    const avgDaysToConversion = conversionDays.length > 0
      ? Math.round(conversionDays.reduce((sum, days) => sum + days, 0) / conversionDays.length)
      : 0;
    
    // Final statistics
    const contactsWithDeals = deals => deals > 0 ? 1 : 0;
    const contactsWithMeetings = meetings => meetings > 0 ? 1 : 0;
    const contactsWithForms = forms => forms > 0 ? 1 : 0;
    
    // Calculate conversion rate
    const conversionRate = totalDeals > 0 ? Math.round((dealsWithAttribution / totalDeals) * 100) / 100 : 0;
    
    // Convert Maps to plain objects for response
    const channelStats: Record<string, number> = {};
    for (const [channel, count] of channels.entries()) {
      channelStats[channel] = count;
    }
    
    const touchpointTypeStats: Record<string, number> = {};
    for (const [type, count] of touchpointTypes.entries()) {
      touchpointTypeStats[type] = count;
    }
    
    return {
      success: true,
      baseResults: {
        total: contacts.length,
        processed,
        attributed,
        errors
      },
      detailedAnalytics: {
        contactStats: {
          totalContacts: contacts.length,
          contactsWithDeals: totalDeals,
          contactsWithMeetings: channels.get('calendly') || 0,
          contactsWithForms: channels.get('typeform') || 0,
          conversionRate
        },
        channelStats,
        touchpointStats: {
          totalTouchpoints,
          avgTouchpointsPerContact: contacts.length > 0 ? Math.round((totalTouchpoints / contacts.length) * 100) / 100 : 0,
          touchpointsByType: touchpointTypeStats
        },
        dealStats: {
          totalDeals,
          dealsWithAttribution,
          dealAttributionRate: totalDeals > 0 ? Math.round((dealsWithAttribution / totalDeals) * 100) / 100 : 0,
          totalDealValue,
          attributedDealValue
        },
        insights: {
          mostEffectiveChannel,
          mostCommonFirstTouch,
          mostCommonLastTouch,
          avgDaysToConversion
        }
      }
    };
  } catch (error) {
    console.error('Error in attributeAllContacts:', error);
    throw error;
  }
}

export default {
  attributeAllContacts
};