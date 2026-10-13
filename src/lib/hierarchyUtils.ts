import { UNSNode, ISA95Level, UNSNodeMetadata } from '@/types/industrial';
import {
  SparkplugMessageType,
  buildSparkplugTopic,
  normalizeTopicPath,
} from './mqttTopics';

// ISA-95 Level hierarchy order
export const ISA95_LEVEL_ORDER: ISA95Level[] = ['Enterprise', 'Site', 'Area', 'Line', 'Cell'];

// Get the level index for hierarchy comparisons
export const getLevelIndex = (level: ISA95Level): number => {
  return ISA95_LEVEL_ORDER.indexOf(level);
};

// Check if a level is at or above the Line level (location-based RDS)
export const isLocationLevel = (level: ISA95Level): boolean => {
  const lineIndex = ISA95_LEVEL_ORDER.indexOf('Line');
  const levelIndex = ISA95_LEVEL_ORDER.indexOf(level);
  return levelIndex <= lineIndex;
};

// IEC 81346 location object class mapping for ISA-95 levels
export const getLocationObjectClass = (level: ISA95Level): string => {
  const mapping: Record<ISA95Level, string> = {
    'Enterprise': 'ENT',
    'Site': 'SITE',
    'Area': 'AREA',
    'Line': 'LN',
    'Cell': 'CELL', // Cells should use function/product, but included for fallback
  };
  return mapping[level] || 'OBJ';
};

// Build the full UNS path from node hierarchy
export const buildUNSPath = (
  nodeName: string,
  parentNode: UNSNode | null,
  nodes: UNSNode[]
): string => {
  if (!parentNode) {
    return nodeName;
  }
  
  // If parent has a path, use it
  if (parentNode.metadata?.uns_path) {
    return `${parentNode.metadata.uns_path}/${nodeName}`;
  }
  
  // Build path recursively
  const buildPath = (node: UNSNode): string => {
    if (!node.parentId) {
      return node.name;
    }
    const parent = nodes.find(n => n.id === node.parentId);
    if (parent) {
      return `${buildPath(parent)}/${node.name}`;
    }
    return node.name;
  };
  
  return `${buildPath(parentNode)}/${nodeName}`;
};

// Build RDS location code from node hierarchy (only for Enterprise → Site → Area → Line)
export const buildRDSLocationCode = (
  level: ISA95Level,
  nodeName: string,
  parentNode: UNSNode | null
): string => {
  // Only build location codes for levels up to Line
  if (!isLocationLevel(level)) {
    return ''; // Below Line level, don't use location-based RDS
  }
  
  const formattedName = sanitizeRDSCode(nodeName) || 'LOC';
  
  if (!parentNode) {
    // Root level (Enterprise)
    return `+${formattedName}`;
  }
  
  // Get parent's location code
  const parentLocation = parentNode.metadata?.rds_location;
  if (parentLocation) {
    return `${parentLocation}.${formattedName}`;
  }
  
  // Fallback: just use this node's code
  return `+${formattedName}`;
};

// Generate Sparkplug B topic for UNS node
// Format: spBv1.0/{group_id}/{message_type}/{edge_node_id}[/{device_id}]
// group_id = Enterprise level, edge_node_id = remaining path levels joined with '-'.
// IDs are sanitized (Sparkplug forbids '+', '/', '#').
// For the host application STATE topic use buildSparkplugStateTopic (mqttTopics.ts).
export const generateSparkplugBTopic = (
  unsPath: string,
  messageType: SparkplugMessageType = 'NDATA',
  deviceId?: string
): string => {
  const pathParts = unsPath.split('/').map(p => p.trim()).filter(Boolean);
  const groupId = pathParts[0] || 'default';
  const edgeNodeId = pathParts.slice(1).join('-') || 'node';
  return buildSparkplugTopic(groupId, messageType, edgeNodeId, deviceId);
};

// Generate standard MQTT topic for UNS node
// Preserves UNS path structure (case-sensitive), sanitizes whitespace,
// MQTT wildcards and empty levels.
// Format: {enterprise}/{site}/{area}/{line}/{cell?}
export const generateMQTTTopic = (unsPath: string): string => {
  return normalizeTopicPath(unsPath);
};

// Generate location projection topic for a UNS node
// Format: enterprise/locations/{site}/{area}/{line}/...
// The literal 'enterprise' prefix matches the Track & Trace namespace (trackingTopics.ts).
export const generateLocationTopic = (unsPath: string): string => {
  const parts = normalizeTopicPath(unsPath).split('/');
  // Skip Enterprise (first part) – it becomes the prefix
  if (parts.length <= 1) return '';
  return `enterprise/locations/${parts.slice(1).join('/')}`;
};

