/**
 * Customer Journey API
 * 
 * This module provides comprehensive data about a customer's journey across all 
 * touchpoints and interactions within the system.
 */

import { storage } from '../storage';
import * as dateRangeFilter from '../services/date-range-filter';

// Types for customer journey data
export interface TimelineEvent {
  id: number;
  type: 'meeting' | 'activity' | 'deal' | 'form' | 'note';
  subtype?: string;
  title: string;
  description?: string;
  timestamp: Date;
  source: string;
  sourceId?: string;
  data: any;
  userId?: number;
  userName?: string;
  score?: number;
}

export interface CustomerJourney {
  contactId: number;
  contact: any;
  firstTouch: Date | null;
  lastTouch: Date | null;
  totalTouchpoints: number;
  timelineEvents: TimelineEvent[];
  sources: {[key: string]: number};
  assignedUsers: {
    userId: number;
    name: string;
    email: string;
    role: string;
    assignmentType: string;
    totalInteractions: number;
  }[];
  deals: any[];
  callMetrics: {
    // Call booking and attendance metrics
    solutionCallsBooked: number;
    solutionCallsSits: number;
    solutionCallShowRate: number;
    triageCallsBooked: number;
    triageCallsSits: number;
    triageShowRate: number;
    totalDials: number;
    speedToLead: number | null; // minutes from lead creation to first call
    pickUpRate: number;
    
    // Follow-up metrics
    callsToClose: number;
    totalCalls: number;
    callsPerStage: {[stage: string]: number};
    
    // Call outcomes
    directBookingRate: number;
    cancelRate: number;
    outboundTriagesSet: number;
    leadResponseTime: number | null; // minutes from lead creation to first response
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
    
    // Advanced metrics
    costPerSolutionCallSit: number | null; // CPC2S
    earningPerCall2Sit: number | null; // EPC2S
    cashEfficiencyPC2: number | null; // EPC2/NPPC2
    profitEfficiencyPC2: number | null; // EPC2/NPPC2
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
    totalCallOneShowRate: number; // (rebook included)
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

/**
 * Get complete customer journey data for a specific contact
 */
export async function getCustomerJourney(contactId: number, dateRange?: string): Promise<CustomerJourney> {
  // Get the contact data
  const contact = await storage.getContact(contactId);
  if (!contact) {
    throw new Error(`Contact with ID ${contactId} not found`);
  }
  
  // Setup date filter if provided
  let dateFilter = null;
  if (dateRange) {
    dateFilter = dateRangeFilter.parseDateRange(dateRange);
  }
  
  // Get all activities
  const activities = await storage.getActivitiesByContactId(contactId);
  
  // Get all meetings
  const meetings = await storage.getMeetingsByContactId(contactId);
  
  // Get all deals
  const deals = await storage.getDealsByContactId(contactId);
  
  // Get all forms
  const forms = await storage.getFormsByContactId(contactId);
  
  // Get user assignments
  const userAssignments = await storage.getContactUserAssignments(contactId);
  
  // Transform activities into timeline events
  const activityEvents: TimelineEvent[] = activities.map(activity => ({
    id: activity.id,
    type: 'activity',
    subtype: activity.type,
    title: activity.title,
    description: activity.description,
    timestamp: activity.date,
    source: activity.source,
    sourceId: activity.sourceId,
    data: {
      ...activity,
      metadata: activity.metadata || {}
    },
    userId: activity.taskAssignedTo ? parseInt(activity.taskAssignedTo, 10) : undefined,
    userName: typeof activity.metadata?.assignedUserName === 'string' ? activity.metadata.assignedUserName : undefined,
    score: calculateEventScore('activity', activity)
  }));
  
  // Transform meetings into timeline events
  const meetingEvents: TimelineEvent[] = meetings.map(meeting => ({
    id: meeting.id,
    type: 'meeting',
    subtype: meeting.type,
    title: meeting.title,
    description: null,
    timestamp: meeting.startTime,
    source: 'calendly',
    sourceId: meeting.calendlyEventId,
    data: {
      ...meeting,
      metadata: meeting.metadata || {}
    },
    userId: meeting.assignedTo ? parseInt(meeting.assignedTo, 10) : undefined,
    userName: meeting.assigneeEmail ? meeting.assigneeEmail.split('@')[0] : undefined,
    score: calculateEventScore('meeting', meeting)
  }));
  
  // Transform deals into timeline events
  const dealEvents: TimelineEvent[] = deals.map(deal => ({
    id: deal.id,
    type: 'deal',
    subtype: deal.status,
    title: deal.title,
    description: `${deal.value || 'No value'} - ${deal.status}`,
    timestamp: deal.createdAt,
    source: 'close',
    sourceId: deal.closeId,
    data: {
      ...deal,
      metadata: deal.metadata || {}
    },
    userId: deal.assignedTo ? parseInt(deal.assignedTo, 10) : undefined,
    userName: typeof deal.metadata?.assignedUserName === 'string' ? deal.metadata.assignedUserName : undefined,
    score: calculateEventScore('deal', deal)
  }));
  
  // Transform forms into timeline events
  const formEvents: TimelineEvent[] = forms.map(form => ({
    id: form.id,
    type: 'form',
    subtype: form.formCategory,
    title: form.formName,
    description: `Form Score: ${form.formScore || 'N/A'}`,
    timestamp: form.submittedAt,
    source: 'typeform',
    sourceId: form.typeformResponseId,
    data: {
      ...form,
      metadata: form.metadata || {}
    },
    userId: undefined,
    userName: undefined,
    score: calculateEventScore('form', form)
  }));
  
  // Combine all events and sort by timestamp
  let allEvents = [...activityEvents, ...meetingEvents, ...dealEvents, ...formEvents];
  
  // Apply date filter if needed
  if (dateFilter) {
    allEvents = allEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= dateFilter.start && eventDate <= dateFilter.end;
    });
  }
  
