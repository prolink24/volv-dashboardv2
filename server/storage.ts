import { db } from "./db";
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
import { eq, and, like, desc, sql } from "drizzle-orm";

// Define interface for storage operations
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
  searchContacts(query: string, limit?: number, offset?: number): Promise<Contact[]>;
  getContactsCount(): Promise<number>;

  // Activity operations
  getActivity(id: number): Promise<Activity | undefined>;
  getActivityBySourceId(source: string, sourceId: string): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: number, activity: Partial<InsertActivity>): Promise<Activity | undefined>;
  getActivitiesByContactId(contactId: number): Promise<Activity[]>;
  getActivitiesCount(): Promise<number>;

  // Deal operations
  getDeal(id: number): Promise<Deal | undefined>;
  getDealBySourceId(source: string, sourceId: string): Promise<Deal | undefined>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: number, deal: Partial<InsertDeal>): Promise<Deal | undefined>;
  getDealsByContactId(contactId: number): Promise<Deal[]>;
  getDealsCount(): Promise<number>;

  // Meeting operations
  getMeeting(id: number): Promise<Meeting | undefined>;
  getMeetingByCalendlyEventId(eventId: string): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  getMeetingsByContactId(contactId: number): Promise<Meeting[]>;
  getMeetingsCount(): Promise<number>;

  // Form operations
  getForm(id: number): Promise<Form | undefined>;
  createForm(form: InsertForm): Promise<Form>;
  getFormsByContactId(contactId: number): Promise<Form[]>;
  getFormsCount(): Promise<number>;

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
  getDashboardData(date: Date, userId?: string, role?: string): Promise<any>;
}

// Implementation with database storage using Drizzle ORM
export class DatabaseStorage implements IStorage {
  // User operations
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

