import { storage } from "../storage";
import { Contact } from "@shared/schema";

export interface CustomerJourney {
  contactId: number;
  contact: Contact;
  firstTouch: Date | null;
  lastTouch: Date | null;
  totalTouchpoints: number;
  timelineEvents: any[];
  sources: {[key: string]: number};
  assignedUsers: any[];
  deals: any[];
  callMetrics: {
    solutionCallsBooked: number;
    solutionCallsSits: number;
    solutionCallShowRate: number;
    triageCallsBooked: number;
    triageCallsSits: number;
    triageShowRate: number;
    totalDials: number;
    speedToLead: number | null;
    pickUpRate: number;
    callsToClose: number;
    totalCalls: number;
    callsPerStage: {[stage: string]: number};
    directBookingRate: number;
    cancelRate: number;
    outboundTriagesSet: number;
    leadResponseTime: number | null;
  };
  salesMetrics: {
    closedWon: number;
    costPerClosedWon: number | null;
    closerSlotUtilization: number | null;
    solutionCallCloseRate: number;
    salesCycleDays: number | null;
    profitPerSolutionCall: number | null;
    costPerSolutionCall: number | null;
    cashPerSolutionCallBooked: number | null;
    revenuePerSolutionCallBooked: number | null;
    costPerSolutionCallSit: number | null;
    earningPerCall2Sit: number | null;
    cashEfficiencyPC2: number | null;
    profitEfficiencyPC2: number | null;
  };
  adminMetrics: {
    completedAdmin: number;
    missingAdmins: number;
    adminMissingPercentage: number;
    adminAssignments: {
      userId: number;
      userName: string;
      count: number;
      completed: number;
      missing: number;
      missingPercentage: number;
    }[];
  };
  leadMetrics: {
    newLeads: number;
    leadsDisqualified: number;
    totalCallOneShowRate: number;
  };
  journeyMetrics: {
    averageResponseTime: number | null;
    engagementScore: number;
    lastActivityGap: number | null;
    stageTransitions: {
      fromStage: string;
      toStage: string;
      daysInStage: number;
      timestamp: Date;
    }[];
    conversionRate: number | null;
    leadStatus: string;
    journeyLength: number | null;
  };
}

