import { describe, expect, it } from 'vitest';
import { ISA95Level, UNSNode } from '@/types/industrial';
import {
  buildAssetRDSDesignation,
  buildLocationFromUNS,
  buildLocationRDSDesignation,
  buildUNSMetadata,
  composeRDSDesignation,
  generateDynamicDesignation,
  generateLocationAssetsTopic,
  generateLocationTopic,
  generateMQTTTopic,
  generateSparkplugBTopic,
  rdsDeviceId,
  relocateRDSDesignation,
  sanitizeRDSCode,
  validateParentForLevel,
  validateRDSDesignation,
} from '../hierarchyUtils';
import { parseSparkplugTopic, topicMatchesFilter, validateMqttTopicName } from '../mqttTopics';

const now = new Date('2026-01-01');

/** Build a UNS tree the same way the app does (metadata computed top-down). */
const buildTree = (spec: Array<[string, string, ISA95Level, string | null]>): UNSNode[] => {
  const nodes: UNSNode[] = [];
  for (const [id, name, level, parentId] of spec) {
    const parent = parentId ? nodes.find(n => n.id === parentId)! : null;
    nodes.push({
      id, name, level, parentId,
      metadata: buildUNSMetadata(level, name, parent, nodes),
      createdAt: now, updatedAt: now,
    });
  }
  return nodes;
};

const tree = buildTree([
  ['e', 'Pilatus', 'Enterprise', null],
  ['s', 'Stans', 'Site', 'e'],
  ['a', 'Hall-3', 'Area', 's'],
  ['l', 'Line 01', 'Line', 'a'],
  ['c', 'CNC 5', 'Cell', 'l'],
  ['l2', 'Line 02', 'Line', 'a'],
]);
const byId = (id: string) => tree.find(n => n.id === id)!;

describe('UNS metadata (ISA-95 → MQTT / Sparkplug / RDS)', () => {
  it('builds the ISA-95 path and a valid MQTT topic', () => {
    const md = byId('c').metadata!;
    expect(md.uns_path).toBe('Pilatus/Stans/Hall-3/Line 01/CNC 5');
    expect(md.mqtt_topic).toBe('Pilatus/Stans/Hall-3/Line_01/CNC_5');
    expect(validateMqttTopicName(md.mqtt_topic!).warnings).toEqual([]);
  });

  it('builds IEC 81346 location codes without separator characters from names', () => {
    expect(byId('a').metadata!.rds_location).toBe('+PILATUS.STANS.HALL3');
    expect(byId('l').metadata!.rds_location).toBe('+PILATUS.STANS.HALL3.LINE01');
    // Cells inherit the location of their line
    expect(byId('c').metadata!.rds_location).toBe('+PILATUS.STANS.HALL3.LINE01');
    for (const n of tree) {
      expect(validateRDSDesignation(n.metadata!.rds_location!).valid).toBe(true);
    }
  });

  it('generates spec-compliant Sparkplug B topics for every node', () => {
    for (const n of tree) {
      expect(parseSparkplugTopic(n.metadata!.sparkplug_topic!)).not.toBeNull();
    }
    const cell = byId('c').metadata!.sparkplug_device_topics!;
    expect(cell.dataTopic).toBe('spBv1.0/Pilatus/DDATA/Stans-Hall-3-Line_01/CNC_5');
    expect(parseSparkplugTopic(cell.birthTopic!)?.messageType).toBe('DBIRTH');
    expect(parseSparkplugTopic(cell.cmdTopic!)?.deviceId).toBe('CNC_5');
  });

  it('device topics of a cell share the edge node of its line', () => {
    const line = parseSparkplugTopic(byId('l').metadata!.sparkplug_topic!)!;
    const cell = parseSparkplugTopic(byId('c').metadata!.sparkplug_device_topics!.dataTopic!)!;
    expect(cell.groupId).toBe(line.groupId);
    expect(cell.edgeNodeId).toBe(line.edgeNodeId);
  });

  it('projects locations into the Track & Trace namespace', () => {
    expect(generateLocationTopic('Pilatus/Stans/Hall 3')).toBe('enterprise/locations/Stans/Hall_3');
    expect(generateLocationAssetsTopic('Pilatus/Stans/Hall 3')).toBe('enterprise/locations/Stans/Hall_3/assets/+/#');
    expect(generateLocationTopic('Pilatus')).toBe('');
    expect(
      topicMatchesFilter(byId('l').metadata!.location_assets_topic!, 'enterprise/locations/Stans/Hall-3/Line_01/assets/box-1')
    ).toBe(true);
  });

  it('keeps extra topics and de-duplicates them', () => {
    const md = buildUNSMetadata('Line', 'L1', byId('a'), tree, null, ['custom/topic ', 'custom/topic', '/x/']);
    expect(md.mqtt_topics).toContain('custom/topic');
    expect(md.mqtt_topics).toContain('x');
    expect(md.mqtt_topics!.filter(t => t === 'custom/topic')).toHaveLength(1);
  });

  it('builds the full asset designation for cells with function aspect', () => {
    const md = buildUNSMetadata('Cell', 'Robot', byId('l'), tree, { functionAspect: 'M1', productAspect: 'DRV1' });
    expect(md.full_rds_designation).toBe('=M1-DRV1+PILATUS.STANS.HALL3.LINE01');
    expect(md.data_model).toBe('AAS');
  });

  it('sanitizes MQTT topics', () => {
    expect(generateMQTTTopic('A B/C+D/#')).toBe('A_B/C_D');
  });

  it('never emits the STATE pseudo message type through the UNS generator', () => {
    expect(generateSparkplugBTopic('A/B/C', 'NBIRTH')).toBe('spBv1.0/A/NBIRTH/B-C');
    expect(generateSparkplugBTopic('', 'NDATA')).toBe('spBv1.0/default/NDATA/node');
  });
});

