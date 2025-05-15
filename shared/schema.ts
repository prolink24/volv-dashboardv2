import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date, real, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import KPI configuration schema
export * from "./schema/kpi-configuration";

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

// Close CRM User schema
export const closeUsers = pgTable("close_users", {
  id: serial("id").primaryKey(),
  closeId: text("close_id").notNull().unique(),
  first_name: text("first_name"),
  last_name: text("last_name"),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  sourceData: jsonb("source_data"),
});

export const insertCloseUserSchema = createInsertSchema(closeUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User assignments for contacts
export const contactToUserAssignments = pgTable("contact_user_assignments", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull(),
  closeUserId: integer("close_user_id").notNull(),
  assignmentDate: timestamp("assignment_date").defaultNow(),
  assignmentType: text("assignment_type").default("primary"), // primary, secondary, etc.
  sourceData: jsonb("source_data"),
});

export const insertContactUserAssignmentSchema = createInsertSchema(contactToUserAssignments).omit({
  id: true,
});

// User assignments for deals
export const dealToUserAssignments = pgTable("deal_user_assignments", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  closeUserId: integer("close_user_id").notNull(),
  assignmentDate: timestamp("assignment_date").defaultNow(),
  assignmentType: text("assignment_type").default("primary"), // primary, secondary, etc.
  sourceData: jsonb("source_data"),
});

export const insertDealUserAssignmentSchema = createInsertSchema(dealToUserAssignments).omit({
  id: true,
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
  type: text("type").notNull(), // call, email, task, note, etc.
  source: text("source").notNull(), // "close", "calendly", "typeform"
  sourceId: text("source_id"),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  // Call-specific fields
  callDuration: integer("call_duration"), // Duration in seconds
  callDirection: text("call_direction"), // inbound, outbound
  callOutcome: text("call_outcome"), // answered, voicemail, no-answer, etc.
  callNotes: text("call_notes"), // Notes from the call
  callRecordingUrl: text("call_recording_url"), // URL to recording if available
  // Email-specific fields
  emailSubject: text("email_subject"),
  emailBody: text("email_body"),
  emailStatus: text("email_status"), // sent, opened, clicked, replied
  emailTemplate: text("email_template"), // Template name if used
  // Task-specific fields
  taskStatus: text("task_status"), // completed, in_progress, etc.
  taskDueDate: timestamp("task_due_date"),
  taskAssignedTo: text("task_assigned_to"),
  taskPriority: text("task_priority"), // high, medium, low
  // Field tracking
  fieldCoverage: integer("field_coverage"), // Percentage of fields filled (0-100)
  // Additional metadata
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
  value: text("value"), // Store as text to handle any format including currency symbols
  status: text("status").notNull(), // open, won, lost
  closeDate: date("close_date"),
  createdAt: timestamp("created_at").defaultNow(),
  closeId: text("close_id"),
  assignedTo: text("assigned_to"),
  // Explicit financial fields from Close CRM custom fields
  cashCollected: text("cash_collected"), // Amount actually collected
  contractedValue: text("contracted_value"), // Total contracted value
  valuePeriod: text("value_period"), // monthly, annual, one-time
  valueCurrency: text("value_currency"), // USD, EUR, etc.
  // Sales process tracking
  confidence: integer("confidence"), // Confidence score (0-100)
  leadName: text("lead_name"), // Associated lead name
  statusLabel: text("status_label"), // Human-readable status
  // Field tracking
  fieldCoverage: integer("field_coverage"), // Percentage of fields filled (0-100)
  // All other custom fields stored in metadata
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
  cashCollected: text("cash_collected").default("0"),
  revenueGenerated: text("revenue_generated").default("0"),
  totalCalls: integer("total_calls").default(0),
  call1Taken: integer("call1_taken").default(0),
  call2Taken: integer("call2_taken").default(0),
  closingRate: text("closing_rate").default("0"),
  avgCashCollected: text("avg_cash_collected").default("0"),
  solutionCallShowRate: text("solution_call_show_rate").default("0"),
  earningPerCall2: text("earning_per_call2").default("0"),
  metadata: jsonb("metadata"),
});

export const insertMetricsSchema = createInsertSchema(metrics).omit({
  id: true,
});

// Define relations
export const usersRelations = relations(users, ({ many }: { many: any }) => ({
  closeUsers: many(closeUsers)
}));

export const closeUsersRelations = relations(closeUsers, ({ many }: { many: any }) => ({
  contactAssignments: many(contactToUserAssignments),
  dealAssignments: many(dealToUserAssignments)
}));

export const contactsRelations = relations(contacts, ({ many }: { many: any }) => ({
  userAssignments: many(contactToUserAssignments),
  activities: many(activities),
  deals: many(deals),
  meetings: many(meetings),
  forms: many(forms)
}));

export const dealsRelations = relations(deals, ({ many, one }: { many: any, one: any }) => ({
  contact: one(contacts, { fields: [deals.contactId], references: [contacts.id] }),
  userAssignments: many(dealToUserAssignments)
}));

export const contactToUserAssignmentsRelations = relations(contactToUserAssignments, ({ one }: { one: any }) => ({
  contact: one(contacts, { fields: [contactToUserAssignments.contactId], references: [contacts.id] }),
  user: one(closeUsers, { fields: [contactToUserAssignments.closeUserId], references: [closeUsers.id] })
}));

export const dealToUserAssignmentsRelations = relations(dealToUserAssignments, ({ one }: { one: any }) => ({
  deal: one(deals, { fields: [dealToUserAssignments.dealId], references: [deals.id] }),
  user: one(closeUsers, { fields: [dealToUserAssignments.closeUserId], references: [closeUsers.id] })
}));

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCloseUser = z.infer<typeof insertCloseUserSchema>;
export type CloseUser = typeof closeUsers.$inferSelect;

export type InsertContactUserAssignment = z.infer<typeof insertContactUserAssignmentSchema>;
export type ContactUserAssignment = typeof contactToUserAssignments.$inferSelect;

export type InsertDealUserAssignment = z.infer<typeof insertDealUserAssignmentSchema>;
export type DealUserAssignment = typeof dealToUserAssignments.$inferSelect;

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
  attribution?: {
    accuracy: number;
    contactsWithMultipleSources: number;
    totalContacts: number;
    multiSourceRate: number;
    channelDistribution: {
      name: string;
      value: number;
    }[];
    contactsBySource: {
      source: string;
      count: number;
      percentage: number;
    }[];
    contactsWithMissingData: number;
    fieldCoverage: number;
    insights: {
      title: string;
      description: string;
      icon?: React.ReactNode;
      badge?: {
        text: string;
        variant: "default" | "destructive" | "secondary" | "outline";
      };
    }[];
  };
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
