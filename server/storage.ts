import { db } from "./db";
import { and, eq, desc, or, isNotNull, sql, exists, gte, lte, like } from "drizzle-orm";
import { 
  users, 
  contacts, 
  activities, 
  deals, 
  meetings, 
  forms, 
  metrics, 
  closeUsers,
  contactToUserAssignments,
  dealToUserAssignments,
  type User,
  type InsertUser,
  type Contact,
  type InsertContact,
  type Activity,
  type InsertActivity,
  type Deal,
  type InsertDeal,
  type Meeting,
  type InsertMeeting,
  type Form,
  type InsertForm,
  type Metrics,
  type InsertMetrics,
  type CloseUser,
  type InsertCloseUser,
  type ContactUserAssignment,
  type InsertContactUserAssignment,
  type DealUserAssignment,
  type InsertDealUserAssignment
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Contact operations
  getContact(id: number): Promise<Contact | undefined>;
  getContactByEmail(email: string): Promise<Contact | undefined>;
  getContactByExternalId(source: string, externalId: string): Promise<Contact | undefined>;
  getContactSample(limit: number): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact | undefined>;
  getContacts(limit?: number, offset?: number): Promise<Contact[]>;
  getAllContacts(): Promise<Contact[]>;

  // Deal operations with additions
  updateDeal(id: number, deal: Partial<InsertDeal>): Promise<Deal | undefined>;
  getDealsByStatus(status: string): Promise<Deal[]>;
  
  // Meeting operations with additions
  getAllMeetings(): Promise<Meeting[]>;
  updateMeeting(id: number, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined>;

  // Generic SQL query for reporting and verification
  query(sqlQuery: string, params?: any[]): Promise<any[]>;
  searchContacts(query: string, limit?: number, offset?: number): Promise<Contact[]>;
  getContactsCount(): Promise<number>;

  // Activity operations
  getActivity(id: number): Promise<Activity | undefined>;
  getActivityBySourceId(source: string, sourceId: string): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: number, activity: Partial<InsertActivity>): Promise<Activity | undefined>;
  getActivitiesByContactId(contactId: number): Promise<Activity[]>;
  getActivitiesCount(): Promise<number>;
  getSampleActivities(limit: number): Promise<Activity[]>;

  // Deal operations
  getDeal(id: number): Promise<Deal | undefined>;
  getDealBySourceId(source: string, sourceId: string): Promise<Deal | undefined>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  getDealsByContactId(contactId: number): Promise<Deal[]>;
  getDealsCount(): Promise<number>;

  // Meeting operations
  getMeeting(id: number): Promise<Meeting | undefined>;
  getMeetingByCalendlyEventId(eventId: string): Promise<Meeting | undefined>;
  getMeetingsByInviteeEmail(email: string): Promise<Meeting[]>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  getMeetingsByContactId(contactId: number): Promise<Meeting[]>;
  getMeetingsCount(): Promise<number>;
  getSampleMeetings(limit: number): Promise<Meeting[]>;

  // Form operations
  getForm(id: number): Promise<Form | undefined>;
  createForm(form: InsertForm): Promise<Form>;
  getFormsByContactId(contactId: number): Promise<Form[]>;
  getFormsCount(): Promise<number>;
  getSampleForms(limit: number): Promise<Form[]>;

  // Close User operations
  getCloseUser(id: number): Promise<CloseUser | undefined>;
  getCloseUserByCloseId(closeId: string): Promise<CloseUser | undefined>;
  getCloseUserByEmail(email: string): Promise<CloseUser | undefined>;
  createCloseUser(user: InsertCloseUser): Promise<CloseUser>;
  getCloseUsers(limit?: number, offset?: number): Promise<CloseUser[]>;
  getCloseUsersCount(): Promise<number>;

  // Contact-to-user assignments
  createContactUserAssignment(assignment: InsertContactUserAssignment): Promise<ContactUserAssignment>;
  getContactUserAssignments(contactId: number): Promise<ContactUserAssignment[]>;
  getContactsByCloseUserId(closeUserId: number): Promise<Contact[]>;

  // Deal-to-user assignments
  createDealUserAssignment(assignment: InsertDealUserAssignment): Promise<DealUserAssignment>;
  getDealUserAssignments(dealId: number): Promise<DealUserAssignment[]>;
  getDealsByCloseUserId(closeUserId: number): Promise<Deal[]>;

  // KPI Metrics operations
  createMetrics(metrics: InsertMetrics): Promise<Metrics>;
  updateMetrics(id: number, metrics: Partial<InsertMetrics>): Promise<Metrics | undefined>;
  getMetrics(id: number): Promise<Metrics | undefined>;
  getMetricsByDate(date: string, userId?: string): Promise<Metrics | undefined>;
  getDashboardData(date: Date | { startDate: Date, endDate: Date }, userId?: string, role?: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async query(sqlQuery: string, params?: any[]): Promise<any[]> {
    try {
      const result = await db.execute(sql.raw(sqlQuery, params || []));
      return result;
    } catch (error) {
      console.error("Database query error:", error);
      return [];
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getContact(id: number): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact || undefined;
  }

  async getContactByEmail(email: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.email, email));
    return contact || undefined;
  }

  async getContactByExternalId(source: string, externalId: string): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.leadSource, source),
          eq(contacts.sourceId, externalId)
        )
      );
    return contact || undefined;
  }

  async getContactSample(limit: number): Promise<Contact[]> {
    return await db.select().from(contacts).limit(limit);
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db
      .insert(contacts)
      .values(contact)
      .returning();
    return newContact;
  }

  async updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact | undefined> {
    const [updatedContact] = await db
      .update(contacts)
      .set(contact)
      .where(eq(contacts.id, id))
      .returning();
    return updatedContact || undefined;
  }

  async getContacts(limit: number = 100, offset: number = 0): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .limit(limit)
      .offset(offset);
  }

  async searchContacts(query: string, limit: number = 100, offset: number = 0): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(
        or(
          like(contacts.name, `%${query}%`),
          like(contacts.email, `%${query}%`),
          like(contacts.company, `%${query}%`)
        )
      )
      .limit(limit)
      .offset(offset);
  }

  async getContactsCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contacts);
    return result?.count || 0;
  }

  async getAllContacts(): Promise<Contact[]> {
    return await db.select().from(contacts);
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity || undefined;
  }

  async getActivityBySourceId(source: string, sourceId: string): Promise<Activity | undefined> {
    const [activity] = await db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.source, source),
          eq(activities.sourceId, sourceId)
        )
      );
    return activity || undefined;
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db
      .insert(activities)
      .values(activity)
      .returning();
    return newActivity;
  }

  async updateActivity(id: number, activity: Partial<InsertActivity>): Promise<Activity | undefined> {
    const [updatedActivity] = await db
      .update(activities)
      .set(activity)
      .where(eq(activities.id, id))
      .returning();
    return updatedActivity || undefined;
  }

  async getActivitiesByContactId(contactId: number): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(eq(activities.contactId, contactId))
      .orderBy(desc(activities.date));
  }

  async getActivitiesCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(activities);
    return result?.count || 0;
  }

  async getSampleActivities(limit: number): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .limit(limit);
  }

  async getDeal(id: number): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal || undefined;
  }

  async getDealBySourceId(source: string, sourceId: string): Promise<Deal | undefined> {
    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.closeId, sourceId));
    return deal || undefined;
  }

  async createDeal(deal: InsertDeal): Promise<Deal> {
    const [newDeal] = await db
      .insert(deals)
      .values(deal)
      .returning();
    return newDeal;
  }

  async updateDeal(id: number, deal: Partial<InsertDeal>): Promise<Deal | undefined> {
    const [updatedDeal] = await db
      .update(deals)
      .set(deal)
      .where(eq(deals.id, id))
      .returning();
    return updatedDeal || undefined;
  }

  async getDealsByContactId(contactId: number): Promise<Deal[]> {
    return await db
      .select()
      .from(deals)
      .where(eq(deals.contactId, contactId));
  }

  async getDealsCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(deals);
    return result?.count || 0;
  }

  async getDealsByStatus(status: string): Promise<Deal[]> {
    return await db
      .select()
      .from(deals)
      .where(eq(deals.status, status));
  }

  async getMeeting(id: number): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting || undefined;
  }

  async getMeetingByCalendlyEventId(eventId: string): Promise<Meeting | undefined> {
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.calendlyEventId, eventId));
    return meeting || undefined;
  }

  async getMeetingsByInviteeEmail(email: string): Promise<Meeting[]> {
    return await db
      .select()
      .from(meetings)
      .where(eq(meetings.inviteeEmail, email));
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const [newMeeting] = await db
      .insert(meetings)
      .values(meeting)
      .returning();
    return newMeeting;
  }

  async updateMeeting(id: number, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    const [updatedMeeting] = await db
      .update(meetings)
      .set(meeting)
      .where(eq(meetings.id, id))
      .returning();
    return updatedMeeting || undefined;
  }

  async getMeetingsByContactId(contactId: number): Promise<Meeting[]> {
    return await db
      .select()
      .from(meetings)
      .where(eq(meetings.contactId, contactId))
      .orderBy(desc(meetings.startTime));
  }

  async getMeetingsCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(meetings);
    return result?.count || 0;
  }

  async getAllMeetings(): Promise<Meeting[]> {
    return await db.select().from(meetings);
  }

  async getSampleMeetings(limit: number): Promise<Meeting[]> {
    return await db
      .select()
      .from(meetings)
      .limit(limit);
  }

  async getForm(id: number): Promise<Form | undefined> {
    const [form] = await db.select().from(forms).where(eq(forms.id, id));
    return form || undefined;
  }

  async createForm(form: InsertForm): Promise<Form> {
    const [newForm] = await db
      .insert(forms)
      .values(form)
      .returning();
    return newForm;
  }

  async getFormsByContactId(contactId: number): Promise<Form[]> {
    return await db
      .select()
      .from(forms)
      .where(eq(forms.contactId, contactId));
  }

  async getFormsCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(forms);
    return result?.count || 0;
  }

  async getSampleForms(limit: number): Promise<Form[]> {
    return await db
      .select()
      .from(forms)
      .limit(limit);
  }

  async getCloseUser(id: number): Promise<CloseUser | undefined> {
    const [user] = await db.select().from(closeUsers).where(eq(closeUsers.id, id));
    return user || undefined;
  }

  async getCloseUserByCloseId(closeId: string): Promise<CloseUser | undefined> {
    const [user] = await db.select().from(closeUsers).where(eq(closeUsers.closeId, closeId));
    return user || undefined;
  }

  async getCloseUserByEmail(email: string): Promise<CloseUser | undefined> {
    const [user] = await db.select().from(closeUsers).where(eq(closeUsers.email, email));
    return user || undefined;
  }

  async createCloseUser(user: InsertCloseUser): Promise<CloseUser> {
    const [newUser] = await db
      .insert(closeUsers)
      .values(user)
      .returning();
    return newUser;
  }

  async getCloseUsers(limit: number = 100, offset: number = 0): Promise<CloseUser[]> {
    return await db
      .select()
      .from(closeUsers)
      .limit(limit)
      .offset(offset);
  }

  async getCloseUsersCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(closeUsers);
    return result?.count || 0;
  }

  async createContactUserAssignment(assignment: InsertContactUserAssignment): Promise<ContactUserAssignment> {
    const [newAssignment] = await db
      .insert(contactToUserAssignments)
      .values(assignment)
      .returning();
    return newAssignment;
  }

  async getContactUserAssignments(contactId: number): Promise<ContactUserAssignment[]> {
    return await db
      .select()
      .from(contactToUserAssignments)
      .where(eq(contactToUserAssignments.contactId, contactId));
  }

  async getContactsByCloseUserId(closeUserId: number): Promise<Contact[]> {
    const assignments = await db
      .select()
      .from(contactToUserAssignments)
      .where(eq(contactToUserAssignments.closeUserId, closeUserId));
    
    if (assignments.length === 0) return [];
    
    const contactIds = assignments.map(a => a.contactId);
    
    return await db
      .select()
      .from(contacts)
      .where(sql`${contacts.id} IN (${contactIds.join(',')})`);
  }

  async createDealUserAssignment(assignment: InsertDealUserAssignment): Promise<DealUserAssignment> {
    const [newAssignment] = await db
      .insert(dealToUserAssignments)
      .values(assignment)
      .returning();
    return newAssignment;
  }

  async getDealUserAssignments(dealId: number): Promise<DealUserAssignment[]> {
    return await db
      .select()
      .from(dealToUserAssignments)
      .where(eq(dealToUserAssignments.dealId, dealId));
  }

  async getDealsByCloseUserId(closeUserId: number): Promise<Deal[]> {
    const assignments = await db
      .select()
      .from(dealToUserAssignments)
      .where(eq(dealToUserAssignments.closeUserId, closeUserId));
    
    if (assignments.length === 0) return [];
    
    const dealIds = assignments.map(a => a.dealId);
    
    return await db
      .select()
      .from(deals)
      .where(sql`${deals.id} IN (${dealIds.join(',')})`);
  }

  async createMetrics(metricsData: InsertMetrics): Promise<Metrics> {
    const [newMetrics] = await db
      .insert(metrics)
      .values(metricsData)
      .returning();
    return newMetrics;
  }

  async getMetrics(id: number): Promise<Metrics | undefined> {
    const [metricsData] = await db.select().from(metrics).where(eq(metrics.id, id));
    return metricsData || undefined;
  }

  async updateMetrics(id: number, metricsData: Partial<InsertMetrics>): Promise<Metrics | undefined> {
    const [updatedMetrics] = await db
      .update(metrics)
      .set(metricsData)
      .where(eq(metrics.id, id))
      .returning();
    return updatedMetrics || undefined;
  }

  async getMetricsByDate(date: string, userId?: string): Promise<Metrics | undefined> {
    const query = userId 
      ? and(eq(metrics.date, date), eq(metrics.userId, userId))
      : eq(metrics.date, date);
    
    const [metricsData] = await db
      .select()
      .from(metrics)
      .where(query);
    
    return metricsData || undefined;
  }

  async getDashboardData(date: Date | { startDate: Date, endDate: Date }, userId?: string, role?: string): Promise<any> {
    console.time('getDashboardData');
    try {
      // Set date range
      let startDate: Date, endDate: Date;
      if ('startDate' in date && 'endDate' in date) {
        startDate = date.startDate;
        endDate = date.endDate;
      } else {
        startDate = date;
        endDate = date;
      }

      // Format dates for SQL with better SQL compatibility
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log(`Dashboard data for date range: ${startDateStr} to ${endDateStr}`);

      // Use SQL literals for date filtering to avoid type issues
      const contactsDateFilter = sql`${contacts.createdAt} >= ${startDateStr} AND ${contacts.createdAt} <= ${endDateStr + 'T23:59:59.999Z'}`;

      // Important: For deals, use closeDate for better financial reporting accuracy
      const dealsDateFilter = sql`${deals.closeDate} >= ${startDateStr} AND ${deals.closeDate} <= ${endDateStr + 'T23:59:59.999Z'}`;

      // For meetings, use startTime for scheduling metrics
      const meetingsDateFilter = sql`${meetings.startTime} >= ${startDateStr} AND ${meetings.startTime} <= ${endDateStr + 'T23:59:59.999Z'}`;

      // For activities, use the date field
      const activitiesDateFilter = sql`${activities.date} >= ${startDateStr} AND ${activities.date} <= ${endDateStr + 'T23:59:59.999Z'}`;

      // Get contacts count
      const [contactsCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(contacts)
        .where(contactsDateFilter);
      
      const totalContacts = contactsCountResult?.count || 0;

      // Get deals count
      const [dealsCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(deals)
        .where(dealsDateFilter);
      
      const totalDeals = dealsCountResult?.count || 0;

      // Get contacts with deals - apply date filter for more accurate metrics
      const [contactsWithDealsResult] = await db
        .select({ count: sql<number>`count(DISTINCT ${contacts.id})` })
        .from(contacts)
        .where(
          and(
            contactsDateFilter,
            exists(
              db.select()
                .from(deals)
                .where(eq(deals.contactId, contacts.id))
            )
          )
        );
      
      const contactsWithDeals = contactsWithDealsResult?.count || 0;

      // Get contacts with meetings - apply date filter for more accurate metrics
      const [contactsWithMeetingsResult] = await db
        .select({ count: sql<number>`count(DISTINCT ${contacts.id})` })
        .from(contacts)
        .where(
          and(
            contactsDateFilter,
            exists(
              db.select()
                .from(meetings)
                .where(eq(meetings.contactId, contacts.id))
            )
          )
        );
      
      const contactsWithMeetings = contactsWithMeetingsResult?.count || 0;

      // Get multi-source contacts with date filter
      const [multiSourceContactsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(contacts)
        .where(
          and(
            contactsDateFilter,
            gte(contacts.sourcesCount, 2)
          )
        );
      
      const multiSourceContacts = multiSourceContactsResult?.count || 0;

      // Get activities count
      const [activitiesCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(activities)
        .where(activitiesDateFilter);
      
      const totalActivities = activitiesCountResult?.count || 0;

      // Get meetings count
      const [meetingsCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(meetings)
        .where(meetingsDateFilter);
      
      const totalMeetings = meetingsCountResult?.count || 0;

      // Calculate conversion rates and ratios
      const conversionRate = totalContacts > 0 ? (contactsWithDeals / totalContacts) * 100 : 0;
      const multiSourceRate = totalContacts > 0 ? (multiSourceContacts / totalContacts) * 100 : 0;

      // Get revenue metrics with optimized SQL
      const revenueResult = await db
        .select({
          totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${deals.value} ~ '^[0-9]+(\.[0-9]+)?$' THEN ${deals.value}::numeric ELSE 0 END), 0)`,
          totalCashCollected: sql<string>`COALESCE(SUM(CASE WHEN ${deals.cashCollected} ~ '^[0-9]+(\.[0-9]+)?$' THEN ${deals.cashCollected}::numeric ELSE 0 END), 0)`,
          wonDealsCount: sql<number>`COUNT(*)`
        })
        .from(deals)
        .where(and(
          dealsDateFilter,
          eq(deals.status, 'won')
        ));
      
      // Extract revenue values with safe parsing
      let totalRevenue = 0;
      let totalCashCollected = 0;
      let wonDealsCount = 0;
      
      try {
        totalRevenue = parseFloat(revenueResult[0]?.totalRevenue || '0');
        if (isNaN(totalRevenue)) totalRevenue = 0;
        
        totalCashCollected = parseFloat(revenueResult[0]?.totalCashCollected || '0');
        if (isNaN(totalCashCollected)) totalCashCollected = 0;
        
        wonDealsCount = revenueResult[0]?.wonDealsCount || 0;
        
        console.log(`Revenue metrics: Revenue=${totalRevenue}, Cash Collected=${totalCashCollected}, Won Deals=${wonDealsCount}`);
      } catch (e) {
        console.error('Error parsing revenue values', e);
      }

      // Calculate cash collected rate
      const cashCollectedRate = totalRevenue > 0 ? (totalCashCollected / totalRevenue) * 100 : 0;

      // Get sales team performance data
      let salesTeam = [];
      
      try {
        const users = await db.select().from(closeUsers);
        
        for (const user of users) {
          // Get user's deals
          const userDeals = await this.getDealsByCloseUserId(user.id);
          const userWonDeals = userDeals.filter(d => d.status === 'won');
          
          // Get user's meetings
          const userContactIds = (await this.getContactsByCloseUserId(user.id)).map(c => c.id);
          let userMeetings: Meeting[] = [];
          
          for (const contactId of userContactIds) {
            const meetings = await this.getMeetingsByContactId(contactId);
            userMeetings = [...userMeetings, ...meetings];
          }
          
          // Get activities
          let userActivities: Activity[] = [];
          for (const contactId of userContactIds) {
            const activities = await this.getActivitiesByContactId(contactId);
            userActivities = [...userActivities, ...activities];
          }
          
          // Calculate performance metrics
          const totalUserDeals = userDeals.length;
          const totalUserWonDeals = userWonDeals.length;
          const totalUserMeetings = userMeetings.length;
          const totalUserActivities = userActivities.length;
          const totalUserCalls = userActivities.filter(a => a.type === 'call').length;
          
          // Calculate closing rate
          const closingRate = totalUserDeals > 0 ? (totalUserWonDeals / totalUserDeals) * 100 : 0;
          
          // Calculate revenue and cash collected
          let userRevenue = 0;
          let userCashCollected = 0;
          let userContractedValue = 0;
          
          for (const deal of userWonDeals) {
            try {
              const dealValue = parseFloat(deal.value || '0');
              const dealCashCollected = parseFloat(deal.cashCollected || '0');
              const dealContractedValue = parseFloat(deal.contractedValue || '0');
              
              if (!isNaN(dealValue)) userRevenue += dealValue;
              if (!isNaN(dealCashCollected)) userCashCollected += dealCashCollected;
              if (!isNaN(dealContractedValue)) userContractedValue += dealContractedValue;
            } catch (e) {
              console.error(`Error parsing deal values for user ${user.id}`, e);
            }
          }
          
          // Calculate performance score (simplified)
          const performanceScore = (closingRate * 0.3) + 
                                  (userActivities.length * 0.2) + 
                                  (userMeetings.length * 0.2) + 
                                  (userWonDeals.length * 0.3);
          
          // Add user to sales team
          salesTeam.push({
            id: user.id.toString(),
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            role: user.role || 'Sales Rep',
            deals: totalUserDeals,
            meetings: totalUserMeetings,
            activities: totalUserActivities,
            performance: Math.round(performanceScore * 10) / 10,
            closed: totalUserWonDeals,
            cashCollected: userCashCollected,
            revenue: userRevenue,
            contractedValue: userContractedValue,
            calls: totalUserCalls,
            closingRate: Math.round(closingRate * 10) / 10
          });
        }
      } catch (e) {
        console.error('Error getting sales team data', e);
      }

      // Filter by role if specified
      if (role) {
        salesTeam = salesTeam.filter(user => 
          user.role && user.role.toLowerCase() === role.toLowerCase()
        );
      }

      // Build the response
      return {
        currentPeriod: {
          totalContacts,
          totalRevenue,
          totalCashCollected,
          totalDeals,
          totalMeetings,
          totalActivities,
          conversionRate,
          multiSourceRate,
          cashCollectedRate,
          salesTeam
        }
      };
    } catch (error) {
      console.error("Database error in getDashboardData:", error);
      
      // Return sample data instead of throwing an error
      const sampleData = {
        currentPeriod: {
          totalContacts: 0,
          totalRevenue: 0,
          totalCashCollected: 0,
          totalDeals: 0,
          totalMeetings: 0,
          totalActivities: 0,
          conversionRate: 0,
          multiSourceRate: 0,
          cashCollectedRate: 0,
          salesTeam: []
        }
      };
      
      console.log("Using sample data due to database error");
      return sampleData;
    }
  }
}

export const storage = new DatabaseStorage();