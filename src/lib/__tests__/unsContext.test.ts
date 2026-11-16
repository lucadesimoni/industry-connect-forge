import { describe, expect, it } from 'vitest';
import { AAS, AssetEvent, ISA95Level, RDSDesignation, TrackedAsset, UNSNode } from '@/types/industrial';
import { buildUNSMetadata } from '../hierarchyUtils';
import { topicMatchesFilter } from '../mqttTopics';
import { generateAssetTopics } from '../trackingTopics';
import {
  buildUNSDashboard,
  isLocationInSubtree,
  locationPathForNode,
  locationTopicForNode,
  placeTrackedAssets,
  subtreeIds,
} from '../unsContext';

const now = new Date('2026-11-01T00:00:00Z');

const nodes: UNSNode[] = [];
const add = (id: string, name: string, level: ISA95Level, parentId: string | null) => {
  const parent = parentId ? nodes.find(n => n.id === parentId)! : null;
  nodes.push({ id, name, level, parentId, metadata: buildUNSMetadata(level, name, parent, nodes), createdAt: now, updatedAt: now });
};
// the production hierarchy shape (names with spaces and hyphens)
add('e', 'Pilatus Aircraft', 'Enterprise', null);
add('s', 'Stans Facility', 'Site', 'e');
add('a', 'Assembly Hall 3', 'Area', 's');
add('l', 'Assembly Line 01', 'Line', 'a');
add('c5', 'Station 05 - Fuel System', 'Cell', 'l');
add('c7', 'Station 07 - Avionics', 'Cell', 'l');
add('a5', 'CNC Hall 5', 'Area', 's');
add('l5', 'CNC Line 01', 'Line', 'a5');
// a second enterprise with an identical site path -> ambiguous location
add('e2', 'Other Corp', 'Enterprise', null);
add('s2', 'Stans Facility', 'Site', 'e2');

const asset = (id: string, location: string | null, extra: Partial<TrackedAsset> = {}): TrackedAsset => ({
  id, assetId: `urn:pil:tracked:sensor:${id}`, assetType: 'sensor', description: '',
  currentLocationPath: location, currentState: 'in_use', currentQualityState: 'ok',
  createdAt: now, updatedAt: now, ...extra,
});

describe('UNS location paths', () => {
  it('drops the enterprise and sanitizes levels like the location topic', () => {
    expect(locationPathForNode(nodes.find(n => n.id === 'c5')!, nodes))
      .toBe('Stans_Facility/Assembly_Hall_3/Assembly_Line_01/Station_05_-_Fuel_System');
    expect(locationPathForNode(nodes.find(n => n.id === 'e')!, nodes)).toBe('');
  });

  it('a placed asset publishes below the subscription filters of its node and ancestors only', () => {
    const sensor = asset('t1', 'Stans Facility/Assembly Hall 3/Assembly Line 01/Station 05 - Fuel System');
    const topic = generateAssetTopics(sensor).location!;
    const filterOf = (id: string) => `${locationTopicForNode(nodes.find(n => n.id === id)!, nodes)}/#`;
    expect(topicMatchesFilter(filterOf('c5'), topic)).toBe(true);
    expect(topicMatchesFilter(filterOf('l'), topic)).toBe(true);
    expect(topicMatchesFilter(filterOf('a'), topic)).toBe(true);
    expect(topicMatchesFilter(filterOf('c7'), topic)).toBe(false);
    expect(topicMatchesFilter(filterOf('l5'), topic)).toBe(false);
    // and the stored node metadata agrees with the computed topic
    expect(nodes.find(n => n.id === 'c5')!.metadata!.location_topic).toBe(locationTopicForNode(nodes.find(n => n.id === 'c5')!, nodes));
  });
});

describe('placeTrackedAssets', () => {
  const assets = [
    asset('exact', 'Stans_Facility/Assembly_Hall_3/Assembly_Line_01'),
    asset('spaces', 'Stans Facility/Assembly Hall 3/Assembly Line 01/Station 07 - Avionics'),
    asset('deeper', 'Stans_Facility/CNC_Hall_5/CNC_Line_01/rack-4/slot-2'),
    asset('legacy', 'plant-ch/line-3'),
    asset('none', null),
    asset('case', 'stans_facility/assembly_hall_3'),
  ];
  const placement = placeTrackedAssets(nodes.filter(n => n.id !== 'e2' && n.id !== 's2'), assets);

  it('places assets on the exact node, normalizing spaces like MQTT topics', () => {
    expect(placement.byNode.get('l')!.map(p => [p.asset.id, p.kind])).toEqual([['exact', 'exact']]);
    expect(placement.byNode.get('c7')!.map(p => p.asset.id)).toEqual(['spaces']);
  });

  it('places deeper sub-locations on the deepest matching node', () => {
    expect(placement.byNode.get('l5')!.map(p => [p.asset.id, p.kind])).toEqual([['deeper', 'subLocation']]);
  });

  it('reports locations that are not in the UNS instead of guessing (case-sensitive)', () => {
    expect(placement.unplaced.map(u => [u.asset.id, u.reason])).toEqual([
      ['legacy', 'unknownLocation'],
      ['none', 'noLocation'],
      ['case', 'unknownLocation'],
    ]);
  });

  it('does not pick one of two nodes with the same location path', () => {
    const p = placeTrackedAssets(nodes, [asset('amb', 'Stans_Facility')]);
    expect(p.byNode.size).toBe(0);
    expect(p.unplaced[0]).toMatchObject({ reason: 'ambiguous', candidates: ['s', 's2'] });
  });
});

