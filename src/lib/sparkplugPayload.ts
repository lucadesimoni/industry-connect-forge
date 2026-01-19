import { AASSubmodel, AASProperty, AAS, UNSNode } from '@/types/industrial';

/**
 * Sparkplug B Data Types as per specification
 */
export type SparkplugDataType = 
  | 'Int8' | 'Int16' | 'Int32' | 'Int64' | 'UInt8' | 'UInt16' | 'UInt32' | 'UInt64'
  | 'Float' | 'Double' | 'Boolean' | 'String' | 'DateTime' | 'Text';

/**
 * Sparkplug B Metric structure
 */
export interface SparkplugMetric {
  name: string;
  alias?: number;
  timestamp: number;
  dataType: SparkplugDataType;
  value: any;
  properties?: Record<string, any>;
}

/**
 * Sparkplug B Payload structure (simplified for AAS integration)
 */
export interface SparkplugPayload {
  timestamp: number;
  seq: number;
  metrics: SparkplugMetric[];
}

/**
 * Map AAS property valueType to Sparkplug B dataType
 */
function mapValueTypeToSparkplug(valueType: AASProperty['valueType']): SparkplugDataType {
  switch (valueType) {
    case 'number':
      return 'Double';
    case 'boolean':
      return 'Boolean';
    case 'date':
      return 'DateTime';
    case 'string':
    default:
      return 'String';
  }
}

/**
 * Convert an AAS property value to the appropriate Sparkplug format
 */
function convertValue(value: any, valueType: AASProperty['valueType']): any {
  switch (valueType) {
    case 'number':
      return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
    case 'boolean':
      return typeof value === 'boolean' ? value : value === 'true';
    case 'date':
      return typeof value === 'string' ? new Date(value).getTime() : Date.now();
    case 'string':
    default:
      return String(value ?? '');
  }
}

/**
 * Generate Sparkplug B metrics from AAS submodel properties
 */
export function generateSubmodelMetrics(
  submodel: AASSubmodel,
  namespace?: string
): SparkplugMetric[] {
  const timestamp = Date.now();
  const prefix = namespace ? `${namespace}/` : '';
  
  return submodel.properties.map((prop, index) => ({
    name: `${prefix}${submodel.idShort}/${prop.idShort}`,
    alias: index + 1,
    timestamp,
    dataType: mapValueTypeToSparkplug(prop.valueType),
    value: convertValue(prop.value, prop.valueType),
    properties: {
      unit: prop.unit || undefined,
      description: prop.description || undefined,
      semanticId: submodel.semanticId,
    },
  }));
}

/**
 * Generate a complete Sparkplug B DDATA payload for a submodel
 */
export function generateSubmodelPayload(
  submodel: AASSubmodel,
  namespace?: string,
  seq?: number
): SparkplugPayload {
  return {
    timestamp: Date.now(),
    seq: seq ?? 0,
    metrics: generateSubmodelMetrics(submodel, namespace),
  };
}

/**
 * Generate a complete Sparkplug B DDATA payload for all AAS submodels
 */
export function generateAASDataPayload(
  aas: AAS,
  seq?: number
): SparkplugPayload {
  const timestamp = Date.now();
  const metrics: SparkplugMetric[] = [];
  let metricIndex = 0;

  // Add all submodel metrics
  for (const submodel of aas.submodels) {
    const submodelMetrics = generateSubmodelMetrics(submodel);
    submodelMetrics.forEach(metric => {
      metric.alias = ++metricIndex;
      metrics.push(metric);
    });
  }

  return {
    timestamp,
    seq: seq ?? 0,
    metrics,
  };
}

/**
 * Build full UNS path from a node by traversing parent chain
 */
function buildUNSPath(node: UNSNode, allNodes: UNSNode[]): string {
  const pathParts: string[] = [];
  let current: UNSNode | undefined = node;
  
  while (current) {
    pathParts.unshift(current.name);
    current = current.parentId 
      ? allNodes.find(n => n.id === current!.parentId) 
      : undefined;
  }
  
  return pathParts.join('/');
}

/**
 * Generate Sparkplug B topic for an AAS instance
 * Follows format: spBv1.0/{uns_path}/{message_type}/{device}
 * Uses UNS hierarchy path for proper topic structure
 */
