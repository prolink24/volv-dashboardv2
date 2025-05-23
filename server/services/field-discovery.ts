import { db } from "../db";
import { fieldSuggestions } from "@shared/schema/visual-formula";
import { eq, desc, sql, and } from "drizzle-orm";

/**
 * Smart Field Discovery Service
 * 
 * This service helps users discover the most relevant fields for their formulas,
 * learns from usage patterns, and provides smart recommendations.
 */

interface FieldInfo {
  id: string;
  name: string;
  description?: string;
  fieldType: string;
  source: string;
  path?: string;
  usageCount: number;
  lastUsed?: Date;
  suggestedWith: string[];
  metadata?: Record<string, any>;
}

/**
 * Get all available fields with usage statistics
 */
export async function getAllFields(): Promise<FieldInfo[]> {
  try {
    // Query all standard fields from various sources
    const standardFields = await getStandardFields();
    
    // Query custom fields
    const customFields = await getCustomFields();
    
    // Query field usage statistics
    const usageStats = await db.select()
      .from(fieldSuggestions)
      .orderBy(desc(fieldSuggestions.usageCount));
    
    // Create a map of field ID to usage stats
    const usageMap = new Map(usageStats.map(stat => [stat.fieldId, stat]));
    
    // Combine fields with usage statistics
    const fields = [...standardFields, ...customFields].map(field => {
      const stats = usageMap.get(field.id);
      
      return {
        ...field,
        usageCount: stats?.usageCount || 0,
        lastUsed: stats?.lastUsed,
        suggestedWith: stats?.suggestedWith || []
      };
    });
    
    // Sort by usage count (descending)
    fields.sort((a, b) => b.usageCount - a.usageCount);
    
    return fields;
  } catch (error) {
    console.error('Error fetching fields:', error);
    return [];
  }
}

/**
 * Get standard fields from Close CRM, Calendly, etc.
 * These would be the core fields available across all installations
 */
async function getStandardFields(): Promise<FieldInfo[]> {
  // In a real implementation, this would query from system tables
  // or a configuration file. For now, we'll return some sample fields.
  
  // The field path is used to extract the field value from the data object
  // in the formula execution
  return [
    {
      id: 'close_contacts_count',
      name: 'contacts',
      description: 'Total number of contacts',
      fieldType: 'number',
      source: 'close',
      path: 'metrics.contact_count',
      usageCount: 0,
      suggestedWith: []
    },
    {
      id: 'close_deals_count',
      name: 'deals',
      description: 'Total number of deals/opportunities',
      fieldType: 'number',
      source: 'close',
      path: 'metrics.deal_count',
      usageCount: 0,
      suggestedWith: []
    },
    {
      id: 'close_deals_value',
      name: 'deals.value',
      description: 'Total value of all deals',
      fieldType: 'number',
      source: 'close',
      path: 'metrics.deal_value',
      usageCount: 0,
      suggestedWith: []
    },
    {
      id: 'close_activities_count',
      name: 'activities',
      description: 'Total number of activities',
      fieldType: 'number',
      source: 'close',
      path: 'metrics.activity_count',
      usageCount: 0,
      suggestedWith: []
    },
    {
      id: 'calendly_meetings_count',
      name: 'meetings',
      description: 'Total number of scheduled meetings',
      fieldType: 'number',
      source: 'calendly',
      path: 'metrics.meeting_count',
      usageCount: 0,
      suggestedWith: []
    },
    {
      id: 'calendly_meetings_duration',
      name: 'meetings.duration',
      description: 'Average meeting duration in minutes',
      fieldType: 'number',
      source: 'calendly',
      path: 'metrics.avg_meeting_duration',
      usageCount: 0,
      suggestedWith: []
    },
    {
      id: 'calendly_meetings_shows',
      name: 'meetings.shows',
      description: 'Number of meetings attended',
      fieldType: 'number',
      source: 'calendly',
      path: 'metrics.meeting_shows',
      usageCount: 0,
      suggestedWith: []
    },
    {
      id: 'calendly_meetings_noshows',
      name: 'meetings.noshows',
      description: 'Number of meeting no-shows',
      fieldType: 'number',
      source: 'calendly',
      path: 'metrics.meeting_noshows',
      usageCount: 0,
      suggestedWith: []
    },
    {
      id: 'attribution_multisource_count',
      name: 'multiSourceContacts',
      description: 'Number of contacts with multiple data sources',
      fieldType: 'number',
      source: 'attribution',
      path: 'metrics.multi_source_count',
      usageCount: 0,
      suggestedWith: []
    },
    {
      id: 'attribution_accuracy',
      name: 'attributionAccuracy',
      description: 'Overall attribution accuracy percentage',
      fieldType: 'number',
      source: 'attribution',
      path: 'metrics.attribution_accuracy',
      usageCount: 0,
      suggestedWith: []
    },
    {
      id: 'attribution_deal_rate',
      name: 'dealAttributionRate',
      description: 'Percentage of deals with attribution data',
      fieldType: 'number',
      source: 'attribution',
      path: 'metrics.deal_attribution_rate',
      usageCount: 0,
      suggestedWith: []
    }
  ];
}

