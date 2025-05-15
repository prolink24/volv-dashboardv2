/**
 * Field Coverage Service
 * 
 * This service provides functions to calculate and update field coverage for various entities
 * (contacts, activities, deals, meetings, forms).
 * 
 * Field coverage is defined as the percentage of applicable fields that have valid, non-empty values.
 * This is a critical metric for ensuring data quality and completeness for attribution.
 */

import { db } from '../db';
import { 
  contacts, activities, deals, meetings, forms,
  type Contact, type Activity, type Deal, type Meeting, type Form
} from '@shared/schema';
import { eq, and, isNull, or, gt, lt } from 'drizzle-orm';

/**
 * Calculate field coverage percentage for a contact
 * @param contact The contact object
 * @returns Field coverage percentage (0-100)
 */
export function calculateContactFieldCoverage(contact: Contact): number {
  const requiredFields = [
    'name',
    'email',
    'phone',
    'company',
    'title', 
    'leadSource',
    'createdAt'
  ];

  const optionalFields = [
    'address',
    'city',
    'state',
    'zipcode',
    'country',
    'linkedInUrl',
    'twitterHandle',
    'secondaryEmail',
    'secondaryPhone',
    'utmSource',
    'utmMedium',
    'utmCampaign',
    'referralSource',
    'timezone',
    'language',
    'leadScore',
    'qualificationStatus',
    'leadTemperature',
    'firstTouchDate'
  ];

  let filledRequiredCount = 0;
  let filledOptionalCount = 0;

  // Check required fields
  for (const field of requiredFields) {
    if (contact[field as keyof Contact] !== null && 
        contact[field as keyof Contact] !== undefined && 
        String(contact[field as keyof Contact]).trim() !== '') {
      filledRequiredCount++;
    }
  }

  // Check optional fields
  for (const field of optionalFields) {
    if (contact[field as keyof Contact] !== null && 
        contact[field as keyof Contact] !== undefined && 
        String(contact[field as keyof Contact]).trim() !== '') {
      filledOptionalCount++;
    }
  }

  // Calculate coverage: weight required fields higher than optional fields
  const requiredWeight = 0.7; // 70% of the score comes from required fields
  const optionalWeight = 0.3; // 30% from optional fields

  const requiredScore = (filledRequiredCount / requiredFields.length) * requiredWeight * 100;
  const optionalScore = (filledOptionalCount / optionalFields.length) * optionalWeight * 100;

  return Math.round(requiredScore + optionalScore);
}

/**
 * Calculate field coverage percentage for an activity
 * @param activity The activity object
 * @returns Field coverage percentage (0-100)
 */
export function calculateActivityFieldCoverage(activity: Activity): number {
  // Base fields required for all activity types
  const baseRequiredFields = [
    'contactId',
    'type',
    'source',
    'source_id',
    'date'
  ];

  let typeSpecificFields: string[] = [];
  
  // Add type-specific required fields
  if (activity.type === 'call') {
    typeSpecificFields = [
      'call_direction', 
      'call_duration',
      'call_outcome'
    ];
  } else if (activity.type === 'email') {
    typeSpecificFields = [
      'email_subject',
      'email_status'
    ];
  } else if (activity.type === 'task') {
    typeSpecificFields = [
      'task_status',
      'task_due_date'
    ];
  }

  const allRequiredFields = [...baseRequiredFields, ...typeSpecificFields];
  let filledCount = 0;

  // Check all required fields
  for (const field of allRequiredFields) {
    if (activity[field as keyof Activity] !== null && 
        activity[field as keyof Activity] !== undefined && 
        String(activity[field as keyof Activity]).trim() !== '') {
      filledCount++;
    }
  }

  // Simple percentage calculation
  return Math.round((filledCount / allRequiredFields.length) * 100);
}

/**
 * Calculate field coverage percentage for a deal
 * @param deal The deal object
 * @returns Field coverage percentage (0-100)
 */
