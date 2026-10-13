/**
 * "Regenerate Topics" on the real project hierarchy (names and location RDS as
 * stored in the database on 2026-10-13). Reproduces the two issues reported
 * after the first regeneration:
 *  1. Cells were published as Sparkplug node messages with the Cell name in the
 *     edge node id, and Enterprise nodes got the placeholder edge id "node".
 *  2. Location codes truncated to 8 characters collided ("Assembly Hall 3" /
 *     "Assembly Line 01" -> ASSEMBLY) and ignored the assigned location RDS.
 */
import { describe, expect, it } from 'vitest';
import { ISA95Level, UNSNode } from '@/types/industrial';
import { findLocationCodeClashes, regenerateUNSMetadata, validateRDSDesignation } from '../hierarchyUtils';
import { parseSparkplugTopic } from '../mqttTopics';

const now = new Date('2026-10-13');
const N = (id: string, name: string, level: ISA95Level, parentId: string | null): UNSNode => ({
  id, name, level, parentId, createdAt: now, updatedAt: now,
});

const NODES: UNSNode[] = [
  N('e1', 'Pilatus Aircraft', 'Enterprise', null),
  N('s1', 'Stans Facility', 'Site', 'e1'),
  N('a1', 'Assembly Hall 3', 'Area', 's1'),
  N('a2', 'CNC Hall 5', 'Area', 's1'),
  N('l1', 'Assembly Line 01', 'Line', 'a1'),
  N('l2', 'CNC Line 01', 'Line', 'a2'),
  N('c1', 'Station 05 - Fuel System', 'Cell', 'l1'),
  N('c2', 'Station 07 - Avionics', 'Cell', 'l1'),
  N('c3', 'CNC Cell 01', 'Cell', 'l2'),
  N('c4', 'CNC Cell 02', 'Cell', 'l2'),
  N('e2', 'Noser', 'Enterprise', null),
  N('s2', 'Root D4', 'Site', 'e2'),
  N('a3', 'Stockwerk-4', 'Area', 's2'),
  N('l3', 'Tisch Reihe 2', 'Line', 'a3'),
  N('c5', 'n301', 'Cell', 'l3'),
];

const loc = (designation: string, linkedUNSNodeId: string) => ({ designation, aspectCode: '+', linkedUNSNodeId });
const LOCATION_RDS = [
  loc('+PIL', 'e1'), loc('+PIL.STANS', 's1'), loc('+PIL.STANS.HALL3', 'a1'), loc('+PIL.STANS.HALL5', 'a2'),
  loc('+PIL.STANS.HALL3.LN01', 'l1'), loc('+PIL.STANS.HALL5.LN01', 'l2'),
  loc('+NOSER', 'e2'), loc('+NOSER.ROOTD4', 's2'), loc('+NOSER.ROOTD4.STOCKWER', 'a3'), loc('+NOSER.ROOTD4.STOCKWER.TISCHREI', 'l3'),
];
// asset RDS as stored (all use the assigned location codes)
const ASSET_RDS_LOCATIONS = { c1: '+PIL.STANS.HALL3.LN01', c3: '+PIL.STANS.HALL5.LN01' };

const byName = (nodes: UNSNode[], name: string) => nodes.find(n => n.name === name)!;

