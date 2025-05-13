/**
 * Close CRM User Service
 * 
 * This service handles the import, synchronization, and management of Close CRM users
 * and their relationships to contacts and deals.
 */

import { CloseUser, InsertCloseUser, InsertContactUserAssignment, InsertDealUserAssignment } from '@shared/schema';
import closeAPI from '../api/close';
import { storage } from '../storage';

// Import axios to create our own instance if needed
import axios from 'axios';

// Track the last sync time for users
let lastUserSyncTime: Date | null = null;

/**
 * Fetch and sync Close CRM users
 * This function fetches all users from Close CRM and syncs them to our database
 */
export async function syncCloseUsers(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    console.log('Starting Close CRM user sync...');
    
    // First verify API connection
    const connectionTest = await closeAPI.testApiConnection();
    if (!connectionTest.success) {
      throw new Error(`Close API connection failed: ${connectionTest.error}`);
    }
    
    // Fetch all users from Close API
    const users = await fetchCloseUsers();
    
    // Track sync results
    let importedCount = 0;
    let updatedCount = 0;
    let errors = 0;
    
    // Process each user
    for (const userData of users) {
      try {
        // Format for our database
        const closeUserData: InsertCloseUser = {
          closeId: userData.id,
          email: userData.email || '',
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          role: userData.role_name || '',
          status: userData.status || 'active',
          sourceData: userData
        };
        
        // Check if user already exists in our system
        const existingUser = await storage.getCloseUserByCloseId(userData.id);
        
        if (existingUser) {
          // Update existing user
          await storage.updateCloseUser(existingUser.id, closeUserData);
          updatedCount++;
        } else {
          // Create new user
          const newUser = await storage.createCloseUser(closeUserData);
          importedCount++;
          console.log(`Created new Close user: ${newUser.first_name} ${newUser.last_name} (${newUser.email})`);
        }
        
      } catch (err) {
        console.error(`Error processing Close user ${userData.id}:`, err);
        errors++;
      }
    }
    
    // Update lastSyncTime
    lastUserSyncTime = new Date();
    
    console.log(`Close user sync complete. ${importedCount} imported, ${updatedCount} updated, ${errors} errors.`);
    
    return {
      success: true,
      count: importedCount + updatedCount
    };
    
  } catch (error: any) {
    console.error('Error syncing Close users:', error);
    return {
      success: false,
      count: 0,
      error: error.message
    };
  }
}

/**
 * Fetch users from Close CRM API
 */