export function calculateDealFieldCoverage(deal: Deal): number {
  const requiredFields = [
    'contactId',
    'name',
    'value',
    'status',
    'source',
    'source_id',
    'created_date'
  ];

  const optionalFields = [
    'confidence',
    'cash_collected',
    'contracted_value',
    'value_period',
    'value_currency',
    'lead_name',
    'status_label'
  ];

  let filledRequiredCount = 0;
  let filledOptionalCount = 0;

  // Check required fields
  for (const field of requiredFields) {
    if (deal[field as keyof Deal] !== null && 
        deal[field as keyof Deal] !== undefined && 
        String(deal[field as keyof Deal]).trim() !== '') {
      filledRequiredCount++;
    }
  }

  // Check optional fields
  for (const field of optionalFields) {
    if (deal[field as keyof Deal] !== null && 
        deal[field as keyof Deal] !== undefined && 
        String(deal[field as keyof Deal]).trim() !== '') {
      filledOptionalCount++;
    }
  }

  // Calculate coverage: weight required fields higher than optional fields
  const requiredWeight = 0.8; // 80% of the score comes from required fields
  const optionalWeight = 0.2; // 20% from optional fields

  const requiredScore = (filledRequiredCount / requiredFields.length) * requiredWeight * 100;
  const optionalScore = (filledOptionalCount / optionalFields.length) * optionalWeight * 100;

  return Math.round(requiredScore + optionalScore);
}

/**
 * Calculate field coverage percentage for a meeting
 * @param meeting The meeting object
 * @returns Field coverage percentage (0-100)
 */
export function calculateMeetingFieldCoverage(meeting: Meeting): number {
  const requiredFields = [
    'contactId',
    'type',
    'status',
    'date',
    'source',
    'source_id'
  ];

  const optionalFields = [
    'duration',
    'invitee_email',
    'invitee_name',
    'assignee_email',
    'location',
    'conference_url',
    'rescheduled',
    'canceled_at',
    'utm_source',
    'utm_medium',
    'utm_campaign'
  ];

  let filledRequiredCount = 0;
  let filledOptionalCount = 0;

  // Check required fields
  for (const field of requiredFields) {
    if (meeting[field as keyof Meeting] !== null && 
        meeting[field as keyof Meeting] !== undefined && 
        String(meeting[field as keyof Meeting]).trim() !== '') {
      filledRequiredCount++;
    }
  }

  // Check optional fields
  for (const field of optionalFields) {
    if (meeting[field as keyof Meeting] !== null && 
        meeting[field as keyof Meeting] !== undefined && 
        String(meeting[field as keyof Meeting]).trim() !== '') {
      filledOptionalCount++;
    }
  }

  // Calculate coverage: weight required fields higher than optional fields
  const requiredWeight = 0.7; // 70% of the score comes from required fields
  const optionalWeight = 0.3; // 30% from optional fields

  const requiredScore = (filledRequiredCount / requiredFields.length) * requiredWeight * 100;
  const optionalScore = (filledOptionalCount / optionalFields.length) * optionalWeight * 100;

  return Math.round(requiredScore + optionalScore);
}

/**
 * Calculate field coverage percentage for a form submission
 * @param form The form object
 * @returns Field coverage percentage (0-100)
 */
export function calculateFormFieldCoverage(form: Form): number {
  const requiredFields = [
    'contactId',
    'name',
    'status',
    'submission_date',
    'source',
    'source_id'
  ];

  const optionalFields = [
    'form_id',
    'respondent_email',
    'respondent_name',
    'completion_time',
    'completion_percentage',
    'utm_source',
    'utm_medium',
    'utm_campaign'
  ];

  let filledRequiredCount = 0;
  let filledOptionalCount = 0;

  // Check required fields
  for (const field of requiredFields) {
    if (form[field as keyof Form] !== null && 
        form[field as keyof Form] !== undefined && 
        String(form[field as keyof Form]).trim() !== '') {
      filledRequiredCount++;
    }
  }

  // Check optional fields
  for (const field of optionalFields) {
    if (form[field as keyof Form] !== null && 
        form[field as keyof Form] !== undefined && 
        String(form[field as keyof Form]).trim() !== '') {
      filledOptionalCount++;
    }
  }

  // Calculate coverage: weight required fields higher than optional fields
  const requiredWeight = 0.7; // 70% of the score comes from required fields
  const optionalWeight = 0.3; // 30% from optional fields

  const requiredScore = (filledRequiredCount / requiredFields.length) * requiredWeight * 100;
  const optionalScore = (filledOptionalCount / optionalFields.length) * optionalWeight * 100;

  return Math.round(requiredScore + optionalScore);
}

