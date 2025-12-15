import { AAS, RDSDesignation, UNSNode } from '@/types/industrial';

/**
 * Helper functions for querying relationships between AAS, UNS, and RDS entities
 */

/**
 * Find all AAS entities linked to a specific UNS node
 */
export function findAASAtLocation(
  unsNodeId: string,
  aasList: AAS[]
): AAS[] {
  return aasList.filter(aas => aas.linkedUNSNodeId === unsNodeId);
}

/**
 * Find all RDS entities linked to a specific UNS node
 */
export function findRDSAtLocation(
  unsNodeId: string,
  rdsList: RDSDesignation[]
): RDSDesignation[] {
  return rdsList.filter(rds => rds.linkedUNSNodeId === unsNodeId);
}

/**
 * Find all entities (AAS and RDS) at a specific UNS location
 */
export function findAllEntitiesAtLocation(
  unsNodeId: string,
  aasList: AAS[],
  rdsList: RDSDesignation[]
): {
  aas: AAS[];
  rds: RDSDesignation[];
} {
  return {
    aas: findAASAtLocation(unsNodeId, aasList),
    rds: findRDSAtLocation(unsNodeId, rdsList),
  };
}

/**
 * Find all RDS designations linked to a specific AAS
 */
export function findRDSForAAS(
  aasId: string,
  rdsList: RDSDesignation[]
): RDSDesignation[] {
  return rdsList.filter(rds => rds.linkedAASId === aasId);
}

/**
 * Find the AAS linked to a specific RDS
 */
export function findAASForRDS(
  rdsId: string,
  aasList: AAS[]
): AAS | undefined {
  return aasList.find(aas => aas.linkedRDSId === rdsId);
}

/**
 * Get the UNS node linked to an AAS
 */
export function getUNSForAAS(
  aas: AAS,
  unsNodes: UNSNode[]
): UNSNode | undefined {
  if (!aas.linkedUNSNodeId) return undefined;
  return unsNodes.find(node => node.id === aas.linkedUNSNodeId);
}

/**
 * Get the UNS node linked to an RDS
 */
export function getUNSForRDS(
  rds: RDSDesignation,
  unsNodes: UNSNode[]
): UNSNode | undefined {
  if (!rds.linkedUNSNodeId) return undefined;
  return unsNodes.find(node => node.id === rds.linkedUNSNodeId);
}

/**
 * Get all entities linked to a UNS node (recursive - includes children)
 */
export function findAllEntitiesAtLocationRecursive(
  unsNodeId: string,
  aasList: AAS[],
  rdsList: RDSDesignation[],
  unsNodes: UNSNode[]
): {
  aas: AAS[];
  rds: RDSDesignation[];
} {
  // Get direct links
  const direct = findAllEntitiesAtLocation(unsNodeId, aasList, rdsList);

  // Find all child UNS nodes
  const childNodes = unsNodes.filter(node => node.parentId === unsNodeId);
  
  // Recursively get entities from children
  const childEntities = childNodes.reduce(
    (acc, child) => {
      const childEntities = findAllEntitiesAtLocationRecursive(
        child.id,
        aasList,
        rdsList,
        unsNodes
      );
      return {
        aas: [...acc.aas, ...childEntities.aas],
        rds: [...acc.rds, ...childEntities.rds],
      };
    },
    { aas: [] as AAS[], rds: [] as RDSDesignation[] }
  );

  return {
    aas: [...direct.aas, ...childEntities.aas],
    rds: [...direct.rds, ...childEntities.rds],
  };
}

/**
 * Count entities at a location
 */
export function countEntitiesAtLocation(
  unsNodeId: string,
  aasList: AAS[],
  rdsList: RDSDesignation[]
): {
  aasCount: number;
  rdsCount: number;
  total: number;
} {
  const entities = findAllEntitiesAtLocation(unsNodeId, aasList, rdsList);
  return {
    aasCount: entities.aas.length,
    rdsCount: entities.rds.length,
    total: entities.aas.length + entities.rds.length,
  };
}

/**
 * Get relationship summary for an entity
 */
export function getRelationshipSummary(
  entity: AAS | RDSDesignation,
  aasList: AAS[],
  rdsList: RDSDesignation[],
  unsNodes: UNSNode[]
): {
  linkedUNS?: UNSNode;
  linkedAAS?: AAS;
  linkedRDS?: RDSDesignation;
  entitiesAtLocation?: {
    aas: AAS[];
    rds: RDSDesignation[];
  };
} {
  const result: ReturnType<typeof getRelationshipSummary> = {};

  if ('linkedUNSNodeId' in entity && entity.linkedUNSNodeId) {
    result.linkedUNS = unsNodes.find(n => n.id === entity.linkedUNSNodeId);
    if (result.linkedUNS) {
      result.entitiesAtLocation = findAllEntitiesAtLocation(
        result.linkedUNS.id,
        aasList,
        rdsList
      );
    }
  }

  if ('linkedAASId' in entity && entity.linkedAASId) {
    result.linkedAAS = aasList.find(a => a.id === entity.linkedAASId);
  }

  if ('linkedRDSId' in entity && entity.linkedRDSId) {
    result.linkedRDS = rdsList.find(r => r.id === entity.linkedRDSId);
  }

  if ('linkedAASId' in entity && entity.linkedAASId) {
    result.linkedAAS = aasList.find(a => a.id === entity.linkedAASId);
  }

  return result;
}