describe('subtrees', () => {
  it('collects descendants', () => {
    expect([...subtreeIds('a', nodes)].sort()).toEqual(['a', 'c5', 'c7', 'l']);
  });

  it('matches locations by whole levels only', () => {
    const line = nodes.find(n => n.id === 'l')!;
    expect(isLocationInSubtree('Stans_Facility/Assembly_Hall_3/Assembly_Line_01/x', line, nodes)).toBe(true);
    expect(isLocationInSubtree('Stans_Facility/Assembly_Hall_3/Assembly_Line_012', line, nodes)).toBe(false);
    expect(isLocationInSubtree(null, line, nodes)).toBe(false);
  });
});

describe('buildUNSDashboard', () => {
  const base = { isType: false, createdAt: now, updatedAt: now, description: '', manufacturer: 'Pilatus' };
  const aasList: AAS[] = [
    { ...base, id: 'x1', assetId: 'urn:x:1', idShort: 'Pump_1', linkedUNSNodeId: 'c5', linkedRDSId: 'r1',
      submodels: [{ id: 'sm', idShort: 'Data', semanticId: '', description: '', properties: [
        { id: 'p1', idShort: 'Flow', valueType: 'xs:double', value: '' },
        { id: 'p2', idShort: 'Speed', valueType: 'xs:double', value: '1' },
      ] }] },
    { ...base, id: 'x2', assetId: 'urn:x:2', idShort: 'Mill_1', linkedUNSNodeId: 'l5', submodels: [] },
    { ...base, id: 't', assetId: 'urn:x:t', idShort: 'PumpType', isType: true, linkedUNSNodeId: 'c5', submodels: [] },
  ];
  const rdsList: RDSDesignation[] = [
    { id: 'r1', designation: '=M1+PIL', aspectCode: '=', objectClass: 'M', description: '', isInstance: true,
      linkedAASId: 'x1', linkedUNSNodeId: 'c5', createdAt: now, updatedAt: now },
  ];
  const assets = [
    asset('s1', 'Stans_Facility/Assembly_Hall_3/Assembly_Line_01', { currentQualityState: 'warning' }),
    asset('s2', 'Stans_Facility/Assembly_Hall_3/Assembly_Line_01/Station_05_-_Fuel_System', { currentState: 'at_rest' }),
    asset('s3', 'Stans_Facility/CNC_Hall_5/CNC_Line_01'),
  ];
  const placement = placeTrackedAssets(nodes, assets);
  const ev = (id: string, assetId: string, from: string | null, to: string | null, at: string): AssetEvent => ({
    id, assetId, eventType: 'locationChanged', fromLocation: from, toLocation: to, reason: null, createdBy: null, createdAt: new Date(at),
  });
  const events = [
    ev('e1', 's3', 'Stans_Facility/Assembly_Hall_3/Assembly_Line_01', 'Stans_Facility/CNC_Hall_5/CNC_Line_01', '2026-11-02T00:00:00Z'),
    ev('e2', 's1', 'plant-ch/receiving', 'Stans_Facility/Assembly_Hall_3/Assembly_Line_01', '2026-11-03T00:00:00Z'),
    ev('e3', 'other', 'plant-ch/a', 'plant-ch/b', '2026-11-04T00:00:00Z'),
  ];
  const line = nodes.find(n => n.id === 'l')!;
  const d = buildUNSDashboard(line, nodes, aasList, rdsList, placement, events);

  it('counts structure, Sparkplug roles, AAS and RDS in the subtree', () => {
    expect(d.levelCounts).toEqual({ Cell: 2 });
    expect(d.sparkplug).toEqual({ edgeNodes: 1, devices: 2 });
    expect(d.aas.total).toBe(1); // type AAS and the AAS on another line are excluded
    expect(d.aas.missingValues).toBe(1);
    expect(d.aas.issues.map(i => i.aas.idShort)).toEqual(['Pump_1']);
    expect(d.rds).toBe(1);
  });

  it('shows movable assets here and below, with states and quality alerts', () => {
    expect(d.movable.here.map(p => p.asset.id)).toEqual(['s1']);
    expect(d.movable.inSubtree.map(p => p.asset.id).sort()).toEqual(['s1', 's2']);
    expect(d.movable.byState).toEqual({ in_use: 1, at_rest: 1 });
    expect(d.movable.attention.map(p => p.asset.id)).toEqual(['s1']);
  });

  it('lists movements into and out of the subtree, newest first', () => {
    expect(d.recentEvents.map(e => e.id)).toEqual(['e2', 'e1']);
  });

  it('offers subscription filters that match the assets it shows', () => {
    expect(d.topics.assetsInSubtree).toBe('enterprise/locations/Stans_Facility/Assembly_Hall_3/Assembly_Line_01/#');
    for (const p of d.movable.inSubtree) {
      expect(topicMatchesFilter(d.topics.assetsInSubtree, generateAssetTopics(p.asset).location!)).toBe(true);
    }
    expect(topicMatchesFilter(d.topics.assetsHere, generateAssetTopics(assets[0]).location!)).toBe(true);
    expect(topicMatchesFilter(d.topics.assetsHere, generateAssetTopics(assets[1]).location!)).toBe(false);
  });

  it('gives Enterprise nodes no location filter (enterprise is not in the T&T path)', () => {
    const ent = buildUNSDashboard(nodes.find(n => n.id === 'e')!, nodes, aasList, rdsList, placement, events);
    expect(ent.topics.assetsInSubtree).toBe('');
    expect(ent.movable.inSubtree).toHaveLength(3);
  });
});
