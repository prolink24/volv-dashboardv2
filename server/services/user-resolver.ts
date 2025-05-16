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

function formatUserName(firstName: string | null, lastName: string | null): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  } else if (firstName) {
    return firstName;
  } else if (lastName) {
    return lastName;
  } else {
    return "Unknown";
  }
}

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
    const dbUsers = await db.select().from(closeUsers).orderBy(desc(closeUsers.createdAt));
    
    // Format user data to ensure name property exists
    const formattedUsers = dbUsers.map(user => ({
      ...user,
      name: formatUserName(user.first_name, user.last_name)
    }));
    
    // Update cache
    cachedUsers = formattedUsers;
    cacheTime = new Date();
    
    return formattedUsers;
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
    console.log('Resolving dashboard users...');
    
    // Get all users for reference
    const users = await getAllUsers();
    console.log(`Retrieved ${users.length} users for resolution`);
    
    // Create a default sales team if it doesn't exist or is empty
    if (!dashboardData.salesTeam || !Array.isArray(dashboardData.salesTeam) || dashboardData.salesTeam.length === 0) {
      console.log('No sales team found, creating from user database...');
      
      // Create a sales team from known users
      dashboardData.salesTeam = users.map(user => ({
        id: user.closeId,
        name: user.name || formatUserName(user.first_name, user.last_name),
        role: user.role || 'Sales Rep',
        kpis: {
          deals_created: 0,
          deals_won: 0,
          calls_made: 0,
          meetings_scheduled: 0,
          meetings_completed: 0,
          revenue: 0
        }
      })).filter(user => user.name && user.name !== 'Unknown');
      
      console.log(`Created sales team with ${dashboardData.salesTeam.length} members from user database`);
    } 
    // Otherwise, fix up the existing sales team data
    else {
      console.log(`Processing ${dashboardData.salesTeam.length} existing sales team members`);
      
      // Transform the sales team data with actual names
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
            name: user.name || formatUserName(user.first_name, user.last_name),
            role: user.role || 'Sales Rep'
          };
        }
        
        // If we can't find a matching user, create a name from the ID
        return {
          ...member,
          name: `User ${member.id ? member.id.substring(0, 8) : 'Unknown'}`,
          role: member.role || 'Sales Rep'
        };
      }));
      
      // Make sure all known users are included in the sales team
      const knownUserIds = dashboardData.salesTeam.map(member => member.id);
      
      // Add any users that aren't already in the sales team
      for (const user of users) {
        if (!knownUserIds.includes(user.closeId) && user.status !== 'inactive') {
          dashboardData.salesTeam.push({
            id: user.closeId,
            name: user.name || formatUserName(user.first_name, user.last_name),
            role: user.role || 'Sales Rep',
            kpis: {
              deals_created: 0,
              deals_won: 0, 
              calls_made: 0,
              meetings_scheduled: 0,
              meetings_completed: 0,
              revenue: 0
            }
          });
        }
      }
      
      console.log(`Resolved ${dashboardData.salesTeam.length} sales team members`);
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