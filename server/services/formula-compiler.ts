import { 
  FormulaBlock, 
  BlockConnection, 
  FieldBlockData, 
  OperatorBlockData, 
  FunctionBlockData, 
  ConstantBlockData, 
  GroupBlockData 
} from "@shared/schema/visual-formula";

/**
 * Formula Compiler Service
 * 
 * This service converts visual block-based formulas into executable JavaScript code,
 * validates formulas, and estimates their performance impact.
 */

interface CompilationContext {
  blocks: Map<string, FormulaBlock>;
  connections: BlockConnection[];
  outputBlocks: string[]; // Blocks with no outgoing connections (terminal nodes)
  variableMap: Map<string, string>; // Maps block IDs to variable names
  safeFieldNames: Map<string, string>; // Maps field names to safe variable names
  performanceEstimate: {
    operationCount: number;
    complexityLevel: 'low' | 'medium' | 'high';
    expectedTimeMs: number;
  };
}

/**
 * Compiles a visual formula into executable JavaScript code
 */
export function compileFormula(
  blocks: FormulaBlock[], 
  connections: BlockConnection[]
): { 
  code: string; 
  valid: boolean; 
  errors: string[]; 
  warnings: string[];
  estimatedPerformance: {
    level: 'low' | 'medium' | 'high';
    operationCount: number;
    expectedTimeMs: number;
  };
} {
  // Initialize context
  const context: CompilationContext = {
    blocks: new Map(blocks.map(block => [block.blockId, block])),
    connections,
    outputBlocks: findOutputBlocks(blocks, connections),
    variableMap: new Map(),
    safeFieldNames: new Map(),
    performanceEstimate: {
      operationCount: 0,
      complexityLevel: 'low',
      expectedTimeMs: 0
    }
  };

  // Validate blocks and connections
  const validationResult = validateFormula(context);
  if (!validationResult.valid) {
    return {
      code: '',
      valid: false,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      estimatedPerformance: {
        level: 'low',
        operationCount: 0,
        expectedTimeMs: 0
      }
    };
  }
  
  // Generate safe variable names for fields
  generateSafeFieldNames(context);
  
  // Generate code for each output block
  const codeSegments: string[] = [];
  
  for (const outputBlockId of context.outputBlocks) {
    const code = generateCodeForBlock(outputBlockId, context);
    codeSegments.push(code);
  }
  
  // Combine code segments into final function
  const finalCode = generateFinalCode(codeSegments, context);
  
  // Calculate performance metrics
  calculatePerformanceMetrics(context);
  
  return {
    code: finalCode,
    valid: true,
    errors: [],
    warnings: validationResult.warnings,
    estimatedPerformance: {
      level: context.performanceEstimate.complexityLevel,
      operationCount: context.performanceEstimate.operationCount,
      expectedTimeMs: context.performanceEstimate.expectedTimeMs
    }
  };
}

/**
 * Find blocks that don't have any outgoing connections (output/terminal blocks)
 */
function findOutputBlocks(blocks: FormulaBlock[], connections: BlockConnection[]): string[] {
  const blocksWithOutgoing = new Set<string>();
  
  for (const connection of connections) {
    blocksWithOutgoing.add(connection.sourceBlockId);
  }
  
  return blocks
    .map(block => block.blockId)
    .filter(blockId => !blocksWithOutgoing.has(blockId));
}

/**
 * Validate formula blocks and connections
 */
