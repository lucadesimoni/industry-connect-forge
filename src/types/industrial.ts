// ISA-95 Hierarchy Levels
export type ISA95Level = 'Enterprise' | 'Site' | 'Area' | 'Line' | 'Cell';

// Site (Multi-site support)
export interface Site {
  id: string;
  code: string;
  name: string;
  region?: string;
  country?: string;
  timezone: string;
  defaultLanguage: string;
  currencyCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UNSNodeMetadata extends Record<string, any> {
  uns_path?: string;
  extended_uns_path?: string;
  mqtt_topic?: string;
  mqtt_topics?: string[];
  location_topic?: string;
  location_assets_topic?: string;
  sparkplug_topic?: string;
  sparkplug_device_topics?: {
    birthTopic?: string;
    dataTopic?: string;
    deathTopic?: string;
    cmdTopic?: string;
  };
  rds_location?: string;
  full_rds_designation?: string;
  hierarchy_level?: ISA95Level;
  is_location_level?: boolean;
  is_asset_level?: boolean;
  data_model?: 'UNS' | 'AAS';
  function_aspect?: string;
  product_aspect?: string;
}

export interface RDSMetadata extends Record<string, any> {
  uns_topic?: string;
  broker_topic?: string;
  mqtt_topic?: string;
  mqtt_topics?: string[];
  sparkplug_topic?: string;
  sparkplug_topics?: {
    birthTopic?: string;
    dataTopic?: string;
    deathTopic?: string;
    cmdTopic?: string;
  };
  uns_path?: string;
  aas_id?: string;
  last_moved_at?: string;
  hierarchy_level?: ISA95Level;
  auto_created?: boolean;
}

export interface AASMetadata extends Record<string, any> {
  uns_topic?: string;
  sparkplug_topic?: string;
  part_number?: string;
  lot_number?: string;
  revision?: string;
  as9100_compliant?: boolean;
  export_control_flag?: 'NONE' | 'ITAR' | 'EAR';
}

// Unified Namespace Node (ISA-95 + IEC 81346)
export interface UNSNode {
  id: string;
  name: string;
  level: ISA95Level;
  parentId: string | null;
  description?: string;
  metadata?: UNSNodeMetadata;
  siteId?: string;
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
  siteId?: string;
  metadata?: AASMetadata;
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

// IEC 63278 / IDTA compliant value types for AAS properties
export type AASValueType =
  | 'xs:string'
  | 'xs:boolean'
  | 'xs:integer'
  | 'xs:int'
  | 'xs:long'
  | 'xs:short'
  | 'xs:byte'
  | 'xs:double'
  | 'xs:float'
  | 'xs:decimal'
  | 'xs:dateTime'
  | 'xs:date'
  | 'xs:duration'
  | 'xs:anyURI'
  | 'xs:base64Binary'
  // Legacy compat (mapped on read)
  | 'string'
  | 'number'
  | 'boolean'
  | 'date';

export interface AASProperty {
  id: string;
  idShort: string;
  valueType: AASValueType;
  value: any;
  unit?: string;
  description?: string;
  semanticId?: string;
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
  siteId?: string;
  metadata?: RDSMetadata;
  isInstance: boolean; // true for physical instances, false for abstract definitions
  parentDefinitionId?: string; // link to abstract definition for instances
  functionAspect?: string; // e.g., F1 for =F1
  productAspect?: string; // e.g., BRKT1 for -BRKT1
  locationAspect?: string; // e.g., PIL.STANS.HALL3
  createdAt: Date;
  updatedAt: Date;
}

// Track & Trace: Tracked Asset (stable identity for containers/carriers)
export interface TrackedAsset {
  id: string;
  assetId: string; // e.g. "container-000812"
  assetType: string; // "container", "pallet", "carrier"
  description: string;
  currentLocationPath: string | null;
  currentState: string; // "in_transit", "at_rest", "in_use", "maintenance"
  currentQualityState: string; // "ok", "warning", "blocked"
  metadata?: Record<string, any>;
  siteId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Track & Trace: Asset Event (locationChanged, qualityViolation, etc.)
export interface AssetEvent {
  id: string;
  assetId: string; // FK to tracked_assets.id
  eventType: string;
  fromLocation: string | null;
  toLocation: string | null;
  reason: string | null;
  payload?: Record<string, any>;
  createdBy: string | null;
  siteId?: string;
  createdAt: Date;
}

// Track & Trace: Context Binding (order, workorder, shipment)
export interface AssetContextBinding {
  id: string;
  assetId: string; // FK to tracked_assets.id
  contextType: string; // "order", "workorder", "shipment"
  contextId: string; // e.g. "PO-471193"
  isActive: boolean;
  boundAt: Date;
  unboundAt: Date | null;
  siteId?: string;
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
