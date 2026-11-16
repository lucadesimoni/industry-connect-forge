/**
 * Live view of a UNS node: which MQTT topics belong to it, and a store that
 * turns raw messages into readable state. Pure logic, no network (the
 * connection is in liveMqttClient.ts), so it is unit- and broker-tested.
 *
 * A node's live scope (ADR 0001/0002, same topic builders as the stored metadata):
 * - UNS state: `{UNS topic}/#` (includes the node's own topic)
 * - Sparkplug B: Line = its edge node incl. devices; Cell = its device on the
 *   Line's edge node (+ the edge node's N* messages for online state);
 *   Enterprise/Site/Area = every edge node of the group whose id starts with
 *   the node's path (filtered here, MQTT cannot wildcard part of a level)
 * - Movable assets: `enterprise/locations/{path}/#` (not for Enterprise)
 */
import { UNSNode } from '@/types/industrial';
import { generateAssetSparkplugTopics, generateSparkplugBTopic } from './hierarchyUtils';
import { normalizeTopicPath, parseSparkplugTopic, topicMatchesFilter } from './mqttTopics';
import { decodeSparkplugPayload, SparkplugValue } from './sparkplugDecode';
import { locationTopicForNode, unsTreePath } from './unsContext';

export interface LiveScope {
  subscriptions: string[];
  /** Topic belongs to the node (broad Sparkplug subscriptions are narrowed here). */
  accepts: (topic: string) => boolean;
  sparkplug: { groupId: string; edgeNodeId?: string; deviceId?: string; edgePrefix?: string };
}

/**
 * Sparkplug 3.0 "Sparkplug Aware MQTT Server": keeps the latest NBIRTH/DBIRTH
 * of each edge node as retained message under this prefix, so a viewer that
 * joins later still learns metric names. Plain Mosquitto does not do this.
 */
export const SPARKPLUG_CERTIFICATES = '$sparkplug/certificates/';

/** Group/edge/device ids by position in a topic built by our own builders (spBv1.0/{group}/{type}/{edge}[/{device}]). */
const idsOf = (topic: string) => {
  const [, groupId, , edgeNodeId, deviceId] = topic.split('/');
  return { groupId, edgeNodeId, deviceId };
};

export function liveScopeForNode(node: UNSNode, nodes: UNSNode[]): LiveScope {
  const path = unsTreePath(node, nodes);
  const unsTopic = normalizeTopicPath(path);
  const subscriptions = [`${unsTopic}/#`];
  let sparkplug: LiveScope['sparkplug'];

  if (node.level === 'Line') {
    const t = idsOf(generateSparkplugBTopic(path, 'NDATA'));
    sparkplug = { groupId: t.groupId, edgeNodeId: t.edgeNodeId };
    subscriptions.push(`spBv1.0/${t.groupId}/+/${t.edgeNodeId}`, `spBv1.0/${t.groupId}/+/${t.edgeNodeId}/+`,
      `${SPARKPLUG_CERTIFICATES}spBv1.0/${t.groupId}/NBIRTH/${t.edgeNodeId}`, `${SPARKPLUG_CERTIFICATES}spBv1.0/${t.groupId}/DBIRTH/${t.edgeNodeId}/+`);
  } else if (node.level === 'Cell') {
    const parent = nodes.find(n => n.id === node.parentId);
    const t = idsOf(generateAssetSparkplugTopics(parent ? unsTreePath(parent, nodes) : path, node.name).dataTopic!);
    sparkplug = { groupId: t.groupId, edgeNodeId: t.edgeNodeId, deviceId: t.deviceId };
    subscriptions.push(`spBv1.0/${t.groupId}/+/${t.edgeNodeId}`, `spBv1.0/${t.groupId}/+/${t.edgeNodeId}/${t.deviceId}`,
      `${SPARKPLUG_CERTIFICATES}spBv1.0/${t.groupId}/NBIRTH/${t.edgeNodeId}`, `${SPARKPLUG_CERTIFICATES}spBv1.0/${t.groupId}/DBIRTH/${t.edgeNodeId}/${t.deviceId}`);
  } else {
    const t = idsOf(generateSparkplugBTopic(path, 'NDATA'));
    // Enterprise: whole group; Site/Area: edge ids "Site-Area-Line" starting with the node's part
    sparkplug = { groupId: t.groupId, edgePrefix: node.level === 'Enterprise' ? undefined : `${t.edgeNodeId}-` };
    subscriptions.push(`spBv1.0/${t.groupId}/#`, `${SPARKPLUG_CERTIFICATES}spBv1.0/${t.groupId}/#`);
  }

  const location = locationTopicForNode(node, nodes);
  if (location) subscriptions.push(`${location}/#`);

  const accepts = (topic: string) => {
    if (!subscriptions.some(f => topicMatchesFilter(f, topic))) return false;
    const stored = topic.startsWith(SPARKPLUG_CERTIFICATES);
    const sp = parseSparkplugTopic(stored ? topic.slice(SPARKPLUG_CERTIFICATES.length) : topic);
    if (!sp) return !topic.startsWith('spBv1.0/') && !stored;
    if (sp.messageType === 'STATE') return false;
    if (stored && sp.messageType !== 'NBIRTH' && sp.messageType !== 'DBIRTH') return false;
    return !sparkplug.edgePrefix || (sp.edgeNodeId ?? '').startsWith(sparkplug.edgePrefix);
  };
  return { subscriptions, accepts, sparkplug };
}