  // Contact operations
  async getContact(id: number): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact || undefined;
  }

  async getContactByEmail(email: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.email, email));
    return contact || undefined;
  }

  async getContactByExternalId(source: string, externalId: string): Promise<Contact | undefined> {
    // Find a contact where the sourceId matches and the leadSource matches the specified source
    const [contact] = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.sourceId, externalId),
          eq(contacts.leadSource, source)
        )
      );
    return contact || undefined;
  }

  async getContactSample(limit: number): Promise<Contact[]> {
    // Get a random sample of contacts for analytics purposes
    // Using SQL RANDOM() for true randomness
    return db
      .select()
      .from(contacts)
      .orderBy(sql`RANDOM()`)
      .limit(limit);
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
    return db
      .select()
      .from(contacts)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(contacts.createdAt));
  }

  async searchContacts(query: string, limit: number = 100, offset: number = 0): Promise<Contact[]> {
    return db
      .select()
      .from(contacts)
      .where(
        sql`
          ${contacts.name} ILIKE ${`%${query}%`} OR
          ${contacts.email} ILIKE ${`%${query}%`} OR
          ${contacts.company} ILIKE ${`%${query}%`}
        `
      )
      .limit(limit)
      .offset(offset);
  }

  async getContactsCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`COUNT(*)` }).from(contacts);
    return result[0]?.count || 0;
  }

  // Activity operations
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
          eq(activities.sourceId, sourceId),
          eq(activities.source, source)
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
    return db
      .select()
      .from(activities)
      .where(eq(activities.contactId, contactId))
      .orderBy(desc(activities.date));
  }

  async getActivitiesCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`COUNT(*)` }).from(activities);
    return result[0]?.count || 0;
  }

  // Deal operations
  async getDeal(id: number): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal || undefined;
  }

  async getDealBySourceId(source: string, sourceId: string): Promise<Deal | undefined> {
    const [deal] = await db
      .select()
      .from(deals)
      .where(
        and(
          eq(deals.closeId, sourceId),
          sql`1=1` // Cannot filter by source as it's not in the schema
        )
      );
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
    return db
      .select()
      .from(deals)
      .where(eq(deals.contactId, contactId))
      .orderBy(desc(deals.createdAt));
  }

  async getDealsCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`COUNT(*)` }).from(deals);
    return result[0]?.count || 0;
  }

  // Meeting operations
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

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const [newMeeting] = await db
      .insert(meetings)
      .values(meeting)
      .returning();
    return newMeeting;
  }

  async getMeetingsByContactId(contactId: number): Promise<Meeting[]> {
    return db
      .select()
      .from(meetings)
      .where(eq(meetings.contactId, contactId))
      .orderBy(desc(meetings.startTime));
  }

  async getMeetingsCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`COUNT(*)` }).from(meetings);
    return result[0]?.count || 0;
  }

  // Form operations
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
    return db
      .select()
      .from(forms)
      .where(eq(forms.contactId, contactId))
      .orderBy(desc(forms.submittedAt));
  }

  async getFormsCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`COUNT(*)` }).from(forms);
    return result[0]?.count || 0;
  }

  // Close User operations
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
    return db
      .select()
      .from(closeUsers)
      .limit(limit)
      .offset(offset);
  }

  async getCloseUsersCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`COUNT(*)` }).from(closeUsers);
    return result[0]?.count || 0;
  }

  // Contact-to-user assignments
  async createContactUserAssignment(assignment: InsertContactUserAssignment): Promise<ContactUserAssignment> {
    const [newAssignment] = await db
      .insert(contactToUserAssignments)
      .values(assignment)
      .returning();
    return newAssignment;
  }

  async getContactUserAssignments(contactId: number): Promise<ContactUserAssignment[]> {
    return db
      .select()
      .from(contactToUserAssignments)
      .where(eq(contactToUserAssignments.contactId, contactId));
  }

  async getContactsByCloseUserId(closeUserId: number): Promise<Contact[]> {
    const assignments = await db
      .select()
      .from(contactToUserAssignments)
      .where(eq(contactToUserAssignments.closeUserId, closeUserId));
    
    const contactIds = assignments.map(assignment => assignment.contactId);
    
    if (contactIds.length === 0) {
      return [];
    }
    
    return db
      .select()
      .from(contacts)
      .where(sql`${contacts.id} IN (${contactIds.join(',')})`);
  }

  // Deal-to-user assignments
  async createDealUserAssignment(assignment: InsertDealUserAssignment): Promise<DealUserAssignment> {
    const [newAssignment] = await db
      .insert(dealToUserAssignments)
      .values(assignment)
      .returning();
    return newAssignment;
  }

  async getDealUserAssignments(dealId: number): Promise<DealUserAssignment[]> {
    return db
      .select()
      .from(dealToUserAssignments)
      .where(eq(dealToUserAssignments.dealId, dealId));
  }

  async getDealsByCloseUserId(closeUserId: number): Promise<Deal[]> {
    const assignments = await db
      .select()
      .from(dealToUserAssignments)
      .where(eq(dealToUserAssignments.closeUserId, closeUserId));
    
    const dealIds = assignments.map(assignment => assignment.dealId);
    
    if (dealIds.length === 0) {
      return [];
    }
    
    return db
      .select()
      .from(deals)
      .where(sql`${deals.id} IN (${dealIds.join(',')})`);
  }

  // Metrics operations
  async createMetrics(metricsData: InsertMetrics): Promise<Metrics> {
    const [newMetrics] = await db
      .insert(metrics)
      .values(metricsData)
      .returning();
    return newMetrics;
  }
  
  async getMetrics(id: number): Promise<Metrics | undefined> {
    const [metricsData] = await db
      .select()
      .from(metrics)
      .where(eq(metrics.id, id));
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
    const conditions = userId 
      ? and(eq(metrics.date, date), eq(metrics.userId, userId))
      : eq(metrics.date, date);
    
    const [metricsData] = await db
      .select()
      .from(metrics)
      .where(conditions);
    
    return metricsData || undefined;
  }

  // Dashboard data - builds dummy data for now, to be replaced with real implementation
  async getDashboardData(date: Date, userId?: string, role?: string): Promise<any> {
    console.log(`Fetching dashboard data for role: ${role || 'default'}, date: ${date.toISOString()}, userId: ${userId || 'all'}`);
    
    // Common base dashboard data
    const commonData = {
      date: date.toISOString(),
      userId: userId || 'all',
      success: true,
      kpis: {
        closedDeals: 4,
        cashCollected: 125500,
        revenueGenerated: 210000,
        totalCalls: 44,
        call1Taken: 30,
        call2Taken: 14,
        closingRate: 37.5,
        avgCashCollected: 80000,
        solutionCallShowRate: 71,
        earningPerCall2: 39970
      }
    };
    
    // Handle different role-specific dashboards
    if (role === 'sales') {
      return {
        ...commonData,
        dashboardType: 'sales',
        title: 'Sales Dashboard',
        salesMetrics: {
          dealValueByStage: {
            'discovery': 45000,
            'proposal': 68000,
            'negotiation': 32000,
            'closed_won': 82000
          },
          forecastedRevenue: 227000,
          pipelineHealth: 87
        },
        salesTeam: [
          {
            name: "Josh Sweetnam",
            id: "josh.sweetnam",
            closed: 2,
            cashCollected: 60000,
            contractedValue: 110000,
            calls: 10,
            call1: 7,
            call2: 3,
            call2Sits: 2,
            closingRate: 100,
            adminMissingPercent: 64.71
          },
          {
            name: "Mazin Gazar",
            id: "mazin.gazar",
            closed: 1,
            cashCollected: 40000,
            contractedValue: 85000,
            calls: 8,
            call1: 6,
            call2: 2,
            call2Sits: 2,
            closingRate: 50,
            adminMissingPercent: 38.55
          },
          {
            name: "Bryann Cabral",
            id: "bryann.cabral",
            closed: 1,
            cashCollected: 25500,
            contractedValue: 55000,
            calls: 7,
            call1: 5,
            call2: 2,
            call2Sits: 1,
            closingRate: 50,
            adminMissingPercent: 42.23
          }
        ]
      };
    } else if (role === 'marketing') {
      return {
        ...commonData,
        dashboardType: 'marketing',
        title: 'Marketing Dashboard',
        marketingMetrics: {
          leadsBySource: {
            'organic': 42,
            'paid': 28,
            'referral': 35,
            'social': 18,
            'event': 12
          },
          campaignPerformance: {
            'Spring Promotion': { leads: 32, conversion: '3.8%' },
            'Product Webinar': { leads: 28, conversion: '4.2%' },
            'Industry Report': { leads: 22, conversion: '3.1%' }
          },
          conversionRates: {
            'lead_to_opportunity': '24%',
            'opportunity_to_customer': '38%',
            'overall': '9.1%'
          }
        }
      };
    } else if (role === 'setter') {
      return {
        ...commonData,
        dashboardType: 'setter',
        title: 'Setter Dashboard',
        setterMetrics: {
          appointmentsSet: 38,
          showRate: '76%',
          conversionToOpportunity: '42%',
          appointmentsByType: {
            'discovery': 22,
            'demo': 12,
            'followup': 4
          }
        }
      };
    } else {
      // Default dashboard
      return {
        ...commonData,
        dashboardType: 'default',
        title: 'Dashboard',
        triageMetrics: {
          booked: 68,
          sits: 52,
          showRate: '76%',
          solutionBookingRate: '42%',
          cancelRate: '12%',
          outboundTriagesSet: 22,
          totalDirectBookings: 46,
          directBookingRate: '68%'
        },
        leadMetrics: {
          newLeads: 135,
          disqualified: 28,
          totalDials: 420,
          pickUpRate: "32%"
        },
        advancedMetrics: {
          costPerClosedWon: 1250,
          closerSlotUtilization: 84,
          solutionCallCloseRate: 38,
          salesCycle: 28,
          callsToClose: 5.2,
          profitPerSolutionCall: 1580
        }
      };
    }
  }
}

export const storage = new DatabaseStorage();