function validateFormula(context: CompilationContext): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for cycles
  if (hasCycles(context)) {
    errors.push("Formula contains cycles which are not allowed");
  }
  
  // Check for disconnected blocks
  const disconnectedBlocks = findDisconnectedBlocks(context);
  if (disconnectedBlocks.length > 0) {
    warnings.push(`${disconnectedBlocks.length} blocks are not connected to the formula`);
  }
  
  // Check for type compatibility in connections
  const typeErrors = validateTypeCompatibility(context);
  errors.push(...typeErrors);
  
  // Check for missing required fields
  const blocks = Array.from(context.blocks.values());
  const functionBlocks = blocks.filter(block => block.blockType === 'function');
  for (const block of functionBlocks) {
    const blockData = block.blockData as FunctionBlockData;
    const incomingConnections = context.connections.filter(conn => conn.targetBlockId === block.blockId);
    
    if (incomingConnections.length < blockData.paramCount) {
      errors.push(`Function ${blockData.functionName} requires ${blockData.paramCount} parameters but only has ${incomingConnections.length} connections`);
    }
  }
  
  // Validate operator blocks have exactly 2 inputs
  const operatorBlocks = blocks.filter(block => block.blockType === 'operator');
  for (const block of operatorBlocks) {
    const incomingConnections = context.connections.filter(conn => conn.targetBlockId === block.blockId);
    
    if (incomingConnections.length !== 2) {
      errors.push(`Operator block requires exactly 2 inputs but has ${incomingConnections.length}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check if the formula contains cycles
 */
function hasCycles(context: CompilationContext): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  // Convert connections to adjacency list
  const adjacencyList = new Map<string, string[]>();
  for (const connection of context.connections) {
    if (!adjacencyList.has(connection.sourceBlockId)) {
      adjacencyList.set(connection.sourceBlockId, []);
    }
    adjacencyList.get(connection.sourceBlockId)!.push(connection.targetBlockId);
  }
  
  const checkForCycles = (blockId: string): boolean => {
    if (!visited.has(blockId)) {
      visited.add(blockId);
      recursionStack.add(blockId);
      
      const neighbors = adjacencyList.get(blockId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor) && checkForCycles(neighbor)) {
          return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }
    }
    
    recursionStack.delete(blockId);
    return false;
  };
  
  // Check each block for cycles
  for (const blockId of context.blocks.keys()) {
    if (!visited.has(blockId) && checkForCycles(blockId)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Find blocks that aren't connected to the rest of the formula
 */
function findDisconnectedBlocks(context: CompilationContext): string[] {
  const connectedBlocks = new Set<string>();
  
  // Add all blocks that are part of connections
  for (const connection of context.connections) {
    connectedBlocks.add(connection.sourceBlockId);
    connectedBlocks.add(connection.targetBlockId);
  }
  
  // Return blocks that aren't in the connectedBlocks set
  return Array.from(context.blocks.keys())
    .filter(blockId => !connectedBlocks.has(blockId));
}

/**
 * Validate type compatibility between connected blocks
 */
function validateTypeCompatibility(context: CompilationContext): string[] {
  const errors: string[] = [];
  
  for (const connection of context.connections) {
    const sourceBlock = context.blocks.get(connection.sourceBlockId);
    const targetBlock = context.blocks.get(connection.targetBlockId);
    
    if (!sourceBlock || !targetBlock) {
      errors.push(`Connection references non-existent block`);
      continue;
    }
    
    // Check type compatibility based on block types
    const sourceType = getBlockOutputType(sourceBlock);
    const targetType = getExpectedInputType(targetBlock, connection.targetPort);
    
    if (!areTypesCompatible(sourceType, targetType)) {
      errors.push(`Type mismatch: ${sourceBlock.blockType} outputs ${sourceType} but ${targetBlock.blockType} expects ${targetType}`);
    }
  }
  
  return errors;
}

/**
 * Get the output type of a block
 */
function getBlockOutputType(block: FormulaBlock): string {
  switch (block.blockType) {
    case 'field':
      return (block.blockData as FieldBlockData).fieldType;
    case 'operator':
      const operator = (block.blockData as OperatorBlockData).operator;
      return operator === '>' || operator === '<' || operator === '>=' || 
             operator === '<=' || operator === '==' || operator === '!=' || 
             operator === '&&' || operator === '||' 
             ? 'boolean' : 'number';
    case 'function':
      // For simplicity, assume all functions return numbers
      // In a real implementation, this would be based on the function definition
      return 'number';
    case 'constant':
      return (block.blockData as ConstantBlockData).dataType;
    case 'group':
      // For groups, we'd need to determine the output of the contained blocks
      return 'any';
    default:
      return 'any';
  }
}

/**
 * Get the expected input type for a block's port
 */
function getExpectedInputType(block: FormulaBlock, port: string): string {
  switch (block.blockType) {
    case 'operator':
      const operator = (block.blockData as OperatorBlockData).operator;
      return operator === '&&' || operator === '||' ? 'boolean' : 'number';
    case 'function':
      // For simplicity, assume all function parameters expect numbers
      // In a real implementation, this would be based on the function definition
      return 'number';
    default:
      return 'any';
  }
}

/**
 * Check if two types are compatible
 */
function areTypesCompatible(sourceType: string, targetType: string): boolean {
  if (targetType === 'any') return true;
  if (sourceType === targetType) return true;
  
  // Special compatibility rules
  if (sourceType === 'number' && targetType === 'string') return true; // Numbers can be converted to strings
  if (sourceType === 'boolean' && targetType === 'number') return true; // Booleans can be treated as 0/1
  
  return false;
}

/**
 * Generate safe variable names for fields
 */
function generateSafeFieldNames(context: CompilationContext): void {
  const fieldBlocks = Array.from(context.blocks.values())
    .filter(block => block.blockType === 'field');
  
  for (const block of fieldBlocks) {
    const fieldData = block.blockData as FieldBlockData;
    const fieldName = fieldData.fieldName;
    
    // Generate a safe variable name
    let safeName = fieldName.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
    
    // Ensure uniqueness
    if (context.safeFieldNames.has(safeName)) {
      let counter = 1;
      let newName = `${safeName}_${counter}`;
      while (context.safeFieldNames.has(newName)) {
        counter++;
        newName = `${safeName}_${counter}`;
      }
      safeName = newName;
    }
    
    context.safeFieldNames.set(fieldName, safeName);
  }
}

/**
 * Generate code for a block recursively
 */
function generateCodeForBlock(blockId: string, context: CompilationContext): string {
  const block = context.blocks.get(blockId);
  if (!block) return 'null';
  
  // Check if we already generated code for this block
  if (context.variableMap.has(blockId)) {
    return context.variableMap.get(blockId)!;
  }
  
  let code = '';
  
  switch (block.blockType) {
    case 'field':
      const fieldData = block.blockData as FieldBlockData;
      const fieldName = fieldData.fieldName;
      const safeName = context.safeFieldNames.get(fieldName) || 'data.' + fieldName.replace(/[^a-zA-Z0-9_]/g, '_');
      code = `data.${safeName}`;
      context.performanceEstimate.operationCount += 1; // Field access
      break;
      
    case 'operator':
      const operatorData = block.blockData as OperatorBlockData;
      const incomingConnections = context.connections.filter(conn => conn.targetBlockId === blockId);
      
      if (incomingConnections.length === 2) {
        const leftCode = generateCodeForBlock(incomingConnections[0].sourceBlockId, context);
        const rightCode = generateCodeForBlock(incomingConnections[1].sourceBlockId, context);
        
        code = `(${leftCode} ${operatorData.operator} ${rightCode})`;
        context.performanceEstimate.operationCount += 1; // Operator
      } else {
        code = 'null';
      }
      break;
      
    case 'function':
      const functionData = block.blockData as FunctionBlockData;
      const functionConnections = context.connections.filter(conn => conn.targetBlockId === blockId);
      
      const paramCodes = functionConnections.map(conn => 
        generateCodeForBlock(conn.sourceBlockId, context)
      );
      
      code = `${functionData.functionName}(${paramCodes.join(', ')})`;
      context.performanceEstimate.operationCount += 5; // Function calls are more expensive
      break;
      
    case 'constant':
      const constantData = block.blockData as ConstantBlockData;
      
      if (constantData.dataType === 'string') {
        code = `"${constantData.value.toString().replace(/"/g, '\\"')}"`;
      } else if (constantData.dataType === 'boolean') {
        code = constantData.value ? 'true' : 'false';
      } else {
        code = constantData.value.toString();
      }
      break;
      
    case 'group':
      const groupData = block.blockData as GroupBlockData;
      
      // For a group, we'd need to generate code for all contained blocks
      // and connect them properly - this is a simplified implementation
      const groupBlocks = groupData.blocks.map(id => context.blocks.get(id)).filter(Boolean);
      
      if (groupBlocks.length > 0) {
        const lastBlock = groupBlocks[groupBlocks.length - 1];
        code = generateCodeForBlock(lastBlock!.blockId, context);
      } else {
        code = 'null';
      }
      break;
  }
  
  // Generate a variable name for this block
  const varName = `v${blockId.replace(/[^a-zA-Z0-9]/g, '_')}`;
  context.variableMap.set(blockId, varName);
  
  return code;
}