// Generate wildcard topic filter to discover all tracked assets at this location
// Format: enterprise/locations/{path}/assets/+/#
export const generateLocationAssetsTopic = (unsPath: string): string => {
  const locationTopic = generateLocationTopic(unsPath);
  return locationTopic ? `${locationTopic}/assets/+/#` : '';
};

export const normalizeUnsTopic = (unsPath: string): string => {
  return generateMQTTTopic(unsPath);
};

// Normalize a user supplied topic (name or filter): whitespace -> '_',
// no leading/trailing slashes. Wildcards are kept so filters stay usable;
// validateMqttTopicName / validateMqttTopicFilter report misuse.
export const normalizeMqttTopic = (topic: string): string => {
  return topic.trim().replace(/\s+/g, '_').replace(/^\/+|\/+$/g, '');
};

// Build complete UNS metadata for a node
// UNS topics stop at machine/Cell level - AAS submodels handle data below
export const buildUNSMetadata = (
  level: ISA95Level,
  nodeName: string,
  parentNode: UNSNode | null,
  nodes: UNSNode[],
  linkedRDS?: { functionAspect?: string; productAspect?: string } | null,
  extraMqttTopics: string[] = []
): UNSNodeMetadata => {
  const unsPath = buildUNSPath(nodeName, parentNode, nodes);
  
  // For Cell level and below, RDS location comes from parent Line
  // and we add function/product aspects to identify the asset
  let rdsLocation = '';
  let functionAspect = '';
  let productAspect = '';
  let fullRDSDesignation = '';
  
  if (isLocationLevel(level)) {
    // Enterprise → Site → Area → Line: use location-based RDS
    rdsLocation = buildRDSLocationCode(level, nodeName, parentNode);
  } else {
    // Cell level (machines/assets): inherit parent's location and add function/product
    rdsLocation = parentNode?.metadata?.rds_location || '';
    
    // Add function and product aspects if provided
    if (linkedRDS?.functionAspect) {
      functionAspect = linkedRDS.functionAspect;
    }
    if (linkedRDS?.productAspect) {
      productAspect = linkedRDS.productAspect;
    }
    
    // Build full RDS designation: =FUNC-PROD+LOCATION
    if (functionAspect) {
      fullRDSDesignation = composeRDSDesignation({
        aspectCode: '=',
        functionAspect,
        productAspect: productAspect || undefined,
        locationAspect: rdsLocation || undefined,
      });
    }
  }
  
  // UNS topic path - stops at machine level
  // Below machine level, data is structured via AAS submodels (e.g., OperationalData, Nameplate)
  const mqttTopic = generateMQTTTopic(unsPath);
  const normalizedExtraTopics = Array.from(new Set(extraMqttTopics.map(normalizeMqttTopic)))
    .filter(topic => topic.length > 0 && topic !== mqttTopic);
  
  // Generate location projection topic (enterprise/locations/{site}/{area}/...)
  const locationTopic = generateLocationTopic(unsPath);
  const locationAssetsTopic = isLocationLevel(level) ? generateLocationAssetsTopic(unsPath) : '';
  
  // Collect all MQTT topics: UNS path + location projection + assets wildcard + extras
  const allTopics = [mqttTopic];
  if (locationTopic) allTopics.push(locationTopic);
  if (locationAssetsTopic) allTopics.push(locationAssetsTopic);
  allTopics.push(...normalizedExtraTopics);
  const mqttTopics = Array.from(new Set(allTopics));
  
  const sparkplugTopic = generateSparkplugBTopic(unsPath);
  
  // For Cell/machine level, generate device-level Sparkplug topics
  // AAS submodels will provide the payload structure
  const isAssetLevel = !isLocationLevel(level);
  const deviceSparkplugTopics = isAssetLevel ? generateAssetSparkplugTopics(
    parentNode?.metadata?.uns_path || unsPath,
    nodeName
  ) : undefined;
  
  return {
    uns_path: unsPath,
    rds_location: rdsLocation,
    function_aspect: functionAspect || undefined,
    product_aspect: productAspect || undefined,
    full_rds_designation: fullRDSDesignation || undefined,
    mqtt_topic: mqttTopic,
    mqtt_topics: mqttTopics,
    location_topic: locationTopic || undefined,
    location_assets_topic: locationAssetsTopic || undefined,
    sparkplug_topic: sparkplugTopic,
    // Device-level Sparkplug B topics for machines
    sparkplug_device_topics: deviceSparkplugTopics,
    hierarchy_level: level,
    is_location_level: isLocationLevel(level),
    is_asset_level: isAssetLevel,
    // Note: Data below machine level is managed by AAS submodels
    // (e.g., OperationalData, TechnicalData, Nameplate)
    data_model: isAssetLevel ? 'AAS' : 'UNS',
  };
};