  // Sort events by timestamp (newest first)
  allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  // Calculate first and last touch timestamps
  const timestamps = allEvents.map(event => new Date(event.timestamp).getTime());
  const firstTouch = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
  const lastTouch = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;
  
  // Calculate source distribution
  const sources: {[key: string]: number} = {};
  allEvents.forEach(event => {
    sources[event.source] = (sources[event.source] || 0) + 1;
  });
  
  // Process assigned users data
  const assignedUsers = await getAssignedUsersWithInteractions(contactId, userAssignments, allEvents);
  
  // Calculate journey metrics
  const journeyMetrics = calculateJourneyMetrics(contact, allEvents, deals);
  
  // Calculate call metrics
  const callMetrics = calculateCallMetrics(contact, allEvents, activities);
  
  // Calculate sales metrics
  const salesMetrics = calculateSalesMetrics(contact, allEvents, deals);
  
  // Calculate admin metrics
  const adminMetrics = calculateAdminMetrics(contact, allEvents, activities);
  
  // Calculate lead metrics
  const leadMetrics = calculateLeadMetrics(contact, allEvents);
  
  return {
    contactId,
    contact,
    firstTouch,
    lastTouch,
    totalTouchpoints: allEvents.length,
    timelineEvents: allEvents,
    sources,
    assignedUsers,
    deals,
    callMetrics,
    salesMetrics,
    adminMetrics,
    leadMetrics,
    journeyMetrics
  };
}

/**
 * Calculate score for an event based on its type and data
 */
function calculateEventScore(eventType: string, eventData: any): number {
  switch (eventType) {
    case 'meeting':
      // Meetings are high-value touchpoints
      return eventData.status === 'canceled' ? 30 : 70;
      
    case 'activity':
      // Score activities based on type
      if (eventData.type === 'call') return 60;
      if (eventData.type === 'email') return 40;
      if (eventData.type === 'note') return 20;
      if (eventData.type === 'task') return 30;
      return 25;
      
    case 'deal':
      // Deals are very high-value
      if (eventData.status === 'won') return 100;
      if (eventData.status === 'lost') return 80;
      return 90;
      
    case 'form':
      // Forms score based on completion
      const completionRate = eventData.completionPercentage || 50;
      return Math.min(Math.round((completionRate / 100) * 50) + 10, 60);
      
    default:
      return 10;
  }
}

