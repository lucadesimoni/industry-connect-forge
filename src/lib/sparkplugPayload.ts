import { AASSubmodel, AASProperty, AAS, UNSNode } from '@/types/industrial';
import { STRUCTURE_PROP } from './aasElements';
import { SparkplugDeviceMessageType, buildSparkplugTopic, sanitizeSparkplugId } from './mqttTopics';
import { generateSparkplugBTopic, isLocationLevel } from './hierarchyUtils';

/**
 * Sparkplug B 3.0 metric data types (subset relevant for AAS properties)
 */
export type SparkplugDataType =
  | 'Int8' | 'Int16' | 'Int32' | 'Int64' | 'UInt8' | 'UInt16' | 'UInt32' | 'UInt64'
  | 'Float' | 'Double' | 'Boolean' | 'String' | 'DateTime' | 'Text';

export type SparkplugValue = string | number | boolean | null;

/**
 * Sparkplug B Metric structure (JSON representation of the protobuf message)
 */
export interface SparkplugMetric {
  name: string;
  alias?: number;
  timestamp: number;
  dataType: SparkplugDataType;
  value: SparkplugValue;
  /** Sparkplug is_null flag – set when the AAS property has no value */
  isNull?: boolean;
  properties?: Record<string, string>;
}

/**
 * Sparkplug B Payload structure (simplified for AAS integration)
 */
export interface SparkplugPayload {
  timestamp: number;
  /** 0..255, wraps around */
  seq: number;
  metrics: SparkplugMetric[];
}

/**
 * Map AAS property valueType (XSD, IDTA-01001 §5.3.11) to Sparkplug B dataType
 */
export function mapValueTypeToSparkplug(valueType: AASProperty['valueType'] | string): SparkplugDataType {
  switch (valueType) {
    case 'number':
    case 'xs:double':
    case 'xs:decimal':
      return 'Double';
    case 'xs:float':
      return 'Float';
    case 'xs:integer':
    case 'xs:long':
      return 'Int64';
    case 'xs:int':
      return 'Int32';
    case 'xs:short':
      return 'Int16';
    case 'xs:byte':
      return 'Int8';
    case 'boolean':
    case 'xs:boolean':
      return 'Boolean';
    case 'date':
    case 'xs:dateTime':
    case 'xs:date':
      return 'DateTime';
    default:
      return 'String';
  }
}

/**
 * Convert an AAS property value to the Sparkplug representation.
 * Empty / unparsable values become null (sent with is_null=true) instead of
 * a fabricated 0 / epoch.
 */
export function convertValue(value: unknown, valueType: AASProperty['valueType'] | string): SparkplugValue {
  const isEmpty = value === null || value === undefined || value === '';
  switch (mapValueTypeToSparkplug(valueType)) {
    case 'Double':
    case 'Float': {
      if (isEmpty) return null;
      const n = typeof value === 'number' ? value : parseFloat(String(value));
      return Number.isFinite(n) ? n : null;
    }
    case 'Int8':
    case 'Int16':
    case 'Int32':
    case 'Int64': {
      if (isEmpty) return null;
      const n = typeof value === 'number' ? Math.round(value) : parseInt(String(value), 10);
      return Number.isFinite(n) ? n : null;
    }
    case 'Boolean':
      if (isEmpty) return null;
      return typeof value === 'boolean' ? value : String(value).toLowerCase() === 'true' || String(value) === '1';
    case 'DateTime': {
      // Sparkplug DateTime = uint64 milliseconds since epoch (UTC)
      if (isEmpty) return null;
      const ms = typeof value === 'number' ? value : new Date(String(value)).getTime();
      return Number.isFinite(ms) ? ms : null;
    }
    default:
      return isEmpty ? '' : String(value);
  }
}

const compactProperties = (props: Record<string, string | undefined>): Record<string, string> | undefined => {
  const entries = Object.entries(props).filter((e): e is [string, string] => !!e[1]);
  return entries.length ? Object.fromEntries(entries) : undefined;
};

const makeMetric = (
  name: string,
  dataType: SparkplugDataType,
  value: SparkplugValue,
  timestamp: number,
  properties?: Record<string, string>
): SparkplugMetric => ({
  name,
  timestamp,
  dataType,
  value,
  ...(value === null ? { isNull: true } : {}),
  ...(properties ? { properties } : {}),
});

/**
 * Generate Sparkplug B metrics from AAS submodel properties.
 * Metric names use '/' as folder separator (Sparkplug convention):
 *   [namespace/]{SubmodelIdShort}/{Collection}/{Property}
 * The internal structure-map property is never published.
 */