// Build RDS designation for a UNS node (location-based)
export const buildLocationRDSDesignation = (
  level: ISA95Level,
  nodeName: string,
  parentNode: UNSNode | null,
  unsPath: string
): {
  designation: string;
  aspectCode: string;
  objectClass: string;
  locationAspect: string;
} | null => {
  // Only create location RDS for levels up to Line
  if (!isLocationLevel(level)) {
    return null;
  }
  
  const rdsLocation = buildRDSLocationCode(level, nodeName, parentNode);
  const objectClass = getLocationObjectClass(level);
  
  return {
    designation: rdsLocation,
    aspectCode: '+',
    objectClass,
    locationAspect: rdsLocation.replace('+', ''),
  };
};

// Build RDS designation for an asset (function/product-based)
// Function aspect: =M1[-PROD][+LOCATION]   e.g. =M1-DRV1+PIL.STANS.HALL3.LN01
// Product aspect:  -M1[+LOCATION]          e.g. -M1+PIL.STANS.HALL3.LN01
// The stored function/product aspect includes the instance number (M1) so the
// designation can be recomposed losslessly (e.g. when the asset is moved).
export const buildAssetRDSDesignation = (
  aspectCode: '=' | '-',
  classCode: string,
  instanceNumber: number | undefined,
  productCode: string | undefined,
  locationNodePath: string | null
): {
  designation: string;
  aspectCode: '=' | '-';
  objectClass: string;
  functionAspect?: string;
  productAspect?: string;
  locationAspect?: string;
} => {
  const code = `${sanitizeRDSCode(classCode)}${instanceNumber || ''}`;
  const locationAspect = locationNodePath ? stripAspectPrefix(locationNodePath) : undefined;
  const functionAspect = aspectCode === '=' ? code : undefined;
  const productAspect = aspectCode === '=' ? (productCode ? sanitizeRDSCode(productCode) : undefined) : code;

  return {
    designation: composeRDSDesignation({ aspectCode, functionAspect, productAspect, locationAspect }),
    aspectCode,
    objectClass: sanitizeRDSCode(classCode),
    functionAspect,
    productAspect,
    locationAspect,
  };
};

// Generate Sparkplug B topics for an asset
export const generateAssetSparkplugTopics = (
  unsPath: string,
  assetName: string
): {
  birthTopic: string;
  dataTopic: string;
  deathTopic: string;
  cmdTopic: string;
} => {
  return {
    birthTopic: generateSparkplugBTopic(unsPath, 'DBIRTH', assetName),
    dataTopic: generateSparkplugBTopic(unsPath, 'DDATA', assetName),
    deathTopic: generateSparkplugBTopic(unsPath, 'DDEATH', assetName),
    cmdTopic: generateSparkplugBTopic(unsPath, 'DCMD', assetName),
  };
};

// Validate that a parent node is valid for a given level
export const validateParentForLevel = (
  targetLevel: ISA95Level,
  parentNode: UNSNode | null,
): { valid: boolean; message?: string } => {
  const targetIndex = getLevelIndex(targetLevel);
  
  if (targetIndex === 0) {
    // Enterprise must have no parent
    if (parentNode) {
      return { valid: false, message: 'Enterprise level must be the root node' };
    }
    return { valid: true };
  }
  
  if (!parentNode) {
    return { valid: false, message: `${targetLevel} level requires a parent node` };
  }
  
  const parentIndex = getLevelIndex(parentNode.level);
  
  // Parent must be exactly one level above
  if (parentIndex !== targetIndex - 1) {
    const expectedParentLevel = ISA95_LEVEL_ORDER[targetIndex - 1];
    return { 
      valid: false, 
      message: `${targetLevel} must be under ${expectedParentLevel}, not ${parentNode.level}` 
    };
  }
  
  return { valid: true };
};

// Get available parent nodes for a given level
export const getAvailableParentsForLevel = (
  targetLevel: ISA95Level,
  nodes: UNSNode[],
  excludeNodeId?: string
): UNSNode[] => {
  const targetIndex = getLevelIndex(targetLevel);
  
  if (targetIndex === 0) {
    return []; // Enterprise has no parents
  }
  
  const requiredParentLevel = ISA95_LEVEL_ORDER[targetIndex - 1];
  
  return nodes.filter(n => {
    if (excludeNodeId && n.id === excludeNodeId) return false;
    return n.level === requiredParentLevel;
  });
};