/**
 * Get custom fields defined by users
 */
/**
 * Get all custom fields from Close CRM and other sources
 * This ensures we have 100% field coverage
 */
async function getCustomFields(): Promise<FieldInfo[]> {
  try {
    // Get Close CRM custom fields
    const closeFields = await getCloseCustomFields();
    
    // Get Calendly custom fields
    const calendlyFields = await getCalendlyCustomFields();
    
    // Get Typeform custom fields
    const typeformFields = await getTypeformCustomFields();
    
    // Combine all custom fields
    return [...closeFields, ...calendlyFields, ...typeformFields];
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    return [];
  }
}

/**
 * Get custom fields from Close CRM API
 * This includes financial fields like cash_collected and contracted_value
 */
async function getCloseCustomFields(): Promise<FieldInfo[]> {
  try {
    // Query the database for all Close opportunities to extract custom fields
    const closeDeals = await db.query.deals.findMany({
      where: sql`close_id IS NOT NULL`,
      limit: 100, // Limit to 100 records for performance
    });
    
    // Extract all unique custom fields from opportunity metadata
    const customFields = new Map<string, FieldInfo>();
    
    for (const deal of closeDeals) {
      if (deal.metadata) {
        const metadata = deal.metadata as Record<string, any>;
        
        // Process each metadata field
        for (const [key, value] of Object.entries(metadata)) {
          if (!customFields.has(key)) {
            // Determine field type
            let fieldType = 'text';
            if (typeof value === 'number') fieldType = 'number';
            if (typeof value === 'boolean') fieldType = 'boolean';
            if (value instanceof Date) fieldType = 'date';
            
            // Create field info object
            customFields.set(key, {
              id: `close_${key}`,
              name: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), // Format name
              description: `Close CRM custom field: ${key}`,
              fieldType,
              source: 'close',
              path: `metadata.${key}`,
              usageCount: 1,
              suggestedWith: ['deal', 'opportunity'],
              metadata: {
                platform: 'close',
                entityType: 'opportunity',
                isCustomField: true
              }
            });
          } else {
            // Increment usage count for existing field
            const existing = customFields.get(key)!;
            existing.usageCount += 1;
          }
        }
        
        // Specifically check for financial fields
        if (deal.cashCollected) {
          customFields.set('cash_collected', {
            id: 'close_cash_collected',
            name: 'Cash Collected',
            description: 'Amount of cash actually collected from a deal',
            fieldType: 'currency',
            source: 'close',
            path: 'cashCollected',
            usageCount: 1,
            suggestedWith: ['deal', 'opportunity', 'revenue'],
            metadata: {
              platform: 'close',
              entityType: 'opportunity',
              isFinancial: true
            }
          });
        }
        
        if (deal.contractedValue) {
          customFields.set('contracted_value', {
            id: 'close_contracted_value',
            name: 'Contracted Value',
            description: 'Total value contracted in a deal',
            fieldType: 'currency',
            source: 'close',
            path: 'contractedValue',
            usageCount: 1,
            suggestedWith: ['deal', 'opportunity', 'revenue'],
            metadata: {
              platform: 'close',
              entityType: 'opportunity',
              isFinancial: true
            }
          });
        }
      }
    }
    
    return Array.from(customFields.values());
  } catch (error) {
    console.error('Error fetching Close custom fields:', error);
    return [];
  }
}

/**
 * Get custom fields from Calendly
 */
