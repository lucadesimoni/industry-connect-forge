// ISA-95 Hierarchy Levels
export type ISA95Level = 'Enterprise' | 'Site' | 'Area' | 'Line' | 'Cell';

// Unified Namespace Node (ISA-95 + IEC 81346)
export interface UNSNode {
  id: string;
  name: string;
  level: ISA95Level;
  parentId: string | null;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Asset Administration Shell (IEC 63278)
export interface AAS {
  id: string;
  assetId: string;
  idShort: string;
  description: string;
  manufacturer?: string;
  serialNumber?: string;
  submodels: AASSubmodel[];
  linkedUNSNodeId?: string;
  linkedRDSId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AASSubmodel {
  id: string;
  idShort: string;
  semanticId: string;
  description: string;
  properties: AASProperty[];
}

export interface AASProperty {
  idShort: string;
  valueType: 'string' | 'number' | 'boolean' | 'date';
  value: any;
  unit?: string;
  description?: string;
}

// Reference Designation System (IEC 81346)
export interface RDSDesignation {
  id: string;
  designation: string; // e.g., =M1-A2.3
  aspectCode: string; // Function (=), Product (-), Location (+)
  objectClass: string;
  description: string;
  linkedUNSNodeId?: string;
  linkedAASId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Link types between entities
export interface EntityLink {
  id: string;
  sourceType: 'UNS' | 'AAS' | 'RDS';
  sourceId: string;
  targetType: 'UNS' | 'AAS' | 'RDS';
  targetId: string;
  linkType: string;
  createdAt: Date;
}
