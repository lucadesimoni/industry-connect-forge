/**
 * MQTT 3.1.1 / 5.0 and Sparkplug B 3.0 topic helpers.
 *
 * MQTT rules (OASIS MQTT v5.0 §4.7, v3.1.1 §4.7):
 *  - topic names/filters are case-sensitive UTF-8 strings, at least one character,
 *    at most 65535 bytes, must not contain U+0000
 *  - `/` separates topic levels; empty levels are allowed but discouraged
 *  - `+` (single level) and `#` (multi level) are wildcards that may only appear in
 *    subscription filters, never in published topic names
 *  - `#` must be the last character and occupy a whole level; `+` must occupy a whole level
 *  - topics starting with `$` are reserved for broker-internal use ($SYS, $share, ...)
 *
 * Sparkplug B 3.0 rules:
 *  - namespace: spBv1.0/{group_id}/{message_type}/{edge_node_id}[/{device_id}]
 *  - group_id, edge_node_id, device_id must be valid UTF-8 and must not contain
 *    the reserved characters `+`, `/` and `#`
 *  - host application state: spBv1.0/STATE/{sparkplug_host_id}
 */

export const SPARKPLUG_NAMESPACE = 'spBv1.0';

export type SparkplugNodeMessageType = 'NBIRTH' | 'NDEATH' | 'NDATA' | 'NCMD';
export type SparkplugDeviceMessageType = 'DBIRTH' | 'DDEATH' | 'DDATA' | 'DCMD';
export type SparkplugMessageType = SparkplugNodeMessageType | SparkplugDeviceMessageType;

const MAX_TOPIC_BYTES = 65535;

export interface TopicValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const byteLength = (s: string) => new TextEncoder().encode(s).length;

/**
 * Make a single topic level safe for publishing:
 * whitespace -> `_`, MQTT wildcards / level separator / NUL removed.
 */