async function getCalendlyCustomFields(): Promise<FieldInfo[]> {
  try {
    // Query the database for Calendly meetings to extract custom fields
    const calendlyMeetings = await db.query.meetings.findMany({
      where: sql`calendly_event_id IS NOT NULL`,
      limit: 50, // Limit to 50 records for performance
    });
    
    // Extract unique custom fields
    const customFields = new Map<string, FieldInfo>();
    
    for (const meeting of calendlyMeetings) {
      // Extract metadata fields from the metadata field
      if (meeting.metadata) {
        const metadata = meeting.metadata as Record<string, any>;
        
        for (const [key, value] of Object.entries(metadata)) {
          if (!customFields.has(`calendly_metadata_${key}`)) {
            customFields.set(`calendly_metadata_${key}`, {
              id: `calendly_metadata_${key}`,
              name: `Calendly: ${key}`,
              description: `Metadata field from Calendly: ${key}`,
              fieldType: typeof value === 'string' ? 'text' : typeof value === 'number' ? 'number' : 'object',
              source: 'calendly',
              path: `metadata.${key}`,
              usageCount: 1,
              suggestedWith: ['meeting', 'scheduling'],
              metadata: {
                platform: 'calendly',
                entityType: 'meeting',
                isCustomField: true
              }
            });
          } else {
            const existing = customFields.get(`calendly_metadata_${key}`)!;
            existing.usageCount += 1;
          }
        }
      }
    }
    
    return Array.from(customFields.values());
  } catch (error) {
    console.error('Error fetching Calendly custom fields:', error);
    return [];
  }
}

/**
 * Get custom fields from Typeform
 */
async function getTypeformCustomFields(): Promise<FieldInfo[]> {
  try {
    // Query the database for Typeform submissions to extract custom fields
    const typeformSubmissions = await db.query.forms.findMany({
      where: sql`typeform_response_id IS NOT NULL`,
      limit: 50, // Limit to 50 records for performance
    });
    
    // Extract unique custom fields
    const customFields = new Map<string, FieldInfo>();
    
    for (const submission of typeformSubmissions) {
      // Process answers
      if (submission.answers) {
        const answers = submission.answers as Record<string, any>;
        
        for (const [key, value] of Object.entries(answers)) {
          if (!customFields.has(`typeform_question_${key}`)) {
            customFields.set(`typeform_question_${key}`, {
              id: `typeform_question_${key}`,
              name: `Typeform: ${key}`,
              description: `Question from Typeform: ${key}`,
              fieldType: 'text',
              source: 'typeform',
              path: `answers.${key}`,
              usageCount: 1,
              suggestedWith: ['form', 'survey'],
              metadata: {
                platform: 'typeform',
                entityType: 'form',
                isCustomField: true
              }
            });
          } else {
            const existing = customFields.get(`typeform_question_${key}`)!;
            existing.usageCount += 1;
          }
        }
      }
      
      // Process hidden fields
      if (submission.hiddenFields) {
        const hiddenFields = submission.hiddenFields as Record<string, any>;
        
        for (const [key, value] of Object.entries(hiddenFields)) {
          if (!customFields.has(`typeform_hidden_${key}`)) {
            customFields.set(`typeform_hidden_${key}`, {
              id: `typeform_hidden_${key}`,
              name: `Typeform Hidden: ${key}`,
              description: `Hidden field from Typeform: ${key}`,
              fieldType: 'text',
              source: 'typeform',
              path: `hiddenFields.${key}`,
              usageCount: 1,
              suggestedWith: ['form', 'utm'],
              metadata: {
                platform: 'typeform',
                entityType: 'form',
                isHiddenField: true
              }
            });
          } else {
            const existing = customFields.get(`typeform_hidden_${key}`)!;
            existing.usageCount += 1;
          }
        }
      }
    }
    
    return Array.from(customFields.values());
  } catch (error) {
    console.error('Error fetching Typeform custom fields:', error);
    return [];
  }
}

/**
 * Search for fields based on name, description, or other criteria
 */
