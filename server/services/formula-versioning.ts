import { db } from "../db";
import { formulaVersions, kpiFormulas, formulaBlocks, blockConnections, formulaBlockPositions } from "@shared/schema/visual-formula";
import { eq, desc, and, gt } from "drizzle-orm";
import { compileFormula, generateFormulaText } from "./formula-compiler";

/**
 * Formula Versioning Service
 * 
 * This service handles versioning and history tracking for KPI formulas,
 * allowing users to track changes, compare versions, and roll back to previous states.
 */

interface FormulaVersion {
  id: string;
  formulaId: string;
  versionNumber: number;
  formula: string;
  visualBlocks: any[];
  connections: any[];
  createdAt: Date;
  createdBy?: string;
  comment?: string;
}

interface VersionComparisonResult {
  versionA: FormulaVersion;
  versionB: FormulaVersion;
  blockChanges: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
  connectionChanges: {
    added: number;
    removed: number;
  };
  formulaTextA: string;
  formulaTextB: string;
  formulaChanged: boolean;
}

/**
 * Create a new version of a formula
 */
export async function createFormulaVersion(
  formulaId: string,
  userId?: string,
  comment?: string
): Promise<FormulaVersion | null> {
  try {
    // Get formula details
    const [formula] = await db.select()
      .from(kpiFormulas)
      .where(eq(kpiFormulas.id, formulaId))
      .limit(1);
    
    if (!formula) {
      console.error(`Formula with ID ${formulaId} not found`);
      return null;
    }
    
    // Get latest version number
    const latestVersion = await db.select()
      .from(formulaVersions)
      .where(eq(formulaVersions.formulaId, formulaId))
      .orderBy(desc(formulaVersions.versionNumber))
      .limit(1);
    
    const nextVersionNumber = latestVersion.length > 0 
      ? latestVersion[0].versionNumber + 1 
      : 1;
    
    // Get visual blocks
    const blocks = await db.select()
      .from(formulaBlocks)
      .where(eq(formulaBlocks.formulaId, formulaId));
    
    // Get block positions
    const positions = await db.select()
      .from(formulaBlockPositions)
      .where(eq(formulaBlockPositions.formulaId, formulaId));
    
    // Get connections
    const connections = await db.select()
      .from(blockConnections)
      .where(eq(blockConnections.formulaId, formulaId));
    
    // Combine blocks with their positions
    const visualBlocks = blocks.map(block => {
      const position = positions.find(pos => pos.blockId === block.blockId) || {
        x: 0,
        y: 0,
        width: 120,
        height: 80,
        zIndex: 1
      };
      
      return {
        ...block,
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
        zIndex: position.zIndex
      };
    });
    
    // Create a new version record
    const [newVersion] = await db.insert(formulaVersions)
      .values({
        formulaId: formulaId,
        versionNumber: nextVersionNumber,
        formula: formula.formula,
        visualBlocks: visualBlocks,
        connections: connections,
        createdBy: userId,
        comment: comment
      })
      .returning();
    
    return newVersion;
  } catch (error) {
    console.error('Error creating formula version:', error);
    return null;
  }
}

/**
 * Get all versions of a formula
 */
export async function getFormulaVersions(formulaId: string): Promise<FormulaVersion[]> {
  try {
    const versions = await db.select()
      .from(formulaVersions)
      .where(eq(formulaVersions.formulaId, formulaId))
      .orderBy(desc(formulaVersions.versionNumber));
    
    return versions;
  } catch (error) {
    console.error(`Error getting versions for formula ${formulaId}:`, error);
    return [];
  }
}

/**
 * Get a specific version of a formula
 */
export async function getFormulaVersion(
  formulaId: string, 
  versionNumber: number
): Promise<FormulaVersion | null> {
  try {
    const [version] = await db.select()
      .from(formulaVersions)
      .where(
        and(
          eq(formulaVersions.formulaId, formulaId),
          eq(formulaVersions.versionNumber, versionNumber)
        )
      )
      .limit(1);
    
    return version || null;
  } catch (error) {
    console.error(`Error getting version ${versionNumber} for formula ${formulaId}:`, error);
    return null;
  }
}

/**
 * Compare two versions of a formula
 */