// ---------------------------------------------------------------------------
// IEC 81346-1 reference designation helpers
// ---------------------------------------------------------------------------

// Single-level designation codes use uppercase letters and digits only.
// Everything else ('-', '.', '+', '=' would be read as aspect prefixes / level
// separators) is removed. Location names are truncated to 8 characters.
export const sanitizeRDSCode = (value: string, maxLength = 8): string =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, maxLength);

const stripAspectPrefix = (value: string): string => value.replace(/^[=+-]+/, '');

// Compose a multi-aspect designation: =FUNC[-PROD][+LOC] or -PROD[+LOC] or +LOC
export const composeRDSDesignation = ({
  aspectCode,
  functionAspect,
  productAspect,
  locationAspect,
}: {
  aspectCode: string;
  functionAspect?: string;
  productAspect?: string;
  locationAspect?: string;
}): string => {
  const loc = locationAspect ? stripAspectPrefix(locationAspect) : '';
  if (aspectCode === '+') return `+${loc}`;

  let designation = '';
  if (aspectCode === '=') {
    designation = `=${stripAspectPrefix(functionAspect || '')}`;
    if (productAspect) designation += `-${stripAspectPrefix(productAspect)}`;
  } else {
    designation = `-${stripAspectPrefix(productAspect || '')}`;
  }
  return loc ? `${designation}+${loc}` : designation;
};

// Replace the location aspect of an existing designation, keeping the
// function/product part verbatim (works for legacy records too).
export const relocateRDSDesignation = (
  designation: string,
  aspectCode: string,
  newLocationAspect: string | undefined
): string => {
  const loc = newLocationAspect ? stripAspectPrefix(newLocationAspect) : '';
  if (aspectCode === '+') return `+${loc}`;
  const plusIndex = designation.indexOf('+');
  const base = plusIndex >= 0 ? designation.slice(0, plusIndex) : designation;
  return loc ? `${base}+${loc}` : base;
};

// Syntax check per IEC 81346-1: one or more aspect blocks, each starting with
// a prefix (=, -, +) followed by codes of uppercase letters/digits, levels
// separated by '.'.
const RDS_DESIGNATION_RE = /^(?:[=+-][A-Z0-9]+(?:\.[A-Z0-9]+)*)+$/;

export const validateRDSDesignation = (designation: string): { valid: boolean; message?: string } => {
  const trimmed = designation.trim();
  if (!trimmed) return { valid: false, message: 'Designation is required.' };
  if (!RDS_DESIGNATION_RE.test(trimmed)) {
    return {
      valid: false,
      message: 'Designation must follow IEC 81346 syntax, e.g. =M1-DRV1+SITE.HALL3.LN01 (uppercase letters/digits, levels separated by ".").',
    };
  }
  return { valid: true };
};

// Sparkplug device id for an RDS instance: the designation without its
// location part (e.g. "=M1-DRV1"), so it stays stable when the asset moves.
export const rdsDeviceId = (designation: string): string => {
  const plusIndex = designation.indexOf('+');
  return plusIndex > 0 ? designation.slice(0, plusIndex) : designation;
};

// Build RDS location aspect (without '+') from UNS hierarchy.
// Each location-level node already stores its *full* location code in
// metadata.rds_location (e.g. +ENT.SITE.AREA.LN), and Cell nodes inherit the
// code of their Line, so the node's own code is used when present. Otherwise
// the code is rebuilt from the node names along the path.
export const buildLocationFromUNS = (node: UNSNode, allNodes: UNSNode[]): string => {
  const ownCode = node.metadata?.rds_location;
  if (typeof ownCode === 'string' && ownCode.length > 1) {
    return ownCode.replace(/^\+/, '');
  }

  const path: string[] = [];
  let current: UNSNode | undefined = node;
  while (current) {
    if (isLocationLevel(current.level)) {
      path.unshift(sanitizeRDSCode(current.name) || 'LOC');
    }
    const parentId: string | null = current.parentId;
    current = parentId ? allNodes.find(n => n.id === parentId) : undefined;
  }
  return path.join('.');
};

// Generate full RDS designation with dynamic location
export const generateDynamicDesignation = (
  functionAspect: string | undefined,
  productAspect: string | undefined,
  locationAspect: string | undefined,
  aspectCode: string
): string =>
  composeRDSDesignation({ aspectCode, functionAspect, productAspect, locationAspect });