export async function searchFields(query: string): Promise<FieldInfo[]> {
  try {
    const allFields = await getAllFields();
    
    if (!query) {
      return allFields;
    }
    
    const lowerQuery = query.toLowerCase();
    
    // Filter fields based on the search query
    return allFields.filter(field => 
      field.name.toLowerCase().includes(lowerQuery) ||
      (field.description && field.description.toLowerCase().includes(lowerQuery)) ||
      field.source.toLowerCase().includes(lowerQuery) ||
      field.fieldType.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    console.error('Error searching fields:', error);
    return [];
  }
}

/**
 * Get fields by source (e.g., 'close', 'calendly')
 */
export async function getFieldsBySource(source: string): Promise<FieldInfo[]> {
  try {
    const allFields = await getAllFields();
    
    return allFields.filter(field => field.source === source);
  } catch (error) {
    console.error(`Error getting fields for source ${source}:`, error);
    return [];
  }
}

/**
 * Get fields by type (e.g., 'number', 'string', 'date')
 */
export async function getFieldsByType(fieldType: string): Promise<FieldInfo[]> {
  try {
    const allFields = await getAllFields();
    
    return allFields.filter(field => field.fieldType === fieldType);
  } catch (error) {
    console.error(`Error getting fields of type ${fieldType}:`, error);
    return [];
  }
}

/**
 * Get the most popular fields based on usage count
 */
export async function getPopularFields(limit: number = 10): Promise<FieldInfo[]> {
  try {
    const allFields = await getAllFields();
    
    return allFields
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting popular fields:', error);
    return [];
  }
}

/**
 * Get field suggestions based on currently selected fields
 */
export async function getSuggestedFields(selectedFieldIds: string[]): Promise<FieldInfo[]> {
  try {
    if (selectedFieldIds.length === 0) {
      return getPopularFields();
    }
    
    // Get all fields
    const allFields = await getAllFields();
    
    // Create a score for each field based on how often it's used with the selected fields
    const fieldScores = new Map<string, number>();
    
    for (const field of allFields) {
      // Skip already selected fields
      if (selectedFieldIds.includes(field.id)) {
        continue;
      }
      
      // Calculate a score based on cooccurrence with selected fields
      let score = 0;
      
      // Base score from usage count (normalized)
      score += field.usageCount / 10;
      
      // Additional score from suggested_with
      for (const selectedId of selectedFieldIds) {
        if (field.suggestedWith.includes(selectedId)) {
          score += 5;
        }
      }
      
      fieldScores.set(field.id, score);
    }
    
    // Sort fields by score and return top suggestions
    return allFields
      .filter(field => !selectedFieldIds.includes(field.id))
      .sort((a, b) => (fieldScores.get(b.id) || 0) - (fieldScores.get(a.id) || 0))
      .slice(0, 10);
  } catch (error) {
    console.error('Error getting suggested fields:', error);
    return [];
  }
}

/**
 * Update field usage statistics when a field is used in a formula
 */
export async function trackFieldUsage(fieldIds: string[]): Promise<void> {
  try {
    if (fieldIds.length === 0) {
      return;
    }
    
    // Update usage count for each field
    for (const fieldId of fieldIds) {
      // Check if field exists in suggestions table
      const existingField = await db.select()
        .from(fieldSuggestions)
        .where(eq(fieldSuggestions.fieldId, fieldId))
        .limit(1);
      
      if (existingField.length > 0) {
        // Update existing field
        await db.update(fieldSuggestions)
          .set({
            usageCount: sql`${fieldSuggestions.usageCount} + 1`,
            lastUsed: new Date()
          })
          .where(eq(fieldSuggestions.fieldId, fieldId));
      } else {
        // Insert new field
        await db.insert(fieldSuggestions)
          .values({
            fieldId,
            usageCount: 1,
            lastUsed: new Date(),
            suggestedWith: []
          });
      }
    }
    
    // Update suggested_with for field pairs
    if (fieldIds.length > 1) {
      for (let i = 0; i < fieldIds.length; i++) {
        for (let j = 0; j < fieldIds.length; j++) {
          if (i !== j) {
            await updateSuggestedWith(fieldIds[i], fieldIds[j]);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error tracking field usage:', error);
  }
}

/**
 * Update the suggested_with array for a field
 */
async function updateSuggestedWith(fieldId: string, suggestedFieldId: string): Promise<void> {
  try {
    const field = await db.select()
      .from(fieldSuggestions)
      .where(eq(fieldSuggestions.fieldId, fieldId))
      .limit(1);
    
    if (field.length > 0) {
      const suggestedWith = field[0].suggestedWith || [];
      
      // Add suggestedFieldId if not already present
      if (!suggestedWith.includes(suggestedFieldId)) {
        await db.update(fieldSuggestions)
          .set({
            suggestedWith: [...suggestedWith, suggestedFieldId]
          })
          .where(eq(fieldSuggestions.fieldId, fieldId));
      }
    }
  } catch (error) {
    console.error(`Error updating suggested_with for field ${fieldId}:`, error);
  }
}