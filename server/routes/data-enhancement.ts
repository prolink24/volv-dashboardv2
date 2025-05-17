/**
 * Data Enhancement API Routes
 * 
 * These routes expose the data enhancement services to improve 
 * the quality of our contact attribution data.
 */

import express, { Request, Response, Router } from "express";
import { storage } from "../storage";
import attributionService from "../services/attribution";

// Create a router for all data enhancement routes
const router = Router();

// Enhance all data (run all enhancement steps)
router.post("/enhance-all", async (req: Request, res: Response) => {
  try {
    console.log("Starting comprehensive data enhancement process...");
    
    // Run all enhancement steps in sequence
    const [contactFields, sourcesCount, cashCollected, meetingClassification, attribution] = await Promise.all([
      enhanceContactFields(),
      updateSourcesCount(),
      fixCashCollected(),
      classifyMeetings(),
      attributionService.attributeAllContacts()
    ]);
    
    res.json({
      success: true,
      contactFields,
      sourcesCount,
      cashCollected,
      meetingClassification,
      attribution
    });
  } catch (error: any) {
    console.error("Error during comprehensive data enhancement:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error during data enhancement process"
    });
  }
});

// Fix missing contact fields
router.post("/fix-contact-fields", async (req: Request, res: Response) => {
  try {
    const result = await enhanceContactFields();
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error("Error fixing contact fields:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error during contact field enhancement"
    });
  }
});

// Update sources count for multi-source attribution
router.post("/update-sources-count", async (req: Request, res: Response) => {
  try {
    const result = await updateSourcesCount();
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error("Error updating sources count:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error during sources count update"
    });
  }
});

// Fix cash collected values for won deals
router.post("/fix-cash-collected", async (req: Request, res: Response) => {
  try {
    const result = await fixCashCollected();
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error("Error fixing cash collected values:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error during cash collected fix"
    });
  }
});

// Classify meetings and set sequence numbers
router.post("/classify-meetings", async (req: Request, res: Response) => {
  try {
    const result = await classifyMeetings();
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error("Error classifying meetings:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error during meeting classification"
    });
  }
});

// Run attribution process
router.post("/run-attribution", async (req: Request, res: Response) => {
  try {
    const result = await attributionService.attributeAllContacts();
    res.json({
      success: true,
      result
    });
  } catch (error: any) {
    console.error("Error running attribution:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error during attribution process"
    });
  }
});

// Enhancement functions
async function enhanceContactFields() {
  console.log("Enhancing contact fields...");
  
  const contacts = await storage.getAllContacts();
  let updated = 0;
  let errors = 0;
  let fieldCoverageImproved = 0;
  
  for (const contact of contacts) {
    try {
      let needsUpdate = false;
      const updateData: any = {};
      
      // Set last_activity_date if missing
      if (!contact.lastActivityDate) {
        const activities = await storage.getActivitiesByContactId(contact.id);
        if (activities.length > 0) {
          // Sort by date descending and take the first one
          activities.sort((a, b) => 
            (b.date?.getTime() || 0) - (a.date?.getTime() || 0)
          );
          
          if (activities[0].date) {
            updateData.lastActivityDate = activities[0].date;
            needsUpdate = true;
          }
        }
      }
      
      // Set assigned_to if missing
      if (!contact.assignedTo) {
        const assignments = await storage.getContactUserAssignments(contact.id);
        if (assignments.length > 0) {
          const closeUser = await storage.getCloseUser(assignments[0].closeUserId);
          if (closeUser) {
            updateData.assignedTo = closeUser.name || closeUser.email;
            needsUpdate = true;
          }
        }
      }
      
      // Set field_coverage score
      const contactFields = Object.keys(contact).filter(key => 
        contact[key as keyof Contact] !== null && 
        contact[key as keyof Contact] !== undefined &&
        key !== 'id' && 
        key !== 'createdAt' && 
        key !== 'metadata'
      );
      
      const totalFields = 20; // Approximate count of important fields
      const fieldCoverage = Math.round((contactFields.length / totalFields) * 100) / 100;
      
      // Only update if the new field coverage is better
      if (contact.fieldCoverage === null || fieldCoverage > (contact.fieldCoverage || 0)) {
        updateData.fieldCoverage = fieldCoverage;
        needsUpdate = true;
        fieldCoverageImproved++;
      }
      
      // Update the contact if needed
      if (needsUpdate) {
        await storage.updateContact(contact.id, updateData);
        updated++;
      }
    } catch (error) {
      console.error(`Error enhancing contact ${contact.id}:`, error);
      errors++;
    }
  }
  
  return {
    total: contacts.length,
    updated,
    fieldCoverageImproved,
    errors
  };
}