/**
 * Update field coverage for all contacts in the database
 */
export async function updateAllContactsFieldCoverage(): Promise<void> {
  const allContacts = await db.select().from(contacts);
  let updatedCount = 0;

  for (const contact of allContacts) {
    const coverage = calculateContactFieldCoverage(contact);
    
    // Mark if all required fields are complete
    const requiredFieldsComplete = coverage >= 70; // 70% is our threshold for "complete"
    
    await db.update(contacts)
      .set({ 
        fieldCoverage: coverage, 
        requiredFieldsComplete: requiredFieldsComplete 
      })
      .where(eq(contacts.id, contact.id));
    
    updatedCount++;
    
    // Log progress for large datasets
    if (updatedCount % 100 === 0) {
      console.log(`Updated field coverage for ${updatedCount} contacts...`);
    }
  }

  console.log(`Field coverage updated for ${updatedCount} contacts.`);
}

/**
 * Update field coverage for all activities in the database
 */
export async function updateAllActivitiesFieldCoverage(): Promise<void> {
  const allActivities = await db.select().from(activities);
  let updatedCount = 0;

  for (const activity of allActivities) {
    const coverage = calculateActivityFieldCoverage(activity);
    
    await db.update(activities)
      .set({ fieldCoverage: coverage })
      .where(eq(activities.id, activity.id));
    
    updatedCount++;
    
    // Log progress for large datasets
    if (updatedCount % 100 === 0) {
      console.log(`Updated field coverage for ${updatedCount} activities...`);
    }
  }

  console.log(`Field coverage updated for ${updatedCount} activities.`);
}

/**
 * Update field coverage for all deals in the database
 */
export async function updateAllDealsFieldCoverage(): Promise<void> {
  const allDeals = await db.select().from(deals);
  let updatedCount = 0;

  for (const deal of allDeals) {
    const coverage = calculateDealFieldCoverage(deal);
    
    await db.update(deals)
      .set({ fieldCoverage: coverage })
      .where(eq(deals.id, deal.id));
    
    updatedCount++;
    
    // Log progress for large datasets
    if (updatedCount % 100 === 0) {
      console.log(`Updated field coverage for ${updatedCount} deals...`);
    }
  }

  console.log(`Field coverage updated for ${updatedCount} deals.`);
}

/**
 * Update field coverage for all meetings in the database
 */
export async function updateAllMeetingsFieldCoverage(): Promise<void> {
  const allMeetings = await db.select().from(meetings);
  let updatedCount = 0;

  for (const meeting of allMeetings) {
    const coverage = calculateMeetingFieldCoverage(meeting);
    
    await db.update(meetings)
      .set({ fieldCoverage: coverage })
      .where(eq(meetings.id, meeting.id));
    
    updatedCount++;
    
    // Log progress for large datasets
    if (updatedCount % 100 === 0) {
      console.log(`Updated field coverage for ${updatedCount} meetings...`);
    }
  }

  console.log(`Field coverage updated for ${updatedCount} meetings.`);
}

/**
 * Update field coverage for all forms in the database
 */
export async function updateAllFormsFieldCoverage(): Promise<void> {
  const allForms = await db.select().from(forms);
  let updatedCount = 0;

  for (const form of allForms) {
    const coverage = calculateFormFieldCoverage(form);
    
    await db.update(forms)
      .set({ fieldCoverage: coverage })
      .where(eq(forms.id, form.id));
    
    updatedCount++;
    
    // Log progress for large datasets
    if (updatedCount % 100 === 0) {
      console.log(`Updated field coverage for ${updatedCount} forms...`);
    }
  }

  console.log(`Field coverage updated for ${updatedCount} forms.`);
}

/**
 * Update field coverage for all entities in the database
 */