/**
 * Generate the final executable code
 */
function generateFinalCode(codeSegments: string[], context: CompilationContext): string {
  if (codeSegments.length === 0) {
    return 'function(data) { return null; }';
  }
  
  if (codeSegments.length === 1) {
    return `function(data) { return ${codeSegments[0]}; }`;
  }
  
  // If multiple output blocks, return an object with all results
  const resultProperties = codeSegments.map((code, index) => 
    `result${index + 1}: ${code}`
  );
  
  return `function(data) { return { ${resultProperties.join(', ')} }; }`;
}

/**
 * Calculate performance metrics for the formula
 */
function calculatePerformanceMetrics(context: CompilationContext): void {
  const operationCount = context.performanceEstimate.operationCount;
  
  // Determine complexity level based on operation count
  let complexityLevel: 'low' | 'medium' | 'high' = 'low';
  
  if (operationCount > 50) {
    complexityLevel = 'high';
  } else if (operationCount > 20) {
    complexityLevel = 'medium';
  }
  
  // Estimate execution time - this is a rough estimate
  // In reality, would be based on benchmarks
  const expectedTimeMs = Math.min(operationCount * 0.5, 100);
  
  context.performanceEstimate.complexityLevel = complexityLevel;
  context.performanceEstimate.expectedTimeMs = expectedTimeMs;
}

