import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { ISA95Level, TrackedAsset, UNSNode } from '@/types/industrial';
import { buildUNSMetadata } from '../hierarchyUtils';
import { liveScopeForNode, LiveStore } from '../liveUns';
import { validateLiveUrl } from '../liveMqttClient';
import { generateAssetTopics } from '../trackingTopics';

const require = createRequire(import.meta.url);
const tahu = require('sparkplug-payload').get('spBv1.0');
const sp = (payload: unknown) => new Uint8Array(tahu.encodePayload(payload));
const now = new Date('2026-11-16T00:00:00Z');

const nodes: UNSNode[] = [];
const add = (id: string, name: string, level: ISA95Level, parentId: string | null) => {
  const parent = parentId ? nodes.find(n => n.id === parentId)! : null;
  nodes.push({ id, name, level, parentId, metadata: buildUNSMetadata(level, name, parent, nodes), createdAt: now, updatedAt: now });
};
add('e', 'Pilatus Aircraft', 'Enterprise', null);
add('s', 'Stans Facility', 'Site', 'e');
add('a', 'Assembly Hall 3', 'Area', 's');
add('l', 'Assembly Line 01', 'Line', 'a');
add('c', 'Station 05 - Fuel System', 'Cell', 'l');
add('c2', 'Station 07 - Avionics', 'Cell', 'l');
add('a5', 'CNC Hall 5', 'Area', 's');
add('l5', 'CNC Line 01', 'Line', 'a5');
const node = (id: string) => nodes.find(n => n.id === id)!;
const scope = (id: string) => liveScopeForNode(node(id), nodes);

describe('liveScopeForNode', () => {
  it('subscribes to exactly the topics stored on the node (same builders as the metadata)', () => {
    for (const id of ['l', 'c', 'l5']) {
      const md = node(id).metadata!;
      const s = scope(id);
      expect(s.accepts(md.sparkplug_topic!), `${id} sparkplug`).toBe(true);
      expect(s.accepts(md.mqtt_topic!), `${id} uns`).toBe(true);
    }
    expect(scope('c').accepts(node('c').metadata!.sparkplug_device_topics!.birthTopic!)).toBe(true);
  });

  it('Line: its edge node and devices only', () => {
    const s = scope('l');
    expect(s.accepts('spBv1.0/Pilatus_Aircraft/NBIRTH/Stans_Facility-Assembly_Hall_3-Assembly_Line_01')).toBe(true);
    expect(s.accepts('spBv1.0/Pilatus_Aircraft/DDATA/Stans_Facility-Assembly_Hall_3-Assembly_Line_01/Station_07_-_Avionics')).toBe(true);
    expect(s.accepts('spBv1.0/Pilatus_Aircraft/NDATA/Stans_Facility-CNC_Hall_5-CNC_Line_01')).toBe(false);
  });

  it('Cell: its own device plus the edge node state, not sibling cells', () => {
    const s = scope('c');
    expect(s.accepts('spBv1.0/Pilatus_Aircraft/DDATA/Stans_Facility-Assembly_Hall_3-Assembly_Line_01/Station_05_-_Fuel_System')).toBe(true);
    expect(s.accepts('spBv1.0/Pilatus_Aircraft/NDEATH/Stans_Facility-Assembly_Hall_3-Assembly_Line_01')).toBe(true);
    expect(s.accepts('spBv1.0/Pilatus_Aircraft/DDATA/Stans_Facility-Assembly_Hall_3-Assembly_Line_01/Station_07_-_Avionics')).toBe(false);
  });

  it('Area: every edge node below it, filtered by edge-id prefix on whole levels', () => {
    const s = scope('a');
    expect(s.subscriptions).toContain('spBv1.0/Pilatus_Aircraft/#');
    expect(s.accepts('spBv1.0/Pilatus_Aircraft/NDATA/Stans_Facility-Assembly_Hall_3-Assembly_Line_01')).toBe(true);
    expect(s.accepts('spBv1.0/Pilatus_Aircraft/NDATA/Stans_Facility-CNC_Hall_5-CNC_Line_01')).toBe(false);
    // "Assembly_Hall_30" must not count as part of "Assembly_Hall_3"
    expect(s.accepts('spBv1.0/Pilatus_Aircraft/NDATA/Stans_Facility-Assembly_Hall_30-Line_X')).toBe(false);
  });

  it('Enterprise: the whole group, never other groups or STATE', () => {
    const s = scope('e');
    expect(s.accepts('spBv1.0/Pilatus_Aircraft/NDATA/Anything')).toBe(true);
    expect(s.accepts('spBv1.0/Other/NDATA/Anything')).toBe(false);
    expect(s.accepts('spBv1.0/STATE/scada-primary')).toBe(false);
  });

  it('never treats host STATE messages as data, even for an enterprise named "STATE"', () => {
    const odd: UNSNode = { id: 'x', name: 'STATE', level: 'Enterprise', parentId: null, createdAt: now, updatedAt: now };
    const st = liveScopeForNode(odd, [odd]);
    expect(st.subscriptions).toContain('spBv1.0/STATE/#');
    expect(st.accepts('spBv1.0/STATE/scada-primary')).toBe(false);
  });

  it('reads stored births of its own edge node / device only', () => {
    const cert = '$sparkplug/certificates/spBv1.0/Pilatus_Aircraft';
    expect(scope('l').accepts(`${cert}/NBIRTH/Stans_Facility-Assembly_Hall_3-Assembly_Line_01`)).toBe(true);
    expect(scope('c').accepts(`${cert}/DBIRTH/Stans_Facility-Assembly_Hall_3-Assembly_Line_01/Station_05_-_Fuel_System`)).toBe(true);
    expect(scope('c').accepts(`${cert}/DBIRTH/Stans_Facility-Assembly_Hall_3-Assembly_Line_01/Station_07_-_Avionics`)).toBe(false);
    expect(scope('a').accepts(`${cert}/NBIRTH/Stans_Facility-CNC_Hall_5-CNC_Line_01`)).toBe(false);
    expect(scope('e').accepts(`${cert}/NDATA/Stans_Facility-CNC_Hall_5-CNC_Line_01`)).toBe(false);
  });

  it('includes movable assets located at or below the node', () => {
    const asset: TrackedAsset = { id: 't', assetId: 'urn:pil:tracked:sensor:vib-017', assetType: 'sensor', description: '',
      currentLocationPath: 'Stans Facility/Assembly Hall 3/Assembly Line 01/Station 05 - Fuel System', currentState: 'in_use', currentQualityState: 'ok', createdAt: now, updatedAt: now };
    const topic = generateAssetTopics(asset).location!;
    expect(scope('l').accepts(topic)).toBe(true);
    expect(scope('c').accepts(topic)).toBe(true);
    expect(scope('l5').accepts(topic)).toBe(false);
  });
});