export async function compareFormulaVersions(
  formulaId: string,
  versionA: number,
  versionB: number
): Promise<VersionComparisonResult | null> {
  try {
    const versionAData = await getFormulaVersion(formulaId, versionA);
    const versionBData = await getFormulaVersion(formulaId, versionB);
    
    if (!versionAData || !versionBData) {
      return null;
    }
    
    // Compare blocks
    const blocksA = versionAData.visualBlocks as any[];
    const blocksB = versionBData.visualBlocks as any[];
    
    const blockIdsA = new Set(blocksA.map(block => block.blockId));
    const blockIdsB = new Set(blocksB.map(block => block.blockId));
    
    const addedBlocks = blocksB.filter(block => !blockIdsA.has(block.blockId));
    const removedBlocks = blocksA.filter(block => !blockIdsB.has(block.blockId));
    
    const commonBlockIds = [...blockIdsA].filter(id => blockIdsB.has(id));
    const modifiedBlocks = commonBlockIds.filter(id => {
      const blockA = blocksA.find(block => block.blockId === id);
      const blockB = blocksB.find(block => block.blockId === id);
      
      // Check if the block data or position has changed
      return JSON.stringify(blockA.blockData) !== JSON.stringify(blockB.blockData) ||
             blockA.x !== blockB.x ||
             blockA.y !== blockB.y ||
             blockA.width !== blockB.width ||
             blockA.height !== blockB.height;
    });
    
    const unchangedBlocks = commonBlockIds.length - modifiedBlocks.length;
    
    // Compare connections
    const connectionsA = versionAData.connections as any[];
    const connectionsB = versionBData.connections as any[];
    
    const connectionKeyA = connectionsA.map(conn => 
      `${conn.sourceBlockId}-${conn.targetBlockId}-${conn.sourcePort}-${conn.targetPort}`
    );
    const connectionKeyB = connectionsB.map(conn => 
      `${conn.sourceBlockId}-${conn.targetBlockId}-${conn.sourcePort}-${conn.targetPort}`
    );
    
    const connectionSetA = new Set(connectionKeyA);
    const connectionSetB = new Set(connectionKeyB);
    
    const addedConnections = connectionKeyB.filter(key => !connectionSetA.has(key));
    const removedConnections = connectionKeyA.filter(key => !connectionSetB.has(key));
    
    return {
      versionA: versionAData,
      versionB: versionBData,
      blockChanges: {
        added: addedBlocks.length,
        removed: removedBlocks.length,
        modified: modifiedBlocks.length,
        unchanged: unchangedBlocks
      },
      connectionChanges: {
        added: addedConnections.length,
        removed: removedConnections.length
      },
      formulaTextA: versionAData.formula,
      formulaTextB: versionBData.formula,
      formulaChanged: versionAData.formula !== versionBData.formula
    };
  } catch (error) {
    console.error(`Error comparing versions ${versionA} and ${versionB} for formula ${formulaId}:`, error);
    return null;
  }
}

/**
 * Restore a formula to a previous version
 */
export async function restoreFormulaVersion(
  formulaId: string,
  versionNumber: number,
  userId?: string,
  comment?: string
): Promise<boolean> {
  try {
    // Get the specified version
    const version = await getFormulaVersion(formulaId, versionNumber);
    
    if (!version) {
      console.error(`Version ${versionNumber} not found for formula ${formulaId}`);
      return false;
    }
    
    // Create a new version record for the current state (before restoring)
    await createFormulaVersion(formulaId, userId, 'Auto-saved before restoring to version ' + versionNumber);
    
    // Delete current formula data
    await db.delete(formulaBlockPositions)
      .where(eq(formulaBlockPositions.formulaId, formulaId));
    
    await db.delete(blockConnections)
      .where(eq(blockConnections.formulaId, formulaId));
    
    await db.delete(formulaBlocks)
      .where(eq(formulaBlocks.formulaId, formulaId));
    
    // Update formula text
    await db.update(kpiFormulas)
      .set({ 
        formula: version.formula,
        updatedAt: new Date()
      })
      .where(eq(kpiFormulas.id, formulaId));
    
    // Restore blocks
    const blocks = version.visualBlocks as any[];
    for (const block of blocks) {
      // Insert block
      await db.insert(formulaBlocks)
        .values({
          blockId: block.blockId,
          formulaId: formulaId,
          blockType: block.blockType,
          blockData: block.blockData
        });
      
      // Insert block position
      await db.insert(formulaBlockPositions)
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
    
    // Restore connections
    const connections = version.connections as any[];
    for (const connection of connections) {
      await db.insert(blockConnections)
        .values({
          formulaId: formulaId,
          sourceBlockId: connection.sourceBlockId,
          targetBlockId: connection.targetBlockId,
          sourcePort: connection.sourcePort,
          targetPort: connection.targetPort
        });
    }
    
    // Create a new version record for the restored state
    await createFormulaVersion(
      formulaId, 
      userId, 
      comment || `Restored from version ${versionNumber}`
    );
    
    return true;
  } catch (error) {
    console.error(`Error restoring formula ${formulaId} to version ${versionNumber}:`, error);
    return false;
  }
}

/**
 * Auto-save formula version if changes exceed a threshold
 */
export async function autoSaveIfNeeded(
  formulaId: string,
  userId?: string
): Promise<void> {
  try {
    // Get latest version
    const latestVersions = await db.select()
      .from(formulaVersions)
      .where(eq(formulaVersions.formulaId, formulaId))
      .orderBy(desc(formulaVersions.versionNumber))
      .limit(1);
    
    if (latestVersions.length === 0) {
      // No previous versions, create the first one
      await createFormulaVersion(formulaId, userId, 'Initial version');
      return;
    }
    
    const latestVersion = latestVersions[0];
    
    // Check if the last version was created recently (within 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    if (latestVersion.createdAt > tenMinutesAgo) {
      // Last version is recent, don't auto-save yet
      return;
    }
    
    // Get current formula state
    const [formula] = await db.select()
      .from(kpiFormulas)
      .where(eq(kpiFormulas.id, formulaId))
      .limit(1);
    
    if (!formula) {
      return;
    }
    
    // Check if formula text has changed
    if (formula.formula !== latestVersion.formula) {
      await createFormulaVersion(formulaId, userId, 'Auto-saved version');
      return;
    }
    
    // Get current blocks and connections
    const blocks = await db.select()
      .from(formulaBlocks)
      .where(eq(formulaBlocks.formulaId, formulaId));
    
    const connections = await db.select()
      .from(blockConnections)
      .where(eq(blockConnections.formulaId, formulaId));
    
    // Check if block count or connection count has changed significantly
    const previousBlocks = latestVersion.visualBlocks as any[];
    const previousConnections = latestVersion.connections as any[];
    
    const blockCountDiff = Math.abs(blocks.length - previousBlocks.length);
    const connectionCountDiff = Math.abs(connections.length - previousConnections.length);
    
    if (blockCountDiff >= 3 || connectionCountDiff >= 3) {
      await createFormulaVersion(formulaId, userId, 'Auto-saved after significant changes');
    }
  } catch (error) {
    console.error(`Error auto-saving formula ${formulaId}:`, error);
  }
}