/**
 * Execute a compiled formula with given data
 */
export function executeFormula(compiledCode: string, data: Record<string, any>): any {
  try {
    // SECURITY: In a production system, this would use a sandbox
    // to prevent malicious code execution
    const formulaFunction = new Function('data', `return (${compiledCode})(data);`);
    return formulaFunction(data);
  } catch (error) {
    console.error('Error executing formula:', error);
    return null;
  }
}

/**
 * Analyze field usage in a formula to determine dependencies
 */
export function analyzeFieldDependencies(
  blocks: FormulaBlock[], 
  connections: BlockConnection[]
): string[] {
  const fieldBlocks = blocks.filter(block => block.blockType === 'field');
  
  return fieldBlocks.map(block => {
    const fieldData = block.blockData as FieldBlockData;
    return fieldData.fieldName;
  });
}

/**
 * Generate a text representation of a formula for display
 */
export function generateFormulaText(
  blocks: FormulaBlock[], 
  connections: BlockConnection[]
): string {
  const context: CompilationContext = {
    blocks: new Map(blocks.map(block => [block.blockId, block])),
    connections,
    outputBlocks: findOutputBlocks(blocks, connections),
    variableMap: new Map(),
    safeFieldNames: new Map(),
    performanceEstimate: {
      operationCount: 0,
      complexityLevel: 'low',
      expectedTimeMs: 0
    }
  };
  
  // Generate code for each output block
  const codeSegments: string[] = [];
  
  for (const outputBlockId of context.outputBlocks) {
    const code = generateCodeForBlock(outputBlockId, context);
    codeSegments.push(code);
  }
  
  if (codeSegments.length === 0) {
    return '';
  }
  
  if (codeSegments.length === 1) {
    return codeSegments[0];
  }
  
  // If multiple output blocks, concatenate with commas
  return codeSegments.join(', ');
}