describe('LiveStore', () => {
  const edge = 'spBv1.0/Pilatus_Aircraft/{T}/Stans_Facility-Assembly_Hall_3-Assembly_Line_01';
  const dev = `${edge}/Station_05_-_Fuel_System`;
  const t = (tpl: string, type: string) => tpl.replace('{T}', type);

  it('resolves DDATA aliases through the DBIRTH and keeps units and nulls', () => {
    const s = new LiveStore();
    s.handle(t(edge, 'NBIRTH'), sp({ seq: 0, metrics: [{ name: 'bdSeq', alias: 1, type: 'UInt64', value: 0 }] }));
    s.handle(t(dev, 'DBIRTH'), sp({ seq: 1, metrics: [
      { name: 'OperationalData/Flow', alias: 1000, type: 'Double', value: 4.2, properties: { engUnit: { type: 'String', value: 'l/min' } } },
      { name: 'OperationalData/Pressure', alias: 1001, type: 'Double', value: null, isNull: true },
    ] }));
    s.handle(t(dev, 'DDATA'), sp({ seq: 2, metrics: [{ alias: 1000, type: 'Double', value: 5.5 }] }));
    const d = s.snapshot().devices.find(x => x.deviceId === 'Station_05_-_Fuel_System')!;
    expect(d.online).toBe(true);
    expect(d.seq).toBe(2);
    expect(d.metrics).toEqual([
      expect.objectContaining({ name: 'OperationalData/Flow', value: 5.5, unit: 'l/min' }),
      expect.objectContaining({ name: 'OperationalData/Pressure', value: null, isNull: true }),
    ]);
  });

  it('shows unknown aliases as such when the viewer missed the birth', () => {
    const s = new LiveStore();
    s.handle(t(dev, 'DDATA'), sp({ seq: 9, metrics: [{ alias: 1000, type: 'Double', value: 1 }] }));
    expect(s.snapshot().devices[0].metrics[0]).toMatchObject({ name: 'alias 1000', unresolved: true });
  });

  it('late joiner: a birth stored by a Sparkplug-aware broker supplies names, not online state', () => {
    const s = new LiveStore();
    const stored = (tpl: string, type: string) => `$sparkplug/certificates/${t(tpl, type)}`;
    s.handle(t(dev, 'DDATA'), sp({ seq: 40, metrics: [{ alias: 1000, type: 'Double', value: 6.1 }] }), 2000);
    expect(s.snapshot().devices[0].metrics[0]).toMatchObject({ name: 'alias 1000', unresolved: true });
    s.handle(stored(dev, 'DBIRTH'), sp({ timestamp: 1000, seq: 1, metrics: [
      { name: 'OperationalData/Flow', alias: 1000, type: 'Double', value: 4.2, properties: { engUnit: { type: 'String', value: 'l/min' } } },
      { name: 'OperationalData/Pressure', alias: 1001, type: 'Double', value: 2.0 },
    ] }), 3000, true);
    const d = s.snapshot().devices[0];
    // the newer live value keeps winning over the older stored birth value, but gets its name
    expect(d.metrics).toEqual([
      expect.objectContaining({ name: 'OperationalData/Flow', value: 6.1 }),
      expect.objectContaining({ name: 'OperationalData/Pressure', value: 2.0, at: 1000 }),
    ]);
    expect(d.metrics[0].unresolved).toBeUndefined();
    expect(d.online).toBeUndefined();
    expect(d.lastType).toBe('DDATA');
    // later live data now resolves directly
    s.handle(t(dev, 'DDATA'), sp({ seq: 41, metrics: [{ alias: 1001, type: 'Double', value: 2.4 }] }), 4000);
    expect(s.snapshot().devices[0].metrics.find(m => m.name === 'OperationalData/Pressure')!.value).toBe(2.4);
  });

  it('ignores anything but births under the stored-birth prefix', () => {
    const s = new LiveStore();
    s.handle(`$sparkplug/certificates/${t(dev, 'DDATA')}`, sp({ metrics: [{ name: 'X', type: 'Int32', value: 1 }] }));
    expect(s.snapshot().devices).toHaveLength(0);
  });

  it('marks the edge node and its devices offline on NDEATH, a device on DDEATH', () => {
    const s = new LiveStore();
    s.handle(t(edge, 'NBIRTH'), sp({ seq: 0, metrics: [] }));
    s.handle(t(dev, 'DBIRTH'), sp({ seq: 1, metrics: [] }));
    s.handle(t(edge, 'NDEATH'), sp({ metrics: [{ name: 'bdSeq', type: 'UInt64', value: 0 }] }));
    expect(s.snapshot().devices.map(d => d.online)).toEqual([false, false]);
    s.handle(t(dev, 'DBIRTH'), sp({ seq: 1, metrics: [] }));
    s.handle(t(dev, 'DDEATH'), sp({ seq: 2, metrics: [] }));
    expect(s.snapshot().devices.find(d => d.deviceId)!.online).toBe(false);
  });

  it('a new NBIRTH replaces the alias map of that edge node', () => {
    const s = new LiveStore();
    s.handle(t(edge, 'NBIRTH'), sp({ seq: 0, metrics: [{ name: 'Old', alias: 5, type: 'Int32', value: 1 }, { name: 'Gone', alias: 6, type: 'Int32', value: 1 }] }));
    s.handle(t(edge, 'NBIRTH'), sp({ seq: 0, metrics: [{ name: 'New', alias: 5, type: 'Int32', value: 1 }] }));
    s.handle(t(edge, 'NDATA'), sp({ seq: 1, metrics: [{ alias: 5, type: 'Int32', value: 2 }, { alias: 6, type: 'Int32', value: 3 }] }));
    // alias 6 belonged to the previous session and was not declared again
    expect(s.snapshot().devices[0].metrics.map(m => [m.name, m.value, m.unresolved ?? false])).toEqual([['alias 6', 3, true], ['New', 2, false]]);
  });

  it('previews plain UNS messages as JSON or text, and flags non-Sparkplug data on Sparkplug topics', () => {
    const s = new LiveStore();
    const enc = new TextEncoder();
    s.handle('Pilatus_Aircraft/Stans_Facility/state', enc.encode('{ "mode": "running" }'), 1, true);
    s.handle('Pilatus_Aircraft/Stans_Facility/note', enc.encode('hello'), 2);
    s.handle(t(edge, 'NDATA'), enc.encode('{"oops":1}'), 3);
    const topics = Object.fromEntries(s.snapshot().topics.map(x => [x.topic, x]));
    expect(topics['Pilatus_Aircraft/Stans_Facility/state']).toMatchObject({ kind: 'json', preview: '{"mode":"running"}', retained: true });
    expect(topics['Pilatus_Aircraft/Stans_Facility/note']).toMatchObject({ kind: 'text', preview: 'hello' });
    expect(topics[t(edge, 'NDATA')].kind).toBe('undecodable');
  });

  it('keeps memory bounded on busy brokers', () => {
    const s = new LiveStore();
    for (let i = 0; i < 1000; i++) s.handle(`Pilatus_Aircraft/x/${i}`, new TextEncoder().encode('1'), i);
    const snap = s.snapshot();
    expect(snap.topics).toHaveLength(300);
    expect(snap.topics[0].topic).toBe('Pilatus_Aircraft/x/999');
    expect(snap.messages).toBe(1000);
  });
});

describe('validateLiveUrl', () => {
  it('accepts only secure WebSockets', () => {
    expect(validateLiveUrl('wss://broker.plant.local:8884')).toBeNull();
    expect(validateLiveUrl('ws://broker:8080')).toMatch(/wss/);
    expect(validateLiveUrl('mqtts://broker:8883')).toMatch(/wss/);
    expect(validateLiveUrl('nonsense')).toMatch(/valid/);
  });
});
