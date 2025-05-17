/**
 * Data Enhancement API Routes
 * 
 * These routes expose the data enhancement services to improve 
 * the quality of our contact attribution data.
 */

import express, { Request, Response, Router } from "express";
import { storage } from "../storage";
import attributionService from "../services/attribution";
import { enhanceContactFields } from "../services/field-mapping";
import { 
  fixCashCollected, 
  classifyMeetings, 
  updateSourcesCount 
} from "../services/deal-enhancement";

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
      error: error.message || "Error during cash collected enhancement"
    });
  }
});

// Update sources count for all contacts
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

// Classify and sequence meetings
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
    const sampleSize = req.body.sampleSize ? parseInt(req.body.sampleSize, 10) : undefined;
    const result = await attributionService.attributeAllContacts(sampleSize);
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error("Error running attribution process:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error during attribution process"
    });
  }
});

// Get current enhancement stats
router.get("/stats", async (req: Request, res: Response) => {
  try {
    // Count contacts with field coverage > 90%
    const contacts = await storage.getAllContacts();
    const highCoverageContacts = contacts.filter(c => c.fieldCoverage && c.fieldCoverage > 90).length;
    const fieldCoverageRate = contacts.length > 0 ? (highCoverageContacts / contacts.length) * 100 : 0;
    
    // Count multi-source contacts
    const multiSourceContacts = contacts.filter(c => c.sourcesCount && c.sourcesCount > 1).length;
    const multiSourceRate = contacts.length > 0 ? (multiSourceContacts / contacts.length) * 100 : 0;
    
    // Count won deals with cash collected
    const wonDeals = await storage.getDealsByStatus("won");
    const dealsWithCashCollected = wonDeals.filter(d => d.cashCollected && d.cashCollected !== "0" && d.cashCollected !== "").length;
    const cashCollectedRate = wonDeals.length > 0 ? (dealsWithCashCollected / wonDeals.length) * 100 : 0;
    
    // Count meetings with sequence numbers
    const meetings = await storage.getAllMeetings();
    const meetingsWithSequence = meetings.filter(m => m.sequence !== null && m.sequence !== undefined).length;
    const sequenceRate = meetings.length > 0 ? (meetingsWithSequence / meetings.length) * 100 : 0;
    
    res.json({
      success: true,
      totals: {
        contacts: contacts.length,
        deals: wonDeals.length,
        meetings: meetings.length
      },
      rates: {
        fieldCoverage: parseFloat(fieldCoverageRate.toFixed(2)),
        multiSource: parseFloat(multiSourceRate.toFixed(2)),
        cashCollected: parseFloat(cashCollectedRate.toFixed(2)),
        meetingSequence: parseFloat(sequenceRate.toFixed(2))
      }
    });
  } catch (error: any) {
    console.error("Error getting enhancement stats:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error retrieving enhancement statistics"
    });
  }
});

export default router;