export async function getCustomerJourney(contactId: number, dateRange?: string): Promise<CustomerJourney | null> {
  try {
    // Get the contact
    const contact = await storage.getContact(contactId);
    
    if (!contact) {
      return null;
    }
    
    // Get related data
    const activities = await storage.getActivitiesByContactId(contactId);
    let meetings = await storage.getMeetingsByContactId(contactId);
    const deals = await storage.getDealsByContactId(contactId);
    
    // If contact has an email, also look for meetings by email to ensure we catch all Calendly meetings
    if (contact.email) {
      // Get additional meetings that might be linked by email but not contactId
      const emailMeetings = await storage.getMeetingsByInviteeEmail(contact.email);
      
      // Create a Set of existing meeting IDs to avoid duplicates
      const existingMeetingIds = new Set(meetings.map(m => m.id));
      
      // Add only new meetings that aren't already included
      const additionalMeetings = emailMeetings.filter(meeting => !existingMeetingIds.has(meeting.id));
      
      if (additionalMeetings.length > 0) {
        console.log(`Found ${additionalMeetings.length} additional meetings for ${contact.email} using email matching`);
        
        // Update these meetings to link them to this contact for future queries
        for (const meeting of additionalMeetings) {
          await storage.updateMeeting(meeting.id, { contactId });
          console.log(`Linked meeting ${meeting.id} to contact ${contactId} (${contact.name})`);
        }
        
        // Add these to our meetings array
        meetings = [...meetings, ...additionalMeetings];
      }
    }
    
    // Create timeline events
    const timelineEvents = [
      ...activities.map(activity => ({
        id: activity.id,
        type: 'activity',
        subtype: activity.type,
        title: activity.title || 'Activity',
        description: activity.notes || '',
        timestamp: new Date(activity.date),
        source: 'Close CRM',
        sourceId: activity.sourceId,
        data: activity,
        userId: activity.userId,
        userName: activity.userName || 'Unknown',
        score: 5
      })),
      ...meetings.map(meeting => {
        // Extract scheduler's name from metadata if it exists
        let scheduledBy = 'Unknown';
        if (meeting.metadata) {
          try {
            const metadata = typeof meeting.metadata === 'string' 
              ? JSON.parse(meeting.metadata) 
              : meeting.metadata;
              
            if (metadata.attribution && metadata.attribution.scheduledBy) {
              scheduledBy = metadata.attribution.scheduledBy;
            }
          } catch (e) {
            console.error('Error parsing meeting metadata:', e);
          }
        }
        
        return {
          id: meeting.id,
          type: 'meeting',
          subtype: meeting.type,
          title: meeting.title || 'Meeting',
          description: meeting.description || '',
          timestamp: new Date(meeting.startTime),
          source: 'Calendly',
          sourceId: meeting.calendlyEventId,
          data: meeting,
          userId: meeting.id, // Use meeting ID as fallback
          userName: scheduledBy, // Use extracted name
          scheduledBy: scheduledBy, // Add explicit field
          score: 10
        };
      }),
      ...deals.map(deal => ({
        id: deal.id,
        type: 'deal',
        subtype: deal.stage,
        title: deal.name || 'Deal',
        description: `${deal.value ? '$' + deal.value : ''} - ${deal.status}`,
        timestamp: new Date(deal.createdAt),
        source: 'Close CRM',
        sourceId: deal.sourceId,
        data: deal,
        userId: deal.userId,
        userName: deal.userName || 'Unknown',
        score: 15
      }))
    ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Calculate sources
    const sources: {[key: string]: number} = {};
    timelineEvents.forEach(event => {
      if (!sources[event.source]) {
        sources[event.source] = 0;
      }
      sources[event.source]++;
    });
    
    // Get first and last touch
    const firstTouch = timelineEvents.length > 0 ? timelineEvents[0].timestamp : null;
    const lastTouch = timelineEvents.length > 0 ? timelineEvents[timelineEvents.length - 1].timestamp : null;
    
    // Calculate metrics
    const journeyLength = firstTouch && lastTouch ? 
      Math.round((lastTouch.getTime() - firstTouch.getTime()) / (1000 * 60 * 60 * 24)) : 
      null;
    
    const engagementScore = timelineEvents.reduce((sum, event) => sum + (event.score || 0), 0);
    
    // Create assigned users
    const userMap = new Map<number, {
      userId: number;
      name: string;
      email: string;
      role: string;
      assignmentType: string;
      totalInteractions: number;
    }>();
    
    // Add users from activities
    activities.forEach(activity => {
      if (activity.userId) {
        if (!userMap.has(activity.userId)) {
          userMap.set(activity.userId, {
            userId: activity.userId,
            name: activity.userName || 'Unknown',
            email: '',
            role: '',
            assignmentType: 'Activity Owner',
            totalInteractions: 0
          });
        }
        const user = userMap.get(activity.userId)!;
        user.totalInteractions++;
      }
    });
    
    // Add users from meetings
    meetings.forEach(meeting => {
      if (meeting.userId) {
        if (!userMap.has(meeting.userId)) {
          userMap.set(meeting.userId, {
            userId: meeting.userId,
            name: meeting.userName || 'Unknown',
            email: '',
            role: '',
            assignmentType: 'Meeting Owner',
            totalInteractions: 0
          });
        }
        const user = userMap.get(meeting.userId)!;
        user.totalInteractions++;
      }
    });
    
    // Add users from deals
    deals.forEach(deal => {
      if (deal.userId) {
        if (!userMap.has(deal.userId)) {
          userMap.set(deal.userId, {
            userId: deal.userId,
            name: deal.userName || 'Unknown',
            email: '',
            role: '',
            assignmentType: 'Deal Owner',
            totalInteractions: 0
          });
        }
        const user = userMap.get(deal.userId)!;
        user.totalInteractions++;
      }
    });
    
    // Build the customer journey object
    const customerJourney: CustomerJourney = {
      contactId,
      contact,
      firstTouch,
      lastTouch,
      totalTouchpoints: timelineEvents.length,
      timelineEvents,
      sources,
      assignedUsers: Array.from(userMap.values()),
      deals,
      callMetrics: {
        solutionCallsBooked: meetings.filter(m => m.type === 'solution_call').length,
        solutionCallsSits: meetings.filter(m => m.type === 'solution_call' && m.status === 'completed').length,
        solutionCallShowRate: calculatePercentage(
          meetings.filter(m => m.type === 'solution_call' && m.status === 'completed').length,
          meetings.filter(m => m.type === 'solution_call').length
        ),
        triageCallsBooked: meetings.filter(m => m.type === 'triage_call').length,
        triageCallsSits: meetings.filter(m => m.type === 'triage_call' && m.status === 'completed').length,
        triageShowRate: calculatePercentage(
          meetings.filter(m => m.type === 'triage_call' && m.status === 'completed').length,
          meetings.filter(m => m.type === 'triage_call').length
        ),
        totalDials: activities.filter(a => a.type === 'call').length,
        speedToLead: calculateSpeedToLead(activities, contact),
        pickUpRate: calculatePercentage(
          activities.filter(a => a.type === 'call' && a.status === 'completed').length,
          activities.filter(a => a.type === 'call').length
        ),
        callsToClose: calculateCallsToClose(activities, deals),
        totalCalls: activities.filter(a => a.type === 'call').length,
        callsPerStage: calculateCallsPerStage(activities, deals),
        directBookingRate: calculateDirectBookingRate(activities, meetings),
        cancelRate: calculatePercentage(
          meetings.filter(m => m.status === 'canceled').length,
          meetings.length
        ),
        outboundTriagesSet: activities.filter(a => a.type === 'call' && a.notes?.includes('triage')).length,
        leadResponseTime: calculateLeadResponseTime(activities, contact)
      },
      salesMetrics: {
        closedWon: deals.filter(d => d.status === 'won').length,
        costPerClosedWon: calculateCostPerClosedWon(deals),
        closerSlotUtilization: calculateCloserSlotUtilization(meetings),
        solutionCallCloseRate: calculatePercentage(
          deals.filter(d => d.status === 'won').length,
          meetings.filter(m => m.type === 'solution_call' && m.status === 'completed').length
        ),
        salesCycleDays: calculateSalesCycleDays(deals),
        profitPerSolutionCall: deals.filter(d => d.status === 'won')
          .reduce((sum, deal) => sum + (deal.profit || 0), 0) / 
          meetings.filter(m => m.type === 'solution_call' && m.status === 'completed').length || null,
        costPerSolutionCall: null,
        cashPerSolutionCallBooked: null,
        revenuePerSolutionCallBooked: null,
        costPerSolutionCallSit: null,
        earningPerCall2Sit: null,
        cashEfficiencyPC2: null,
        profitEfficiencyPC2: null
      },
      adminMetrics: {
        completedAdmin: activities.filter(a => a.type === 'admin' && a.status === 'completed').length,
        missingAdmins: activities.filter(a => a.type === 'admin' && a.status !== 'completed').length,
        adminMissingPercentage: calculatePercentage(
          activities.filter(a => a.type === 'admin' && a.status !== 'completed').length,
          activities.filter(a => a.type === 'admin').length
        ),
        adminAssignments: []
      },
      leadMetrics: {
        newLeads: 1, // This is the contact itself
        leadsDisqualified: contact.status === 'disqualified' ? 1 : 0,
        totalCallOneShowRate: calculatePercentage(
          meetings.filter(m => m.status === 'completed').length,
          meetings.length
        )
      },
      journeyMetrics: {
        averageResponseTime: calculateAverageResponseTime(activities),
        engagementScore,
        lastActivityGap: calculateLastActivityGap(timelineEvents),
        stageTransitions: [],
        conversionRate: calculateConversionRate(deals),
        leadStatus: contact.status || 'unknown',
        journeyLength
      }
    };
    
    return customerJourney;
  } catch (error) {
    console.error("Error getting customer journey:", error);
    return null;
  }
}

// Helper functions for calculations
function calculatePercentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function calculateSpeedToLead(activities: any[], contact: any): number | null {
  const firstActivity = activities.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )[0];
  
  if (!firstActivity || !contact.createdAt) return null;
  
  const leadCreatedDate = new Date(contact.createdAt);
  const firstActivityDate = new Date(firstActivity.date);
  
  return Math.round((firstActivityDate.getTime() - leadCreatedDate.getTime()) / (1000 * 60)); // minutes
}

