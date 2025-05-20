/**
 * Enhanced Typeform Integration API
 * 
 * This API provides endpoints for advanced integration between Typeform and Close CRM:
 * - Automatic name extraction from email addresses
 * - Company name derivation from business domains
 * - Contact matching and linking to Close CRM
 * - Integration health monitoring
 */

import { Router } from 'express';
import { db } from '../db';
import { contacts, formSubmissions } from '../../shared/schema';
import { and, eq, isNull, like, or } from 'drizzle-orm';
import axios from 'axios';

const router = Router();

// Cache configuration
const CACHE_TTL = 3600; // 1 hour cache lifetime

// Constants
const CLOSE_API_URL = 'https://api.close.com/api/v1';

// Helper function to extract name from email
function extractNameFromEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return 'Unknown Contact';
  }

  // Extract the part before @ symbol
  const namePart = email.split('@')[0];
  
  if (!namePart) {
    return 'Unknown Contact';
  }

  // Replace dots, underscores, dashes, and numbers with spaces
  const withSpaces = namePart.replace(/[._\-0-9]/g, ' ');
  
  // Capitalize each word
  const capitalized = withSpaces
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return capitalized || 'Unknown Contact';
}

// Helper function to extract company from domain
function extractCompanyFromDomain(email: string): string | null {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return null;
  }

  const domain = email.split('@')[1];
  if (!domain) {
    return null;
  }

  // Skip common email providers
  const commonProviders = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
    'aol.com', 'icloud.com', 'mail.com', 'protonmail.com', 
    'zoho.com', 'yandex.com', 'gmx.com', 'live.com',
    'msn.com', 'protonmail.ch', 'mail.ru', 'example.com',
    'placeholder.com'
  ];

  if (commonProviders.includes(domain.toLowerCase())) {
    return null;
  }

  // Process domain to create a company name
  const domainParts = domain.split('.');
  
  // Use only the main domain part, typically the second-to-last segment
  let companyPart = domainParts[0];
  
  if (domainParts.length > 2) {
    companyPart = domainParts[domainParts.length - 2];
  }

  // Format: replace hyphens and underscores with spaces, capitalize
  let companyName = companyPart
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // Special case for capital-related domains
  if (domain.includes('capital') || domain.includes('ventures') || domain.includes('partners')) {
    companyName += ' ' + domain.split('.')[0].split('-').join(' ').toUpperCase();
  }
  
  return companyName;
}

// Find a lead in Close CRM by email
async function findLeadByEmail(email: string, apiKey: string) {
  try {
    const response = await axios.get(`${CLOSE_API_URL}/lead/`, {
      auth: {
        username: apiKey,
        password: ''
      },
      params: {
        email_address: email
      }
    });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error finding lead by email:', error);
    return null;
  }
}

