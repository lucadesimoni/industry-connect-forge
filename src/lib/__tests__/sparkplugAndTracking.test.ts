import { describe, expect, it } from 'vitest';
import { AAS, ISA95Level, RDSDesignation, TrackedAsset, UNSNode } from '@/types/industrial';
import {
  convertValue,
  generateAASBirthPayload,
  generateAASDataPayload,
  generateAASSparkplugTopic,
  generateExamplePayload,
  generateSubmodelMetrics,
  mapValueTypeToSparkplug,
} from '../sparkplugPayload';
import { buildUNSMetadata } from '../hierarchyUtils';
import { parseSparkplugTopic, validateMqttTopicName } from '../mqttTopics';
import { STRUCTURE_PROP } from '../aasElements';
import { generateAssetTopics } from '../trackingTopics';
import { validateAASUNSLink, validateRDSUNSLink, validateAASRDSLink } from '../relationshipValidation';

const now = new Date('2026-01-01');

const nodes: UNSNode[] = [];
const add = (id: string, name: string, level: ISA95Level, parentId: string | null) => {
  const parent = parentId ? nodes.find(n => n.id === parentId)! : null;
  nodes.push({ id, name, level, parentId, metadata: buildUNSMetadata(level, name, parent, nodes), createdAt: now, updatedAt: now });
};
add('e', 'Acme', 'Enterprise', null);
add('s', 'Plant 1', 'Site', 'e');
add('a', 'Assembly', 'Area', 's');
add('l', 'Line1', 'Line', 'a');
add('c', 'Cell A', 'Cell', 'l');
const node = (id: string) => nodes.find(n => n.id === id)!;

const aas: AAS = {
  id: 'i1',
  assetId: 'https://acme.com/assets/robot/0001', // IRI with '/' – must NOT end up in topics
  idShort: 'Robot_0001',
  description: 'Robot',
  manufacturer: 'Acme',
  isType: false,
  createdAt: now,
  updatedAt: now,
  submodels: [
    {
      id: 'sm', idShort: 'OperationalData', semanticId: 'urn:x:op', description: 'op',
      properties: [
        { id: '1', idShort: 'Speed', valueType: 'xs:double', value: '12.5', unit: 'm/s' },
        { id: '2', idShort: 'Count', valueType: 'xs:long', value: 7 },
        { id: '3', idShort: 'Running', valueType: 'xs:boolean', value: 'true' },
        { id: '4', idShort: 'Axis.Temp', valueType: 'xs:float', value: '' },
        { id: '5', idShort: STRUCTURE_PROP, valueType: 'xs:string', value: '{}' },
      ],
    },
  ],
};

describe('AAS → Sparkplug B', () => {
  it('maps XSD types to Sparkplug data types', () => {
    expect(mapValueTypeToSparkplug('xs:int')).toBe('Int32');
    expect(mapValueTypeToSparkplug('xs:long')).toBe('Int64');
    expect(mapValueTypeToSparkplug('xs:integer')).toBe('Int64');
    expect(mapValueTypeToSparkplug('xs:short')).toBe('Int16');
    expect(mapValueTypeToSparkplug('xs:byte')).toBe('Int8');
    expect(mapValueTypeToSparkplug('xs:dateTime')).toBe('DateTime');
    expect(mapValueTypeToSparkplug('xs:anyURI')).toBe('String');
  });

  it('never fabricates values for empty/invalid input', () => {
    expect(convertValue('', 'xs:double')).toBeNull();
    expect(convertValue('abc', 'xs:int')).toBeNull();
    expect(convertValue('not a date', 'xs:dateTime')).toBeNull();
    expect(convertValue('2026-01-01T00:00:00Z', 'xs:dateTime')).toBe(Date.UTC(2026, 0, 1));
    expect(convertValue('0', 'xs:double')).toBe(0);
    expect(convertValue('TRUE', 'xs:boolean')).toBe(true);
  });

  it('publishes submodel metrics with folder names, without the internal structure map', () => {
    const metrics = generateSubmodelMetrics(aas.submodels[0]);
    expect(metrics.map(m => m.name)).toEqual([
      'OperationalData/Speed',
      'OperationalData/Count',
      'OperationalData/Running',
      'OperationalData/Axis/Temp',
    ]);
    expect(metrics[3]).toMatchObject({ value: null, isNull: true });
    expect(metrics[0].properties).toEqual({ unit: 'm/s', semanticId: 'urn:x:op' });
  });

  // Sparkplug 3.0 payloads chapter: NBIRTH/DBIRTH carry name + alias,
  // DDATA "MUST only include an alias and the metric name MUST be excluded".
  it('declares name + alias in DBIRTH and references metrics by alias only in DDATA', () => {
    const birth = generateAASBirthPayload(aas);
    const data = generateAASDataPayload(aas);
    const birthAliases = new Set(birth.metrics.map(m => m.alias));
    for (const m of birth.metrics) {
      expect(m.name).toBeTruthy();
      expect(m.alias).toBeTypeOf('number');
    }
    for (const m of data.metrics) {
      expect(m.name).toBeUndefined();
      expect(birthAliases.has(m.alias)).toBe(true);
    }
    expect(birthAliases.size).toBe(birth.metrics.length);
  });

  // NBIRTH has seq 0; every following message of the edge node is +1 (wrapping at 255)
  it('uses edge-node sequence numbers after NBIRTH', () => {
    expect(generateAASBirthPayload(aas).seq).toBe(1);
    expect(generateAASDataPayload(aas).seq).toBe(2);
    expect(generateAASDataPayload(aas, { seq: 256 }).seq).toBe(0);
  });

  // "no two metrics for the same Edge Node can have the same alias"
  it('keeps aliases disjoint for devices on the same edge node via aliasBase', () => {
    const a = generateAASBirthPayload(aas).metrics.map(m => m.alias!);
    const b = generateAASBirthPayload(aas, { aliasBase: 1000 }).metrics.map(m => m.alias!);
    expect(a.some(x => b.includes(x))).toBe(false);
  });

  it('identifies standalone submodel metrics by name, not alias', () => {
    for (const m of generateSubmodelMetrics(aas.submodels[0])) {
      expect(m.name).toBeTruthy();
      expect(m.alias).toBeUndefined();
    }
  });

  it('builds AAS topics on the UNS edge node with idShort as device id', () => {
    const atCell = generateAASSparkplugTopic(aas, node('c'), 'DDATA', nodes);
    expect(atCell).toBe('spBv1.0/Acme/DDATA/Plant_1-Assembly-Line1/Robot_0001');
    const cellDevice = parseSparkplugTopic(node('c').metadata!.sparkplug_device_topics!.dataTopic!)!;
    const aasDevice = parseSparkplugTopic(atCell)!;
    expect(aasDevice.edgeNodeId).toBe(cellDevice.edgeNodeId);

    const atLine = generateAASSparkplugTopic(aas, node('l'), 'DBIRTH', nodes);
    expect(parseSparkplugTopic(atLine)).toMatchObject({ messageType: 'DBIRTH', deviceId: 'Robot_0001' });

    expect(parseSparkplugTopic(generateAASSparkplugTopic(aas, null))).not.toBeNull();
  });

  it('example payload uses a valid topic', () => {
    expect(parseSparkplugTopic(generateExamplePayload().topic)).not.toBeNull();
  });
});

