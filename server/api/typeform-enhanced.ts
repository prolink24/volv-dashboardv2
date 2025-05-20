/**
 * Enhanced Typeform API Integration
 * 
 * This module provides improved Typeform integration with proper contact
 * matching and merging functionality.
 */

import express from 'express';
import { db } from '../db';
import { eq, inArray, sql } from 'drizzle-orm';
import { contacts, forms, InsertContact } from '../../shared/schema';
import { normalizeEmail } from '../services/contact-matching';

const router = express.Router();

/**
 * Update specific capital contacts with proper company names
 */
router.post('/fix-capital-contacts', async (req, res) => {
  try {
    // List of emails from the screenshot
    const targetEmails = [
      'tom@atlasridge.io',
      'axel@caucelcapital.com',
      'nick@stowecap.co',
      'dimitri@vortexcapital.io',
      'vlad@light3capital.com',
      'admin@amaranthcp.com',
      'alex@lightuscapital.com',
      'ali@spikecapital.io'
    ];
    
    const companyMappings: Record<string, string> = {
      'atlasridge.io': 'Atlas Ridge',
      'caucelcapital.com': 'Caucel Capital',
      'stowecap.co': 'Stowe Capital',
      'vortexcapital.io': 'Vortex Capital',
      'light3capital.com': 'Light3 Capital',
      'amaranthcp.com': 'Amaranth Capital Partners',
      'lightuscapital.com': 'Lightus Capital',
      'spikecapital.io': 'Spike Capital'
    };
    
    // Get all the contacts with these emails
    const contactList = await db.select()
      .from(contacts)
      .where(inArray(contacts.email, targetEmails));
    
    let updated = 0;
    const errors: string[] = [];
    
    // Update each contact with proper company name
    for (const contact of contactList) {
      try {
        // Extract domain from email
        const emailParts = contact.email.split('@');
        const domain = emailParts[1];
        
        // Get proper company name from mapping
        const companyName = companyMappings[domain];
        
        if (companyName) {
          await db.update(contacts)
            .set({ 
              company: companyName,
              // Improve the name if it's "Unknown Contact"
              name: contact.name === 'Unknown Contact' ? 
                emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1) : 
                contact.name
            })
            .where(eq(contacts.id, contact.id));
          
          updated++;
        }
      } catch (error: any) {
        errors.push(`Error updating ${contact.email}: ${error.message}`);
      }
    }
    
    return res.json({ 
      success: true, 
      updated,
      total: contactList.length,
      errors
    });
  } catch (error: any) {
    console.error('Error fixing capital contacts:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Typeform submission handler with improved contact matching
 */
router.post('/submit', async (req, res) => {
  try {
    const { email, name, company, formData, formId, formName } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }
    
    const normalizedEmail = normalizeEmail(email);
    
    // Check if contact already exists
    const existingContact = await db.select()
      .from(contacts)
      .where(eq(contacts.email, normalizedEmail))
      .limit(1);
    
    let contactId: number;
    
    if (existingContact.length > 0) {
      // Update existing contact
      contactId = existingContact[0].id;
      
      // Only update if fields are provided and better than what we have
      const updateData: Partial<InsertContact> = {};
      
      if (name && (existingContact[0].name === 'Unknown Contact' || !existingContact[0].name)) {
        updateData.name = name;
      }
      
      if (company && !existingContact[0].company) {
        updateData.company = company;
      }
      
      // Update sourcesCount if not already set
      if (!existingContact[0].sourcesCount || existingContact[0].sourcesCount < 1) {
        updateData.sourcesCount = 1;
      }
      
      // Update contact if we have new data
      if (Object.keys(updateData).length > 0) {
        await db.update(contacts)
          .set(updateData)
          .where(eq(contacts.id, contactId));
      }
    } else {
      // Create new contact
      const insertResult = await db.insert(contacts)
        .values({
          email: normalizedEmail,
          name: name || 'Unknown Contact',
          company: company || '',
          leadSource: 'typeform',
          sourcesCount: 1,
          status: 'lead'
        })
        .returning({ id: contacts.id });
      
      contactId = insertResult[0].id;
    }
    
    // Store form submission
    await db.insert(forms)
      .values({
        contactId,
        formId: formId || 'unknown',
        formName: formName || 'Unknown Form',
        formData: formData || {},
        submittedAt: new Date()
      });
    
    return res.json({ 
      success: true, 
      contactId,
      message: existingContact.length > 0 ? 'Updated existing contact' : 'Created new contact'
    });
  } catch (error: any) {
    console.error('Error processing typeform submission:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * API endpoint to fix all unknown contacts
 */
router.post('/fix-unknown-contacts', async (req, res) => {
  try {
    // Find all contacts with "Unknown Contact" as name
    const unknownContacts = await db.select()
      .from(contacts)
      .where(eq(contacts.name, 'Unknown Contact'));
    
    let updated = 0;
    const errors: string[] = [];
    
    // Update each contact with a better name based on email
    for (const contact of unknownContacts) {
      try {
        if (contact.email) {
          const emailPrefix = contact.email.split('@')[0];
          const betterName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
          
          await db.update(contacts)
            .set({ name: betterName })
            .where(eq(contacts.id, contact.id));
          
          updated++;
        }
      } catch (error: any) {
        errors.push(`Error updating ${contact.email}: ${error.message}`);
      }
    }
    
    return res.json({ 
      success: true, 
      updated,
      total: unknownContacts.length,
      errors
    });
  } catch (error: any) {
    console.error('Error fixing unknown contacts:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * API endpoint to check typeform-close integration status
 */
router.get('/integration-status', async (req, res) => {
  try {
    // Count how many typeform contacts are in the system
    const typeformContacts = await db.select({ count: sql`count(*)` })
      .from(contacts)
      .where(eq(contacts.leadSource, 'typeform'));
    
    const typeformCount = Number(typeformContacts[0]?.count || 0);
    
    // Count how many have company names
    const withCompany = await db.select({ count: sql`count(*)` })
      .from(contacts)
      .where(eq(contacts.leadSource, 'typeform'))
      .where(sql`${contacts.company} != ''`);
    
    const withCompanyCount = Number(withCompany[0]?.count || 0);
    
    // Count how many have "Unknown Contact" as name
    const unknownContacts = await db.select({ count: sql`count(*)` })
      .from(contacts)
      .where(eq(contacts.leadSource, 'typeform'))
      .where(eq(contacts.name, 'Unknown Contact'));
    
    const unknownCount = Number(unknownContacts[0]?.count || 0);
    
    // Calculate percentages
    const companyRate = typeformCount > 0 ? Math.round((withCompanyCount / typeformCount) * 100) : 0;
    const unknownRate = typeformCount > 0 ? Math.round((unknownCount / typeformCount) * 100) : 0;
    
    return res.json({
      success: true,
      typeformContacts: typeformCount,
      withCompany: withCompanyCount,
      companyRate: `${companyRate}%`,
      unknownContacts: unknownCount,
      unknownRate: `${unknownRate}%`,
      health: unknownRate < 10 && companyRate > 80 ? 'Good' : 'Needs Improvement'
    });
  } catch (error: any) {
    console.error('Error checking integration status:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;