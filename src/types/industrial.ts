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
// Supports Type/Instance pattern:
// - Type AAS: Template/class for asset types (e.g., "5-Axis CNC Machine Type")
// - Instance AAS: Specific physical asset that inherits from Type AAS
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
  // Type/Instance distinction
  isType: boolean; // true = Type AAS (template), false = Instance AAS (physical asset)
  typeAASId?: string; // Reference to parent Type AAS (for Instance AAS only)
  typeAAS?: AAS; // Resolved Type AAS object (populated when fetching instances)
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
  id: string;
  idShort: string;
  valueType: 'string' | 'number' | 'boolean' | 'date';
  value: any;
  unit?: string;
  description?: string;
}

// Reference Designation System (IEC 81346)
export interface RDSDesignation {
  id: string;
  designation: string; // e.g., =F1+PIL.STANS.HALL3.LN01.ST05 (instance) or =F1 (abstract)
  aspectCode: string; // Function (=), Product (-), Location (+)
  objectClass: string;
  description: string;
  linkedUNSNodeId?: string;
  linkedAASId?: string;
  metadata?: Record<string, any>;
  isInstance: boolean; // true for physical instances, false for abstract definitions
  parentDefinitionId?: string; // link to abstract definition for instances
  functionAspect?: string; // e.g., F1 for =F1
  productAspect?: string; // e.g., BRKT1 for -BRKT1
  locationAspect?: string; // e.g., PIL.STANS.HALL3
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