describe('Regenerate Topics on the real hierarchy', () => {
  const { nodes, clashes } = regenerateUNSMetadata(NODES, LOCATION_RDS);

  it('publishes Cells as devices of their Line edge node (DDATA/{edge}/{cell})', () => {
    const cell = byName(nodes, 'Station 05 - Fuel System').metadata!;
    const t = parseSparkplugTopic(cell.sparkplug_topic!)!;
    expect(t.messageType).toBe('DDATA');
    expect(t.groupId).toBe('Pilatus_Aircraft');
    expect(t.edgeNodeId).toBe('Stans_Facility-Assembly_Hall_3-Assembly_Line_01');
    expect(t.deviceId).toBe('Station_05_-_Fuel_System');
    expect(cell.sparkplug_topic).toBe(cell.sparkplug_device_topics!.dataTopic);
  });

  it('publishes Lines as edge nodes and gives Enterprise/Site/Area no Sparkplug topic', () => {
    const line = parseSparkplugTopic(byName(nodes, 'Assembly Line 01').metadata!.sparkplug_topic!)!;
    expect(line).toEqual({ groupId: 'Pilatus_Aircraft', messageType: 'NDATA', edgeNodeId: 'Stans_Facility-Assembly_Hall_3-Assembly_Line_01' });
    for (const name of ['Pilatus Aircraft', 'Noser', 'Stans Facility', 'Assembly Hall 3', 'Stockwerk-4']) {
      expect(byName(nodes, name).metadata!.sparkplug_topic, name).toBeUndefined();
    }
    const all = nodes.map(n => n.metadata!.sparkplug_topic).filter(Boolean) as string[];
    expect(all.some(t => t.endsWith('/node'))).toBe(false);
  });

  it('keeps the assigned location codes from the location RDS', () => {
    expect(byName(nodes, 'Assembly Line 01').metadata!.rds_location).toBe('+PIL.STANS.HALL3.LN01');
    expect(byName(nodes, 'CNC Line 01').metadata!.rds_location).toBe('+PIL.STANS.HALL5.LN01');
    expect(byName(nodes, 'Station 05 - Fuel System').metadata!.rds_location).toBe(ASSET_RDS_LOCATIONS.c1);
    expect(byName(nodes, 'CNC Cell 01').metadata!.rds_location).toBe(ASSET_RDS_LOCATIONS.c3);
    expect(clashes).toEqual([]);
  });

  it('derives distinct, untruncated codes where no location RDS exists', () => {
    const derived = regenerateUNSMetadata(NODES, []);
    expect(byName(derived.nodes, 'Assembly Hall 3').metadata!.rds_location).toBe('+PILATUSAIRCRAFT.STANSFACILITY.ASSEMBLYHALL3');
    expect(byName(derived.nodes, 'Assembly Line 01').metadata!.rds_location).toBe('+PILATUSAIRCRAFT.STANSFACILITY.ASSEMBLYHALL3.ASSEMBLYLINE01');
    expect(derived.clashes).toEqual([]);
    for (const n of derived.nodes) expect(validateRDSDesignation(n.metadata!.rds_location!).valid, n.name).toBe(true);

    // a future "CNC Line 02" no longer collides with "CNC Line 01"
    const withLine02 = regenerateUNSMetadata([...NODES, N('l4', 'CNC Line 02', 'Line', 'a2')], []);
    expect(withLine02.clashes).toEqual([]);
  });

  it('a new node under an assigned parent continues the assigned code', () => {
    const { nodes: n2 } = regenerateUNSMetadata([...NODES, N('l4', 'CNC Line 02', 'Line', 'a2')], LOCATION_RDS);
    expect(byName(n2, 'CNC Line 02').metadata!.rds_location).toBe('+PIL.STANS.HALL5.CNCLINE02');
  });

  it('reports clashes instead of hiding them', () => {
    const clashing = regenerateUNSMetadata(NODES, [...LOCATION_RDS.filter(r => r.linkedUNSNodeId !== 'l2'), loc('+PIL.STANS.HALL3.LN01', 'l2')]);
    expect(clashing.clashes).toEqual([{ code: '+PIL.STANS.HALL3.LN01', nodes: ['Assembly Line 01', 'CNC Line 01'] }]);
    expect(findLocationCodeClashes(NODES)).toEqual([]);
  });

  it('preserves user-defined extra MQTT topics', () => {
    const custom = NODES.map(n => n.id === 'l1' ? { ...n, metadata: { mqtt_topics: ['custom/line1/kpi'] } } : n);
    const { nodes: n3 } = regenerateUNSMetadata(custom, LOCATION_RDS);
    expect(byName(n3, 'Assembly Line 01').metadata!.mqtt_topics).toContain('custom/line1/kpi');
  });
});
