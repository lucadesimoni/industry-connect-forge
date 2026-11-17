/**
 * Live UNS view against a real Mosquitto with the documented config
 * (deploy/mosquitto). Run by scripts/test-broker.sh, which starts the broker
 * and sets the LIVE_MQTT_* variables; skipped otherwise.
 *
 * The edge node publishes over the TLS listener with its client certificate;
 * the viewer uses the app's own connection code over wss with the read-only
 * uns-viewer login.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import mqtt from 'mqtt';
import { afterAll, describe, expect, it } from 'vitest';
import { ISA95Level, UNSNode } from '@/types/industrial';
import { buildUNSMetadata } from '../hierarchyUtils';
import { liveScopeForNode, LiveStore } from '../liveUns';
import { LiveMqttConnection, LiveStatus } from '../liveMqttClient';

const WS_URL = process.env.LIVE_MQTT_WS_URL;
const TLS_URL = process.env.LIVE_MQTT_TLS_URL ?? '';
const CERTS = process.env.LIVE_MQTT_CERTS ?? '';
const VIEWER_PASSWORD = process.env.LIVE_MQTT_VIEWER_PASSWORD ?? '';

const require = createRequire(import.meta.url);
const tahu = require('sparkplug-payload').get('spBv1.0');
const sp = (payload: unknown) => Buffer.from(tahu.encodePayload(payload));
const file = (name: string) => readFileSync(join(CERTS, name));
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Client with a certificate identity (ACL role = certificate CN) on the TLS listener. */
const certClient = (role: string) => mqtt.connectAsync(TLS_URL, {
  protocolVersion: 5, ca: file('ca.crt'), cert: file(`${role}.crt`), key: file(`${role}.key`), reconnectPeriod: 0,
});
/** Raw wss client with a password (to try things the app's connection cannot do, e.g. publish). */
const wsClient = (username: string, password: string) => mqtt.connectAsync(WS_URL!, {
  protocolVersion: 5, ca: file('ca.crt'), username, password, reconnectPeriod: 0,
});
const waitFor = async (cond: () => boolean, ms = 4000) => {
  const end = Date.now() + ms;
  while (!cond() && Date.now() < end) await sleep(50);
  return cond();
};

// UNS that matches the edge-node role in deploy/mosquitto/acl
const now = new Date();
const nodes: UNSNode[] = [];
const add = (id: string, name: string, level: ISA95Level, parentId: string | null) => {
  const parent = parentId ? nodes.find(n => n.id === parentId)! : null;
  nodes.push({ id, name, level, parentId, metadata: buildUNSMetadata(level, name, parent, nodes), createdAt: now, updatedAt: now });
};
add('e', 'Pilatus', 'Enterprise', null);
add('s', 'Stans', 'Site', 'e');
add('a', 'Hall-3', 'Area', 's');
add('l', 'Line 01', 'Line', 'a');
add('c', 'CNC 5', 'Cell', 'l');

const opened: Array<{ end: (force?: boolean) => unknown }> = [];
const connections: LiveMqttConnection[] = [];
afterAll(async () => {
  for (const c of connections) await c.disconnect();
  for (const c of opened) c.end(true);
});

