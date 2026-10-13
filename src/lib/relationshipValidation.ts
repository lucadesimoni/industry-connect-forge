import { AAS, RDSDesignation, UNSNode } from '@/types/industrial';
import { getLevelIndex } from './hierarchyUtils';

/**
 * Relationship Validation Utilities
 * Validates links between AAS, UNS, and RDS entities
 */

export interface ValidationResult {
  valid: boolean;
  message?: string;
  severity?: 'error' | 'warning';
}

/**
 * Validate that a UNS node is at an appropriate level for AAS linking
 * AAS should typically link to Line or Cell level nodes (not Enterprise/Site/Area)
 */
export const validateAASUNSLink = (
  aas: AAS,
  unsNode: UNSNode | null
): ValidationResult => {
  if (!unsNode) {
    return { valid: true }; // Optional link
  }

  const levelIndex = getLevelIndex(unsNode.level);
  const lineIndex = getLevelIndex('Line');
  const cellIndex = getLevelIndex('Cell');

  // AAS should link to Line or Cell level (where physical assets are)
  if (levelIndex > cellIndex) {
    return {
      valid: false,
      message: `AAS should link to Line or Cell level UNS nodes, not ${unsNode.level}`,
      severity: 'error',
    };
  }

  // Warning for Enterprise/Site/Area (too high level)
  if (levelIndex < lineIndex) {
    return {
      valid: true,
      message: `Warning: Linking AAS to ${unsNode.level} level is unusual. Consider using Line or Cell level.`,
      severity: 'warning',
    };
  }

  return { valid: true };
};

/**
 * Validate that a UNS node is at an appropriate level for RDS linking
 * RDS instances should link to Line or Cell level nodes
 */
export const validateRDSUNSLink = (
  rds: RDSDesignation,
  unsNode: UNSNode | null
): ValidationResult => {
  if (!unsNode) {
    // Location aspects don't need UNS links (they ARE the location)
    if (rds.aspectCode === '+') {
      return { valid: true };
    }
    // Function/Product instances should have location links
    if (rds.isInstance) {
      return {
        valid: false,
        message: 'RDS instances should link to a UNS location node',
        severity: 'error',
      };
    }
    return { valid: true }; // Abstract definitions don't need links
  }

  const levelIndex = getLevelIndex(unsNode.level);
  const lineIndex = getLevelIndex('Line');

  // Location aspects (+) are generated from the UNS location levels
  // (Enterprise → Line) and link back to the node they represent.
  if (rds.aspectCode === '+') {
    if (levelIndex > lineIndex) {
      return {
        valid: false,
        message: `Location aspects represent Enterprise…Line levels; ${unsNode.level} nodes are assets (use = or - aspects)`,
        severity: 'error',
      };
    }
    return { valid: true };
  }

  // RDS instances should link to Line or Cell level (not Enterprise/Site/Area)
  if (rds.isInstance && levelIndex < lineIndex) {
    return {
      valid: false,
      message: `RDS instances should link to Line or Cell level UNS nodes, not ${unsNode.level}`,
      severity: 'error',
    };
  }

  return { valid: true };
};

/**
 * Validate that an AAS and RDS are semantically compatible
 * Function RDS should link to functional AAS, Product RDS to product AAS
 */
export const validateAASRDSLink = (
  aas: Pick<AAS, 'isType'>,
  rds: Pick<RDSDesignation, 'isInstance'>
): ValidationResult => {
  // Type AAS shouldn't link to RDS instances
  if (aas.isType && rds.isInstance) {
    return {
      valid: false,
      message: 'Type AAS should not link to RDS instances (only Instance AAS should)',
      severity: 'error',
    };
  }

  // Instance AAS should link to RDS instances
  if (!aas.isType && !rds.isInstance) {
    return {
      valid: true,
      message: 'Warning: Instance AAS linking to abstract RDS definition. Consider using an RDS instance.',
      severity: 'warning',
    };
  }

  return { valid: true };
};

/**
 * Validate that an RDS and AAS are semantically compatible
 * Reverse validation of validateAASRDSLink
 */
export const validateRDSAASLink = (
  rds: RDSDesignation,
  aas: AAS
): ValidationResult => {
  return validateAASRDSLink(aas, rds);
};

/**
 * Check for circular references in relationships
 * Prevents A → B → A patterns
 */
export const checkCircularReference = (
  sourceType: 'AAS' | 'RDS',
  sourceId: string,
  targetType: 'AAS' | 'RDS' | 'UNS',
  targetId: string,
  allAAS: Array<Pick<AAS, 'id' | 'linkedRDSId'>>,
  allRDS: Array<Pick<RDSDesignation, 'id' | 'linkedAASId'>>
): ValidationResult => {
  // Only check AAS ↔ RDS circular references (UNS can't create cycles)
  if (sourceType === 'AAS' && targetType === 'RDS') {
    const targetRDS = allRDS.find(r => r.id === targetId);
    if (targetRDS?.linkedAASId === sourceId) {
      return {
        valid: false,
        message: 'Circular reference detected: This AAS already links to this RDS, and the RDS links back to this AAS',
        severity: 'error',
      };
    }
  }

  if (sourceType === 'RDS' && targetType === 'AAS') {
    const targetAAS = allAAS.find(a => a.id === targetId);
    if (targetAAS?.linkedRDSId === sourceId) {
      return {
        valid: false,
        message: 'Circular reference detected: This RDS already links to this AAS, and the AAS links back to this RDS',
        severity: 'error',
      };
    }
  }

  return { valid: true };
};