// ---------------------------------------------------------------------------

export interface LiveMetric {
  name: string;
  alias?: number;
  /** true when a DATA message used an alias that no BIRTH seen by this viewer declared */
  unresolved?: boolean;
  value: SparkplugValue;
  isNull: boolean;
  unit?: string;
  at: number;
}

export interface LiveDevice {
  key: string;
  groupId: string;
  edgeNodeId: string;
  deviceId?: string;
  /** undefined until a BIRTH or DEATH was seen */
  online?: boolean;
  lastType: string;
  seq?: number;
  at: number;
  metrics: LiveMetric[];
}

export interface LiveTopic {
  topic: string;
  at: number;
  count: number;
  retained: boolean;
  preview: string;
  kind: 'json' | 'text' | 'binary' | 'sparkplug' | 'undecodable';
}

export interface LiveSnapshot {
  devices: LiveDevice[];
  topics: LiveTopic[];
  messages: number;
}

const MAX_TOPICS = 300;
const PREVIEW = 240;
const utf8 = new TextDecoder('utf-8', { fatal: true });

const previewOf = (payload: Uint8Array): Pick<LiveTopic, 'preview' | 'kind'> => {
  let text: string;
  try { text = utf8.decode(payload); } catch { return { preview: `${payload.length} bytes (binary)`, kind: 'binary' }; }
  try {
    const json = JSON.stringify(JSON.parse(text));
    return { preview: json.length > PREVIEW ? `${json.slice(0, PREVIEW)}…` : json, kind: 'json' };
  } catch {
    return { preview: text.length > PREVIEW ? `${text.slice(0, PREVIEW)}…` : text, kind: 'text' };
  }
};

/**
 * Latest state of everything a viewer received. Sparkplug metric names come
 * from NBIRTH/DBIRTH (aliases are unique per edge node, so the alias map is
 * per edge node). A viewer that joins after the births sees "alias N" until
 * the next birth, or until a Sparkplug-aware broker delivers the stored birth
 * ($sparkplug/certificates/...; used for names and last-known values only, not
 * for online state). It never sends a rebirth request (read-only).
 */
export class LiveStore {
  private devices = new Map<string, LiveDevice & { byName: Map<string, LiveMetric> }>();
  private aliases = new Map<string, Map<number, string>>();
  private topics = new Map<string, LiveTopic>();
  private count = 0;
  version = 0;