describe.skipIf(!WS_URL)('live UNS view on a real broker', () => {
  it('logs in over wss as the read-only viewer and refuses a wrong password', async () => {
    const ok = new LiveMqttConnection(); connections.push(ok);
    await ok.connect({ url: WS_URL!, username: 'uns-viewer', password: VIEWER_PASSWORD }, { ca: file('ca.crt'), reconnectPeriod: 0 });
    expect(ok.status).toBe<LiveStatus>('connected');

    const bad = new LiveMqttConnection(); connections.push(bad);
    await bad.connect({ url: WS_URL!, username: 'uns-viewer', password: 'wrong' }, { ca: file('ca.crt'), reconnectPeriod: 0 });
    expect(bad.status).toBe<LiveStatus>('error');
    expect(bad.lastError).toMatch(/Login refused/);
  });

  it('shows Sparkplug metrics of a Line by name (aliases resolved via DBIRTH) and its UNS messages', async () => {
    const line = nodes.find(n => n.id === 'l')!;
    const scope = liveScopeForNode(line, nodes);
    const store = new LiveStore();
    const viewer = new LiveMqttConnection(); connections.push(viewer);
    viewer.onMessage((topic, payload, retained) => { if (scope.accepts(topic)) store.handle(topic, payload, Date.now(), retained); });
    viewer.subscribe(scope.subscriptions);
    await viewer.connect({ url: WS_URL!, username: 'uns-viewer', password: VIEWER_PASSWORD }, { ca: file('ca.crt'), reconnectPeriod: 0 });
    await sleep(300);

    const edge = await certClient('edge-stans-hall3-line01'); opened.push(edge);
    const base = 'spBv1.0/Pilatus';
    const edgeId = scope.sparkplug.edgeNodeId!;
    expect(edgeId).toBe('Stans-Hall-3-Line_01');
    await edge.publishAsync(`${base}/NBIRTH/${edgeId}`, sp({ seq: 0, metrics: [{ name: 'bdSeq', alias: 1, type: 'UInt64', value: 0 }] }), { qos: 1 });
    await edge.publishAsync(`${base}/DBIRTH/${edgeId}/CNC_5`, sp({ seq: 1, metrics: [
      { name: 'OperationalData/SpindleSpeed', alias: 1000, type: 'Double', value: 1200, properties: { engUnit: { type: 'String', value: 'rpm' } } },
    ] }), { qos: 1 });
    await edge.publishAsync(`${base}/DDATA/${edgeId}/CNC_5`, sp({ seq: 2, metrics: [{ alias: 1000, type: 'Double', value: 1350.5 }] }), { qos: 1 });
    await edge.publishAsync('Pilatus/Stans/Hall-3/Line_01/CNC_5/state', JSON.stringify({ mode: 'running' }), { qos: 1 });

    const device = () => store.snapshot().devices.find(d => d.deviceId === 'CNC_5');
    expect(await waitFor(() => device()?.metrics[0]?.value === 1350.5)).toBe(true);
    expect(device()!.metrics[0]).toMatchObject({ name: 'OperationalData/SpindleSpeed', unit: 'rpm' });
    expect(device()!.online).toBe(true);
    expect(await waitFor(() => store.snapshot().topics.some(t => t.topic.endsWith('/state') && t.preview === '{"mode":"running"}'))).toBe(true);
  });

  it('cannot publish: a write by uns-viewer never reaches subscribers (positive control: the edge node can)', async () => {
    const watcher = await wsClient('uns-viewer', VIEWER_PASSWORD); opened.push(watcher);
    const got: string[] = [];
    watcher.on('message', t => got.push(t));
    await watcher.subscribeAsync('Pilatus/Stans/Hall-3/Line_01/#', { qos: 1 });

    const viewerAsWriter = await wsClient('uns-viewer', VIEWER_PASSWORD); opened.push(viewerAsWriter);
    await viewerAsWriter.publishAsync('Pilatus/Stans/Hall-3/Line_01/forged', 'x', { qos: 1 }).catch(() => undefined);
    const edge = await certClient('edge-stans-hall3-line01'); opened.push(edge);
    await edge.publishAsync('Pilatus/Stans/Hall-3/Line_01/control', 'y', { qos: 1 });

    expect(await waitFor(() => got.includes('Pilatus/Stans/Hall-3/Line_01/control'))).toBe(true);
    await sleep(500);
    expect(got).not.toContain('Pilatus/Stans/Hall-3/Line_01/forged');
  });

  it('cannot read broker internals ($SYS), which the monitoring role can', async () => {
    const monitoring = await certClient('monitoring'); opened.push(monitoring);
    const viewer = await wsClient('uns-viewer', VIEWER_PASSWORD); opened.push(viewer);
    const seen = { monitoring: 0, viewer: 0 };
    monitoring.on('message', () => { seen.monitoring++; });
    viewer.on('message', () => { seen.viewer++; });
    await monitoring.subscribeAsync('$SYS/broker/version');
    await viewer.subscribeAsync('$SYS/broker/version');
    expect(await waitFor(() => seen.monitoring > 0)).toBe(true);
    await sleep(500);
    expect(seen.viewer).toBe(0);
  });
});