async function fetchCloseUsers(): Promise<any[]> {
  try {
    // Create our own API client since closeApiClient isn't exported
    const CLOSE_API_KEY = process.env.CLOSE_API_KEY;
    const CLOSE_BASE_URL = 'https://api.close.com/api/v1';
    
    // Create our own axios instance
    const apiClient = axios.create({
      baseURL: CLOSE_BASE_URL,
      auth: {
        username: CLOSE_API_KEY || '',
        password: ''
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
      
    // First test the API connection
    const testResponse = await closeAPI.testApiConnection();
    if (!testResponse.success) {
      throw new Error(`Failed to connect to Close API: ${testResponse.error}`);
    }
    
    // Then fetch users
    const response = await apiClient.get('/user/');
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching Close users:', error);
    throw error;
  }
}

/**
 * Sync contact-user assignments
 * This connects contacts to the Close CRM users they're assigned to
 * @param forceSync If true, overwrite all existing assignments
 */
export async function syncContactUserAssignments(forceSync: boolean = false): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    console.log('Starting Contact-User assignment sync...');
    
    // Get all contacts
    const allContacts = await storage.getAllContacts();
    
    // Track sync results
    let importedCount = 0;
    let errors = 0;
    
    // Process each contact
    for (const contact of allContacts) {
      try {
        // Skip contacts without Close data
        if (!contact.sourceData || !contact.leadSource || contact.leadSource !== 'close') {
          continue;
        }
        
        const sourceData = contact.sourceData;
        
        // Extract assigned_to information from source data
        const sourceDataObj = typeof sourceData === 'string' 
          ? JSON.parse(sourceData as string) 
          : sourceData;
          
        const assignedToId = sourceDataObj?.assigned_to_id || sourceDataObj?.assigned_to;
        
        if (!assignedToId) {
          continue; // No assignment
        }
        
        // First, check if we already have this assignment
        const existingAssignments = await storage.getContactUserAssignmentsByContactId(contact.id);
        
        // If we have existing assignments and not forcing sync, skip
        if (existingAssignments.length > 0 && !forceSync) {
          continue;
        }
        
        // Find the Close user in our database
        const closeUser = await storage.getCloseUserByCloseId(assignedToId);
        
        if (!closeUser) {
          // This would be unusual since we should have synced users first
          console.log(`Cannot find Close user with ID ${assignedToId}, skipping assignment`);
          continue;
        }
        
        // Create the assignment
        const assignmentData: InsertContactUserAssignment = {
          contactId: contact.id,
          closeUserId: closeUser.id,
          assignmentType: 'primary',
          assignmentDate: new Date(),
          sourceData: { from: 'close_sync', contact_id: contact.id, close_user_id: closeUser.id }
        };
        
        // If forcing sync, delete existing assignments first
        if (forceSync && existingAssignments.length > 0) {
          for (const assignment of existingAssignments) {
            await storage.deleteContactUserAssignment(assignment.id);
          }
        }
        
        // Create the new assignment
        await storage.createContactUserAssignment(assignmentData);
        importedCount++;
        
      } catch (err) {
        console.error(`Error processing contact-user assignment for contact ${contact.id}:`, err);
        errors++;
      }
    }
    
    console.log(`Contact-User assignment sync complete. ${importedCount} assignments created, ${errors} errors.`);
    
    return {
      success: true,
      count: importedCount
    };
    
  } catch (error: any) {
    console.error('Error syncing contact-user assignments:', error);
    return {
      success: false,
      count: 0,
      error: error.message
    };
  }
}

/**
 * Sync deal-user assignments
 * This connects deals to the Close CRM users they're assigned to
 * @param forceSync If true, overwrite all existing assignments
 */
export async function syncDealUserAssignments(forceSync: boolean = false): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    console.log('Starting Deal-User assignment sync...');
    
    // Get all deals
    const allDeals = await storage.getAllOpportunities();
    
    // Track sync results
    let importedCount = 0;
    let errors = 0;
    
    // Process each deal
    for (const deal of allDeals) {
      try {
        // Skip deals without metadata
        if (!deal.metadata) {
          continue;
        }
        
        // Safely handle metadata which could be a string or object
        const metadata = typeof deal.metadata === 'string'
          ? JSON.parse(deal.metadata as string)
          : deal.metadata;
        
        // Extract assigned_to information
        const assignedToId = deal.assignedTo || metadata?.assigned_to || metadata?.assigned_to_id;
        
        if (!assignedToId) {
          continue; // No assignment
        }
        
        // First, check if we already have this assignment
        const existingAssignments = await storage.getDealUserAssignmentsByDealId(deal.id);
        
        // If we have existing assignments and not forcing sync, skip
        if (existingAssignments.length > 0 && !forceSync) {
          continue;
        }
        
        // Find the Close user in our database
        const closeUser = await storage.getCloseUserByCloseId(assignedToId);
        
        if (!closeUser) {
          // This would be unusual since we should have synced users first
          console.log(`Cannot find Close user with ID ${assignedToId}, skipping assignment`);
          continue;
        }
        
        // Create the assignment
        const assignmentData: InsertDealUserAssignment = {
          dealId: deal.id,
          closeUserId: closeUser.id,
          assignmentType: 'primary',
          assignmentDate: new Date(),
          sourceData: { from: 'close_sync', deal_id: deal.id, close_user_id: closeUser.id }
        };
        
        // If forcing sync, delete existing assignments first
        if (forceSync && existingAssignments.length > 0) {
          for (const assignment of existingAssignments) {
            await storage.deleteDealUserAssignment(assignment.id);
          }
        }
        
        // Create the new assignment
        await storage.createDealUserAssignment(assignmentData);
        importedCount++;
        
      } catch (err) {
        console.error(`Error processing deal-user assignment for deal ${deal.id}:`, err);
        errors++;
      }
    }
    
    console.log(`Deal-User assignment sync complete. ${importedCount} assignments created, ${errors} errors.`);
    
    return {
      success: true,
      count: importedCount
    };
    
  } catch (error: any) {
    console.error('Error syncing deal-user assignments:', error);
    return {
      success: false,
      count: 0,
      error: error.message
    };
  }
}

// Export the last sync time getter
export function getLastUserSyncTime(): Date | null {
  return lastUserSyncTime;
}

// Export all functions
export default {
  syncCloseUsers,
  syncContactUserAssignments,
  syncDealUserAssignments,
  getLastUserSyncTime
};