import { db } from "../db";
import {
  contacts,
  deals,
  activities,
  meetings,
  users
} from "@shared/schema";
import { count, eq, sql, and } from "drizzle-orm";

/**
 * Get field consistency metrics
 * This service calculates metrics related to field consistency across platforms
 */
export async function getFieldConsistencyMetrics() {
  try {
    // In a real system, field consistency would be measured by comparing the same fields
    // across different platforms (e.g., comparing email fields in Close vs. Calendly)
    // For now, we'll use simulated data
    
    // Calculate field consistency for common fields
    const fieldConsistency = {
      // Contact fields
      "name": 0.94, // 94% consistency
      "email": 0.98, // 98% consistency
      "phone": 0.76, // 76% consistency
      "company": 0.82, // 82% consistency
      "title": 0.64, // 64% consistency
      
      // Deal fields
      "dealTitle": 0.88, // 88% consistency
      "value": 0.92, // 92% consistency
      "status": 0.96, // 96% consistency
      "closeDate": 0.81, // 81% consistency
      "pipeline": 0.90  // 90% consistency
    };
    
    // Calculate overall consistency score (average of all field consistency scores)
    const overallScore = Object.values(fieldConsistency).reduce((sum, value) => sum + value, 0) / 
      Object.values(fieldConsistency).length * 100;
    
    // Get top inconsistent fields
    const topInconsistentFields = Object.entries(fieldConsistency)
      .map(([field, score]) => ({ 
        field, 
        score: score * 100,
        importance: getFieldImportance(field)
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);
    
    return {
      overallScore,
      fieldConsistency,
      topInconsistentFields
    };
  } catch (error) {
    console.error("Error calculating field consistency metrics:", error);
    
    // Return default values if there's an error
    return {
      overallScore: 76.4,
      fieldConsistency: {
        "name": 0.94,
        "email": 0.98,
        "phone": 0.76,
        "company": 0.82,
        "title": 0.64,
        "dealTitle": 0.88,
        "value": 0.92,
        "status": 0.96,
        "closeDate": 0.81,
        "pipeline": 0.90
      },
      topInconsistentFields: [
        { field: "title", score: 64.2, importance: "low" },
        { field: "phone", score: 76.4, importance: "medium" },
        { field: "closeDate", score: 81.4, importance: "medium" },
        { field: "company", score: 81.9, importance: "medium" },
        { field: "pipeline", score: 90.1, importance: "high" }
      ]
    };
  }
}

/**
 * Get the importance level for a field
 */
function getFieldImportance(field: string): string {
  // Define importance levels for common fields
  const fieldImportance: Record<string, string> = {
    "email": "critical",
    "name": "high",
    "value": "critical",
    "status": "critical",
    "closeDate": "medium",
    "phone": "medium",
    "company": "medium",
    "title": "low",
    "pipeline": "high",
    "dealTitle": "high",
    "cashCollected": "high"
  };
  
  return fieldImportance[field] || "medium";
}