// Create a lead in Close CRM
async function createLeadInClose(contact: any, apiKey: string) {
  try {
    const companyName = contact.company || extractCompanyFromDomain(contact.email);
    
    const payload = {
      name: contact.name,
      contacts: [{
        name: contact.name,
        emails: [{ email: contact.email, type: 'office' }],
        phones: contact.phone ? [{ phone: contact.phone, type: 'office' }] : []
      }],
      custom: {
        source: contact.source || 'Attribution Platform'
      }
    };

    if (companyName) {
      // @ts-ignore
      payload.custom.company = companyName;
    }

    const response = await axios.post(`${CLOSE_API_URL}/lead/`, payload, {
      auth: {
        username: apiKey,
        password: ''
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating lead in Close:', error);
    return null;
  }
}

/**
 * GET /api/typeform-enhanced/health
 * Returns health metrics for Typeform integration
 */
router.get('/health', async (req, res) => {
  try {
    // Count total contacts
    const totalContacts = await db.select({
      count: db.fn.count(contacts.id)
    })
    .from(contacts);
    
    // Count Typeform contacts
    const typeformContacts = await db.select({
      count: db.fn.count(contacts.id)
    })
    .from(contacts)
    .where(like(contacts.source, '%typeform%'));
    
    // Count unknown contact names
    const unknownContactNames = await db.select({
      count: db.fn.count(contacts.id)
    })
    .from(contacts)
    .where(like(contacts.name, 'Unknown Contact%'));
    
    // Count missing company names
    const missingCompanyNames = await db.select({
      count: db.fn.count(contacts.id)
    })
    .from(contacts)
    .where(
      or(
        isNull(contacts.company),
        eq(contacts.company, '')
      )
    );
    
    // Count missing Close CRM IDs
    const missingCloseIds = await db.select({
      count: db.fn.count(contacts.id)
    })
    .from(contacts)
    .where(isNull(contacts.closeId));
    
    // Count total form submissions
    const totalFormSubmissions = await db.select({
      count: db.fn.count(formSubmissions.id)
    })
    .from(formSubmissions);
    
    // Count orphaned form submissions
    const orphanedFormSubmissions = await db.select({
      count: db.fn.count(formSubmissions.id)
    })
    .from(formSubmissions)
    .where(isNull(formSubmissions.contactId));
    
    // Calculate multi-source contacts
    const multiSourceContacts = await db.select({
      count: db.fn.count(contacts.id)
    })
    .from(contacts)
    .where(eq(contacts.multiSource, true));
    
    res.json({
      status: 'success',
      data: {
        totalContacts: Number(totalContacts[0].count || 0),
        typeformContacts: Number(typeformContacts[0].count || 0),
        typeformPercentage: Number(totalContacts[0].count) > 0 
          ? (Number(typeformContacts[0].count) / Number(totalContacts[0].count) * 100).toFixed(2) 
          : 0,
        dataQuality: {
          unknownContactNames: Number(unknownContactNames[0].count || 0),
          missingCompanyNames: Number(missingCompanyNames[0].count || 0),
          missingCloseIds: Number(missingCloseIds[0].count || 0),
        },
        formSubmissions: {
          total: Number(totalFormSubmissions[0].count || 0),
          orphaned: Number(orphanedFormSubmissions[0].count || 0),
          linkageRate: Number(totalFormSubmissions[0].count) > 0
            ? ((Number(totalFormSubmissions[0].count) - Number(orphanedFormSubmissions[0].count)) / Number(totalFormSubmissions[0].count) * 100).toFixed(2)
            : 0
        },
        attribution: {
          multiSourceContacts: Number(multiSourceContacts[0].count || 0),
          multiSourceRate: Number(totalContacts[0].count) > 0
            ? (Number(multiSourceContacts[0].count) / Number(totalContacts[0].count) * 100).toFixed(2)
            : 0
        },
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching integration health:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch integration health metrics',
      error: String(error)
    });
  }
});

/**
 * POST /api/typeform-enhanced/process-batch
 * Process a batch of contacts to improve data quality
 */
router.post('/process-batch', async (req, res) => {
  try {
    const { 
      batchSize = 25, 
      fixNames = true, 
      addCompanies = true, 
      linkToClose = true,
      closeApiKey
    } = req.body;
    
    // Validate input
    if (linkToClose && !closeApiKey) {
      return res.status(400).json({
        status: 'error',
        message: 'Close API key is required when linkToClose is true'
      });
    }
    
    // Build query conditions based on requested fixes
    const conditions = [];
    
    if (fixNames) {
      conditions.push(like(contacts.name, 'Unknown Contact%'));
    }
    
    if (addCompanies) {
      conditions.push(
        or(
          isNull(contacts.company),
          eq(contacts.company, '')
        )
      );
    }
    
    if (linkToClose) {
      conditions.push(isNull(contacts.closeId));
    }
    
    let contactsToProcess;
    
    if (conditions.length > 0) {
      contactsToProcess = await db.select()
        .from(contacts)
        .where(or(...conditions))
        .limit(batchSize);
    } else {
      contactsToProcess = await db.select()
        .from(contacts)
        .limit(batchSize);
    }
    
    // Process the batch
    const results = {
      totalProcessed: contactsToProcess.length,
      namesFixed: 0,
      companiesAdded: 0,
      linkedToExistingLeads: 0,
      newLeadsCreated: 0,
      errors: 0
    };
    
    for (const contact of contactsToProcess) {
      try {
        const updates: any = {};
        let madeUpdates = false;
        
        // Fix unknown contact names
        if (fixNames && contact.name?.includes('Unknown Contact') && contact.email) {
          const extractedName = extractNameFromEmail(contact.email);
          if (extractedName !== 'Unknown Contact') {
            updates.name = extractedName;
            madeUpdates = true;
            results.namesFixed++;
          }
        }
        
        // Add company names
        if (addCompanies && (!contact.company || contact.company === '') && contact.email) {
          const companyName = extractCompanyFromDomain(contact.email);
          if (companyName) {
            updates.company = companyName;
            madeUpdates = true;
            results.companiesAdded++;
          }
        }
        
        // Link to Close CRM
        if (linkToClose && !contact.closeId && contact.email && closeApiKey) {
          // First try to find an existing lead
          const lead = await findLeadByEmail(contact.email, closeApiKey);
          
          if (lead) {
            updates.closeId = lead.id;
            madeUpdates = true;
            results.linkedToExistingLeads++;
          } else {
            // Create a new lead if not found
            const newLead = await createLeadInClose(contact, closeApiKey);
            if (newLead) {
              updates.closeId = newLead.id;
              madeUpdates = true;
              results.newLeadsCreated++;
            }
          }
        }
        
        // Apply updates
        if (madeUpdates) {
          await db.update(contacts)
            .set(updates)
            .where(eq(contacts.id, contact.id));
        }
      } catch (error) {
        console.error(`Error processing contact ${contact.id}:`, error);
        results.errors++;
      }
    }
    
    res.json({
      status: 'success',
      message: `Processed ${results.totalProcessed} contacts`,
      data: results
    });
  } catch (error) {
    console.error('Error processing contact batch:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process contact batch',
      error: String(error)
    });
  }
});

/**
 * POST /api/typeform-enhanced/connect-lead
 * Manually connect a contact to a Close CRM lead
 */
router.post('/connect-lead', async (req, res) => {
  try {
    const { contactId, closeId } = req.body;
    
    if (!contactId || !closeId) {
      return res.status(400).json({
        status: 'error',
        message: 'Both contactId and closeId are required'
      });
    }
    
    // Find the contact
    const contactExists = await db.select()
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1);
    
    if (contactExists.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Contact with ID ${contactId} not found`
      });
    }
    
    // Update the contact
    await db.update(contacts)
      .set({ closeId })
      .where(eq(contacts.id, contactId));
    
    res.json({
      status: 'success',
      message: `Successfully linked contact ${contactId} to Close lead ${closeId}`
    });
  } catch (error) {
    console.error('Error connecting lead:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect lead',
      error: String(error)
    });
  }
});

export default router;