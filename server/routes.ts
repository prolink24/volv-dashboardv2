import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import closeApi from "./api/close";
import calendlyApi from "./api/calendly";
import typeformApi from "./api/typeform";
import attributionService from "./services/attribution";
import syncService from "./services/sync";
import syncStatus from "./api/sync-status";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = express.Router();

  // Dashboard data endpoint
  apiRouter.get("/dashboard", async (req: Request, res: Response) => {
    try {
      const dateStr = req.query.date as string || new Date().toISOString();
      const userId = req.query.userId as string;
      
      const date = new Date(dateStr);
      const dashboardData = await storage.getDashboardData(date, userId);
      
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Contacts endpoints
  apiRouter.get("/contacts", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const contacts = await storage.getAllContacts(limit, offset);
      const totalCount = (await storage.getAllContacts()).length;
      
      res.json({ contacts, totalCount });
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  apiRouter.get("/contacts/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      const contacts = await storage.searchContacts(query);
      res.json({ contacts, totalCount: contacts.length });
    } catch (error) {
      console.error("Error searching contacts:", error);
      res.status(500).json({ error: "Failed to search contacts" });
    }
  });

  apiRouter.get("/contacts/:id", async (req: Request, res: Response) => {
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

  // Integration sync endpoints
  apiRouter.post("/sync/all", async (req: Request, res: Response) => {
    try {
      const result = await syncService.syncAllData();
      res.json(result);
    } catch (error) {
      console.error("Error syncing all data:", error);
      res.status(500).json({ error: "Failed to sync data" });
    }
  });

  apiRouter.post("/sync/close", async (req: Request, res: Response) => {
    try {
      const result = await closeApi.syncAllLeads();
      res.json(result);
    } catch (error) {
      console.error("Error syncing Close data:", error);
      res.status(500).json({ error: "Failed to sync Close data" });
    }
  });

  apiRouter.post("/sync/calendly", async (req: Request, res: Response) => {
    try {
      const result = await calendlyApi.syncAllEvents();
      res.json(result);
    } catch (error) {
      console.error("Error syncing Calendly data:", error);
      res.status(500).json({ error: "Failed to sync Calendly data" });
    }
  });

  apiRouter.post("/sync/typeform", async (req: Request, res: Response) => {
    try {
      const result = await typeformApi.syncAllResponses();
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

  // Register API routes with prefix
  app.use("/api", apiRouter);

  // Start sync service after server starts
  setTimeout(() => {
    syncService.scheduleRegularSync(60); // Sync every hour
  }, 5000);

  const httpServer = createServer(app);
  return httpServer;
}
