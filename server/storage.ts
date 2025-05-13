import { 
  User, InsertUser, users,
  Contact, InsertContact, contacts,
  Activity, InsertActivity, activities,
  Deal, InsertDeal, deals,
  Meeting, InsertMeeting, meetings,
  Form, InsertForm, forms,
  Metrics, InsertMetrics, metrics,
  CloseUser, InsertCloseUser, closeUsers,
  ContactUserAssignment, InsertContactUserAssignment, contactToUserAssignments,
  DealUserAssignment, InsertDealUserAssignment, dealToUserAssignments
} from "@shared/schema";
import { eq, like, and, or, desc, asc, sql, count, inArray } from "drizzle-orm";
import { db } from "./db";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Close CRM User operations
  getCloseUser(id: number): Promise<CloseUser | undefined>;
  getCloseUserByCloseId(closeId: string): Promise<CloseUser | undefined>;
  getCloseUserByEmail(email: string): Promise<CloseUser | undefined>;
  getAllCloseUsers(limit?: number, offset?: number): Promise<CloseUser[]>;
  getCloseUsersCount(): Promise<number>;
  createCloseUser(user: InsertCloseUser): Promise<CloseUser>;
  updateCloseUser(id: number, user: Partial<InsertCloseUser>): Promise<CloseUser | undefined>;
  deleteCloseUser(id: number): Promise<boolean>;
  getContactsByCloseUserId(closeUserId: number): Promise<Contact[]>;
  getDealsByCloseUserId(closeUserId: number): Promise<Deal[]>;
  
  // Contact-User Assignment operations
  getContactUserAssignment(id: number): Promise<ContactUserAssignment | undefined>;
  getContactUserAssignmentsByContactId(contactId: number): Promise<ContactUserAssignment[]>;
  getContactUserAssignmentsByCloseUserId(closeUserId: number): Promise<ContactUserAssignment[]>;
  createContactUserAssignment(assignment: InsertContactUserAssignment): Promise<ContactUserAssignment>;
  updateContactUserAssignment(id: number, assignment: Partial<InsertContactUserAssignment>): Promise<ContactUserAssignment | undefined>;
  deleteContactUserAssignment(id: number): Promise<boolean>;
  
  // Deal-User Assignment operations
  getDealUserAssignment(id: number): Promise<DealUserAssignment | undefined>;
  getDealUserAssignmentsByDealId(dealId: number): Promise<DealUserAssignment[]>;
  getDealUserAssignmentsByCloseUserId(closeUserId: number): Promise<DealUserAssignment[]>;
  createDealUserAssignment(assignment: InsertDealUserAssignment): Promise<DealUserAssignment>;
  updateDealUserAssignment(id: number, assignment: Partial<InsertDealUserAssignment>): Promise<DealUserAssignment | undefined>;
  deleteDealUserAssignment(id: number): Promise<boolean>;
  
  // Contact operations
  getContact(id: number): Promise<Contact | undefined>;
  getContactByEmail(email: string): Promise<Contact | undefined>;
  getContactByExternalId(source: string, id: string): Promise<Contact | undefined>;
  getAllContacts(limit?: number, offset?: number): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContact(id: number): Promise<boolean>;
  searchContacts(query: string): Promise<Contact[]>;
  
  // Activity operations
  getActivity(id: number): Promise<Activity | undefined>;
  getActivitiesByContactId(contactId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  deleteActivity(id: number): Promise<boolean>;
  
  // Deal operations
  getDeal(id: number): Promise<Deal | undefined>;
  getDealsByContactId(contactId: number): Promise<Deal[]>;
  getAllOpportunities(limit?: number, offset?: number): Promise<Deal[]>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: number, deal: Partial<InsertDeal>): Promise<Deal | undefined>;
  deleteDeal(id: number): Promise<boolean>;
  
  // Meeting operations
  getMeeting(id: number): Promise<Meeting | undefined>;
  getMeetingsByContactId(contactId: number): Promise<Meeting[]>;
  getAllMeetings(limit?: number, offset?: number): Promise<Meeting[]>;
  getMeetingByCalendlyEventId(eventId: string): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: number, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined>;
  deleteMeeting(id: number): Promise<boolean>;
  
  // Form operations
  getForm(id: number): Promise<Form | undefined>;
  getFormsByContactId(contactId: number): Promise<Form[]>;
  getFormByTypeformResponseId(responseId: string): Promise<Form | undefined>;
  createForm(form: InsertForm): Promise<Form>;
  updateForm(id: number, form: Partial<InsertForm>): Promise<Form | undefined>;
  deleteForm(id: number): Promise<boolean>;

  // Metrics operations
  getMetrics(date: Date, userId?: string): Promise<Metrics | undefined>;
  createMetrics(metrics: InsertMetrics): Promise<Metrics>;
  updateMetrics(id: number, metrics: Partial<InsertMetrics>): Promise<Metrics | undefined>;

  // Dashboard data
  getDashboardData(date: Date, userId?: string): Promise<any>;
}