export function generateSubmodelMetrics(
  submodel: AASSubmodel,
  namespace?: string,
  timestamp: number = Date.now()
): SparkplugMetric[] {
  const prefix = namespace ? `${namespace}/` : '';

  return submodel.properties
    .filter((prop) => prop.idShort !== STRUCTURE_PROP)
    .map((prop, index) => ({
      ...makeMetric(
        `${prefix}${submodel.idShort}/${prop.idShort.split('.').join('/')}`,
        mapValueTypeToSparkplug(prop.valueType),
        convertValue(prop.value, prop.valueType),
        timestamp,
        compactProperties({
          unit: prop.unit,
          description: prop.description,
          semanticId: prop.semanticId || submodel.semanticId,
        })
      ),
      alias: index + 1,
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
  const timestamp = Date.now();
  return {
    timestamp,
    seq: (seq ?? 0) % 256,
    metrics: generateSubmodelMetrics(submodel, namespace, timestamp),
  };
}

/**
 * Full, alias-stable metric set of an AAS.
 * DBIRTH publishes all of them; DDATA must use the SAME aliases (Sparkplug
 * requires aliases from the birth certificate to be reused unchanged).
 */
function buildAASMetrics(aas: AAS, timestamp: number): { metric: SparkplugMetric; static: boolean }[] {
  const identity: { metric: SparkplugMetric; static: boolean }[] = [
    { metric: makeMetric('AAS/IdShort', 'String', aas.idShort, timestamp), static: false },
    { metric: makeMetric('AAS/AssetId', 'String', aas.assetId, timestamp), static: false },
    { metric: makeMetric('AAS/Description', 'String', aas.description ?? '', timestamp), static: true },
  ];
  if (aas.manufacturer) {
    identity.push({ metric: makeMetric('AAS/Manufacturer', 'String', aas.manufacturer, timestamp), static: true });
  }
  if (aas.serialNumber) {
    identity.push({ metric: makeMetric('AAS/SerialNumber', 'String', aas.serialNumber, timestamp), static: true });
  }

  const submodelMetrics = aas.submodels.flatMap((sm) =>
    generateSubmodelMetrics(sm, undefined, timestamp).map((metric) => ({ metric, static: false }))
  );

  return [...identity, ...submodelMetrics].map((entry, index) => ({
    ...entry,
    metric: { ...entry.metric, alias: index + 1 },
  }));
}

/**
 * Generate a Sparkplug B DDATA payload for all AAS submodels.
 * Contains identification + submodel metrics with the aliases used in DBIRTH.
 */
export function generateAASDataPayload(aas: AAS, seq?: number): SparkplugPayload {
  const timestamp = Date.now();
  return {
    timestamp,
    seq: (seq ?? 1) % 256,
    metrics: buildAASMetrics(aas, timestamp)
      .filter((m) => !m.static)
      .map((m) => m.metric),
  };
}

/**
 * Generate a complete Sparkplug B DBIRTH payload for an AAS instance.
 * Declares every metric (name, alias, datatype) the device will publish.
 */
export function generateAASBirthPayload(aas: AAS, _unsNode?: UNSNode | null, seq?: number): SparkplugPayload {
  const timestamp = Date.now();
  return {
    timestamp,
    seq: (seq ?? 0) % 256,
    metrics: buildAASMetrics(aas, timestamp).map((m) => m.metric),
  };
}

/**
 * UNS path of a node: stored metadata.uns_path, otherwise rebuilt from the parent chain.
 */
function resolveUNSPath(node: UNSNode, allNodes: UNSNode[]): string {
  if (node.metadata?.uns_path) return node.metadata.uns_path;
  const parts: string[] = [];
  let current: UNSNode | undefined = node;
  while (current) {
    parts.unshift(current.name);
    const parentId: string | null = current.parentId;
    current = parentId ? allNodes.find((n) => n.id === parentId) : undefined;
  }
  return parts.join('/');
}

/**
 * Generate the Sparkplug B topic for an AAS instance:
 *   spBv1.0/{Enterprise}/{type}/{Site-Area-Line}/{AAS idShort}
 *
 * Consistent with the UNS (hierarchyUtils.generateSparkplugBTopic):
 *  - group_id  = Enterprise
 *  - edge node = path below Enterprise down to the Line (an AAS linked to a
 *    Cell uses the Cell's parent path, same as the Cell's own device topics)
 *  - device_id = AAS idShort (IDTA idShort is always Sparkplug-safe; the
 *    globalAssetId is an IRI containing '/' and therefore NOT usable)
 */
export function generateAASSparkplugTopic(
  aas: AAS,
  unsNode: UNSNode | null,
  messageType: SparkplugDeviceMessageType = 'DDATA',
  allNodes: UNSNode[] = []
): string {
  const deviceId = sanitizeSparkplugId(aas.idShort) || 'device';
  if (!unsNode) {
    return buildSparkplugTopic('default', messageType, 'node', deviceId);
  }

  let edgeNode: UNSNode = unsNode;
  if (!isLocationLevel(unsNode.level) && unsNode.parentId) {
    edgeNode = allNodes.find((n) => n.id === unsNode.parentId) ?? unsNode;
  }
  return generateSparkplugBTopic(resolveUNSPath(edgeNode, allNodes), messageType, deviceId);
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
    semanticId: 'urn:industry-connect-forge:submodel:OperationalData:1:0',
    description: 'Real-time operational data from CNC machine',
    properties: [
      { id: 'prop-1', idShort: 'SpindleSpeed', valueType: 'xs:double', value: 12500, unit: '1/min', description: 'Current spindle rotation speed' },
      { id: 'prop-2', idShort: 'FeedRate', valueType: 'xs:double', value: 250.5, unit: 'mm/min', description: 'Current feed rate' },
      { id: 'prop-3', idShort: 'ToolInUse', valueType: 'xs:string', value: 'T01-EndMill-10mm', description: 'Currently mounted tool identifier' },
      { id: 'prop-4', idShort: 'CoolantActive', valueType: 'xs:boolean', value: true, description: 'Coolant pump status' },
      { id: 'prop-5', idShort: 'MachineState', valueType: 'xs:string', value: 'RUNNING', description: 'Current machine operational state' },
    ],
  };

  return {
    topic: generateSparkplugBTopic('PIL/STANS/HALL3/LN01', 'DDATA', 'CNC_Machine_01'),
    payload: generateSubmodelPayload(exampleSubmodel),
    description: 'Example Sparkplug B DDATA payload for a CNC machine operational submodel',
  };
}

/**
 * Format payload as pretty-printed JSON for display
 */
export function formatPayloadJSON(payload: SparkplugPayload): string {
  return JSON.stringify(payload, null, 2);
}