describe('ISA-95 hierarchy rules', () => {
  it('requires the parent exactly one level above', () => {
    expect(validateParentForLevel('Enterprise', null).valid).toBe(true);
    expect(validateParentForLevel('Site', null).valid).toBe(false);
    expect(validateParentForLevel('Line', byId('a')).valid).toBe(true);
    expect(validateParentForLevel('Cell', byId('a')).valid).toBe(false);
  });
});

describe('IEC 81346 reference designations', () => {
  it('sanitizes codes', () => {
    expect(sanitizeRDSCode('Hall-3.North')).toBe('HALL3NOR');
    expect(sanitizeRDSCode('Hall-3.North', 20)).toBe('HALL3NORTH');
  });

  it('builds location designations for location levels only', () => {
    expect(buildLocationRDSDesignation('Line', 'Line 01', byId('a'), '')?.designation).toBe('+PILATUS.STANS.HALL3.LINE01');
    expect(buildLocationRDSDesignation('Cell', 'X', byId('l'), '')).toBeNull();
  });

  it('builds function aspect designations including instance number and product', () => {
    const d = buildAssetRDSDesignation('=', 'M', 1, 'drv1', '+PIL.STANS.LN01');
    expect(d.designation).toBe('=M1-DRV1+PIL.STANS.LN01');
    expect(d.functionAspect).toBe('M1');
    expect(d.productAspect).toBe('DRV1');
    expect(d.aspectCode).toBe('=');
  });

  it('builds product aspect designations with the product prefix', () => {
    const d = buildAssetRDSDesignation('-', 'CNC', 2, undefined, '+PIL.LN01');
    expect(d.designation).toBe('-CNC2+PIL.LN01');
    expect(d.aspectCode).toBe('-');
    expect(d.productAspect).toBe('CNC2');
    expect(d.functionAspect).toBeUndefined();
  });

  it('composes and relocates designations losslessly', () => {
    expect(composeRDSDesignation({ aspectCode: '+', locationAspect: '+A.B' })).toBe('+A.B');
    expect(generateDynamicDesignation('M1', 'DRV1', 'A.B', '=')).toBe('=M1-DRV1+A.B');
    expect(relocateRDSDesignation('=M1-DRV1+OLD.LOC', '=', 'NEW.LOC')).toBe('=M1-DRV1+NEW.LOC');
    // legacy record where function_aspect lacked the instance number
    expect(relocateRDSDesignation('=M1', '=', '+NEW')).toBe('=M1+NEW');
    expect(relocateRDSDesignation('+OLD', '+', 'NEW')).toBe('+NEW');
    expect(rdsDeviceId('=M1-DRV1+A.B')).toBe('=M1-DRV1');
  });

  it('validates designation syntax', () => {
    expect(validateRDSDesignation('=M1-DRV1+PIL.STANS.LN01').valid).toBe(true);
    expect(validateRDSDesignation('+PIL').valid).toBe(true);
    expect(validateRDSDesignation('=m1').valid).toBe(false);
    expect(validateRDSDesignation('=M1+').valid).toBe(false);
    expect(validateRDSDesignation('M1').valid).toBe(false);
    expect(validateRDSDesignation('+PIL..X').valid).toBe(false);
  });

  it('derives the location of a node without duplicating parent codes', () => {
    expect(buildLocationFromUNS(byId('c'), tree)).toBe('PILATUS.STANS.HALL3.LINE01');
    expect(buildLocationFromUNS(byId('l2'), tree)).toBe('PILATUS.STANS.HALL3.LINE02');
    // without stored metadata the code is rebuilt from names (cells skipped)
    const bare = tree.map(n => ({ ...n, metadata: undefined }));
    expect(buildLocationFromUNS(bare.find(n => n.id === 'c')!, bare)).toBe('PILATUS.STANS.HALL3.LINE01');
  });
});