  handle(topic: string, payload: Uint8Array, at = Date.now(), retained = false) {
    this.count++;
    this.version++;
    const stored = topic.startsWith(SPARKPLUG_CERTIFICATES);
    const sp = parseSparkplugTopic(stored ? topic.slice(SPARKPLUG_CERTIFICATES.length) : topic);
    if (sp && sp.messageType !== 'STATE') {
      const type = sp.messageType;
      const isBirth = type === 'NBIRTH' || type === 'DBIRTH';
      if (stored && !isBirth) return;
      this.record(topic, at, retained, { preview: stored ? `${type} (stored by broker)` : type, kind: 'sparkplug' });
      let decoded;
      try { decoded = decodeSparkplugPayload(payload); } catch { this.record(topic, at, retained, { preview: 'not a Sparkplug B payload', kind: 'undecodable' }); return; }
      const edgeKey = `${sp.groupId}/${sp.edgeNodeId}`;
      const key = sp.deviceId ? `${edgeKey}/${sp.deviceId}` : edgeKey;
      if (isBirth) {
        const map = type === 'NBIRTH' && !stored ? new Map<number, string>() : this.aliases.get(edgeKey) ?? new Map<number, string>();
        for (const m of decoded.metrics) if (m.name && m.alias !== undefined) map.set(m.alias, m.name);
        this.aliases.set(edgeKey, map);
        this.resolvePending(edgeKey, map);
      }
      const existing = this.devices.get(key);
      const device: LiveDevice & { byName: Map<string, LiveMetric> } = existing ?? {
        key, groupId: sp.groupId, edgeNodeId: sp.edgeNodeId!, deviceId: sp.deviceId, lastType: type, at, metrics: [], byName: new Map(),
      };
      if (stored) {
        // a stored birth only fills in what this viewer has not seen live
        if (!existing) { device.lastType = `${type} (stored by broker)`; device.at = decoded.timestamp ?? at; }
      } else {
        if (isBirth) { device.byName = new Map(); device.online = true; }
        if (type === 'NDEATH') {
          for (const d of this.devices.values()) if (`${d.groupId}/${d.edgeNodeId}` === edgeKey) d.online = false;
          device.online = false;
        }
        if (type === 'DDEATH') device.online = false;
        device.lastType = type;
        device.at = at;
        if (decoded.seq !== undefined) device.seq = decoded.seq;
      }
      if (!type.endsWith('CMD') && type !== 'NDEATH') {
        const aliasMap = this.aliases.get(edgeKey);
        for (const m of decoded.metrics) {
          const known = m.name ?? (m.alias !== undefined ? aliasMap?.get(m.alias) : undefined);
          const name = known ?? `alias ${m.alias ?? '?'}`;
          const prev = device.byName.get(name);
          const metricAt = m.timestamp ?? decoded.timestamp ?? at;
          if (stored && prev && prev.at >= metricAt) continue;
          const unit = m.properties?.engUnit;
          device.byName.set(name, {
            name, alias: m.alias ?? prev?.alias, unresolved: !known || undefined, value: m.value, isNull: m.isNull,
            unit: typeof unit === 'string' ? unit : prev?.unit, at: metricAt,
          });
        }
      }
      device.metrics = [...device.byName.values()].sort((a, b) => a.name.localeCompare(b.name));
      this.devices.set(key, device);
      return;
    }
    this.record(topic, at, retained, previewOf(payload));
  }

  /** Rename metrics that arrived as "alias N" once a birth declares the alias. */
  private resolvePending(edgeKey: string, map: Map<number, string>) {
    for (const d of this.devices.values()) {
      if (`${d.groupId}/${d.edgeNodeId}` !== edgeKey) continue;
      let changed = false;
      for (const [k, m] of [...d.byName]) {
        const name = m.unresolved && m.alias !== undefined ? map.get(m.alias) : undefined;
        if (!name) continue;
        d.byName.delete(k);
        const prev = d.byName.get(name);
        if (!prev || prev.at <= m.at) d.byName.set(name, { ...m, name, unit: m.unit ?? prev?.unit, unresolved: undefined });
        changed = true;
      }
      if (changed) d.metrics = [...d.byName.values()].sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  private record(topic: string, at: number, retained: boolean, p: Pick<LiveTopic, 'preview' | 'kind'>) {
    const prev = this.topics.get(topic);
    this.topics.delete(topic);
    this.topics.set(topic, { topic, at, retained, count: (prev?.count ?? 0) + (p.kind === 'undecodable' ? 0 : 1), ...p });
    if (this.topics.size > MAX_TOPICS) this.topics.delete(this.topics.keys().next().value!);
  }

  snapshot(): LiveSnapshot {
    return {
      devices: [...this.devices.values()].map(({ byName: _byName, ...d }) => d).sort((a, b) => a.key.localeCompare(b.key)),
      topics: [...this.topics.values()].sort((a, b) => b.at - a.at),
      messages: this.count,
    };
  }
}
