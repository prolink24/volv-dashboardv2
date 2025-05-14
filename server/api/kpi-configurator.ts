import { db } from '../db';
import { compileFormula, executeFormula, analyzeFieldDependencies } from '../services/formula-compiler';
import { getAllFields, getPopularFields, getSuggestedFields, trackFieldUsage, searchFields } from '../services/field-discovery';
import { 
  createFormulaVersion, 
  getFormulaVersions, 
  restoreFormulaVersion, 
  compareFormulaVersions,
  getFormulaHistory,
  autoSaveIfNeeded
} from '../services/formula-versioning';
import { kpiFormulas } from '@shared/schema/kpi-configuration';
import { 
  formulaBlocks, 
  formulaBlockPositions, 
  blockConnections, 
  formulaTemplates, 
  formulaFunctions 
} from '@shared/schema/visual-formula';
import { eq, desc, and } from 'drizzle-orm';
import express from 'express';

const router = express.Router();

/**
 * API endpoints for the KPI Configurator
 */

// Get all KPI formulas
router.get('/formulas', async (req, res) => {
  try {
    const formulas = await db.select()
      .from(kpiFormulas)
      .orderBy(desc(kpiFormulas.updatedAt));
    
    res.json({ success: true, formulas });
  } catch (error) {
    console.error('Error fetching KPI formulas:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch KPI formulas' });
  }
});