async function updateSourcesCount() {
  console.log("Updating sources count...");
  
  const contacts = await storage.getAllContacts();
  let multiSourceUpdated = 0;
  let errors = 0;
  
  for (const contact of contacts) {
    try {
      // Count unique sources
      const sources = new Set<string>();
      
      // Check for Close CRM activities
      const activities = await storage.getActivitiesByContactId(contact.id);
      if (activities.length > 0) {
        sources.add('close');
      }
      
      // Check for Calendly meetings
      const meetings = await storage.getMeetingsByContactId(contact.id);
      if (meetings.length > 0) {
        sources.add('calendly');
      }
      
      // Check for Typeform form submissions
      const forms = await storage.getFormsByContactId(contact.id);
      if (forms.length > 0) {
        sources.add('typeform');
      }
      
      // Update sourcesCount if it's different
      const sourcesCount = sources.size;
      if (contact.sourcesCount !== sourcesCount) {
        await storage.updateContact(contact.id, { sourcesCount });
        multiSourceUpdated++;
      }
    } catch (error) {
      console.error(`Error updating sources count for contact ${contact.id}:`, error);
      errors++;
    }
  }
  
  return {
    total: contacts.length,
    multiSourceUpdated,
    errors
  };
}

async function fixCashCollected() {
  console.log("Fixing cash collected values...");
  
  const wonDeals = await storage.getDealsByStatus("won");
  let updated = 0;
  let errors = 0;
  let totalCashCollected = 0;
  
  for (const deal of wonDeals) {
    try {
      // Only update deals without cash_collected value
      if (!deal.cashCollected) {
        let cashCollectedValue = 0;
        
        // If we have a deal value, use that as the cash collected value
        if (deal.value) {
          const value = parseFloat(deal.value);
          if (!isNaN(value)) {
            cashCollectedValue = value;
          }
        }
        
        // Update the deal with the cash collected value
        if (cashCollectedValue > 0) {
          await storage.updateDeal(deal.id, { 
            cashCollected: cashCollectedValue.toString()
          });
          totalCashCollected += cashCollectedValue;
          updated++;
        }
      } else {
        // Add to total for reporting
        const cashCollectedValue = parseFloat(deal.cashCollected);
        if (!isNaN(cashCollectedValue)) {
          totalCashCollected += cashCollectedValue;
        }
      }
    } catch (error) {
      console.error(`Error fixing cash collected for deal ${deal.id}:`, error);
      errors++;
    }
  }
  
  return {
    total: wonDeals.length,
    updated,
    totalCashCollected,
    errors
  };
}

async function classifyMeetings() {
  console.log("Classifying meetings...");
  
  const meetings = await storage.getAllMeetings();
  let updated = 0;
  let errors = 0;
  const bySequence: Record<number, number> = {};
  
  // First, group meetings by contact
  const meetingsByContact = new Map<number, Array<{ id: number; startTime: Date; }>>();
  
  for (const meeting of meetings) {
    if (meeting.contactId && meeting.startTime) {
      const contactMeetings = meetingsByContact.get(meeting.contactId) || [];
      contactMeetings.push({
        id: meeting.id,
        startTime: meeting.startTime
      });
      meetingsByContact.set(meeting.contactId, contactMeetings);
    }
  }
  
  // Then, process each contact's meetings
  for (const [contactId, contactMeetings] of meetingsByContact.entries()) {
    try {
      // Sort meetings by startTime
      contactMeetings.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      
      // Update each meeting with its sequence number
      for (let i = 0; i < contactMeetings.length; i++) {
        const sequenceNumber = i + 1; // 1-based sequence
        const meetingId = contactMeetings[i].id;
        
        // Update meeting with sequence number
        await storage.updateMeeting(meetingId, { 
          sequence: sequenceNumber,
          meetingType: getMeetingType(sequenceNumber)
        });
        
        // Track counts by sequence
        bySequence[sequenceNumber] = (bySequence[sequenceNumber] || 0) + 1;
        
        updated++;
      }
    } catch (error) {
      console.error(`Error classifying meetings for contact ${contactId}:`, error);
      errors++;
    }
  }
  
  return {
    total: meetings.length,
    updated,
    bySequence,
    errors
  };
}

function getMeetingType(sequence: number): string {
  switch (sequence) {
    case 1:
      return "NC1";
    case 2:
      return "C2";
    case 3:
      return "C3";
    default:
      return `C${sequence}`;
  }
}

export default router;