/**
 * Get the changes history for a formula
 */
export async function getFormulaHistory(
  formulaId: string,
  limit: number = 10
): Promise<{ 
  versions: FormulaVersion[]; 
  changes: { 
    versionNumber: number; 
    createdAt: Date; 
    createdBy?: string; 
    comment?: string; 
    summary: string; 
  }[]; 
}> {
  try {
    const versions = await db.select()
      .from(formulaVersions)
      .where(eq(formulaVersions.formulaId, formulaId))
      .orderBy(desc(formulaVersions.versionNumber))
      .limit(limit);
    
    if (versions.length <= 1) {
      return { 
        versions, 
        changes: versions.map(v => ({
          versionNumber: v.versionNumber,
          createdAt: v.createdAt,
          createdBy: v.createdBy,
          comment: v.comment,
          summary: 'Initial version'
        }))
      };
    }
    
    // Calculate changes between consecutive versions
    const changes = [];
    
    for (let i = 0; i < versions.length - 1; i++) {
      const currentVersion = versions[i];
      const previousVersion = versions[i + 1];
      
      const comparison = await compareFormulaVersions(
        formulaId, 
        previousVersion.versionNumber, 
        currentVersion.versionNumber
      );
      
      if (comparison) {
        const { blockChanges, connectionChanges, formulaChanged } = comparison;
        
        let summary = [];
        
        if (formulaChanged) {
          summary.push('Formula text changed');
        }
        
        if (blockChanges.added > 0) {
          summary.push(`Added ${blockChanges.added} blocks`);
        }
        
        if (blockChanges.removed > 0) {
          summary.push(`Removed ${blockChanges.removed} blocks`);
        }
        
        if (blockChanges.modified > 0) {
          summary.push(`Modified ${blockChanges.modified} blocks`);
        }
        
        if (connectionChanges.added > 0 || connectionChanges.removed > 0) {
          summary.push(`Changed ${connectionChanges.added + connectionChanges.removed} connections`);
        }
        
        changes.push({
          versionNumber: currentVersion.versionNumber,
          createdAt: currentVersion.createdAt,
          createdBy: currentVersion.createdBy,
          comment: currentVersion.comment,
          summary: summary.join(', ') || 'No significant changes'
        });
      }
    }
    
    // Add the first version
    changes.push({
      versionNumber: versions[versions.length - 1].versionNumber,
      createdAt: versions[versions.length - 1].createdAt,
      createdBy: versions[versions.length - 1].createdBy,
      comment: versions[versions.length - 1].comment,
      summary: 'Initial version'
    });
    
    return { versions, changes };
  } catch (error) {
    console.error(`Error getting history for formula ${formulaId}:`, error);
    return { versions: [], changes: [] };
  }
}