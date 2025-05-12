import { 
  User, InsertUser, users,
  Contact, InsertContact, contacts,
  Activity, InsertActivity, activities,
  Deal, InsertDeal, deals,
  Meeting, InsertMeeting, meetings,
  Form, InsertForm, forms,
  Metrics, InsertMetrics, metrics
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: number, deal: Partial<InsertDeal>): Promise<Deal | undefined>;
  deleteDeal(id: number): Promise<boolean>;
  
  // Meeting operations
  getMeeting(id: number): Promise<Meeting | undefined>;
  getMeetingsByContactId(contactId: number): Promise<Meeting[]>;
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
  
  private userCurrentId: number;
  private contactCurrentId: number;
  private activityCurrentId: number;
  private dealCurrentId: number;
  private meetingCurrentId: number;
  private formCurrentId: number;
  private metricsCurrentId: number;

  constructor() {
    this.users = new Map();
    this.contacts = new Map();
    this.activities = new Map();
    this.deals = new Map();
    this.meetings = new Map();
    this.forms = new Map();
    this.metricsData = new Map();
    
    this.userCurrentId = 1;
    this.contactCurrentId = 1;
    this.activityCurrentId = 1;
    this.dealCurrentId = 1;
    this.meetingCurrentId = 1;
    this.formCurrentId = 1;
    this.metricsCurrentId = 1;

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
    return Array.from(this.contacts.values()).find(
      (contact) => contact.email === email
    );
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

export const storage = new MemStorage();
