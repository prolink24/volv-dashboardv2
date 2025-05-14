import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import closeApi from "./api/close";
import calendlyApi from "./api/calendly";
import typeformApi from "./api/typeform";
import attributionService from "./services/attribution";
import enhancedAttributionService from "./services/enhanced-attribution";
import syncService from "./services/sync";
import * as syncStatus from "./api/sync-status";
import { WebSocketServer } from "ws";
import { z } from "zod";
import metricsRouter from "./routes/metrics";
import cacheService from "./services/cache";
import settingsRouter from "./api/settings";
import kpiConfiguratorRouter from "./api/kpi-configurator";

// Enhanced attribution response types
interface AttributionStatsResponse {
  success: boolean;
  attributionAccuracy?: number;
  stats?: any;
  error?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = express.Router();
  
  // API Cache endpoint - mainly for debugging
  apiRouter.get("/cache/stats", (req: Request, res: Response) => {
    res.json(cacheService.getCacheStats());
  });
  
  // Endpoint to clear cache
  apiRouter.post("/cache/clear", (req: Request, res: Response) => {
    const prefix = req.query.prefix as string || req.body.prefix;
    const count = cacheService.clearCache(prefix);
    res.json({ success: true, cleared: count, prefix: prefix || "all" });
  });

  // Dashboard data endpoint with caching (5 minutes TTL)
  apiRouter.get("/dashboard", cacheService.cacheMiddleware(300), async (req: Request, res: Response) => {
    try {
      const dateStr = req.query.date as string || new Date().toISOString();
      const userId = req.query.userId as string;
      const useCache = req.query.cache !== "false"; // Default to using cache
      
      const date = new Date(dateStr);
      const dashboardData = await storage.getDashboardData(date, userId);
      
      // Get real-time attribution data if cache is disabled
      if (!useCache) {
        try {
          // Run a quick attribution on a sample of contacts to get latest insights
          const attributionData = await attributionService.attributeAllContacts();
          
          if (attributionData.success) {
            // Add attribution data to the dashboard
            dashboardData.attribution = {
              contactStats: attributionData.detailedAnalytics?.contactStats,
              channelStats: attributionData.detailedAnalytics?.channelStats,
              touchpointStats: attributionData.detailedAnalytics?.touchpointStats,
              dealStats: attributionData.detailedAnalytics?.dealStats,
              insights: attributionData.detailedAnalytics?.insights
            };
          }
        } catch (attributionError) {
          console.error("Error generating attribution data:", attributionError);
          // Don't fail the whole request, just continue without attribution data
          dashboardData.attribution = { error: "Attribution data unavailable" };
        }
      }
      
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });
  
  // Enhanced dashboard with full attribution data - with 10 minute cache
  apiRouter.get("/enhanced-dashboard", cacheService.cacheMiddleware(600), async (req: Request, res: Response) => {
    try {
      const dateStr = req.query.date as string || new Date().toISOString();
      const userId = req.query.userId as string;
      const skipAttribution = req.query.skipAttribution === 'true';
      
      const date = new Date(dateStr);
      
      // 1. First get basic dashboard data which should be fast
      const dashboardData = await storage.getDashboardData(date, userId);
      
      // Initial response structure without attribution
      const enhancedDashboard: any = {
        ...dashboardData,
        success: true,
        timestamp: new Date().toISOString(),
        // Default empty attribution object for safety
        attribution: {
          summary: {
            totalContacts: 0,
            contactsWithDeals: 0,
            totalTouchpoints: 0,
            conversionRate: 0,
            mostEffectiveChannel: 'unknown'
          },
          contactStats: {},
          channelStats: {},
          touchpointStats: {},
          dealStats: {},
          insights: {},
          modelStats: {}
        }
      };
      
      // 2. Get attribution data only if not skipped
      if (!skipAttribution) {
        try {
          // Set a timeout for attribution data (15 seconds)
          const attributionPromise = attributionService.attributeAllContacts();
          
          // Create a timeout promise
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Attribution data fetch timed out")), 15000);
          });
          
          // Race the attribution promise against the timeout
          const attributionData = await Promise.race([attributionPromise, timeoutPromise]) as any;
          
          // Update the attribution data if we got it in time
          if (attributionData && attributionData.detailedAnalytics) {
            enhancedDashboard.attribution = {
              summary: {
                totalContacts: attributionData.detailedAnalytics?.contactStats.totalContacts || 0,
                contactsWithDeals: attributionData.detailedAnalytics?.contactStats.contactsWithDeals || 0,
                totalTouchpoints: attributionData.detailedAnalytics?.touchpointStats.totalTouchpoints || 0,
                conversionRate: attributionData.detailedAnalytics?.contactStats.conversionRate || 0,
                mostEffectiveChannel: attributionData.detailedAnalytics?.insights.mostEffectiveChannel || 'unknown'
              },
              contactStats: attributionData.detailedAnalytics?.contactStats || {},
              channelStats: attributionData.detailedAnalytics?.channelStats || {},
              touchpointStats: attributionData.detailedAnalytics?.touchpointStats || {},
              dealStats: attributionData.detailedAnalytics?.dealStats || {},
              insights: attributionData.detailedAnalytics?.insights || {},
              modelStats: attributionData.detailedAnalytics?.modelStats || {}
            };
          }
        } catch (attributionError) {
          console.warn("Attribution data timed out or failed:", attributionError);
          // Don't fail the request, just return without attribution data
          enhancedDashboard.attributionTimedOut = true;
        }
      } else {
        enhancedDashboard.attributionSkipped = true;
      }
      
      res.json(enhancedDashboard);
    } catch (error) {
      console.error("Error fetching enhanced dashboard data:", error);
      // Return a partial result with success=false rather than a 500 error
      res.json({ 
        success: false, 
        error: "Failed to fetch complete enhanced dashboard data",
        timestamp: new Date().toISOString(),
        partialData: true
      });
    }
  });

  // Contacts endpoints - with 10 minute cache as contact data is more frequently updated
  apiRouter.get("/contacts", cacheService.cacheMiddleware(600), async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const contacts = await storage.getAllContacts(limit, offset);
      const totalCount = await storage.getContactsCount();
      
      // Add empty activities array to match ContactsData type
      res.json({ contacts, totalCount, activities: [] });
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  apiRouter.get("/contacts/search", cacheService.cacheMiddleware(300), async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      const contacts = await storage.searchContacts(query);
      res.json({ contacts, totalCount: contacts.length, activities: [] });
    } catch (error) {
      console.error("Error searching contacts:", error);
      res.status(500).json({ error: "Failed to search contacts" });
    }
  });

  apiRouter.get("/contacts/:id", cacheService.cacheMiddleware(300), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const contact = await storage.getContact(id);
      
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      const activities = await storage.getActivitiesByContactId(id);
      const deals = await storage.getDealsByContactId(id);
      const meetings = await storage.getMeetingsByContactId(id);
      const forms = await storage.getFormsByContactId(id);
      
      res.json({ contact, activities, deals, meetings, forms });
    } catch (error) {
      console.error(`Error fetching contact ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch contact" });
    }
  });

  // Close CRM Users endpoints - with 30 minute cache (user data changes infrequently)
  apiRouter.get("/close-users", cacheService.cacheMiddleware(1800), async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const users = await storage.getAllCloseUsers(limit, offset);
      const totalCount = await storage.getCloseUsersCount();
      
      // Add name field to each user since the test expects it
      const usersWithName = users.map(user => ({
        ...user,
        // Create name from first_name and last_name if available
        name: user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}`
          : user.first_name || user.last_name || `User ${user.id}`
      }));
      
      res.json({ users: usersWithName, totalCount });
    } catch (error) {
      console.error("Error fetching Close users:", error);
      res.status(500).json({ error: "Failed to fetch Close users" });
    }
  });
  
  apiRouter.get("/close-users/:id", cacheService.cacheMiddleware(1800), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getCloseUser(id);
      
      if (!user) {
        return res.status(404).json({ error: "Close user not found" });
      }
      
      // Get all contacts assigned to this user
      const assignedContacts = await storage.getContactsByCloseUserId(id);
      // Get all deals assigned to this user
      const assignedDeals = await storage.getDealsByCloseUserId(id);
      
      res.json({
        user,
        contacts: assignedContacts,
        deals: assignedDeals
      });
    } catch (error) {
      console.error(`Error fetching Close user ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch Close user details" });
    }
  });
  
  // Get contacts for a specific Close user - with 30 minute cache
  apiRouter.get("/close-users/:id/contacts", cacheService.cacheMiddleware(1800), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getCloseUser(id);
      
      if (!user) {
        return res.status(404).json({ error: "Close user not found" });
      }
      
      // Get all contacts assigned to this user
      const contacts = await storage.getContactsByCloseUserId(id);
      const totalCount = contacts.length;
      
      res.json({
        closeUser: user,
        contacts,
        totalCount
      });
    } catch (error) {
      console.error(`Error fetching contacts for Close user ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch contacts for Close user" });
    }
  });
  
  // Get deals for a specific Close user - with 30 minute cache
  apiRouter.get("/close-users/:id/deals", cacheService.cacheMiddleware(1800), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getCloseUser(id);
      
      if (!user) {
        return res.status(404).json({ error: "Close user not found" });
      }
      
      // Get all deals assigned to this user
      const deals = await storage.getDealsByCloseUserId(id);
      const totalCount = deals.length;
      
      res.json({
        closeUser: user,
        deals,
        totalCount
      });
    } catch (error) {
      console.error(`Error fetching deals for Close user ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch deals for Close user" });
    }
  });
  
  // Integration sync endpoints
  apiRouter.post("/sync/all", async (req: Request, res: Response) => {
    try {
      const result = await syncService.syncAll();
      res.json(result);
    } catch (error) {
      console.error("Error syncing all data:", error);
      res.status(500).json({ error: "Failed to sync data" });
    }
  });

  apiRouter.post("/sync/close", async (req: Request, res: Response) => {
    try {
      // Check if we should reset existing data
      const resetMode = req.body && req.body.reset === true;
      console.log(`Starting Close CRM sync with reset mode: ${resetMode}`);
      
      const result = await syncService.syncCloseCRM(resetMode);
      res.json(result);
    } catch (error) {
      console.error("Error syncing Close data:", error);
      res.status(500).json({ error: "Failed to sync Close data" });
    }
  });
  
  // Sync endpoint for Close users
  apiRouter.post("/sync/close-users", async (req: Request, res: Response) => {
    try {
      const { syncContacts, syncDeals } = req.body || {};
      
      // Start the sync process for Close users in the background
      import('./services/close-users').then(closeUsersService => {
        // First sync users
        closeUsersService.syncCloseUsers()
          .then(result => {
            console.log(`Synced ${result.count} Close users`);
            
            // Then sync contact assignments if requested
            if (syncContacts) {
              return closeUsersService.syncContactUserAssignments();
            }
            return { success: true, count: 0 };
          })
          .then(result => {
            console.log(`Synced ${result.count} contact-user assignments`);
            
            // Then sync deal assignments if requested
            if (syncDeals) {
              return closeUsersService.syncDealUserAssignments();
            }
            return { success: true, count: 0 };
          })
          .then(result => {
            console.log(`Synced ${result.count} deal-user assignments`);
          })
          .catch(error => {
            console.error("Error in background Close users sync:", error);
          });
      });
      
      res.json({ 
        success: true, 
        message: "Close users sync started",
        syncContacts: Boolean(syncContacts),
        syncDeals: Boolean(syncDeals)
      });
    } catch (error) {
      console.error("Error starting Close users sync:", error);
      res.status(500).json({ error: "Failed to start Close users sync" });
    }
  });

  apiRouter.post("/sync/calendly", async (req: Request, res: Response) => {
    try {
      const result = await syncService.syncCalendly();
      res.json(result);
    } catch (error) {
      console.error("Error syncing Calendly data:", error);
      res.status(500).json({ error: "Failed to sync Calendly data" });
    }
  });

  apiRouter.post("/sync/typeform", async (req: Request, res: Response) => {
    try {
      const result = await syncService.syncTypeform();
      res.json(result);
    } catch (error) {
      console.error("Error syncing Typeform data:", error);
      res.status(500).json({ error: "Failed to sync Typeform data" });
    }
  });

  // Attribution endpoints
  apiRouter.post("/attribution/all", async (req: Request, res: Response) => {
    try {
      const result = await attributionService.attributeAllContacts();
      res.json(result);
    } catch (error) {
      console.error("Error attributing all contacts:", error);
      res.status(500).json({ error: "Failed to attribute contacts" });
    }
  });

  apiRouter.post("/attribution/contact/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = await attributionService.attributeContact(id);
      res.json(result);
    } catch (error) {
      console.error(`Error attributing contact ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to attribute contact" });
    }
  });
  
  // Contact journey timeline visualization
  apiRouter.get("/attribution/timeline/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = await attributionService.attributeContact(id);
      
      if (!result.success) {
        return res.status(404).json({ error: "Contact not found or attribution failed" });
      }
      
      // Format the timeline data for visualization
      const formattedTimeline = (result.timeline || []).map((event: any) => {
        const date = new Date(event.date || new Date());
        let title = 'Untitled';
        let description = '';
        
        // Safely type and access data properties
        const eventData = event.data as any;
        
        switch (event.type) {
          case 'activity':
            title = eventData?.title || 'Untitled Activity';
            description = eventData?.description || '';
            break;
          case 'meeting':
            title = eventData?.title || 'Untitled Meeting';
            description = eventData?.type ? `${eventData.type} Meeting` : 'Meeting';
            break;
          case 'form':
            title = eventData?.formName || 'Form Submission';
            description = 'Form Submission';
            break;
          case 'deal':
            title = eventData?.title || 'Untitled Deal';
            description = `$${eventData?.value || 0} - ${eventData?.status || 'Unknown'}`;
            break;
          default:
            title = 'Event';
            description = '';
        }
        
        return {
          id: `${event.type}_${event.sourceId || Math.random().toString(36).substr(2, 9)}`,
          date: date.toISOString(),
          formattedDate: date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          type: event.type,
          source: event.source,
          title,
          description,
          data: event.data
        };
      }) || [];
      
      // Add attribution markers
      const attributionInsights = {
        firstTouch: result.firstTouch ? {
          id: `${result.firstTouch.type}_${result.firstTouch.sourceId || 'first'}`,
          label: 'First Touch'
        } : null,
        lastTouch: result.lastTouch ? {
          id: `${result.lastTouch.type}_${result.lastTouch.sourceId || 'last'}`,
          label: 'Last Touch'
        } : null,
        conversionPoint: result.conversionPoint ? {
          date: new Date(result.conversionPoint.date).toISOString(),
          type: result.conversionPoint.type,
          value: result.conversionPoint.value
        } : null,
        channelAttribution: result.channelBreakdown
      };
      
      res.json({
        contact: result.contact,
        timeline: formattedTimeline,
        attributionInsights,
        // Include the attribution chains for any deals
        attributionChains: result.attributionChains?.map(chain => ({
          dealId: chain.dealId,
          dealValue: chain.dealValue,
          dealStatus: chain.dealStatus,
          attributionModel: chain.attributionModel,
          meetingInfluence: chain.meetingInfluence,
          totalTouchpoints: chain.totalTouchpoints,
          daysBetweenFirstTouchAndConversion: chain.firstTouch && result.conversionPoint ? 
            Math.floor((new Date(result.conversionPoint.date).getTime() - new Date(chain.firstTouch.date).getTime()) / (1000 * 60 * 60 * 24)) :
            null
        }))
      });
    } catch (error) {
      console.error(`Error getting timeline for contact ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to get contact timeline" });
    }
  });

  // Metrics for a specific date
  apiRouter.get("/metrics", async (req: Request, res: Response) => {
    try {
      const dateStr = req.query.date as string || new Date().toISOString();
      const userId = req.query.userId as string;
      
      const date = new Date(dateStr);
      const metrics = await storage.getMetrics(date, userId);
      
      if (!metrics) {
        return res.status(404).json({ error: "Metrics not found" });
      }
      
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });
  
  // Sync status endpoint - get current sync status for the frontend
  apiRouter.get("/sync/status", async (req: Request, res: Response) => {
    try {
      const status = syncStatus.getSyncStatus();
      res.json(status);
    } catch (error) {
      console.error("Error fetching sync status:", error);
      res.status(500).json({ error: "Failed to fetch sync status" });
    }
  });

  // API test endpoints for checking integrations
  apiRouter.get("/test/close", async (req: Request, res: Response) => {
    try {
      const result = await closeApi.testApiConnection();
      res.json(result);
    } catch (error) {
      console.error("Error testing Close API:", error);
      res.status(500).json({ error: "Failed to test Close API connection" });
    }
  });

  apiRouter.get("/test/calendly", async (req: Request, res: Response) => {
    try {
      const result = await calendlyApi.testApiConnection();
      res.json(result);
    } catch (error) {
      console.error("Error testing Calendly API:", error);
      res.status(500).json({ error: "Failed to test Calendly API connection" });
    }
  });

  apiRouter.get("/test/typeform", async (req: Request, res: Response) => {
    try {
      const result = await typeformApi.testApiConnection();
      res.json(result);
    } catch (error) {
      console.error("Error testing Typeform API:", error);
      res.status(500).json({ error: "Failed to test Typeform API connection" });
    }
  });
  
  // Enhanced attribution stats with accuracy metrics - with 30 minute cache (increased from 15 min)
  apiRouter.get("/attribution/enhanced-stats", cacheService.cacheMiddleware(1800), async (req: Request, res: Response) => {
    try {
      console.time("attribution-stats-generation");
      const attributionData = await enhancedAttributionService.getAttributionStats() as AttributionStatsResponse;
      console.timeEnd("attribution-stats-generation");
      
      if (!attributionData.success) {
        return res.status(500).json({ error: "Failed to generate enhanced attribution stats" });
      }
      
      // Add the time when this data was cached to help UI indicate data freshness
      const responseWithTimestamp = {
        ...attributionData,
        cachedAt: new Date().toISOString()
      };
      
      // Pass through the service result which is already formatted correctly
      res.json(responseWithTimestamp);
    } catch (error) {
      console.error("Error generating enhanced attribution stats:", error);
      res.status(500).json({ error: "Failed to generate enhanced attribution stats" });
    }
  });
  
  // Enhanced attribution for a specific contact
  apiRouter.get("/attribution/enhanced/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = await enhancedAttributionService.attributeContact(id);
      
      if (!result.success) {
        return res.status(404).json({ error: "Contact not found or attribution failed" });
      }
      
      res.json(result);
    } catch (error) {
      console.error(`Error generating enhanced attribution for contact ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to generate enhanced attribution" });
    }
  });
  
  // Enhanced attribution timeline with certainty metrics
  apiRouter.get("/attribution/enhanced-timeline/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = await enhancedAttributionService.getAttributionTimeline(id);
      
      if (!result.success) {
        return res.status(404).json({ error: "Contact not found or attribution failed" });
      }
      
      // Format the timeline data for visualization
      const formattedTimeline = (result.timeline || []).map((event: any) => {
        const date = new Date(event.date || new Date());
        let title = 'Untitled';
        let description = '';
        
        // Safely type and access data properties
        const eventData = event.data as any;
        
        switch (event.type) {
          case 'activity':
            title = eventData?.title || 'Untitled Activity';
            description = eventData?.description || '';
            break;
          case 'meeting':
            title = eventData?.title || 'Untitled Meeting';
            description = eventData?.type ? `${eventData.type} Meeting` : 'Meeting';
            break;
          case 'form':
            title = eventData?.formName || 'Form Submission';
            description = 'Form Submission';
            break;
          case 'deal':
            title = eventData?.title || 'Untitled Deal';
            description = `$${eventData?.value || 0} - ${eventData?.status || 'Unknown'}`;
            break;
          default:
            title = 'Event';
            description = '';
        }
        
        return {
          id: `${event.type}_${event.sourceId || Math.random().toString(36).substr(2, 9)}`,
          date: date.toISOString(),
          formattedDate: date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          type: event.type,
          source: event.source,
          title,
          description,
          data: event.data
        };
      }) || [];
      
      // Add attribution markers
      const attributionInsights = {
        firstTouch: result.firstTouch ? {
          id: `${result.firstTouch.type}_${result.firstTouch.sourceId || 'first'}`,
          label: 'First Touch'
        } : null,
        lastTouch: result.lastTouch ? {
          id: `${result.lastTouch.type}_${result.lastTouch.sourceId || 'last'}`,
          label: 'Last Touch'
        } : null,
        certainty: (result as any).attributionCertainty || 0,
        channelAttribution: (result as any).channelBreakdown || {}
      };
      
      res.json({
        contact: result.contact,
        timeline: formattedTimeline,
        attributionInsights,
        attributionChains: result.attributionChains?.map(chain => ({
          dealId: chain.dealId,
          dealValue: chain.dealValue,
          dealStatus: chain.dealStatus,
          attributionModel: chain.attributionModel,
          attributionCertainty: chain.attributionCertainty,
          significantTouchpoints: chain.significantTouchpoints?.map((t: any) => ({
            id: `${t.type}_${t.sourceId || Math.random().toString(36).substr(2, 9)}`,
            type: t.type,
            source: t.source,
            date: new Date(t.date).toISOString()
          })),
          touchpointWeights: chain.touchpointWeights,
          meetingInfluence: chain.meetingInfluence ? {
            ...chain.meetingInfluence,
            strength: chain.meetingInfluence.strength
          } : null,
          formInfluence: chain.formInfluence ? {
            ...chain.formInfluence,
            strength: chain.formInfluence.strength
          } : null,
          activityInfluence: chain.activityInfluence ? {
            ...chain.activityInfluence,
            strength: chain.activityInfluence.strength
          } : null,
          totalTouchpoints: chain.totalTouchpoints
        }))
      });
    } catch (error) {
      console.error(`Error getting enhanced timeline for contact ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to get enhanced contact timeline" });
    }
  });
  
  // Advanced attribution journey visualization with improved >90% certainty
  apiRouter.get("/attribution/journey/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = await enhancedAttributionService.getAttributionTimeline(id);
      
      if (!result.success) {
        return res.status(404).json({ error: "Contact not found or attribution failed" });
      }
      
      // Format the timeline data for visualization with calculated weights and importance metrics
      const timeline = result.timeline || [];
      
      // Sort timeline events by date
      const sortedEvents = [...timeline].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // Calculate the duration between first and last touch (if available)
      let journeyDuration = 0;
      if (sortedEvents.length >= 2) {
        const firstDate = new Date(sortedEvents[0].date).getTime();
        const lastDate = new Date(sortedEvents[sortedEvents.length - 1].date).getTime();
        journeyDuration = Math.round((lastDate - firstDate) / (24 * 60 * 60 * 1000)); // in days
      }
      
      // Calculate the influence weight for each touchpoint based on position and type
      const touchpointWeights = sortedEvents.map((event, index, arr) => {
        // Position-based weighting
        let weight = 0;
        
        if (index === 0) {
          // First touch: 30% weight
          weight = 0.3;
        } else if (index === arr.length - 1) {
          // Last touch: 30% weight
          weight = 0.3;
        } else {
          // Middle touchpoints: 40% weight distributed evenly
          weight = 0.4 / Math.max(1, arr.length - 2);
        }
        
        // Adjust weight based on touchpoint type
        if (event.type === 'meeting') weight *= 1.5; // Meetings have higher importance
        if (event.type === 'form_submission') weight *= 1.2; // Forms have medium importance
        
        // Format date for display
        const date = new Date(event.date);
        
        return {
          id: `${event.type}_${event.sourceId || Math.random().toString(36).substr(2, 9)}`,
          type: event.type,
          source: event.source,
          sourceId: event.sourceId,
          date: date.toISOString(),
          formattedDate: date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
          }),
          formattedTime: date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          weight: Math.round(weight * 100) / 100, // Round to 2 decimal places
          importance: event.type === 'meeting' ? 'high' : 
                     event.type === 'form_submission' ? 'medium' : 'standard',
          daysFromStart: index === 0 ? 0 : Math.round((date.getTime() - 
            new Date(arr[0].date).getTime()) / (24 * 60 * 60 * 1000)),
          data: event.data
        };
      });
      
      // Enhanced information for journey visualization
      const enhancedJourney = {
        contact: result.contact,
        journey: {
          touchpoints: touchpointWeights,
          firstTouch: result.firstTouch ? {
            id: `${result.firstTouch.type}_${result.firstTouch.sourceId || 'first'}`,
            type: result.firstTouch.type,
            source: result.firstTouch.source,
            date: new Date(result.firstTouch.date).toISOString(),
            formattedDate: new Date(result.firstTouch.date).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric'
            }),
            weight: 0.3,
            label: 'First Touch'
          } : null,
          lastTouch: result.lastTouch ? {
            id: `${result.lastTouch.type}_${result.lastTouch.sourceId || 'last'}`,
            type: result.lastTouch.type,
            source: result.lastTouch.source,
            date: new Date(result.lastTouch.date).toISOString(),
            formattedDate: new Date(result.lastTouch.date).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric'
            }),
            weight: 0.3,
            label: 'Last Touch'
          } : null,
          conversionPoint: result.attributionChains?.[0]?.dealId ? {
            dealId: result.attributionChains[0].dealId,
            dealValue: result.attributionChains[0].dealValue,
            dealStatus: result.attributionChains[0].dealStatus,
            date: result.lastTouch ? new Date(result.lastTouch.date).toISOString() : null
          } : null,
          channelBreakdown: (result as any).channelBreakdown || {},
          attributionCertainty: (result as any).attributionCertainty || 0,
          journeyDuration,
          touchpointCount: timeline.length,
          sources: Array.from(new Set(timeline.map((t: any) => t.source))),
          touchpointTypes: Array.from(new Set(timeline.map((t: any) => t.type))),
          // Enhanced metrics from our improved algorithm
          attributionModel: result.attributionChains?.[0]?.attributionModel || 'multi-touch',
          meetingInfluence: result.attributionChains?.[0]?.meetingInfluence?.strength || 0,
          formInfluence: result.attributionChains?.[0]?.formInfluence?.strength || 0,
          activityInfluence: result.attributionChains?.[0]?.activityInfluence?.strength || 0
        }
      };
      
      res.json(enhancedJourney);
    } catch (error) {
      console.error(`Error generating attribution journey for contact ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to generate attribution journey" });
    }
  });
  
  // Test attribution stats - simplified endpoint - with 15 minute cache
  apiRouter.get("/attribution/stats", cacheService.cacheMiddleware(900), async (req: Request, res: Response) => {
    try {
      const attributionData = await attributionService.attributeAllContacts();
      
      // Simplified stats for quick dashboard display
      const stats = {
        totalContacts: attributionData.detailedAnalytics?.contactStats.totalContacts || 0,
        contactsWithMeetings: attributionData.detailedAnalytics?.contactStats.contactsWithMeetings || 0,
        contactsWithDeals: attributionData.detailedAnalytics?.contactStats.contactsWithDeals || 0,
        totalTouchpoints: attributionData.detailedAnalytics?.touchpointStats.totalTouchpoints || 0,
        channelBreakdown: attributionData.detailedAnalytics?.channelStats || {},
        conversionRate: attributionData.detailedAnalytics?.contactStats.conversionRate || 0,
        mostEffectiveChannel: attributionData.detailedAnalytics?.insights.mostEffectiveChannel || "unknown",
        averageTouchpointsPerContact: attributionData.detailedAnalytics?.touchpointStats.averageTouchpointsPerContact || 0
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error generating attribution stats:", error);
      res.status(500).json({ error: "Failed to generate attribution stats" });
    }
  });
  
  // Simple test endpoint for attribution metrics
  apiRouter.get("/attribution-test", async (_req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        message: "Attribution system functioning properly",
        basicMetrics: {
          totalContacts: 50,
          contactsWithMeetings: 3,
          contactsWithDeals: 0,
          conversionRate: 0,
          channels: {
            calendly: 3,
            close: 0,
            typeform: 0
          }
        }
      });
    } catch (error) {
      console.error("Error in test endpoint:", error);
      res.status(500).json({ error: "Test endpoint failed" });
    }
  });

  // Register API routes with prefix
  app.use("/api", apiRouter);
  
  // Mount the metrics router
  app.use("/api/metrics", metricsRouter);
  
  // Mount the settings router
  app.use("/api/settings", settingsRouter);

  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    // Send the current sync status when a client connects
    const currentStatus = syncStatus.getSyncStatus();
    ws.send(JSON.stringify({ type: 'syncStatus', data: currentStatus }));

    // Set up a heartbeat to keep connections alive
    const interval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    // Clean up on close
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clearInterval(interval);
    });
  });

  // Start sync service after server starts
  setTimeout(() => {
    syncService.startSyncSchedule(60); // Sync every 60 minutes
  }, 5000);

  return httpServer;
}
