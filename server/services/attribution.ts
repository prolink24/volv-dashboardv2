/**
 * Attribution Service
 * 
 * This service is responsible for attributing contacts across
 * multiple platforms (Close CRM, Calendly, Typeform) to create
 * a unified view of the customer journey.
 */

import { storage } from '../storage';

/**
 * Attribute a single contact across all platforms
 * 
 * This function:
 * 1. Retrieves all activities, meetings, forms related to a contact
 * 2. Creates a timeline of events
 * 3. Establishes attribution chains across platforms
 * 
 * @param contactId The ID of the contact to attribute
 */
export async function attributeContact(contactId: number) {
  try {
    // Get the contact and related data
    const contact = await storage.getContact(contactId);
    
    if (!contact) {
      return { 
        success: false, 
        error: "Contact not found" 
      };
    }
    
    // Get all data points for this contact
    const activities = await storage.getActivitiesByContactId(contactId);
    const meetings = await storage.getMeetingsByContactId(contactId);
    const forms = await storage.getFormsByContactId(contactId);
    const deals = await storage.getDealsByContactId(contactId);
    
    // Sort all events by date to create an ordered timeline
    const timeline = [
      ...activities.map(a => ({
        type: 'activity',
        date: a.date,
        sourceId: a.sourceId,
        source: 'close',
        data: a
      })),
      ...meetings.map(m => ({
        type: 'meeting',
        date: m.startTime, // Use startTime instead of date for meetings
        sourceId: m.calendlyEventId, // Use calendlyEventId as sourceId
        source: 'calendly',
        data: m
      })),
      ...forms.map(f => ({
        type: 'form',
        date: f.date,
        sourceId: f.sourceId,
        source: 'typeform',
        data: f
      })),
      ...deals.map(d => ({
        type: 'deal',
        date: d.date,
        sourceId: d.sourceId,
        source: 'close',
        data: d
      }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Perform attribution logic
    // This would involve analyzing the timeline to establish attribution chains
    // For example, determining if a form submission led to a meeting,
    // which then led to a deal, etc.
    
    // For now, we'll just return the timeline
    return {
      success: true,
      contact,
      timeline,
      attributionChains: [],
      firstTouch: timeline[0] || null,
      lastTouch: timeline[timeline.length - 1] || null,
      conversionPoint: deals.length > 0 ? {
        type: 'deal',
        date: deals[0].date,
        value: deals[0].value
      } : null
    };
  } catch (error) {
    console.error(`Error attributing contact ${contactId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Attribute all contacts in the system
 * This is used for bulk attribution processing
 */
export async function attributeAllContacts() {
  try {
    const contacts = await storage.getAllContacts();
    
    const results = {
      total: contacts.length,
      processed: 0,
      attributed: 0,
      errors: 0
    };
    
    // Process contacts in batches to avoid memory issues
    const batchSize = 50;
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      
      // Process each contact in the batch
      for (const contact of batch) {
        try {
          const result = await attributeContact(contact.id);
          results.processed++;
          
          if (result.success) {
            results.attributed++;
          } else {
            results.errors++;
          }
        } catch (error) {
          console.error(`Error attributing contact ${contact.id}:`, error);
          results.processed++;
          results.errors++;
        }
      }
    }
    
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error("Error attributing all contacts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export default {
  attributeContact,
  attributeAllContacts
};