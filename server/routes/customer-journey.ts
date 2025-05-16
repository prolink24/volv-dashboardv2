import { Router, Request, Response } from "express";
import { getCustomerJourney } from "../api/customer-journey";
import { storage } from "../storage";

const router = Router();

// Get customer journey data for a specific contact
router.get("/:contactId", async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.params.contactId, 10);
    
    if (isNaN(contactId)) {
      return res.status(400).json({ error: "Invalid contact ID" });
    }
    
    let dateRange = req.query.dateRange as string | undefined;
    
    const journey = await getCustomerJourney(contactId, dateRange);
    
    if (!journey) {
      // If we couldn't get the journey data, try to at least send the contact info
      const contact = await storage.getContact(contactId);
      
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      // Return a minimal customer journey with just the contact information
      return res.json({
        contactId,
        contact,
        firstTouch: null,
        lastTouch: null,
        totalTouchpoints: 0,
        timelineEvents: [],
        sources: {},
        assignedUsers: [],
        deals: [],
        callMetrics: {
          solutionCallsBooked: 0,
          solutionCallsSits: 0,
          solutionCallShowRate: 0,
          triageCallsBooked: 0,
          triageCallsSits: 0,
          triageShowRate: 0,
          totalDials: 0,
          speedToLead: null,
          pickUpRate: 0,
          callsToClose: 0,
          totalCalls: 0,
          callsPerStage: {},
          directBookingRate: 0,
          cancelRate: 0,
          outboundTriagesSet: 0,
          leadResponseTime: null
        },
        salesMetrics: {
          closedWon: 0,
          costPerClosedWon: null,
          closerSlotUtilization: null,
          solutionCallCloseRate: 0,
          salesCycleDays: null,
          profitPerSolutionCall: null,
          costPerSolutionCall: null,
          cashPerSolutionCallBooked: null,
          revenuePerSolutionCallBooked: null,
          costPerSolutionCallSit: null,
          earningPerCall2Sit: null,
          cashEfficiencyPC2: null,
          profitEfficiencyPC2: null
        },
        adminMetrics: {
          completedAdmin: 0,
          missingAdmins: 0,
          adminMissingPercentage: 0,
          adminAssignments: []
        },
        leadMetrics: {
          newLeads: 1,
          leadsDisqualified: contact.status === 'disqualified' ? 1 : 0,
          totalCallOneShowRate: 0
        },
        journeyMetrics: {
          averageResponseTime: null,
          engagementScore: 0,
          lastActivityGap: null,
          stageTransitions: [],
          conversionRate: null,
          leadStatus: contact.status || 'unknown',
          journeyLength: null
        }
      });
    }
    
    res.json(journey);
  } catch (error) {
    console.error("Error fetching customer journey:", error);
    res.status(500).json({ error: "Failed to fetch customer journey data" });
  }
});

export default router;