// Memory Storage Implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private contacts: Map<number, Contact>;
  private activities: Map<number, Activity>;
  private deals: Map<number, Deal>;
  private meetings: Map<number, Meeting>;
  private forms: Map<number, Form>;
  private metricsData: Map<number, Metrics>;
  private closeUsersData: Map<number, CloseUser>;
  private contactUserAssignments: Map<number, ContactUserAssignment>;
  private dealUserAssignments: Map<number, DealUserAssignment>;
  
  private userCurrentId: number;
  private contactCurrentId: number;
  private activityCurrentId: number;
  private dealCurrentId: number;
  private meetingCurrentId: number;
  private formCurrentId: number;
  private metricsCurrentId: number;
  private closeUserCurrentId: number;
  private contactUserAssignmentCurrentId: number;
  private dealUserAssignmentCurrentId: number;

  constructor() {
    this.users = new Map();
    this.contacts = new Map();
    this.activities = new Map();
    this.deals = new Map();
    this.meetings = new Map();
    this.forms = new Map();
    this.metricsData = new Map();
    this.closeUsersData = new Map();
    this.contactUserAssignments = new Map();
    this.dealUserAssignments = new Map();
    
    this.userCurrentId = 1;
    this.contactCurrentId = 1;
    this.activityCurrentId = 1;
    this.dealCurrentId = 1;
    this.meetingCurrentId = 1;
    this.formCurrentId = 1;
    this.metricsCurrentId = 1;
    this.closeUserCurrentId = 1;
    this.contactUserAssignmentCurrentId = 1;
    this.dealUserAssignmentCurrentId = 1;

    // Initialize with sample data
    this.initializeSampleData();
  }

  // Initialize sample data for development
  private initializeSampleData() {
    // Create sample users
    const users = [
      {
        username: "josh.sweetnam",
        password: "password",
        name: "Josh Sweetnam",
        email: "josh@contactsync.com",
        role: "admin"
      },
      {
        username: "mazin.gazar",
        password: "password",
        name: "Mazin Gazar",
        email: "mazin@contactsync.com",
        role: "admin"
      },
      {
        username: "bryann.cabral",
        password: "password",
        name: "Bryann Cabral",
        email: "bryann@contactsync.com",
        role: "sales"
      },
      {
        username: "bogdan.micov",
        password: "password",
        name: "Bogdan Micov",
        email: "bogdan@contactsync.com",
        role: "sales"
      },
      {
        username: "harlan.ryder",
        password: "password",
        name: "Harlan Ryder",
        email: "harlan@contactsync.com",
        role: "sales"
      }
    ];

    users.forEach(user => this.createUser(user));
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Contact operations
  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async getContactByEmail(email: string): Promise<Contact | undefined> {
    // Import the normalizeEmail function
    const { normalizeEmail } = await import('./services/contact-matcher');
    
    // Normalize the lookup email
    const normalizedEmail = normalizeEmail(email);
    
    // Look for a contact with a matching normalized email
    return Array.from(this.contacts.values()).find(contact => {
      const contactNormalizedEmail = normalizeEmail(contact.email);
      return contactNormalizedEmail === normalizedEmail;
    });
  }

  async getContactByExternalId(source: string, id: string): Promise<Contact | undefined> {
    if (source === "close") {
      return Array.from(this.contacts.values()).find(
        (contact) => contact.closeId === id
      );
    } else if (source === "calendly") {
      return Array.from(this.contacts.values()).find(
        (contact) => contact.calendlyId === id
      );
    } else if (source === "typeform") {
      return Array.from(this.contacts.values()).find(
        (contact) => contact.typeformId === id
      );
    }
    return undefined;
  }

  async getAllContacts(limit?: number, offset = 0): Promise<Contact[]> {
    const allContacts = Array.from(this.contacts.values());
    if (limit) {
      return allContacts.slice(offset, offset + limit);
    }
    return allContacts;
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const id = this.contactCurrentId++;
    const createdAt = new Date();
    const newContact: Contact = { ...contact, id, createdAt };
    this.contacts.set(id, newContact);
    return newContact;
  }

  async updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact | undefined> {
    const existingContact = this.contacts.get(id);
    if (!existingContact) return undefined;
    
    const updatedContact = { ...existingContact, ...contact };
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }

  async deleteContact(id: number): Promise<boolean> {
    return this.contacts.delete(id);
  }

  async searchContacts(query: string): Promise<Contact[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.contacts.values()).filter(
      (contact) => 
        contact.name.toLowerCase().includes(lowerQuery) ||
        contact.email.toLowerCase().includes(lowerQuery) ||
        (contact.company && contact.company.toLowerCase().includes(lowerQuery))
    );
  }

  // Activity operations
  async getActivity(id: number): Promise<Activity | undefined> {
    return this.activities.get(id);
  }

  async getActivitiesByContactId(contactId: number): Promise<Activity[]> {
    return Array.from(this.activities.values()).filter(
      (activity) => activity.contactId === contactId
    );
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.activityCurrentId++;
    const newActivity: Activity = { ...activity, id };
    this.activities.set(id, newActivity);
    return newActivity;
  }

  async deleteActivity(id: number): Promise<boolean> {
    return this.activities.delete(id);
  }

  // Deal operations
  async getDeal(id: number): Promise<Deal | undefined> {
    return this.deals.get(id);
  }

  async getDealsByContactId(contactId: number): Promise<Deal[]> {
    return Array.from(this.deals.values()).filter(
      (deal) => deal.contactId === contactId
    );
  }
  
  async getAllOpportunities(limit: number = 1000, offset: number = 0): Promise<Deal[]> {
    return Array.from(this.deals.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);
  }

  async createDeal(deal: InsertDeal): Promise<Deal> {
    const id = this.dealCurrentId++;
    const createdAt = new Date();
    const newDeal: Deal = { ...deal, id, createdAt };
    this.deals.set(id, newDeal);
    return newDeal;
  }

  async updateDeal(id: number, deal: Partial<InsertDeal>): Promise<Deal | undefined> {
    const existingDeal = this.deals.get(id);
    if (!existingDeal) return undefined;
    
    const updatedDeal = { ...existingDeal, ...deal };
    this.deals.set(id, updatedDeal);
    return updatedDeal;
  }

  async deleteDeal(id: number): Promise<boolean> {
    return this.deals.delete(id);
  }

  // Meeting operations
  async getMeeting(id: number): Promise<Meeting | undefined> {
    return this.meetings.get(id);
  }

  async getMeetingsByContactId(contactId: number): Promise<Meeting[]> {
    return Array.from(this.meetings.values()).filter(
      (meeting) => meeting.contactId === contactId
    );
  }
  
  async getAllMeetings(limit: number = 1000, offset: number = 0): Promise<Meeting[]> {
    return Array.from(this.meetings.values())
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(offset, offset + limit);
  }

  async getMeetingByCalendlyEventId(eventId: string): Promise<Meeting | undefined> {
    return Array.from(this.meetings.values()).find(
      (meeting) => meeting.calendlyEventId === eventId
    );
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const id = this.meetingCurrentId++;
    const newMeeting: Meeting = { ...meeting, id };
    this.meetings.set(id, newMeeting);
    return newMeeting;
  }

  async updateMeeting(id: number, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    const existingMeeting = this.meetings.get(id);
    if (!existingMeeting) return undefined;
    
    const updatedMeeting = { ...existingMeeting, ...meeting };
    this.meetings.set(id, updatedMeeting);
    return updatedMeeting;
  }

  async deleteMeeting(id: number): Promise<boolean> {
    return this.meetings.delete(id);
  }

  // Form operations
  async getForm(id: number): Promise<Form | undefined> {
    return this.forms.get(id);
  }

  async getFormsByContactId(contactId: number): Promise<Form[]> {
    return Array.from(this.forms.values()).filter(
      (form) => form.contactId === contactId
    );
  }

  async getFormByTypeformResponseId(responseId: string): Promise<Form | undefined> {
    return Array.from(this.forms.values()).find(
      (form) => form.typeformResponseId === responseId
    );
  }

  async createForm(form: InsertForm): Promise<Form> {
    const id = this.formCurrentId++;
    const newForm: Form = { ...form, id };
    this.forms.set(id, newForm);
    return newForm;
  }

  async updateForm(id: number, form: Partial<InsertForm>): Promise<Form | undefined> {
    const existingForm = this.forms.get(id);
    if (!existingForm) return undefined;
    
    const updatedForm = { ...existingForm, ...form };
    this.forms.set(id, updatedForm);
    return updatedForm;
  }

  async deleteForm(id: number): Promise<boolean> {
    return this.forms.delete(id);
  }

  // Metrics operations
  async getMetrics(date: Date, userId?: string): Promise<Metrics | undefined> {
    const formattedDate = date.toISOString().split('T')[0];
    return Array.from(this.metricsData.values()).find(
      (metric) => 
        metric.date.toISOString().split('T')[0] === formattedDate && 
        (!userId || metric.userId === userId)
    );
  }

  // Close CRM User operations
  async getCloseUser(id: number): Promise<CloseUser | undefined> {
    return this.closeUsersData.get(id);
  }

  async getCloseUserByCloseId(closeId: string): Promise<CloseUser | undefined> {
    return Array.from(this.closeUsersData.values()).find(
      (user) => user.closeId === closeId
    );
  }

  async getCloseUserByEmail(email: string): Promise<CloseUser | undefined> {
    return Array.from(this.closeUsersData.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async getAllCloseUsers(limit?: number, offset = 0): Promise<CloseUser[]> {
    const allUsers = Array.from(this.closeUsersData.values())
      .sort((a, b) => {
        // Sort by updatedAt in descending order
        const aDate = a.updatedAt || new Date(0);
        const bDate = b.updatedAt || new Date(0);
        return bDate.getTime() - aDate.getTime();
      });
      
    if (limit) {
      return allUsers.slice(offset, offset + limit);
    }
    return allUsers;
  }
  
  async getCloseUsersCount(): Promise<number> {
    return this.closeUsersData.size;
  }
  
  async getContactsByCloseUserId(closeUserId: number): Promise<Contact[]> {
    // Find all contact-user assignments for this closeUserId
    const assignments = Array.from(this.contactUserAssignments.values())
      .filter(assignment => assignment.closeUserId === closeUserId);
    
    // Extract all contactIds
    const contactIds = assignments.map(assignment => assignment.contactId);
    
    if (contactIds.length === 0) {
      return [];
    }
    
    // Find all contacts with those IDs
    return Array.from(this.contacts.values())
      .filter(contact => contactIds.includes(contact.id))
      .sort((a, b) => {
        // Sort by lastActivityDate in descending order
        const aDate = a.lastActivityDate || new Date(0);
        const bDate = b.lastActivityDate || new Date(0);
        return bDate.getTime() - aDate.getTime();
      });
  }
  
  async getDealsByCloseUserId(closeUserId: number): Promise<Deal[]> {
    // Find all deal-user assignments for this closeUserId
    const assignments = Array.from(this.dealUserAssignments.values())
      .filter(assignment => assignment.closeUserId === closeUserId);
    
    // Extract all dealIds
    const dealIds = assignments.map(assignment => assignment.dealId);
    
    if (dealIds.length === 0) {
      return [];
    }
    
    // Find all deals with those IDs
    return Array.from(this.deals.values())
      .filter(deal => dealIds.includes(deal.id))
      .sort((a, b) => {
        // Sort by createdAt in descending order
        const aDate = a.createdAt || new Date(0);
        const bDate = b.createdAt || new Date(0);
        return bDate.getTime() - aDate.getTime();
      });
  }

  async createCloseUser(user: InsertCloseUser): Promise<CloseUser> {
    const id = this.closeUserCurrentId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const newUser: CloseUser = { ...user, id, createdAt, updatedAt };
    this.closeUsersData.set(id, newUser);
    return newUser;
  }

  async updateCloseUser(id: number, user: Partial<InsertCloseUser>): Promise<CloseUser | undefined> {
    const existingUser = this.closeUsersData.get(id);
    if (!existingUser) return undefined;
    
    const updatedAt = new Date();
    const updatedUser = { ...existingUser, ...user, updatedAt };
    this.closeUsersData.set(id, updatedUser);
    return updatedUser;
  }

  async deleteCloseUser(id: number): Promise<boolean> {
    return this.closeUsersData.delete(id);
  }
  
  // Contact-User Assignment operations
  async getContactUserAssignment(id: number): Promise<ContactUserAssignment | undefined> {
    return this.contactUserAssignments.get(id);
  }

  async getContactUserAssignmentsByContactId(contactId: number): Promise<ContactUserAssignment[]> {
    return Array.from(this.contactUserAssignments.values()).filter(
      (assignment) => assignment.contactId === contactId
    );
  }

  async getContactUserAssignmentsByCloseUserId(closeUserId: number): Promise<ContactUserAssignment[]> {
    return Array.from(this.contactUserAssignments.values()).filter(
      (assignment) => assignment.closeUserId === closeUserId
    );
  }

  async createContactUserAssignment(assignment: InsertContactUserAssignment): Promise<ContactUserAssignment> {
    const id = this.contactUserAssignmentCurrentId++;
    const newAssignment: ContactUserAssignment = { ...assignment, id };
    this.contactUserAssignments.set(id, newAssignment);
    return newAssignment;
  }

  async updateContactUserAssignment(id: number, assignment: Partial<InsertContactUserAssignment>): Promise<ContactUserAssignment | undefined> {
    const existingAssignment = this.contactUserAssignments.get(id);
    if (!existingAssignment) return undefined;
    
    const updatedAssignment = { ...existingAssignment, ...assignment };
    this.contactUserAssignments.set(id, updatedAssignment);
    return updatedAssignment;
  }

  async deleteContactUserAssignment(id: number): Promise<boolean> {
    return this.contactUserAssignments.delete(id);
  }
  
  // Deal-User Assignment operations
  async getDealUserAssignment(id: number): Promise<DealUserAssignment | undefined> {
    return this.dealUserAssignments.get(id);
  }

  async getDealUserAssignmentsByDealId(dealId: number): Promise<DealUserAssignment[]> {
    return Array.from(this.dealUserAssignments.values()).filter(
      (assignment) => assignment.dealId === dealId
    );
  }

  async getDealUserAssignmentsByCloseUserId(closeUserId: number): Promise<DealUserAssignment[]> {
    return Array.from(this.dealUserAssignments.values()).filter(
      (assignment) => assignment.closeUserId === closeUserId
    );
  }

  async createDealUserAssignment(assignment: InsertDealUserAssignment): Promise<DealUserAssignment> {
    const id = this.dealUserAssignmentCurrentId++;
    const newAssignment: DealUserAssignment = { ...assignment, id };
    this.dealUserAssignments.set(id, newAssignment);
    return newAssignment;
  }

  async updateDealUserAssignment(id: number, assignment: Partial<InsertDealUserAssignment>): Promise<DealUserAssignment | undefined> {
    const existingAssignment = this.dealUserAssignments.get(id);
    if (!existingAssignment) return undefined;
    
    const updatedAssignment = { ...existingAssignment, ...assignment };
    this.dealUserAssignments.set(id, updatedAssignment);
    return updatedAssignment;
  }

  async deleteDealUserAssignment(id: number): Promise<boolean> {
    return this.dealUserAssignments.delete(id);
  }

  async createMetrics(metrics: InsertMetrics): Promise<Metrics> {
    const id = this.metricsCurrentId++;
    const newMetrics: Metrics = { ...metrics, id };
    this.metricsData.set(id, newMetrics);
    return newMetrics;
  }

  async updateMetrics(id: number, metrics: Partial<InsertMetrics>): Promise<Metrics | undefined> {
    const existingMetrics = this.metricsData.get(id);
    if (!existingMetrics) return undefined;
    
    const updatedMetrics = { ...existingMetrics, ...metrics };
    this.metricsData.set(id, updatedMetrics);
    return updatedMetrics;
  }

  // Dashboard data - builds dummy data for now, to be replaced with real implementation
  async getDashboardData(date: Date, userId?: string): Promise<any> {
    // Sample data for dashboards
    return {
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
          contractedValue: 50000,
          calls: 11,
          call1: 10,
          call2: 1,
          call2Sits: 2,
          closingRate: 50,
          adminMissingPercent: 80.95
        },
        {
          name: "Bryann Cabral",
          id: "bryann.cabral",
          closed: 0,
          cashCollected: 10500,
          contractedValue: 0,
          calls: 14,
          call1: 6,
          call2: 8,
          call2Sits: 5,
          closingRate: 0,
          adminMissingPercent: 72.73
        },
        {
          name: "Bogdan Micov",
          id: "bogdan.micov",
          closed: 0,
          cashCollected: 5000,
          contractedValue: 0,
          calls: 9,
          call1: 7,
          call2: 2,
          call2Sits: 1,
          closingRate: 0,
          adminMissingPercent: 68.42
        },
        {
          name: "Harlan Ryder",
          id: "harlan.ryder",
          closed: 1,
          cashCollected: 10000,
          contractedValue: 50000,
          calls: 0,
          call1: 0,
          call2: 0,
          call2Sits: 0,
          closingRate: 0,
          adminMissingPercent: 0
        }
      ],
      triageMetrics: {
        booked: 79,
        sits: 30,
        showRate: 37.97,
        solutionBookingRate: 56.67,
        cancelRate: 36.67,
        outboundTriagesSet: 8,
        totalDirectBookings: 73,
        directBookingRate: 16.67
      },
      leadMetrics: {
        newLeads: 185,
        disqualified: 3,
        totalDials: 253,
        pickUpRate: 1
      },
      advancedMetrics: {
        costPerClosedWon: 3160.34,
        closerSlotUtilization: 106,
        solutionCallCloseRate: 15.38,
        salesCycle: 108,
        callsToClose: 1,
        profitPerSolutionCall: 2678
      },
      missingAdmins: [
        {
          assignedTo: "Mazin Gazar",
          count: 7,
          contacts: [
            {
              id: 1,
              name: "Isaiah Norris",
              email: "inorris@gmail.com",
              eventType: "Triage Call",
              callDateTime: "3/31/2025 2:00pm"
            },
            {
              id: 2,
              name: "Monell Scott",
              email: "monell@pacific-investments.co",
              eventType: "Triage Call",
              callDateTime: "3/30/2025 1:00pm"
            },
            {
              id: 3,
              name: "Steve Mills",
              email: "generalmillsassets@gmail.com",
              eventType: "Strategy Call",
              callDateTime: "3/14/2025 4:30pm"
            },
            {
              id: 4,
              name: "Kevin Carr",
              email: "kevincarr@gmail.com",
              eventType: "Triage Call",
              callDateTime: "3/14/2025 2:20pm"
            },
            {
              id: 5,
              name: "Jesse Chavez",
              email: "spartanmindset@yahoo.com",
              eventType: "Follow-Up Call",
              callDateTime: "3/12/2025 12:00pm"
            },
            {
              id: 6,
              name: "Jeff O'Brien",
              email: "jeff@brienacquistions.com",
              eventType: "Strategy Call",
              callDateTime: "3/10/2025 4:00pm"
            },
            {
              id: 7,
              name: "Jesus Chavez",
              email: "jessuschavez@yahoo.com",
              eventType: "Strategy Call",
              callDateTime: "3/8/2025 5:30pm"
            }
          ]
        },
        {
          assignedTo: "Josh Sweetnam",
          count: 14,
          contacts: [
            {
              id: 8,
              name: "Joshua Fuchs",
              email: "joshua@globalfarm.com",
              eventType: "Triage Call",
              callDateTime: "4/2/2025 11:00am"
            },
            {
              id: 9,
              name: "Victor Aguirre",
              email: "victor.aguirre747@gmail.com",
              eventType: "Triage Call",
              callDateTime: "4/2/2025 10:00am"
            },
            {
              id: 10,
              name: "Zach Gordon",
              email: "zgordon5@yahoo.com",
              eventType: "Strategy Call",
              callDateTime: "3/31/2025 12:00pm"
            },
            {
              id: 11,
              name: "Dan Lee Vogler",
              email: "dan.vogler@averysecm.com",
              eventType: "Triage Call",
              callDateTime: "3/31/2025 10:30am"
            },
            {
              id: 12,
              name: "Darrin Stallings",
              email: "darrinstall1992@gmail.com",
              eventType: "Triage Call",
              callDateTime: "3/24/2025 10:00am"
            },
            {
              id: 13,
              name: "Manni Stewart",
              email: "info@moonlittman.com",
              eventType: "Triage Call",
              callDateTime: "3/21/2025 9:00am"
            }
          ]
        }
      ]
    };
  }
}