function calculateCallsToClose(activities: any[], deals: any[]): number {
  const wonDeals = deals.filter(d => d.status === 'won');
  if (wonDeals.length === 0) return 0;
  
  const calls = activities.filter(a => a.type === 'call');
  return calls.length || 0;
}

function calculateCallsPerStage(activities: any[], deals: any[]): {[stage: string]: number} {
  const callsPerStage: {[stage: string]: number} = {};
  
  // Initialize stages from deals
  deals.forEach(deal => {
    if (deal.stage && !callsPerStage[deal.stage]) {
      callsPerStage[deal.stage] = 0;
    }
  });
  
  // Count calls per stage
  activities.forEach(activity => {
    if (activity.type === 'call' && activity.stage) {
      if (!callsPerStage[activity.stage]) {
        callsPerStage[activity.stage] = 0;
      }
      callsPerStage[activity.stage]++;
    }
  });
  
  return callsPerStage;
}

function calculateDirectBookingRate(activities: any[], meetings: any[]): number {
  const totalMeetings = meetings.length;
  if (totalMeetings === 0) return 0;
  
  // Estimate direct bookings (no prior call activity)
  let directBookings = 0;
  
  meetings.forEach(meeting => {
    const meetingDate = new Date(meeting.startTime);
    
    // Check if there was any call activity before this meeting
    const priorCalls = activities.filter(a => 
      a.type === 'call' && new Date(a.date) < meetingDate
    );
    
    if (priorCalls.length === 0) {
      directBookings++;
    }
  });
  
  return calculatePercentage(directBookings, totalMeetings);
}

