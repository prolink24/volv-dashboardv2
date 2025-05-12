import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date, real, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email"),
  role: text("role").default("user"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  role: true,
});

// Contact schema - core entity that links across systems
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  company: text("company"),
  title: text("title"),
  sourceId: text("source_id"),           // External ID from the source system
  sourceData: jsonb("source_data"),      // Raw data from the source system
  lastActivityDate: timestamp("last_activity_date"),
  createdAt: timestamp("created_at").defaultNow(),
  leadSource: text("lead_source"),       // "close", "calendly", "typeform"
  status: text("status").default("lead"),
  assignedTo: text("assigned_to"),
  notes: text("notes"),
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

// Activities schema - tracks all interactions
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull(),
  type: text("type").notNull(),
  source: text("source").notNull(), // "close", "calendly", "typeform"
  sourceId: text("source_id"),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  metadata: jsonb("metadata"),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
});

// Deals schema - tracks opportunities
export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull(),
  title: text("title").notNull(),
  value: numeric("value"),
  status: text("status").notNull(), // open, won, lost
  closeDate: date("close_date"),
  createdAt: timestamp("created_at").defaultNow(),
  closeId: text("close_id"),
  assignedTo: text("assigned_to"),
  metadata: jsonb("metadata"),
});

export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  createdAt: true,
});

// Meetings schema - tracks calendly events
export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull(),
  calendlyEventId: text("calendly_event_id").notNull().unique(),
  type: text("type").notNull(), // triage, solution, follow-up, etc.
  title: text("title").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").notNull(), // scheduled, completed, canceled, etc.
  assignedTo: text("assigned_to"),
  metadata: jsonb("metadata"),
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
});

// Forms schema - tracks typeform submissions
export const forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull(),
  typeformResponseId: text("typeform_response_id").notNull().unique(),
  formName: text("form_name").notNull(),
  submittedAt: timestamp("submitted_at").notNull(),
  answers: jsonb("answers"),
});

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
});

// KPI metrics schema - cached calculations
export const metrics = pgTable("metrics", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  userId: text("user_id"),
  closedDeals: integer("closed_deals").default(0),
  cashCollected: numeric("cash_collected").default(0),
  revenueGenerated: numeric("revenue_generated").default(0),
  totalCalls: integer("total_calls").default(0),
  call1Taken: integer("call1_taken").default(0),
  call2Taken: integer("call2_taken").default(0),
  closingRate: real("closing_rate").default(0),
  avgCashCollected: numeric("avg_cash_collected").default(0),
  solutionCallShowRate: real("solution_call_show_rate").default(0),
  earningPerCall2: numeric("earning_per_call2").default(0),
  metadata: jsonb("metadata"),
});

export const insertMetricsSchema = createInsertSchema(metrics).omit({
  id: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof deals.$inferSelect;

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;

export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof forms.$inferSelect;

export type InsertMetrics = z.infer<typeof insertMetricsSchema>;
export type Metrics = typeof metrics.$inferSelect;

// Dashboard response types for frontend
export type DashboardData = {
  kpis: {
    closedDeals: number;
    cashCollected: number;
    revenueGenerated: number;
    totalCalls: number;
    call1Taken: number;
    call2Taken: number;
    closingRate: number;
    avgCashCollected: number;
    solutionCallShowRate: number;
    earningPerCall2: number;
  };
  salesTeam: {
    name: string;
    id: string;
    closed: number;
    cashCollected: number;
    contractedValue: number;
    calls: number;
    call1: number;
    call2: number;
    call2Sits: number;
    closingRate: number;
    adminMissingPercent: number;
  }[];
  triageMetrics: {
    booked: number;
    sits: number;
    showRate: number;
    solutionBookingRate: number;
    cancelRate: number;
    outboundTriagesSet: number;
    totalDirectBookings: number;
    directBookingRate: number;
  };
  leadMetrics: {
    newLeads: number;
    disqualified: number;
    totalDials: number;
    pickUpRate: number;
  };
  advancedMetrics: {
    costPerClosedWon: number;
    closerSlotUtilization: number;
    solutionCallCloseRate: number;
    salesCycle: number;
    callsToClose: number;
    profitPerSolutionCall: number;
  };
  missingAdmins: {
    assignedTo: string;
    count: number;
    contacts: {
      id: number;
      name: string;
      email: string;
      eventType: string;
      callDateTime: string;
    }[];
  }[];
};

export type ContactsData = {
  contacts: Contact[];
  totalCount: number;
  activities: Activity[];
};

export type MeetingsData = {
  meetings: Meeting[];
  totalCount: number;
};

export type FormsData = {
  forms: Form[];
  totalCount: number;
};