/**
 * Get detailed information about assigned users with their interaction counts
 */
async function getAssignedUsersWithInteractions(
  contactId: number, 
  assignments: any[], 
  events: TimelineEvent[]
): Promise<any[]> {
  // Get all Close users
  const allUsers = await storage.getAllCloseUsers();
  
  // Create a map of user IDs to users
  const userMap = new Map();
  allUsers.forEach(user => userMap.set(user.id, user));
  
  // Calculate interactions per user
  const userInteractions = new Map<number, number>();
  
  // Count events per user
  events.forEach(event => {
    if (event.userId) {
      const count = userInteractions.get(event.userId) || 0;
      userInteractions.set(event.userId, count + 1);
    }
  });
  
  // Format the result combining assignments and interaction counts
  return assignments.map(assignment => {
    const user = userMap.get(assignment.closeUserId);
    return {
      userId: assignment.closeUserId,
      name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown User',
      email: user ? user.email : 'unknown',
      role: user ? user.role : 'unknown',
      assignmentType: assignment.assignmentType,
      assignmentDate: assignment.assignmentDate,
      totalInteractions: userInteractions.get(assignment.closeUserId) || 0
    };
  });
}

/**
 * Calculate comprehensive journey metrics for this contact
 */
function calculateJourneyMetrics(contact: any, events: TimelineEvent[], deals: any[]): any {
  // Initialize with defaults
  const metrics = {
    averageResponseTime: null,
    engagementScore: 0,
    lastActivityGap: null,
    stageTransitions: [],
    conversionRate: null,
    leadStatus: contact.status || 'unknown',
    journeyLength: null
  };
  
  // Calculate engagement score based on event types, recency, and frequency
  let totalScore = 0;
  events.forEach(event => {
    totalScore += event.score || 0;
  });
  
  // Normalize score to 0-100 scale
  metrics.engagementScore = Math.min(Math.round(totalScore / Math.max(events.length, 1)), 100);
  
  // Calculate last activity gap (days since last interaction)
  if (events.length > 0) {
    const now = new Date();
    const lastEvent = new Date(events[0].timestamp);
    const daysDiff = Math.round((now.getTime() - lastEvent.getTime()) / (1000 * 60 * 60 * 24));
    metrics.lastActivityGap = daysDiff;
  }
  
  // Calculate journey length in days if we have first and last touch
  if (contact.firstTouchDate && contact.lastActivityDate) {
    const firstTouch = new Date(contact.firstTouchDate);
    const lastTouch = new Date(contact.lastActivityDate);
    metrics.journeyLength = Math.round((lastTouch.getTime() - firstTouch.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  // Calculate conversion rate if we have deals
  if (deals.length > 0 && events.length > 0) {
    const wonDeals = deals.filter(deal => deal.status === 'won').length;
    metrics.conversionRate = (wonDeals / deals.length) * 100;
  }
  
  return metrics;
}

/**
 * Calculate all call-related metrics
 */
function calculateCallMetrics(contact: any, events: TimelineEvent[], activities: any[]): any {
  // Filter call events (typically activities of type 'call')
  const callEvents = events.filter(event => 
    (event.type === 'activity' && event.subtype === 'call') || 
    (event.type === 'meeting' && event.subtype?.toLowerCase().includes('call'))
  );
  
  // Filter specific call types
  const solutionCalls = callEvents.filter(e => 
    e.title?.toLowerCase().includes('solution') || 
    e.data?.type?.toLowerCase().includes('solution') ||
    e.data?.metadata?.callType?.toLowerCase().includes('solution')
  );
  
  const triageCalls = callEvents.filter(e => 
    e.title?.toLowerCase().includes('triage') || 
    e.data?.type?.toLowerCase().includes('triage') ||
    e.data?.metadata?.callType?.toLowerCase().includes('triage')
  );
  
  // Count booked vs attended (sits) calls
  const solutionCallsBooked = solutionCalls.length;
  
  // For sits, we only count calls that were actually attended (not cancelled)
  const solutionCallsSits = solutionCalls.filter(e => 
    e.data?.status !== 'canceled' && 
    e.data?.status !== 'no_show' && 
    !e.data?.metadata?.noShow
  ).length;
  
  const triageCallsBooked = triageCalls.length;
  const triageCallsSits = triageCalls.filter(e => 
    e.data?.status !== 'canceled' && 
    e.data?.status !== 'no_show' && 
    !e.data?.metadata?.noShow
  ).length;
  
  // Calculate show rates
  const solutionCallShowRate = solutionCallsBooked > 0 
    ? (solutionCallsSits / solutionCallsBooked) * 100 
    : 0;
    
  const triageShowRate = triageCallsBooked > 0 
    ? (triageCallsSits / triageCallsBooked) * 100 
    : 0;
  
  // Count total dials (all call attempts)
  const totalDials = activities.filter(a => 
    a.type === 'call' || 
    a.type === 'outbound_call' || 
    a.type === 'inbound_call'
  ).length;
  
  // Calculate speed to lead (time from creation to first call)
  let speedToLead = null;
  if (callEvents.length > 0 && contact.createdAt) {
    // Sort calls chronologically (oldest first)
    const sortedCalls = [...callEvents].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    const firstCall = sortedCalls[0];
    const createDate = new Date(contact.createdAt);
    const firstCallDate = new Date(firstCall.timestamp);
    
    // Calculate minutes between creation and first call
    const diffMs = firstCallDate.getTime() - createDate.getTime();
    speedToLead = Math.round(diffMs / (1000 * 60)); // Convert to minutes
  }
  
  // Count successful calls vs attempts
  const answeredCalls = callEvents.filter(e => 
    e.data?.status === 'completed' || 
    e.data?.metadata?.answered === true ||
    e.data?.metadata?.callResult === 'answered'
  ).length;
  
  const pickUpRate = totalDials > 0 
    ? (answeredCalls / totalDials) * 100 
    : 0;
  
  // Count calls per sales stage
  const callsPerStage: {[stage: string]: number} = {};
  
  callEvents.forEach(event => {
    const stage = event.data?.dealStage || 
                 event.data?.metadata?.stage || 
                 'unknown';
                 
    callsPerStage[stage] = (callsPerStage[stage] || 0) + 1;
  });
  
  // Calculate calls to close
  const callsToClose = activities.filter(a => 
    (a.type === 'call' || a.type === 'meeting') && 
    a.metadata?.leadStatus === 'closed' || 
    a.metadata?.dealStage === 'closed'
  ).length;
  
  // Calculate outbound triages
  const outboundTriagesSet = activities.filter(a => 
    a.type === 'call' && 
    a.metadata?.direction === 'outbound' && 
    a.title?.toLowerCase().includes('triage')
  ).length;
  
  // Calculate lead response time
  let leadResponseTime = null;
  if (callEvents.length > 0 && contact.createdAt) {
    // Sort by timestamp (oldest first)
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Find first response
    const firstResponse = sortedEvents.find(e => 
      e.type === 'activity' || e.type === 'meeting'
    );
    
    if (firstResponse) {
      const createDate = new Date(contact.createdAt);
      const responseDate = new Date(firstResponse.timestamp);
      
      // Calculate minutes between creation and first response
      const diffMs = responseDate.getTime() - createDate.getTime();
      leadResponseTime = Math.round(diffMs / (1000 * 60)); // Convert to minutes
    }
  }
  
  // Calculate direct booking rate
  const directBookings = events.filter(e => 
    e.data?.metadata?.bookingType === 'direct' || 
    e.data?.metadata?.bookingSource === 'direct'
  ).length;
  
  const directBookingRate = solutionCallsBooked > 0 
    ? (directBookings / solutionCallsBooked) * 100 
    : 0;
  
  // Calculate cancel rate
  const canceledCalls = callEvents.filter(e => 
    e.data?.status === 'canceled' || 
    e.data?.metadata?.canceled === true
  ).length;
  
  const cancelRate = callEvents.length > 0 
    ? (canceledCalls / callEvents.length) * 100 
    : 0;
  
  return {
    // Call booking and attendance metrics
    solutionCallsBooked,
    solutionCallsSits,
    solutionCallShowRate,
    triageCallsBooked,
    triageCallsSits,
    triageShowRate,
    totalDials,
    speedToLead,
    pickUpRate,
    
    // Follow-up metrics
    callsToClose,
    totalCalls: callEvents.length,
    callsPerStage,
    
    // Call outcomes
    directBookingRate,
    cancelRate,
    outboundTriagesSet,
    leadResponseTime
  };
}

/**
 * Calculate all sales-related metrics
 */
function calculateSalesMetrics(contact: any, events: TimelineEvent[], deals: any[]): any {
  // Get won deals
  const wonDeals = deals.filter(deal => deal.status === 'won');
  const closedWon = wonDeals.length;
  
  // Calculate financial metrics if we have deals
  let costPerClosedWon = null;
  let solutionCallCloseRate = 0;
  let salesCycleDays = null;
  let profitPerSolutionCall = null;
  let costPerSolutionCall = null;
  let cashPerSolutionCallBooked = null;
  let revenuePerSolutionCallBooked = null;
  let costPerSolutionCallSit = null;
  let earningPerCall2Sit = null;
  let cashEfficiencyPC2 = null;
  let profitEfficiencyPC2 = null;
  let closerSlotUtilization = null;
  
  // Filter solution calls
  const solutionCalls = events.filter(event => 
    (event.type === 'activity' && event.subtype === 'call' && event.title?.toLowerCase().includes('solution')) ||
    (event.type === 'meeting' && event.title?.toLowerCase().includes('solution'))
  );
  
  const solutionCallsBooked = solutionCalls.length;
  
  const solutionCallsSits = solutionCalls.filter(e => 
    e.data?.status !== 'canceled' && 
    e.data?.status !== 'no_show' && 
    !e.data?.metadata?.noShow
  ).length;
  
  // Calculate financial metrics if we have won deals
  if (wonDeals.length > 0) {
    // Calculate revenue metrics
    const totalContractedValue = wonDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
    const totalCashCollected = wonDeals.reduce((sum, deal) => sum + (deal.cashCollected || 0), 0);
    const totalCost = wonDeals.reduce((sum, deal) => sum + (deal.cost || 0), 0);
    const totalProfit = totalCashCollected - totalCost;
    
    // Cost per closed won
    costPerClosedWon = totalCost / closedWon;
    
    // Sales cycle days (average time from lead to close)
    if (contact.createdAt) {
      const createDate = new Date(contact.createdAt);
      let totalDays = 0;
      
      wonDeals.forEach(deal => {
        const closeDate = new Date(deal.closedAt || deal.updatedAt);
        const daysToClose = Math.round((closeDate.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24));
        totalDays += daysToClose;
      });
      
      salesCycleDays = Math.round(totalDays / wonDeals.length);
    }
    
    // Solution call metrics
    if (solutionCallsBooked > 0) {
      // Close rate
      solutionCallCloseRate = (closedWon / solutionCallsBooked) * 100;
      
      // Per call metrics
      costPerSolutionCall = totalCost / solutionCallsBooked;
      profitPerSolutionCall = totalProfit / solutionCallsBooked;
      cashPerSolutionCallBooked = totalCashCollected / solutionCallsBooked;
      revenuePerSolutionCallBooked = totalContractedValue / solutionCallsBooked;
    }
    
    // Per sit metrics (if we have sits)
    if (solutionCallsSits > 0) {
      costPerSolutionCallSit = totalCost / solutionCallsSits;
      earningPerCall2Sit = totalContractedValue / solutionCallsSits;
      
      // Efficiency metrics
      if (costPerSolutionCallSit > 0) {
        cashEfficiencyPC2 = (earningPerCall2Sit / costPerSolutionCallSit) * 100;
        profitEfficiencyPC2 = ((earningPerCall2Sit - costPerSolutionCallSit) / costPerSolutionCallSit) * 100;
      }
    }
    
    // Calculate closer slot utilization
    // This is the percentage of available slots that have been utilized
    const closerSlots = contact.metadata?.closerSlots || 0;
    if (closerSlots > 0) {
      closerSlotUtilization = (solutionCallsSits / closerSlots) * 100;
    }
  }
  
  return {
    closedWon,
    costPerClosedWon,
    closerSlotUtilization,
    solutionCallCloseRate,
    salesCycleDays,
    profitPerSolutionCall,
    costPerSolutionCall,
    cashPerSolutionCallBooked,
    revenuePerSolutionCallBooked,
    
    // Advanced metrics
    costPerSolutionCallSit,
    earningPerCall2Sit,
    cashEfficiencyPC2,
    profitEfficiencyPC2
  };
}

/**
 * Calculate all admin-related metrics
 */
function calculateAdminMetrics(contact: any, events: TimelineEvent[], activities: any[]): any {
  // Filter admin activities
  const adminActivities = activities.filter(activity => 
    activity.type === 'admin' || 
    activity.metadata?.type === 'admin' ||
    activity.title?.toLowerCase().includes('admin')
  );
  
  // Count completed vs missing admin tasks
  const completedAdmin = adminActivities.filter(a => 
    a.status === 'completed' || 
    a.metadata?.status === 'completed'
  ).length;
  
  const missingAdmins = adminActivities.filter(a => 
    a.status !== 'completed' && 
    a.metadata?.status !== 'completed'
  ).length;
  
  // Calculate admin missing percentage
  const adminMissingPercentage = adminActivities.length > 0 
    ? (missingAdmins / adminActivities.length) * 100 
    : 0;
  
  // Group admin tasks by assigned user
  const adminByUser = new Map<number, {
    userId: number;
    userName: string;
    count: number;
    completed: number;
    missing: number;
  }>();
  
  adminActivities.forEach(activity => {
    if (activity.taskAssignedTo) {
      const userId = parseInt(activity.taskAssignedTo, 10);
      const userName = typeof activity.metadata?.assignedUserName === 'string' 
        ? activity.metadata.assignedUserName 
        : `User ${userId}`;
      
      if (!adminByUser.has(userId)) {
        adminByUser.set(userId, {
          userId,
          userName,
          count: 0,
          completed: 0,
          missing: 0
        });
      }
      
      const userData = adminByUser.get(userId)!;
      userData.count++;
      
      if (activity.status === 'completed' || activity.metadata?.status === 'completed') {
        userData.completed++;
      } else {
        userData.missing++;
      }
    }
  });
  
  // Convert user data to array and calculate percentages
  const adminAssignments = Array.from(adminByUser.values()).map(userData => ({
    ...userData,
    missingPercentage: userData.count > 0 
      ? (userData.missing / userData.count) * 100 
      : 0
  }));
  
  return {
    completedAdmin,
    missingAdmins,
    adminMissingPercentage,
    adminAssignments
  };
}

/**
 * Calculate all lead-related metrics
 */
function calculateLeadMetrics(contact: any, events: TimelineEvent[]): any {
  // Count new leads (typically would be 1 for a single contact, but could track history)
  const newLeads = contact.status === 'lead' ? 1 : 0;
  
  // Count disqualified leads
  const leadsDisqualified = contact.status === 'disqualified' ? 1 : 0;
  
  // Calculate call 1 show rate (including rebooks)
  const firstCalls = events.filter(e => 
    (e.type === 'activity' && e.subtype === 'call' && e.data?.metadata?.callNumber === 1) ||
    (e.type === 'meeting' && e.data?.metadata?.callNumber === 1)
  );
  
  const firstCallsShown = firstCalls.filter(e => 
    e.data?.status !== 'canceled' && 
    e.data?.status !== 'no_show' && 
    !e.data?.metadata?.noShow
  ).length;
  
  const totalCallOneShowRate = firstCalls.length > 0 
    ? (firstCallsShown / firstCalls.length) * 100 
    : 0;
  
  return {
    newLeads,
    leadsDisqualified,
    totalCallOneShowRate
  };
}

/**
 * Get a list of similar contacts based on journey patterns
 */
export async function getSimilarContacts(contactId: number, limit: number = 5): Promise<any[]> {
  const contact = await storage.getContact(contactId);
  if (!contact) {
    throw new Error(`Contact with ID ${contactId} not found`);
  }
  
  // Get all contacts
  const allContacts = await storage.getAllContacts();
  
  // Exclude the current contact
  const otherContacts = allContacts.filter(c => c.id !== contactId);
  
  // Score each contact for similarity
  const scoredContacts = await Promise.all(
    otherContacts.map(async (otherContact) => {
      const similarityScore = await calculateContactSimilarity(contact, otherContact);
      return {
        ...otherContact,
        similarityScore
      };
    })
  );
  
  // Sort by similarity score (highest first) and take top matches
  return scoredContacts
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
}

/**
 * Calculate similarity score between two contacts (0-100)
 */
async function calculateContactSimilarity(contact1: any, contact2: any): Promise<number> {
  let score = 0;
  
  // Compare company (max 20 points)
  if (contact1.company && contact2.company && 
      contact1.company.toLowerCase() === contact2.company.toLowerCase()) {
    score += 20;
  }
  
  // Compare lead source (max 15 points)
  if (contact1.leadSource && contact2.leadSource) {
    const sources1 = contact1.leadSource.split(',').map((s: string) => s.trim());
    const sources2 = contact2.leadSource.split(',').map((s: string) => s.trim());
    
    const commonSources = sources1.filter((s: string) => sources2.includes(s));
    score += Math.min(commonSources.length * 5, 15);
  }
  
  // Compare status (max 10 points)
  if (contact1.status && contact2.status && 
      contact1.status === contact2.status) {
    score += 10;
  }
  
  // Compare titles (max 15 points)
  if (contact1.title && contact2.title) {
    // Basic keyword matching on titles
    const title1Words = contact1.title.toLowerCase().split(/\s+/);
    const title2Words = contact2.title.toLowerCase().split(/\s+/);
    
    const commonWords = title1Words.filter(word => 
      title2Words.includes(word) && word.length > 3); // Only count meaningful words
    
    score += Math.min(commonWords.length * 5, 15);
  }
  
  // Get activities for both contacts
  const activities1 = await storage.getActivitiesByContactId(contact1.id);
  const activities2 = await storage.getActivitiesByContactId(contact2.id);
  
  // Compare activity patterns (max 20 points)
  if (activities1.length > 0 && activities2.length > 0) {
    // Compare activity types
    const types1 = activities1.map(a => a.type);
    const types2 = activities2.map(a => a.type);
    
    // Count common activity types
    const uniqueTypes1 = [...new Set(types1)];
    const uniqueTypes2 = [...new Set(types2)];
    const commonTypes = uniqueTypes1.filter(t => uniqueTypes2.includes(t));
    
    score += Math.min(commonTypes.length * 5, 20);
  }
  
  // Get deals for both contacts
  const deals1 = await storage.getDealsByContactId(contact1.id);
  const deals2 = await storage.getDealsByContactId(contact2.id);
  
  // Compare deal patterns (max 20 points)
  if (deals1.length > 0 && deals2.length > 0) {
    // Compare deal statuses
    const statuses1 = deals1.map(d => d.status);
    const statuses2 = deals2.map(d => d.status);
    
    const uniqueStatuses1 = [...new Set(statuses1)];
    const uniqueStatuses2 = [...new Set(statuses2)];
    const commonStatuses = uniqueStatuses1.filter(s => uniqueStatuses2.includes(s));
    
    score += Math.min(commonStatuses.length * 10, 20);
  }
  
  return score;
}

/**
 * Get aggregate journey analytics for contact segments
 */
export async function getJourneyAnalytics(
  segment?: string, 
  dateRange?: string, 
  limit?: number
): Promise<any> {
  // Get filtered contacts based on segment
  let contacts = await storage.getAllContacts();
  
  // Apply segmentation if needed
  if (segment) {
    switch(segment) {
      case 'customers':
        contacts = contacts.filter(c => c.status === 'customer');
        break;
      case 'leads':
        contacts = contacts.filter(c => c.status === 'lead');
        break;
      case 'multi-source':
        contacts = contacts.filter(c => {
          const sources = c.leadSource ? c.leadSource.split(',') : [];
          return sources.length > 1;
        });
        break;
      // Additional segments can be added
    }
  }
  
  // Apply limit if provided
  if (limit && limit > 0) {
    contacts = contacts.slice(0, limit);
  }
  
  // Setup date filter if provided
  let dateFilter = null;
  if (dateRange) {
    dateFilter = dateRangeFilter.parseDateRange(dateRange);
  }
  
  // Calculate journey analytics
  const analytics = {
    totalContacts: contacts.length,
    totalActivities: 0,
    totalMeetings: 0,
    totalDeals: 0,
    averageJourneyLength: 0,
    conversionRates: {
      leadToCustomer: 0,
      meetingToOpportunity: 0,
      opportunityToWon: 0
    },
    channelEffectiveness: {},
    topPerformingSegments: [],
    commonJourneyPatterns: []
  };
  
  // Process each contact to build up analytics
  const journeyLengths: number[] = [];
  
  for (const contact of contacts) {
    // Get complete journey for this contact
    const journey = await getCustomerJourney(contact.id, dateRange);
    
    // Update totals
    analytics.totalActivities += journey.timelineEvents.filter(e => e.type === 'activity').length;
    analytics.totalMeetings += journey.timelineEvents.filter(e => e.type === 'meeting').length;
    analytics.totalDeals += journey.deals.length;
    
    // Update journey length if available
    if (journey.journeyMetrics.journeyLength) {
      journeyLengths.push(journey.journeyMetrics.journeyLength);
    }
    
    // Update channel effectiveness
    Object.keys(journey.sources).forEach(source => {
      if (!analytics.channelEffectiveness[source]) {
        analytics.channelEffectiveness[source] = {
          totalInteractions: 0,
          totalContacts: 0,
          conversionRate: 0
        };
      }
      
      analytics.channelEffectiveness[source].totalInteractions += journey.sources[source];
      analytics.channelEffectiveness[source].totalContacts += 1;
    });
  }
  
  // Calculate averages
  if (journeyLengths.length > 0) {
    analytics.averageJourneyLength = journeyLengths.reduce((a, b) => a + b, 0) / journeyLengths.length;
  }
  
  // Calculate conversion rates if we have journey data
  // This would require more in-depth analysis of the journeys
  
  // Calculate channel effectiveness scores
  Object.keys(analytics.channelEffectiveness).forEach(channel => {
    const channelData = analytics.channelEffectiveness[channel];
    
    // Simple conversion rate as: deals won / contacts with this channel
    const wonDeals = contacts.filter(c => {
      const sources = c.leadSource ? c.leadSource.split(',') : [];
      return sources.includes(channel) && c.status === 'customer';
    }).length;
    
    channelData.conversionRate = channelData.totalContacts > 0 
      ? (wonDeals / channelData.totalContacts) * 100 
      : 0;
  });
  
  return analytics;
}