describe('Track & Trace topics', () => {
  const asset: TrackedAsset = {
    id: 'x', assetId: 'urn:acme:tracked:container:box 1', assetType: 'container', description: '',
    currentLocationPath: '/plant-ch//line 3/', currentState: 'at_rest', currentQualityState: 'ok', createdAt: now, updatedAt: now,
  };

  it('produces only valid MQTT topic names', () => {
    const t = generateAssetTopics(asset, [
      { id: 'b', assetId: 'x', contextType: 'order', contextId: 'PO 4711/1', isActive: true, boundAt: now, unboundAt: null },
      { id: 'c', assetId: 'x', contextType: 'order', contextId: 'old', isActive: false, boundAt: now, unboundAt: now },
    ]);
    const all = [t.identity, ...t.telemetry, ...t.status, ...t.events, t.location!, ...t.contexts];
    for (const topic of all) {
      const r = validateMqttTopicName(topic);
      expect(r.valid, topic).toBe(true);
      expect(r.warnings, topic).toEqual([]);
    }
    expect(t.location).toBe('enterprise/locations/plant-ch/line_3/assets/urn:acme:tracked:container:box_1');
    expect(t.contexts).toEqual(['enterprise/contexts/order/PO_47111/assets/urn:acme:tracked:container:box_1']);
  });

  it('has no location topic without a location', () => {
    expect(generateAssetTopics({ ...asset, currentLocationPath: null }).location).toBeNull();
  });
});

describe('Relationship validation', () => {
  const rds = (aspectCode: string, isInstance: boolean): RDSDesignation => ({
    id: 'r', designation: `${aspectCode}X`, aspectCode, objectClass: 'X', description: '', isInstance, createdAt: now, updatedAt: now,
  });

  it('accepts auto-created location RDS linked to their location node', () => {
    expect(validateRDSUNSLink(rds('+', false), node('l')).valid).toBe(true);
    expect(validateRDSUNSLink(rds('+', false), node('e')).valid).toBe(true);
    expect(validateRDSUNSLink(rds('+', false), node('c')).valid).toBe(false);
  });

  it('requires a location for RDS instances', () => {
    expect(validateRDSUNSLink(rds('=', true), null).valid).toBe(false);
    expect(validateRDSUNSLink(rds('=', true), node('c')).valid).toBe(true);
  });

  it('warns when an AAS is linked above Line level', () => {
    expect(validateAASUNSLink(aas, node('s')).severity).toBe('warning');
    expect(validateAASUNSLink(aas, node('c')).message).toBeUndefined();
  });

  it('keeps Type AAS away from RDS instances', () => {
    expect(validateAASRDSLink({ ...aas, isType: true }, rds('=', true)).valid).toBe(false);
  });
});