export const sanitizeTopicLevel = (level: string): string =>
  level
    .trim()
    .replace(/\s+/g, '_')
    // eslint-disable-next-line no-control-regex
    .replace(/[+#/\u0000]/g, '');

/**
 * Normalize a slash separated path into a publishable MQTT topic name:
 * each level sanitized, empty levels (leading/trailing/double slashes) dropped.
 * Case is preserved (MQTT topics are case-sensitive).
 */
export const normalizeTopicPath = (path: string): string =>
  path
    .split('/')
    .map(sanitizeTopicLevel)
    .filter((level) => level.length > 0)
    .join('/');

/** Validate an MQTT topic *name* (used for PUBLISH, wildcards not allowed). */
export const validateMqttTopicName = (topic: string): TopicValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (topic.length === 0) errors.push('Topic must not be empty.');
  if (byteLength(topic) > MAX_TOPIC_BYTES) errors.push('Topic exceeds 65535 bytes.');
  if (topic.includes('\u0000')) errors.push('Topic must not contain the NUL character.');
  if (/[#+]/.test(topic)) errors.push('Wildcards (+, #) are not allowed in published topic names.');
  if (topic.startsWith('$')) warnings.push('Topics starting with $ are reserved for the broker.');
  if (/\s/.test(topic)) warnings.push('Avoid whitespace; use underscores or dashes.');
  if (topic.startsWith('/')) warnings.push('Avoid a leading slash (creates an empty first level).');
  if (topic.endsWith('/')) warnings.push('Avoid trailing slashes.');
  if (topic.includes('//')) warnings.push('Avoid empty topic levels (//).');

  return { valid: errors.length === 0, errors, warnings };
};

/** Validate an MQTT topic *filter* (used for SUBSCRIBE, wildcards allowed). */
export const validateMqttTopicFilter = (filter: string): TopicValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (filter.length === 0) errors.push('Topic filter must not be empty.');
  if (byteLength(filter) > MAX_TOPIC_BYTES) errors.push('Topic filter exceeds 65535 bytes.');
  if (filter.includes('\u0000')) errors.push('Topic filter must not contain the NUL character.');

  const levels = filter.split('/');
  levels.forEach((level, i) => {
    if (level.includes('#') && (level !== '#' || i !== levels.length - 1)) {
      errors.push('# must occupy a whole level and be the last level.');
    }
    if (level.includes('+') && level !== '+') {
      errors.push('+ must occupy a whole topic level.');
    }
  });
  if (/\s/.test(filter)) warnings.push('Avoid whitespace in topic filters.');

  return { valid: errors.length === 0, errors: [...new Set(errors)], warnings };
};

/** True when `topic` (a topic name) is matched by `filter` per MQTT wildcard semantics. */
export const topicMatchesFilter = (filter: string, topic: string): boolean => {
  const f = filter.split('/');
  const t = topic.split('/');
  // Wildcards at the first level must not match $-topics (MQTT §4.7.2)
  if (topic.startsWith('$') && (f[0] === '+' || f[0] === '#')) return false;
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return true;
    if (i >= t.length) return false;
    if (f[i] !== '+' && f[i] !== t[i]) return false;
  }
  return f.length === t.length;
};

/**
 * Make an identifier safe as Sparkplug group_id / edge_node_id / device_id:
 * reserved characters (+ / #) and whitespace become `_`.
 */
export const sanitizeSparkplugId = (id: string): string => {
  const cleaned = id
    .trim()
    // eslint-disable-next-line no-control-regex
    .replace(/[\s+/#\u0000]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned;
};

export const isValidSparkplugId = (id: string): boolean =>
  id.length > 0 && !/[+/#]/.test(id);

/** Build a Sparkplug B topic. Device id makes it a device-level (D*) topic. */
export const buildSparkplugTopic = (
  groupId: string,
  messageType: SparkplugMessageType,
  edgeNodeId: string,
  deviceId?: string
): string => {
  const parts = [
    SPARKPLUG_NAMESPACE,
    sanitizeSparkplugId(groupId) || 'default',
    messageType,
    sanitizeSparkplugId(edgeNodeId) || 'node',
  ];
  if (deviceId !== undefined) parts.push(sanitizeSparkplugId(deviceId) || 'device');
  return parts.join('/');
};

/** Sparkplug 3.0 host application STATE topic. */
export const buildSparkplugStateTopic = (hostId: string): string =>
  `${SPARKPLUG_NAMESPACE}/STATE/${sanitizeSparkplugId(hostId) || 'host'}`;

export interface ParsedSparkplugTopic {
  groupId: string;
  messageType: SparkplugMessageType | 'STATE';
  edgeNodeId?: string;
  deviceId?: string;
  hostId?: string;
}

const NODE_TYPES = new Set(['NBIRTH', 'NDEATH', 'NDATA', 'NCMD']);
const DEVICE_TYPES = new Set(['DBIRTH', 'DDEATH', 'DDATA', 'DCMD']);

/** Parse and validate a Sparkplug B topic. Returns null when it is not spec-compliant. */
export const parseSparkplugTopic = (topic: string): ParsedSparkplugTopic | null => {
  const parts = topic.split('/');
  if (parts[0] !== SPARKPLUG_NAMESPACE) return null;

  if (parts[1] === 'STATE') {
    return parts.length === 3 && isValidSparkplugId(parts[2])
      ? { groupId: '', messageType: 'STATE', hostId: parts[2] }
      : null;
  }

  const [, groupId, messageType, edgeNodeId, deviceId] = parts;
  if (!groupId || !messageType || !edgeNodeId) return null;
  if (![groupId, edgeNodeId].every(isValidSparkplugId)) return null;

  if (NODE_TYPES.has(messageType)) {
    return parts.length === 4
      ? { groupId, messageType: messageType as SparkplugMessageType, edgeNodeId }
      : null;
  }
  if (DEVICE_TYPES.has(messageType)) {
    return parts.length === 5 && isValidSparkplugId(deviceId ?? '')
      ? { groupId, messageType: messageType as SparkplugMessageType, edgeNodeId, deviceId }
      : null;
  }
  return null;
};
