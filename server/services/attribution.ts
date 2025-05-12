import { storage } from '../storage';
import { Contact, Activity, Deal, Meeting, Form } from '@shared/schema';

// Determines the lead source and attribution for a contact based on all data
export async function attributeContact(contactId: number) {
  try {
    const contact = await storage.getContact(contactId);
    if (!contact) {
      throw new Error(`Contact not found with ID ${contactId}`);
    }
    
    // Get all activities, meetings, and forms for this contact
    const activities = await storage.getActivitiesByContactId(contactId);
    const meetings = await storage.getMeetingsByContactId(contactId);
    const forms = await storage.getFormsByContactId(contactId);
    
    // Sort all touchpoints by date
    const touchpoints = [
      ...activities.map(a => ({ type: 'activity', data: a, date: a.date })),
      ...meetings.map(m => ({ type: 'meeting', data: m, date: m.startTime })),
      ...forms.map(f => ({ type: 'form', data: f, date: f.submittedAt }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Determine first touchpoint (for attribution)
    const firstTouchpoint = touchpoints[0];
    
    let leadSource = contact.leadSource;
    let attributionSource = '';
    let attributionMedium = '';
    
    if (firstTouchpoint) {
      if (firstTouchpoint.type === 'form') {
        leadSource = 'typeform';
        attributionSource = 'form';
        attributionMedium = (firstTouchpoint.data as Form).formName;
      } else if (firstTouchpoint.type === 'meeting') {
        leadSource = 'calendly';
        attributionSource = 'meeting';
        attributionMedium = (firstTouchpoint.data as Meeting).type;
      } else if (firstTouchpoint.type === 'activity') {
        const activity = firstTouchpoint.data as Activity;
        leadSource = activity.source;
        attributionSource = activity.type;
        attributionMedium = activity.title;
      }
    }
    
    // Update contact with attribution data
    const updatedContact = await storage.updateContact(contactId, {
      leadSource,
      notes: contact.notes + `\nAttribution: ${attributionSource} / ${attributionMedium}`
    });
    
    return {
      contact: updatedContact,
      attribution: {
        source: attributionSource,
        medium: attributionMedium,
        firstTouchpointDate: firstTouchpoint?.date || null
      }
    };
  } catch (error) {
    console.error(`Error attributing contact ${contactId}:`, error);
    throw error;
  }
}

// Calculate how many touchpoints before a deal was closed
export async function calculateTouchpointsToClose(contactId: number, dealId: number) {
  try {
    const deal = await storage.getDeal(dealId);
    if (!deal || deal.contactId !== contactId) {
      throw new Error(`Deal ${dealId} not found or does not belong to contact ${contactId}`);
    }
    
    // Get all activities, meetings, and forms for this contact
    const activities = await storage.getActivitiesByContactId(contactId);
    const meetings = await storage.getMeetingsByContactId(contactId);
    const forms = await storage.getFormsByContactId(contactId);
    
    // Sort all touchpoints by date
    const touchpoints = [
      ...activities.map(a => ({ type: 'activity', data: a, date: a.date })),
      ...meetings.map(m => ({ type: 'meeting', data: m, date: m.startTime })),
      ...forms.map(f => ({ type: 'form', data: f, date: f.submittedAt }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Find touchpoints before close date
    const closeDateUTC = deal.closeDate?.getTime() || Date.now();
    const touchpointsBeforeClose = touchpoints.filter(tp => tp.date.getTime() <= closeDateUTC);
    
    return {
      totalTouchpoints: touchpointsBeforeClose.length,
      daysToClose: deal.closeDate 
        ? Math.round((deal.closeDate.getTime() - touchpoints[0].date.getTime()) / (1000 * 60 * 60 * 24)) 
        : null,
      firstTouchpointDate: touchpoints[0]?.date || null,
      touchpointBreakdown: {
        meetings: touchpointsBeforeClose.filter(tp => tp.type === 'meeting').length,
        forms: touchpointsBeforeClose.filter(tp => tp.type === 'form').length,
        activities: touchpointsBeforeClose.filter(tp => tp.type === 'activity').length
      }
    };
  } catch (error) {
    console.error(`Error calculating touchpoints for contact ${contactId} and deal ${dealId}:`, error);
    throw error;
  }
}

// Attribute all contacts
export async function attributeAllContacts() {
  try {
    const contacts = await storage.getAllContacts();
    const results = [];
    
    for (const contact of contacts) {
      const result = await attributeContact(contact.id);
      results.push(result);
    }
    
    return { success: true, count: results.length, results };
  } catch (error) {
    console.error('Error attributing all contacts:', error);
    throw error;
  }
}

export default {
  attributeContact,
  calculateTouchpointsToClose,
  attributeAllContacts
};