// Get a specific KPI formula with its visual blocks and connections
router.get('/formulas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get formula
    const [formula] = await db.select()
      .from(kpiFormulas)
      .where(eq(kpiFormulas.id, id))
      .limit(1);
    
    if (!formula) {
      return res.status(404).json({ success: false, error: 'Formula not found' });
    }
    
    // Get blocks
    const blocks = await db.select()
      .from(formulaBlocks)
      .where(eq(formulaBlocks.formulaId, id));
    
    // Get block positions
    const positions = await db.select()
      .from(formulaBlockPositions)
      .where(eq(formulaBlockPositions.formulaId, id));
    
    // Get connections
    const connections = await db.select()
      .from(blockConnections)
      .where(eq(blockConnections.formulaId, id));
    
    // Combine blocks with their positions
    const visualBlocks = blocks.map(block => {
      const position = positions.find(pos => pos.blockId === block.blockId);
      
      return {
        ...block,
        x: position?.x || 0,
        y: position?.y || 0,
        width: position?.width || 120,
        height: position?.height || 80,
        zIndex: position?.zIndex || 1
      };
    });
    
    res.json({ 
      success: true, 
      formula,
      visualBlocks,
      connections
    });
  } catch (error) {
    console.error(`Error fetching KPI formula ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Failed to fetch KPI formula' });
  }
});

// Create or update a KPI formula
router.post('/formulas', async (req, res) => {
  try {
    const { formula, visualBlocks, connections, userId } = req.body;
    
    if (!formula) {
      return res.status(400).json({ success: false, error: 'Formula data is required' });
    }
    
    // Check if formula exists
    const existingFormula = await db.select()
      .from(kpiFormulas)
      .where(eq(kpiFormulas.id, formula.id))
      .limit(1);
    
    // Start a transaction
    await db.transaction(async (tx) => {
      let formulaId;
      
      if (existingFormula.length > 0) {
        // Update existing formula
        await tx.update(kpiFormulas)
          .set({
            name: formula.name,
            description: formula.description || '',
            formula: formula.formula,
            enabled: formula.enabled,
            category: formula.category,
            customizable: formula.customizable !== false,
            updatedAt: new Date()
          })
          .where(eq(kpiFormulas.id, formula.id));
        
        formulaId = formula.id;
        
        // Delete existing blocks and connections
        await tx.delete(formulaBlockPositions)
          .where(eq(formulaBlockPositions.formulaId, formulaId));
        
        await tx.delete(blockConnections)
          .where(eq(blockConnections.formulaId, formulaId));
        
        await tx.delete(formulaBlocks)
          .where(eq(formulaBlocks.formulaId, formulaId));
      } else {
        // Create new formula
        const [newFormula] = await tx.insert(kpiFormulas)
          .values({
            id: formula.id,
            name: formula.name,
            description: formula.description || '',
            formula: formula.formula,
            enabled: formula.enabled,
            customizable: formula.customizable !== false,
            category: formula.category,
            requiredFields: formula.requiredFields || [],
            source: 'visual-builder'
          })
          .returning();
        
        formulaId = newFormula.id;
      }
      
      // Insert visual blocks
      if (visualBlocks && visualBlocks.length > 0) {
        for (const block of visualBlocks) {
          // Insert block
          await tx.insert(formulaBlocks)
            .values({
              blockId: block.blockId,
              formulaId: formulaId,
              blockType: block.blockType,
              blockData: block.blockData
            });
          
          // Insert block position
          await tx.insert(formulaBlockPositions)
            .values({
              blockId: block.blockId,
              formulaId: formulaId,
              x: block.x,
              y: block.y,
              width: block.width,
              height: block.height,
              zIndex: block.zIndex
            });
        }
      }
      
      // Insert connections
      if (connections && connections.length > 0) {
        for (const connection of connections) {
          await tx.insert(blockConnections)
            .values({
              formulaId: formulaId,
              sourceBlockId: connection.sourceBlockId,
              targetBlockId: connection.targetBlockId,
              sourcePort: connection.sourcePort,
              targetPort: connection.targetPort
            });
        }
      }
      
      // Create a version record
      await createFormulaVersion(formulaId, userId, 'Manual save');
      
      // Track field usage for analytics
      if (visualBlocks && visualBlocks.length > 0) {
        const fieldBlocks = visualBlocks
          .filter(block => block.blockType === 'field')
          .map(block => block.blockData.fieldId);
        
        if (fieldBlocks.length > 0) {
          await trackFieldUsage(fieldBlocks);
        }
      }
    });
    
    res.json({ success: true, message: 'Formula saved successfully' });
  } catch (error) {
    console.error('Error saving KPI formula:', error);
    res.status(500).json({ success: false, error: 'Failed to save KPI formula' });
  }
});

// Delete a KPI formula
router.delete('/formulas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if formula exists
    const [formula] = await db.select()
      .from(kpiFormulas)
      .where(eq(kpiFormulas.id, id))
      .limit(1);
    
    if (!formula) {
      return res.status(404).json({ success: false, error: 'Formula not found' });
    }
    
    // Delete formula (cascade will delete related records)
    await db.delete(kpiFormulas)
      .where(eq(kpiFormulas.id, id));
    
    res.json({ success: true, message: 'Formula deleted successfully' });
  } catch (error) {
    console.error(`Error deleting KPI formula ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Failed to delete KPI formula' });
  }
});

// Compile and validate a formula
router.post('/compile', async (req, res) => {
  try {
    const { blocks, connections } = req.body;
    
    if (!blocks || !connections) {
      return res.status(400).json({ success: false, error: 'Blocks and connections are required' });
    }
    
    const result = compileFormula(blocks, connections);
    
    res.json({ 
      success: true, 
      ...result
    });
  } catch (error) {
    console.error('Error compiling formula:', error);
    res.status(500).json({ success: false, error: 'Failed to compile formula' });
  }
});

// Execute a formula with sample data
router.post('/execute', async (req, res) => {
  try {
    const { code, data } = req.body;
    
    if (!code) {
      return res.status(400).json({ success: false, error: 'Formula code is required' });
    }
    
    const result = executeFormula(code, data || {});
    
    res.json({ 
      success: true, 
      result
    });
  } catch (error) {
    console.error('Error executing formula:', error);
    res.status(500).json({ success: false, error: 'Failed to execute formula' });
  }
});