export function generateAASSparkplugTopic(
  aas: AAS,
  unsNode: UNSNode | null,
  messageType: 'DBIRTH' | 'DDEATH' | 'DDATA' | 'DCMD' = 'DDATA',
  allNodes?: UNSNode[]
): string {
  // Build UNS path if node and all nodes available
  let unsPath = 'default';
  
  if (unsNode && allNodes && allNodes.length > 0) {
    // Build full UNS path from hierarchy
    unsPath = buildUNSPath(unsNode, allNodes);
  } else if (unsNode) {
    // Fallback: just use node name
    unsPath = unsNode.name.replace(/\s+/g, '-');
  }
  
  // Device ID is the AAS asset identifier
  const deviceId = aas.assetId;
  
  return `spBv1.0/${unsPath}/${messageType}/${deviceId}`;
}

/**
 * Generate a complete Sparkplug B DBIRTH payload for an AAS instance
 * This is the best practice payload sent when a device comes online
 */
export function generateAASBirthPayload(
  aas: AAS,
  unsNode: UNSNode | null
): SparkplugPayload {
  const timestamp = Date.now();
  const metrics: SparkplugMetric[] = [];
  let metricIndex = 0;

  // Add AAS identification metrics
  metrics.push({
    name: 'AAS/IdShort',
    alias: ++metricIndex,
    timestamp,
    dataType: 'String',
    value: aas.idShort,
  });

  metrics.push({
    name: 'AAS/AssetId',
    alias: ++metricIndex,
    timestamp,
    dataType: 'String',
    value: aas.assetId,
  });

  metrics.push({
    name: 'AAS/Description',
    alias: ++metricIndex,
    timestamp,
    dataType: 'String',
    value: aas.description,
  });

  if (aas.manufacturer) {
    metrics.push({
      name: 'AAS/Manufacturer',
      alias: ++metricIndex,
      timestamp,
      dataType: 'String',
      value: aas.manufacturer,
    });
  }

  if (aas.serialNumber) {
    metrics.push({
      name: 'AAS/SerialNumber',
      alias: ++metricIndex,
      timestamp,
      dataType: 'String',
      value: aas.serialNumber,
    });
  }

  // Add submodel metrics
  for (const submodel of aas.submodels) {
    const submodelMetrics = generateSubmodelMetrics(submodel);
    submodelMetrics.forEach(metric => {
      metric.alias = ++metricIndex;
      metrics.push(metric);
    });
  }

  return {
    timestamp,
    seq: 0,
    metrics,
  };
}

/**
 * Generate an example Sparkplug B payload for demonstration
 */
export function generateExamplePayload(): {
  topic: string;
  payload: SparkplugPayload;
  description: string;
} {
  const exampleSubmodel: AASSubmodel = {
    id: 'example-submodel',
    idShort: 'OperationalData',
    semanticId: 'https://admin-shell.io/submodel/operational/1/0',
    description: 'Real-time operational data from CNC machine',
    properties: [
      {
        id: 'prop-1',
        idShort: 'SpindleSpeed',
        valueType: 'number',
        value: 12500,
        unit: 'RPM',
        description: 'Current spindle rotation speed',
      },
      {
        id: 'prop-2',
        idShort: 'FeedRate',
        valueType: 'number',
        value: 250.5,
        unit: 'mm/min',
        description: 'Current feed rate',
      },
      {
        id: 'prop-3',
        idShort: 'ToolInUse',
        valueType: 'string',
        value: 'T01-EndMill-10mm',
        description: 'Currently mounted tool identifier',
      },
      {
        id: 'prop-4',
        idShort: 'CoolantActive',
        valueType: 'boolean',
        value: true,
        description: 'Coolant pump status',
      },
      {
        id: 'prop-5',
        idShort: 'MachineState',
        valueType: 'string',
        value: 'RUNNING',
        description: 'Current machine operational state',
      },
    ],
  };

  return {
    topic: 'spBv1.0/PIL/STANS/DDATA/CNC-Machine-01/ASSET-001',
    payload: generateSubmodelPayload(exampleSubmodel, 'CNC-Machine-01'),
    description: 'Example Sparkplug B DDATA payload for a CNC machine operational submodel',
  };
}

/**
 * Format payload as pretty-printed JSON for display
 */
export function formatPayloadJSON(payload: SparkplugPayload): string {
  return JSON.stringify(payload, null, 2);
}