function calculateLeadResponseTime(activities: any[], contact: any): number | null {
  if (!contact.createdAt) return null;
  
  const contactCreatedDate = new Date(contact.createdAt);
  
  // Find first response activity
  const firstResponseActivity = activities
    .filter(a => a.type === 'email' || a.type === 'call' || a.type === 'text')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  
  if (!firstResponseActivity) return null;
  
  const responseDate = new Date(firstResponseActivity.date);
  
  // Calculate minutes between lead creation and first response
  return Math.round((responseDate.getTime() - contactCreatedDate.getTime()) / (1000 * 60));
}

function calculateCostPerClosedWon(deals: any[]): number | null {
  const wonDeals = deals.filter(d => d.status === 'won');
  if (wonDeals.length === 0) return null;
  
  const totalCost = deals.reduce((sum, deal) => sum + (deal.cost || 0), 0);
  return Math.round(totalCost / wonDeals.length) || null;
}

function calculateCloserSlotUtilization(meetings: any[]): number | null {
  // This would require additional data about available slots
  // For now, return a placeholder
  return null;
}

function calculateSalesCycleDays(deals: any[]): number | null {
  const wonDeals = deals.filter(d => d.status === 'won');
  if (wonDeals.length === 0) return null;
  
  let totalDays = 0;
  let countedDeals = 0;
  
  wonDeals.forEach(deal => {
    if (deal.createdAt && deal.closedAt) {
      const createdDate = new Date(deal.createdAt);
      const closedDate = new Date(deal.closedAt);
      const days = Math.round((closedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (days >= 0) {
        totalDays += days;
        countedDeals++;
      }
    }
  });
  
  return countedDeals > 0 ? Math.round(totalDays / countedDeals) : null;
}

function calculateAverageResponseTime(activities: any[]): number | null {
  const responseTimes: number[] = [];
  
  // Group activities by day
  const activityGroups: {[date: string]: any[]} = {};
  
  activities.forEach(activity => {
    const date = new Date(activity.date);
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    
    if (!activityGroups[dateKey]) {
      activityGroups[dateKey] = [];
    }
    
    activityGroups[dateKey].push(activity);
  });
  
  // Calculate response times within each day
  Object.values(activityGroups).forEach(group => {
    // Sort activities by time
    const sortedActivities = group.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Calculate time between consecutive activities
    for (let i = 1; i < sortedActivities.length; i++) {
      const prevActivity = sortedActivities[i - 1];
      const currActivity = sortedActivities[i];
      
      if (prevActivity.type === 'email' || prevActivity.type === 'text') {
        const prevDate = new Date(prevActivity.date);
        const currDate = new Date(currActivity.date);
        
        const responseTimeMinutes = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60));
        
        if (responseTimeMinutes > 0 && responseTimeMinutes < 24 * 60) { // Exclude responses > 24 hours
          responseTimes.push(responseTimeMinutes);
        }
      }
    }
  });
  
  if (responseTimes.length === 0) return null;
  
  const totalResponseTime = responseTimes.reduce((sum, time) => sum + time, 0);
  return Math.round(totalResponseTime / responseTimes.length);
}

function calculateLastActivityGap(events: any[]): number | null {
  if (events.length === 0) return null;
  
  const lastEvent = events[events.length - 1];
  const lastEventDate = new Date(lastEvent.timestamp);
  const currentDate = new Date();
  
  return Math.round((currentDate.getTime() - lastEventDate.getTime()) / (1000 * 60 * 60 * 24)); // days
}

function calculateConversionRate(deals: any[]): number | null {
  const totalDeals = deals.length;
  if (totalDeals === 0) return null;
  
  const wonDeals = deals.filter(d => d.status === 'won');
  return calculatePercentage(wonDeals.length, totalDeals);
}