// Get available fields for formulas
router.get('/fields', async (req, res) => {
  try {
    const { search, source, type } = req.query;
    
    let fields;
    
    if (search) {
      fields = await searchFields(search as string);
    } else {
      fields = await getAllFields();
    }
    
    // Apply filters if provided
    if (source) {
      fields = fields.filter(field => field.source === source);
    }
    
    if (type) {
      fields = fields.filter(field => field.fieldType === type);
    }
    
    res.json({ success: true, fields });
  } catch (error) {
    console.error('Error fetching available fields:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch available fields' });
  }
});

// Get popular fields based on usage
router.get('/fields/popular', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    const fields = await getPopularFields(limit);
    
    res.json({ success: true, fields });
  } catch (error) {
    console.error('Error fetching popular fields:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch popular fields' });
  }
});

// Get suggested fields based on already selected fields
router.post('/fields/suggested', async (req, res) => {
  try {
    const { selectedFieldIds } = req.body;
    
    if (!selectedFieldIds || !Array.isArray(selectedFieldIds)) {
      return res.status(400).json({ success: false, error: 'Selected field IDs array is required' });
    }
    
    const fields = await getSuggestedFields(selectedFieldIds);
    
    res.json({ success: true, fields });
  } catch (error) {
    console.error('Error fetching suggested fields:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch suggested fields' });
  }
});

// Get formula templates
router.get('/templates', async (req, res) => {
  try {
    const { category, difficulty } = req.query;
    
    let query = db.select().from(formulaTemplates);
    
    if (category) {
      query = query.where(eq(formulaTemplates.category, category as string));
    }
    
    if (difficulty) {
      query = query.where(eq(formulaTemplates.difficulty, difficulty as string));
    }
    
    const templates = await query;
    
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Error fetching formula templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch formula templates' });
  }
});

// Get available functions for formulas
router.get('/functions', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = db.select().from(formulaFunctions);
    
    if (category) {
      query = query.where(eq(formulaFunctions.category, category as string));
    }
    
    const functions = await query;
    
    res.json({ success: true, functions });
  } catch (error) {
    console.error('Error fetching formula functions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch formula functions' });
  }
});

// Get formula versions
router.get('/formulas/:id/versions', async (req, res) => {
  try {
    const { id } = req.params;
    
    const versions = await getFormulaVersions(id);
    
    res.json({ success: true, versions });
  } catch (error) {
    console.error(`Error fetching versions for formula ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Failed to fetch formula versions' });
  }
});

// Get formula history
router.get('/formulas/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    const history = await getFormulaHistory(id, limit);
    
    res.json({ success: true, ...history });
  } catch (error) {
    console.error(`Error fetching history for formula ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Failed to fetch formula history' });
  }
});

// Restore formula to specific version
router.post('/formulas/:id/restore/:versionNumber', async (req, res) => {
  try {
    const { id, versionNumber } = req.params;
    const { userId, comment } = req.body;
    
    const success = await restoreFormulaVersion(
      id, 
      parseInt(versionNumber), 
      userId, 
      comment
    );
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'Formula or version not found' });
    }
    
    res.json({ success: true, message: 'Formula restored successfully' });
  } catch (error) {
    console.error(`Error restoring formula ${req.params.id} to version ${req.params.versionNumber}:`, error);
    res.status(500).json({ success: false, error: 'Failed to restore formula' });
  }
});

// Compare two versions of a formula
router.get('/formulas/:id/compare/:versionA/:versionB', async (req, res) => {
  try {
    const { id, versionA, versionB } = req.params;
    
    const comparison = await compareFormulaVersions(
      id, 
      parseInt(versionA), 
      parseInt(versionB)
    );
    
    if (!comparison) {
      return res.status(404).json({ success: false, error: 'Formula or versions not found' });
    }
    
    res.json({ success: true, comparison });
  } catch (error) {
    console.error(`Error comparing versions for formula ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Failed to compare formula versions' });
  }
});

// Auto-save formula if needed
router.post('/formulas/:id/auto-save', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    await autoSaveIfNeeded(id, userId);
    
    res.json({ success: true });
  } catch (error) {
    console.error(`Error auto-saving formula ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Failed to auto-save formula' });
  }
});

export default router;