import { UNSNode, ISA95Level, RDSDesignation } from '@/types/industrial';

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
  
  // Format name for RDS (uppercase, remove spaces, take first meaningful part)
  const formatName = (name: string): string => {
    return name.toUpperCase().replace(/\s+/g, '').substring(0, 8);
  };
  
  const formattedName = formatName(nodeName);
  
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
// Format: spBv1.0/{group_id}/{message_type}/{edge_node_id}/{device_id}
export const generateSparkplugBTopic = (
  unsPath: string,
  messageType: 'NBIRTH' | 'NDEATH' | 'NDATA' | 'NCMD' | 'DBIRTH' | 'DDEATH' | 'DDATA' | 'DCMD' | 'STATE' = 'NDATA',
  deviceId?: string
): string => {
  // Parse the UNS path to extract group and edge node
  const pathParts = unsPath.split('/');
  
  if (pathParts.length === 0) {
    return '';
  }
  
  // Group ID is typically the Enterprise level
  const groupId = pathParts[0] || 'default';
  
  // Edge Node ID is derived from the path (Site/Area/Line)
  const edgeNodeId = pathParts.slice(1).join('-') || 'node';
  
  if (deviceId) {
    // Device-level message
    return `spBv1.0/${groupId}/${messageType}/${edgeNodeId}/${deviceId}`;
  } else {
    // Node-level message (for NBIRTH, NDEATH, NDATA, NCMD)
    return `spBv1.0/${groupId}/${messageType}/${edgeNodeId}`;
  }
};

// Generate standard MQTT topic for UNS node
// Format: {enterprise}/{site}/{area}/{line}/{cell?}/{asset?}
export const generateMQTTTopic = (unsPath: string): string => {
  return unsPath.replace(/\s+/g, '_').toLowerCase();
};

// Build complete UNS metadata for a node
// For Cell level and below, includes function/product aspects in the path
export const buildUNSMetadata = (
  level: ISA95Level,
  nodeName: string,
  parentNode: UNSNode | null,
  nodes: UNSNode[],
  linkedRDS?: { functionAspect?: string; productAspect?: string } | null
): Record<string, any> => {
  const unsPath = buildUNSPath(nodeName, parentNode, nodes);
  
  // For Cell level and below, RDS location comes from parent Line
  // and we add function/product aspects to the hierarchy
  let rdsLocation = '';
  let functionAspect = '';
  let productAspect = '';
  let fullRDSDesignation = '';
  
  if (isLocationLevel(level)) {
    // Enterprise → Site → Area → Line: use location-based RDS
    rdsLocation = buildRDSLocationCode(level, nodeName, parentNode);
  } else {
    // Cell level and below: inherit parent's location and add function/product
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
      fullRDSDesignation = `=${functionAspect}`;
      if (productAspect) {
        fullRDSDesignation += `-${productAspect}`;
      }
      if (rdsLocation) {
        fullRDSDesignation += rdsLocation; // Already has + prefix
      }
    }
  }
  
  // Build extended UNS path with function/product for Cell level
  let extendedUNSPath = unsPath;
  if (!isLocationLevel(level) && (functionAspect || productAspect)) {
    const aspectPath = [functionAspect, productAspect].filter(Boolean).join('/');
    if (aspectPath) {
      extendedUNSPath = `${unsPath}/${aspectPath}`;
    }
  }
  
  const mqttTopic = generateMQTTTopic(extendedUNSPath);
  const sparkplugTopic = generateSparkplugBTopic(extendedUNSPath);
  
  return {
    uns_path: unsPath,
    extended_uns_path: extendedUNSPath,
    rds_location: rdsLocation,
    function_aspect: functionAspect || undefined,
    product_aspect: productAspect || undefined,
    full_rds_designation: fullRDSDesignation || undefined,
    mqtt_topic: mqttTopic,
    sparkplug_topic: sparkplugTopic,
    hierarchy_level: level,
    is_location_level: isLocationLevel(level),
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
export const buildAssetRDSDesignation = (
  functionCode: string,
  productCode: string | undefined,
  locationNodePath: string | null,
  instanceNumber?: number
): {
  designation: string;
  aspectCode: string;
  objectClass: string;
  functionAspect: string;
  productAspect?: string;
  locationAspect?: string;
} => {
  // Format: =FUNC{N}[-PROD{N}][+LOCATION]
  // Example: =M1-DRV1+PIL.STANS.HALL3.LN01 (Motor-Drive at specific location)
  
  const funcPart = `=${functionCode}${instanceNumber || ''}`;
  const prodPart = productCode ? `-${productCode}` : '';
  const locPart = locationNodePath ? `+${locationNodePath.replace('+', '')}` : '';
  
  return {
    designation: `${funcPart}${prodPart}${locPart}`,
    aspectCode: '=',
    objectClass: functionCode,
    functionAspect: functionCode,
    productAspect: productCode,
    locationAspect: locationNodePath?.replace('+', ''),
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
