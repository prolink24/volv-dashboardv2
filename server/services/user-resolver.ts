/**
 * User Resolver Service
 * 
 * This service provides enhanced user resolution capabilities to ensure all users
 * are properly identified and displayed throughout the application.
 */

import { db } from "../db";
import { closeUsers } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

// Cache the users to avoid multiple DB queries
let cachedUsers: any[] | null = null;
let cacheTime: Date | null = null;
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get a user by their Close CRM ID
 */
export async function getUserByCloseId(closeId: string): Promise<any | null> {
  const users = await getAllUsers();
  return users.find(user => user.closeId === closeId) || null;
}

/**
 * Get a user by name with fuzzy matching to resolve naming discrepancies
 */
export async function getUserByName(name: string): Promise<any | null> {
  if (!name) return null;
  
  const users = await getAllUsers();
  
  // First try exact match
  const exactMatch = users.find(user => user.name === name);
  if (exactMatch) return exactMatch;
  
  // Try case-insensitive match
  const caseInsensitiveMatch = users.find(
    user => user.name.toLowerCase() === name.toLowerCase()
  );
  if (caseInsensitiveMatch) return caseInsensitiveMatch;
  
  // Try partial match (e.g., first name only or last name only)
  const nameParts = name.toLowerCase().split(' ');
  const partialMatch = users.find(user => {
    const userNameParts = user.name.toLowerCase().split(' ');
    return nameParts.some(part => 
      userNameParts.some(userPart => userPart === part || userPart.includes(part) || part.includes(userPart))
    );
  });
  
  return partialMatch || null;
}

/**
 * Get all users from the database with caching for performance
 */
export async function getAllUsers(): Promise<any[]> {
  // Check if we have a valid cache
  if (cachedUsers && cacheTime && (new Date().getTime() - cacheTime.getTime() < CACHE_EXPIRY_MS)) {
    return cachedUsers;
  }
  
  try {
    // Fetch users from database
    const users = await db.select().from(closeUsers).orderBy(desc(closeUsers.createdAt));
    
    // Update cache
    cachedUsers = users;
    cacheTime = new Date();
    
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    
    // Return cached users if available, even if expired
    if (cachedUsers) {
      return cachedUsers;
    }
    
    // Return empty array as fallback
    return [];
  }
}

/**
 * Clear the user cache to force fresh data on next fetch
 */
export function clearUserCache(): void {
  cachedUsers = null;
  cacheTime = null;
}

/**
 * Ensure all user references in a dashboard dataset are properly resolved
 * This prevents "Unknown" users from showing in the dashboard
 */
export async function resolveDashboardUsers(dashboardData: any): Promise<any> {
  if (!dashboardData) return dashboardData;
  
  try {
    // Get all users for reference
    const users = await getAllUsers();
    
    // Process salesTeam array if it exists
    if (dashboardData.salesTeam && Array.isArray(dashboardData.salesTeam)) {
      dashboardData.salesTeam = await Promise.all(dashboardData.salesTeam.map(async (member) => {
        // Skip if member already has a valid name
        if (member.name && member.name !== 'Unknown') {
          return member;
        }
        
        // Try to find the user by ID
        const user = users.find(u => u.closeId === member.id);
        
        if (user) {
          return {
            ...member,
            name: user.name || 'Unknown',
            role: user.role || 'Sales Rep'
          };
        }
        
        return member;
      }));
    }
    
    return dashboardData;
  } catch (error) {
    console.error('Error resolving dashboard users:', error);
    return dashboardData;
  }
}

export default {
  getUserByCloseId,
  getUserByName,
  getAllUsers,
  clearUserCache,
  resolveDashboardUsers
};