export async function updateAllFieldCoverage(): Promise<void> {
  console.log("Starting field coverage update for all entities...");
  
  await updateAllContactsFieldCoverage();
  await updateAllActivitiesFieldCoverage();
  await updateAllDealsFieldCoverage();
  await updateAllMeetingsFieldCoverage();
  await updateAllFormsFieldCoverage();
  
  console.log("Field coverage update completed for all entities.");
}

/**
 * Get the overall field coverage percentage across all entities
 * @returns Object with coverage percentages by entity type and overall average
 */
export async function getOverallFieldCoverage(): Promise<{
  contacts: number;
  activities: number;
  deals: number;
  meetings: number;
  forms: number;
  average: number;
}> {
  // Get average field coverage for contacts
  const contactsResult = await db.select({
    avg: db.fn.avg(contacts.fieldCoverage)
  }).from(contacts);
  
  // Get average field coverage for activities
  const activitiesResult = await db.select({
    avg: db.fn.avg(activities.fieldCoverage)
  }).from(activities);
  
  // Get average field coverage for deals
  const dealsResult = await db.select({
    avg: db.fn.avg(deals.fieldCoverage)
  }).from(deals);
  
  // Get average field coverage for meetings
  const meetingsResult = await db.select({
    avg: db.fn.avg(meetings.fieldCoverage)
  }).from(meetings);
  
  // Get average field coverage for forms
  const formsResult = await db.select({
    avg: db.fn.avg(forms.fieldCoverage)
  }).from(forms);
  
  // Convert results to numbers, defaulting to 0 if null
  const contactsCoverage = Number(contactsResult[0]?.avg || 0);
  const activitiesCoverage = Number(activitiesResult[0]?.avg || 0);
  const dealsCoverage = Number(dealsResult[0]?.avg || 0);
  const meetingsCoverage = Number(meetingsResult[0]?.avg || 0);
  const formsCoverage = Number(formsResult[0]?.avg || 0);
  
  // Calculate overall average (weighted by importance)
  const contactsWeight = 0.3;
  const activitiesWeight = 0.2;
  const dealsWeight = 0.3;
  const meetingsWeight = 0.15;
  const formsWeight = 0.05;
  
  const overall = (
    contactsCoverage * contactsWeight +
    activitiesCoverage * activitiesWeight +
    dealsCoverage * dealsWeight +
    meetingsCoverage * meetingsWeight +
    formsCoverage * formsWeight
  );
  
  return {
    contacts: Math.round(contactsCoverage),
    activities: Math.round(activitiesCoverage),
    deals: Math.round(dealsCoverage),
    meetings: Math.round(meetingsCoverage),
    forms: Math.round(formsCoverage),
    average: Math.round(overall)
  };
}

/**
 * Get contacts with incomplete required fields
 * @param limit Maximum number of contacts to return
 * @returns Array of contacts with incomplete required fields
 */
export async function getIncompleteContacts(limit: number = 100): Promise<Contact[]> {
  return db
    .select()
    .from(contacts)
    .where(
      or(
        eq(contacts.requiredFieldsComplete, false),
        isNull(contacts.requiredFieldsComplete),
        lt(contacts.fieldCoverage, 70)
      )
    )
    .limit(limit);
}

/**
 * Calculate the field coverage for a new or updated entity
 * @param entityType Type of entity ('contact', 'activity', 'deal', 'meeting', 'form')
 * @param entity The entity object
 * @returns Field coverage percentage (0-100)
 */
export function calculateFieldCoverage(
  entityType: 'contact' | 'activity' | 'deal' | 'meeting' | 'form',
  entity: Contact | Activity | Deal | Meeting | Form
): number {
  switch (entityType) {
    case 'contact':
      return calculateContactFieldCoverage(entity as Contact);
    case 'activity':
      return calculateActivityFieldCoverage(entity as Activity);
    case 'deal':
      return calculateDealFieldCoverage(entity as Deal);
    case 'meeting':
      return calculateMeetingFieldCoverage(entity as Meeting);
    case 'form':
      return calculateFormFieldCoverage(entity as Form);
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}