// Database storage implementation

export class DatabaseStorage implements IStorage {
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
  
  // Close CRM User operations
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

  async getAllCloseUsers(limit?: number, offset = 0): Promise<CloseUser[]> {
    let query = db.select().from(closeUsers).orderBy(desc(closeUsers.updatedAt));
    
    if (limit) {
      query = query.limit(limit).offset(offset);
    }
    
    return await query;
  }
  
  async getCloseUsersCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(closeUsers);
    return result[0].count;
  }
  
  async getContactsByCloseUserId(closeUserId: number): Promise<Contact[]> {
    // Find all contactUserAssignments for the given Close user
    const assignments = await db
      .select()
      .from(contactToUserAssignments)
      .where(eq(contactToUserAssignments.closeUserId, closeUserId));
    
    // Extract all contactIds
    const contactIds = assignments.map(assignment => assignment.contactId);
    
    if (contactIds.length === 0) {
      return [];
    }
    
    // Fetch all contacts with those IDs
    return await db
      .select()
      .from(contacts)
      .where(inArray(contacts.id, contactIds))
      .orderBy(desc(contacts.lastActivityDate));
  }
  
  async getDealsByCloseUserId(closeUserId: number): Promise<Deal[]> {
    // Find all dealUserAssignments for the given Close user
    const assignments = await db
      .select()
      .from(dealToUserAssignments)
      .where(eq(dealToUserAssignments.closeUserId, closeUserId));
    
    // Extract all dealIds
    const dealIds = assignments.map(assignment => assignment.dealId);
    
    if (dealIds.length === 0) {
      return [];
    }
    
    // Fetch all deals with those IDs
    return await db
      .select()
      .from(deals)
      .where(inArray(deals.id, dealIds))
      .orderBy(desc(deals.createdAt));
  }

  async createCloseUser(insertCloseUser: InsertCloseUser): Promise<CloseUser> {
    const [user] = await db
      .insert(closeUsers)
      .values({
        ...insertCloseUser,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return user;
  }

  async updateCloseUser(id: number, updateData: Partial<InsertCloseUser>): Promise<CloseUser | undefined> {
    const [user] = await db
      .update(closeUsers)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(closeUsers.id, id))
      .returning();
    return user || undefined;
  }

  async deleteCloseUser(id: number): Promise<boolean> {
    const result = await db.delete(closeUsers).where(eq(closeUsers.id, id));
    return result.rowCount > 0;
  }
  
  // Contact-User Assignment operations
  async getContactUserAssignment(id: number): Promise<ContactUserAssignment | undefined> {
    const [assignment] = await db.select().from(contactToUserAssignments).where(eq(contactToUserAssignments.id, id));
    return assignment || undefined;
  }

  async getContactUserAssignmentsByContactId(contactId: number): Promise<ContactUserAssignment[]> {
    return await db.select().from(contactToUserAssignments).where(eq(contactToUserAssignments.contactId, contactId));
  }

  async getContactUserAssignmentsByCloseUserId(closeUserId: number): Promise<ContactUserAssignment[]> {
    return await db.select().from(contactToUserAssignments).where(eq(contactToUserAssignments.closeUserId, closeUserId));
  }

  async createContactUserAssignment(insertAssignment: InsertContactUserAssignment): Promise<ContactUserAssignment> {
    const [assignment] = await db
      .insert(contactToUserAssignments)
      .values(insertAssignment)
      .returning();
    return assignment;
  }

  async updateContactUserAssignment(id: number, updateData: Partial<InsertContactUserAssignment>): Promise<ContactUserAssignment | undefined> {
    const [assignment] = await db
      .update(contactToUserAssignments)
      .set(updateData)
      .where(eq(contactToUserAssignments.id, id))
      .returning();
    return assignment || undefined;
  }

  async deleteContactUserAssignment(id: number): Promise<boolean> {
    const result = await db.delete(contactToUserAssignments).where(eq(contactToUserAssignments.id, id));
    return result.rowCount > 0;
  }
  
  // Deal-User Assignment operations
  async getDealUserAssignment(id: number): Promise<DealUserAssignment | undefined> {
    const [assignment] = await db.select().from(dealToUserAssignments).where(eq(dealToUserAssignments.id, id));
    return assignment || undefined;
  }

  async getDealUserAssignmentsByDealId(dealId: number): Promise<DealUserAssignment[]> {
    return await db.select().from(dealToUserAssignments).where(eq(dealToUserAssignments.dealId, dealId));
  }

  async getDealUserAssignmentsByCloseUserId(closeUserId: number): Promise<DealUserAssignment[]> {
    return await db.select().from(dealToUserAssignments).where(eq(dealToUserAssignments.closeUserId, closeUserId));
  }

  async createDealUserAssignment(insertAssignment: InsertDealUserAssignment): Promise<DealUserAssignment> {
    const [assignment] = await db
      .insert(dealToUserAssignments)
      .values(insertAssignment)
      .returning();
    return assignment;
  }

  async updateDealUserAssignment(id: number, updateData: Partial<InsertDealUserAssignment>): Promise<DealUserAssignment | undefined> {
    const [assignment] = await db
      .update(dealToUserAssignments)
      .set(updateData)
      .where(eq(dealToUserAssignments.id, id))
      .returning();
    return assignment || undefined;
  }

  async deleteDealUserAssignment(id: number): Promise<boolean> {
    const result = await db.delete(dealToUserAssignments).where(eq(dealToUserAssignments.id, id));
    return result.rowCount > 0;
  }

  async getContact(id: number): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact || undefined;
  }

  async getContactByEmail(email: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.email, email));
    return contact || undefined;
  }

  async getContactByExternalId(source: string, id: string): Promise<Contact | undefined> {
    // Use the sourceId field combined with leadSource to find the contact
    try {
      const [contact] = await db.select()
        .from(contacts)
        .where(
          and(
            eq(contacts.sourceId, id),
            eq(contacts.leadSource, source)
          )
        );
      return contact || undefined;
    } catch (error) {
      console.error(`Error in getContactByExternalId(${source}, ${id}):`, error);
      return undefined;
    }
  }

  async getAllContacts(limit: number = 50, offset: number = 0): Promise<Contact[]> {
    return db.select().from(contacts).limit(limit).offset(offset).orderBy(desc(contacts.createdAt));
  }
  
  async getContactsCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)` }).from(contacts);
    return Number(result[0].count);
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
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

  async deleteContact(id: number): Promise<boolean> {
    const result = await db.delete(contacts).where(eq(contacts.id, id));
    return true; // PostgreSQL doesn't return deleted rows count easily
  }

  async searchContacts(query: string): Promise<Contact[]> {
    return db
      .select()
      .from(contacts)
      .where(
        or(
          like(contacts.name, `%${query}%`),
          like(contacts.email, `%${query}%`),
          like(contacts.company, `%${query}%`),
          like(contacts.phone, `%${query}%`)
        )
      );
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity || undefined;
  }

  async getActivitiesByContactId(contactId: number): Promise<Activity[]> {
    return db
      .select()
      .from(activities)
      .where(eq(activities.contactId, contactId))
      .orderBy(desc(activities.date));
  }
  
  async getActivityBySourceId(source: string, id: string): Promise<Activity | undefined> {
    const [activity] = await db.select()
      .from(activities)
      .where(
        and(
          eq(activities.sourceId, id),
          eq(activities.source, source)
        )
      );
    return activity || undefined;
  }
  
  async updateActivity(id: number, activity: Partial<InsertActivity>): Promise<Activity | undefined> {
    const [updatedActivity] = await db
      .update(activities)
      .set(activity)
      .where(eq(activities.id, id))
      .returning();
    return updatedActivity || undefined;
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  async deleteActivity(id: number): Promise<boolean> {
    await db.delete(activities).where(eq(activities.id, id));
    return true;
  }

  async getDeal(id: number): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal || undefined;
  }

  async getDealsByContactId(contactId: number): Promise<Deal[]> {
    return db
      .select()
      .from(deals)
      .where(eq(deals.contactId, contactId))
      .orderBy(desc(deals.createdAt));
  }
  
  async getAllOpportunities(limit: number = 1000, offset: number = 0): Promise<Deal[]> {
    return db
      .select()
      .from(deals)
      .orderBy(desc(deals.createdAt))
      .limit(limit)
      .offset(offset);
  }
  
  async getDealBySourceId(source: string, id: string): Promise<Deal | undefined> {
    // Use the closeId field for deals from Close
    if (source === 'close') {
      const [deal] = await db.select()
        .from(deals)
        .where(eq(deals.closeId, id));
      return deal || undefined;
    }
    
    return undefined;
  }

  async createDeal(deal: InsertDeal): Promise<Deal> {
    try {
      // Create a new deal object with explicit properties to avoid SQL errors
      const dealData = {
        contactId: deal.contactId,
        title: deal.title,
        status: deal.status,
        value: deal.value || null,
        closeDate: deal.closeDate || null,
        closeId: deal.closeId || null,
        assignedTo: deal.assignedTo || null,
        metadata: deal.metadata || null
      };
      
      // Use standard insert approach with explicitly listed fields
      const [newDeal] = await db.insert(deals).values(dealData).returning();
      return newDeal;
    } catch (error) {
      console.error('Error creating deal:', error);
      throw error;
    }
  }

  async updateDeal(id: number, deal: Partial<InsertDeal>): Promise<Deal | undefined> {
    try {
      // Handle currency formatting in the value field
      let updateData = {...deal};
      
      // Convert value from currency format if needed
      if (typeof updateData.value === 'string' && updateData.value.includes('$')) {
        // Remove currency symbols and commas for database storage
        updateData.value = updateData.value.replace(/[^0-9.-]+/g, '');
      }
      
      const [updatedDeal] = await db
        .update(deals)
        .set(updateData)
        .where(eq(deals.id, id))
        .returning();
      return updatedDeal || undefined;
    } catch (error) {
      console.error('Error updating deal:', error);
      throw error;
    }
  }

  async deleteDeal(id: number): Promise<boolean> {
    await db.delete(deals).where(eq(deals.id, id));
    return true;
  }

  async getMeeting(id: number): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting || undefined;
  }

  async getMeetingsByContactId(contactId: number): Promise<Meeting[]> {
    return db
      .select()
      .from(meetings)
      .where(eq(meetings.contactId, contactId))
      .orderBy(asc(meetings.startTime));
  }
  
  async getAllMeetings(limit: number = 1000, offset: number = 0): Promise<Meeting[]> {
    try {
      return db
        .select()
        .from(meetings)
        .limit(limit)
        .offset(offset)
        .orderBy(asc(meetings.startTime));
    } catch (error) {
      console.error('Error fetching all meetings:', error);
      return [];
    }
  }

  async getMeetingByCalendlyEventId(eventId: string): Promise<Meeting | undefined> {
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.calendlyEventId, eventId));
    return meeting || undefined;
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    try {
      // Create a new meeting object with explicit properties to avoid SQL errors
      const meetingData = {
        contactId: meeting.contactId,
        calendlyEventId: meeting.calendlyEventId,
        type: meeting.type,
        title: meeting.title,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        status: meeting.status,
        assignedTo: meeting.assignedTo || null,
        metadata: meeting.metadata || null
      };
      
      // Use standard insert approach with explicitly listed fields
      const [newMeeting] = await db.insert(meetings).values(meetingData).returning();
      
      // Log successful meeting creation for debugging
      console.log(`Successfully created meeting: ${meetingData.title} for contact ID ${meetingData.contactId}`);
      return newMeeting;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }

  async updateMeeting(id: number, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    try {
      // Create a meeting update object with normalized values
      const updateData = {...meeting};
      
      const [updatedMeeting] = await db
        .update(meetings)
        .set(updateData)
        .where(eq(meetings.id, id))
        .returning();
      
      // Log successful meeting update for debugging
      console.log(`Successfully updated meeting ID ${id}`);
      return updatedMeeting || undefined;
    } catch (error) {
      console.error('Error updating meeting:', error);
      throw error;
    }
  }

  async deleteMeeting(id: number): Promise<boolean> {
    await db.delete(meetings).where(eq(meetings.id, id));
    return true;
  }

  async getForm(id: number): Promise<Form | undefined> {
    const [form] = await db.select().from(forms).where(eq(forms.id, id));
    return form || undefined;
  }

  async getFormsByContactId(contactId: number): Promise<Form[]> {
    return db
      .select()
      .from(forms)
      .where(eq(forms.contactId, contactId))
      .orderBy(desc(forms.submittedAt));
  }

  async getFormByTypeformResponseId(responseId: string): Promise<Form | undefined> {
    const [form] = await db
      .select()
      .from(forms)
      .where(eq(forms.typeformResponseId, responseId));
    return form || undefined;
  }

  async createForm(form: InsertForm): Promise<Form> {
    const [newForm] = await db.insert(forms).values(form).returning();
    return newForm;
  }

  async updateForm(id: number, form: Partial<InsertForm>): Promise<Form | undefined> {
    const [updatedForm] = await db
      .update(forms)
      .set(form)
      .where(eq(forms.id, id))
      .returning();
    return updatedForm || undefined;
  }

  async deleteForm(id: number): Promise<boolean> {
    await db.delete(forms).where(eq(forms.id, id));
    return true;
  }

  async getMetrics(date: Date, userId?: string): Promise<Metrics | undefined> {
    const dateString = date.toISOString().split('T')[0];
    
    const conditions = [eq(metrics.date, dateString)];
    if (userId) {
      conditions.push(eq(metrics.userId, userId));
    }
    
    const [metric] = await db
      .select()
      .from(metrics)
      .where(and(...conditions));
    
    return metric || undefined;
  }

  async createMetrics(metricsData: InsertMetrics): Promise<Metrics> {
    const [newMetrics] = await db.insert(metrics).values(metricsData).returning();
    return newMetrics;
  }

  async updateMetrics(id: number, metricsData: Partial<InsertMetrics>): Promise<Metrics | undefined> {
    const [updatedMetrics] = await db
      .update(metrics)
      .set(metricsData)
      .where(eq(metrics.id, id))
      .returning();
    return updatedMetrics || undefined;
  }

  async getDashboardData(date: Date, userId?: string): Promise<any> {
    // Get metrics for the date
    const metricsData = await this.getMetrics(date, userId);
    
    // Get Close CRM user data to use in the dashboard
    const closeUsers = await this.getAllCloseUsers(3); // Get top 3 users for the dashboard
    
    // If we have Close users, generate sales team data from them
    let salesTeamData = [];
    
    if (closeUsers && closeUsers.length > 0) {
      // For each user, get their contacts and deals
      salesTeamData = await Promise.all(closeUsers.map(async (user) => {
        // Get assigned contacts for this user
        const contactAssignments = await this.getContactUserAssignmentsByCloseUserId(user.id);
        
        // Get assigned deals for this user
        const dealAssignments = await this.getDealUserAssignmentsByCloseUserId(user.id);
        
        // Get all deals for this user's assigned contacts
        const deals = await this.getDealsByCloseUserId(user.id);
        
        // Calculate KPIs for this user
        const closedDeals = deals.filter(deal => deal.status === 'won').length;
        const cashCollected = deals.filter(deal => deal.status === 'won')
          .reduce((sum, deal) => sum + (deal.value ? parseInt(deal.value) : 0), 0);
        const contractedValue = deals.reduce((sum, deal) => sum + (deal.value ? parseInt(deal.value) : 0), 0);
        
        // Placeholder for call data - in a real app would be fetched from activities
        const calls = Math.round(5 + Math.random() * 15);
        const call1 = Math.round(calls * 0.6);
        const call2 = Math.round(calls * 0.4);
        const call2Sits = Math.round(call2 * 0.8);
        const closingRate = closedDeals > 0 && dealAssignments.length > 0 
          ? Math.round((closedDeals / dealAssignments.length) * 100) 
          : Math.round(Math.random() * 50);
        
        return {
          // Construct full name from first_name and last_name
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
          id: user.id.toString(),
          closed: closedDeals,
          cashCollected: cashCollected,
          contractedValue: contractedValue,
          calls: calls,
          call1: call1,
          call2: call2,
          call2Sits: call2Sits,
          closingRate: closingRate,
          adminMissingPercent: Math.round(Math.random() * 20)
        };
      }));
    }
    
    // Calculate overall KPIs from real salesTeamData if available
    if (salesTeamData.length > 0) {
      // Sum up values from real users
      const totalClosedDeals = salesTeamData.reduce((sum, user) => sum + user.closed, 0);
      const totalCashCollected = salesTeamData.reduce((sum, user) => sum + user.cashCollected, 0);
      const totalContractedValue = salesTeamData.reduce((sum, user) => sum + user.contractedValue, 0);
      const totalCalls = salesTeamData.reduce((sum, user) => sum + user.calls, 0);
      const totalCall1 = salesTeamData.reduce((sum, user) => sum + user.call1, 0);
      const totalCall2 = salesTeamData.reduce((sum, user) => sum + user.call2, 0);
      
      // Calculate derived metrics
      const closingRate = totalClosedDeals > 0 && totalCall2 > 0 
        ? Math.round((totalClosedDeals / totalCall2) * 100) 
        : 0;
      const avgCashCollected = totalClosedDeals > 0 
        ? Math.round(totalCashCollected / totalClosedDeals) 
        : 0;
      const solutionCallShowRate = 87; // Not enough data to calculate this yet
      const earningPerCall2 = totalCall2 > 0 
        ? Math.round(totalCashCollected / totalCall2) 
        : 0;
      
      return {
        kpis: {
          closedDeals: totalClosedDeals,
          cashCollected: totalCashCollected,
          revenueGenerated: totalContractedValue,
          totalCalls: totalCalls,
          call1Taken: totalCall1,
          call2Taken: totalCall2,
          closingRate: closingRate,
          avgCashCollected: avgCashCollected,
          solutionCallShowRate: solutionCallShowRate,
          earningPerCall2: earningPerCall2
        },
        salesTeam: salesTeamData,
        triageMetrics: {
          booked: Math.round(totalCalls * 0.8),
          sits: Math.round(totalCalls * 0.7),
          showRate: 87.5,
          solutionBookingRate: 35,
          cancelRate: 12.5,
          outboundTriagesSet: Math.round(totalCalls * 0.3),
          totalDirectBookings: Math.round(totalCalls * 0.2),
          inboundLeads: Math.round(totalCalls * 0.5)
        }
      };
    }
      
    // Use the metrics data if available, or calculate from sales data
    if (metricsData) {
      const metricsJson = metricsData.metadata ? 
        (typeof metricsData.metadata === 'string' ? 
          JSON.parse(metricsData.metadata as string) : 
          metricsData.metadata) : null;
          
      if (metricsJson && metricsJson.dashboardData) {
        return metricsJson.dashboardData;
      }
    }
    
    // If no real data is available, use sample data with real sales team members
    if (salesTeamData && salesTeamData.length > 0) {
      return {
        kpis: {
          closedDeals: 4,
          cashCollected: 125500,
          revenueGenerated: 195000,
          totalCalls: 38,
          call1Taken: 25,
          call2Taken: 13,
          closingRate: 31,
          avgCashCollected: 31375,
          solutionCallShowRate: 87,
          earningPerCall2: 9654
        },
        salesTeam: salesTeamData,
        triageMetrics: {
          booked: Math.round(38 * 0.8),
          sits: Math.round(38 * 0.7),
          showRate: 87.5,
          solutionBookingRate: 35,
          cancelRate: 12.5,
          outboundTriagesSet: Math.round(38 * 0.3),
          totalDirectBookings: Math.round(38 * 0.2),
          directBookingRate: 25
        },
        leadMetrics: {
          newLeads: Math.round(38 * 2),
          disqualified: Math.round(38 * 0.3),
          totalDials: Math.round(38 * 3),
          pickUpRate: "35%"
        },
        advancedMetrics: {
          costPerClosedWon: Math.round(125500 / 4),
          closerSlotUtilization: 85,
          solutionCallCloseRate: Math.round((4 / 13) * 100),
          salesCycle: 14,
          callsToClose: Math.round((38 / 4) * 10) / 10,
          profitPerSolutionCall: Math.round(125500 / 13 / 2)
        },
        missingAdmins: [
          {
            assignedTo: salesTeamData[0] ? salesTeamData[0].name : "Unknown",
            count: 2,
            contacts: [
              {
                id: 101,
                name: "Alice Johnson",
                email: "alice@example.com",
                eventType: "Solution Call",
                callDateTime: "2025-03-15T10:00:00"
              },
              {
                id: 102,
                name: "Bob Smith",
                email: "bob@example.com",
                eventType: "Triage Call",
                callDateTime: "2025-03-16T11:30:00"
              }
            ]
          },
          {
            assignedTo: salesTeamData[1] ? salesTeamData[1].name : "Unknown",
            count: 1,
            contacts: [
              {
                id: 103,
                name: "Carol White",
                email: "carol@example.com",
                eventType: "Solution Call",
                callDateTime: "2025-03-18T14:00:00"
              }
            ]
          }
        ]
      };
    }
    
    // Return an empty result if all else fails
    return {
      kpis: {
        closedDeals: 0,
        cashCollected: 0,
        revenueGenerated: 0,
        totalCalls: 0,
        call1Taken: 0,
        call2Taken: 0,
        closingRate: 0,
        avgCashCollected: 0,
        solutionCallShowRate: 0,
        earningPerCall2: 0
      },
      salesTeam: [],
      triageMetrics: {
        booked: 0,
        sits: 0,
        showRate: 0,
        solutionBookingRate: 0,
        cancelRate: 0,
        outboundTriagesSet: 0,
        totalDirectBookings: 0,
        directBookingRate: 0
      },
      leadMetrics: {
        newLeads: 0,
        disqualified: 0,
        totalDials: 0,
        pickUpRate: "0%"
      },
      advancedMetrics: {
        costPerClosedWon: 0,
        closerSlotUtilization: 0,
        solutionCallCloseRate: 0,
        salesCycle: 0,
        callsToClose: 0,
        profitPerSolutionCall: 0
      }
    };
  }
}

export const storage = new DatabaseStorage();