/**
 * Validate all relationships for an AAS
 */
export const validateAASRelationships = (
  aas: AAS,
  unsNodes: UNSNode[],
  rdsList: RDSDesignation[],
  allAAS: AAS[]
): ValidationResult[] => {
  const results: ValidationResult[] = [];

  // Validate UNS link
  if (aas.linkedUNSNodeId) {
    const unsNode = unsNodes.find(n => n.id === aas.linkedUNSNodeId);
    if (unsNode) {
      results.push(validateAASUNSLink(aas, unsNode));
    } else {
      results.push({
        valid: false,
        message: 'Linked UNS node not found',
        severity: 'error',
      });
    }
  }

  // Validate RDS link
  if (aas.linkedRDSId) {
    const rds = rdsList.find(r => r.id === aas.linkedRDSId);
    if (rds) {
      results.push(validateAASRDSLink(aas, rds));
      results.push(checkCircularReference('AAS', aas.id, 'RDS', rds.id, allAAS, rdsList));
    } else {
      results.push({
        valid: false,
        message: 'Linked RDS designation not found',
        severity: 'error',
      });
    }
  }

  return results;
};

/**
 * Validate all relationships for an RDS
 */
export const validateRDSRelationships = (
  rds: RDSDesignation,
  unsNodes: UNSNode[],
  aasList: AAS[],
  allRDS: RDSDesignation[]
): ValidationResult[] => {
  const results: ValidationResult[] = [];

  // Validate UNS link
  if (rds.linkedUNSNodeId) {
    const unsNode = unsNodes.find(n => n.id === rds.linkedUNSNodeId);
    if (unsNode) {
      results.push(validateRDSUNSLink(rds, unsNode));
    } else {
      results.push({
        valid: false,
        message: 'Linked UNS node not found',
        severity: 'error',
      });
    }
  }

  // Validate AAS link
  if (rds.linkedAASId) {
    const aas = aasList.find(a => a.id === rds.linkedAASId);
    if (aas) {
      results.push(validateRDSAASLink(rds, aas));
      results.push(checkCircularReference('RDS', rds.id, 'AAS', aas.id, aasList, allRDS));
    } else {
      results.push({
        valid: false,
        message: 'Linked AAS not found',
        severity: 'error',
      });
    }
  }

  return results;
};

/**
 * Get all entities linked to a UNS node
 */
export const getEntitiesAtLocation = (
  unsNodeId: string,
  aasList: AAS[],
  rdsList: RDSDesignation[]
): {
  aas: AAS[];
  rds: RDSDesignation[];
} => {
  return {
    aas: aasList.filter(a => a.linkedUNSNodeId === unsNodeId),
    rds: rdsList.filter(r => r.linkedUNSNodeId === unsNodeId),
  };
};

/**
 * Get all RDS designations for an AAS
 */
export const getRDSForAAS = (
  aasId: string,
  rdsList: RDSDesignation[]
): RDSDesignation[] => {
  return rdsList.filter(r => r.linkedAASId === aasId);
};

/**
 * Get all AAS for an RDS
 */
export const getAASForRDS = (
  rdsId: string,
  aasList: AAS[]
): AAS[] => {
  return aasList.filter(a => a.linkedRDSId === rdsId);
};

/**
 * Filter UNS nodes by level for AAS linking
 * Returns only Line and Cell level nodes
 */
export const filterUNSForAAS = (nodes: UNSNode[]): UNSNode[] => {
  return nodes.filter(n => {
    const levelIndex = getLevelIndex(n.level);
    const lineIndex = getLevelIndex('Line');
    const cellIndex = getLevelIndex('Cell');
    return levelIndex >= lineIndex && levelIndex <= cellIndex;
  });
};

/**
 * Filter UNS nodes by level for RDS linking
 * Returns only Line and Cell level nodes (for instances)
 */
export const filterUNSForRDS = (nodes: UNSNode[]): UNSNode[] => {
  return nodes.filter(n => {
    const levelIndex = getLevelIndex(n.level);
    const lineIndex = getLevelIndex('Line');
    const cellIndex = getLevelIndex('Cell');
    return levelIndex >= lineIndex && levelIndex <= cellIndex;
  });
};

/**
 * Filter RDS by aspect type for AAS linking
 * Returns RDS that match the AAS type (instances for instance AAS)
 */
export const filterRDSForAAS = (
  rdsList: RDSDesignation[],
  aasIsType: boolean
): RDSDesignation[] => {
  if (aasIsType) {
    // Type AAS shouldn't link to RDS instances
    return rdsList.filter(r => !r.isInstance && r.aspectCode !== '+');
  } else {
    // Instance AAS should link to RDS instances
    return rdsList.filter(r => r.isInstance && r.aspectCode !== '+');
  }
};

/**
 * Filter AAS by type for RDS linking
 * Returns AAS that match the RDS type (instances for RDS instances)
 */
export const filterAASForRDS = (
  aasList: AAS[],
  rdsIsInstance: boolean
): AAS[] => {
  if (rdsIsInstance) {
    // RDS instances should link to Instance AAS
    return aasList.filter(a => !a.isType);
  } else {
    // Abstract RDS definitions could link to Type AAS
    return aasList.filter(a => a.isType);
  }
};
