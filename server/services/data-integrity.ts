/**
 * Data Integrity Service
 * 
 * This service provides methods to maintain data integrity between our database
 * and external systems like Close CRM.
 * 
 * It includes validation and correction methods that should be used during sync processes
 * to ensure ownership attribution is always correctly maintained.
 */

import axios from 'axios';
import { db } from "../db";
import { deals } from "../../shared/schema";
import { eq } from "drizzle-orm";

// Close CRM API configuration
const CLOSE_API_KEY = process.env.CLOSE_API_KEY;
const closeApi = axios.create({
  baseURL: 'https://api.close.com/api/v1',
  auth: {
    username: CLOSE_API_KEY || '',
    password: ''
  },
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

/**
 * Validates deal ownership data against Close CRM
 * @param dealData The deal data from our database
 * @returns True if ownership is valid, false if it needs correction
 */
export async function validateDealOwnership(dealData: {
  id: number;
  closeId?: string | null;
  assignedTo?: string | null;
}) {
  // If deal has no Close ID, we can't validate against Close CRM
  if (!dealData.closeId) {
    return true;
  }
  
  try {
    // Get the deal data from Close CRM
    const response = await closeApi.get(`/opportunity/${dealData.closeId}/`);
    const closeDeal = response.data;
    
    // If Close CRM has no user assignment, ownership is valid
    if (!closeDeal || !closeDeal.user_id) {
      return true;
    }
    
    // Compare our user assignment with Close CRM
    return dealData.assignedTo === closeDeal.user_id;
  } catch (error) {
    console.error(`Error validating ownership for deal ${dealData.id}:`, error);
    return true; // In case of API errors, assume ownership is valid
  }
}

/**
 * Ensures deal has the correct ownership as recorded in Close CRM
 * @param dealData The deal data from our database
 * @returns The updated deal data with corrected ownership
 */
export async function ensureCorrectOwnership(dealData: {
  id: number;
  closeId?: string | null;
  assignedTo?: string | null;
}) {
  // If deal has no Close ID, we can't correct it
  if (!dealData.closeId) {
    return dealData;
  }
  
  try {
    // Get the deal data from Close CRM
    const response = await closeApi.get(`/opportunity/${dealData.closeId}/`);
    const closeDeal = response.data;
    
    // If Close has user assignment data and it differs from ours
    if (closeDeal && closeDeal.user_id && dealData.assignedTo !== closeDeal.user_id) {
      // Update our database with the correct owner
      await db.update(deals)
        .set({ assignedTo: closeDeal.user_id })
        .where(eq(deals.id, dealData.id));
      
      // Return the updated data
      return {
        ...dealData,
        assignedTo: closeDeal.user_id
      };
    }
    
    return dealData;
  } catch (error) {
    console.error(`Error correcting ownership for deal ${dealData.id}:`, error);
    return dealData; // In case of API errors, return original data
  }
}

/**
 * Validates and corrects user assignment during data import/sync
 * @param newData New data being imported/synced
 * @param existingData Existing data in database (if any)
 * @returns Data with validated user assignment
 */
export function validateUserAssignment(newData: any, existingData: any = null) {
  // If the new data has a user assignment, use it
  if (newData && newData.user_id) {
    return {
      ...newData,
      assignedTo: newData.user_id
    };
  }
  
  // If we have existing data with a user assignment, preserve it
  if (existingData && existingData.assignedTo) {
    return {
      ...newData,
      assignedTo: existingData.assignedTo
    };
  }
  
  // Use created_by as a fallback
  if (newData && newData.created_by) {
    return {
      ...newData,
      assignedTo: newData.created_by
    };
  }
  
  // Return the data as is
  return newData;
}

// Export the service
export const dataIntegrityService = {
  validateDealOwnership,
  ensureCorrectOwnership,
  validateUserAssignment
};