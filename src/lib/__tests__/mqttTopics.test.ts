import { describe, expect, it } from 'vitest';
import {
  buildSparkplugStateTopic,
  buildSparkplugTopic,
  normalizeTopicPath,
  parseSparkplugTopic,
  sanitizeSparkplugId,
  sanitizeTopicLevel,
  topicMatchesFilter,
  validateMqttTopicFilter,
  validateMqttTopicName,
} from '../mqttTopics';

describe('MQTT topic names', () => {
  it('sanitizes levels: whitespace, wildcards and separators', () => {
    expect(sanitizeTopicLevel(' Line 1 ')).toBe('Line_1');
    expect(sanitizeTopicLevel('a+b#c/d')).toBe('abcd');
  });

  it('normalizes paths: preserves case, drops empty levels', () => {
    expect(normalizeTopicPath('/Acme Corp//Plant 1/Line+A/')).toBe('Acme_Corp/Plant_1/LineA');
  });

  it('rejects wildcards and empty topics in topic names', () => {
    expect(validateMqttTopicName('a/+/b').valid).toBe(false);
    expect(validateMqttTopicName('a/#').valid).toBe(false);
    expect(validateMqttTopicName('').valid).toBe(false);
    expect(validateMqttTopicName('a\u0000b').valid).toBe(false);
  });

  it('warns about leading slash, $ prefix, whitespace and empty levels', () => {
    const r = validateMqttTopicName('/$SYS/a b//c/');
    expect(r.valid).toBe(true);
    expect(r.warnings.length).toBeGreaterThanOrEqual(4);
    expect(validateMqttTopicName('acme/site/area').warnings).toEqual([]);
  });

  it('validates topic filters per MQTT §4.7.1', () => {
    expect(validateMqttTopicFilter('a/+/b/#').valid).toBe(true);
    expect(validateMqttTopicFilter('#').valid).toBe(true);
    expect(validateMqttTopicFilter('a/#/b').valid).toBe(false);
    expect(validateMqttTopicFilter('a/b#').valid).toBe(false);
    expect(validateMqttTopicFilter('a/b+/c').valid).toBe(false);
  });

  it('matches filters like a broker', () => {
    expect(topicMatchesFilter('enterprise/locations/S1/assets/+/#', 'enterprise/locations/S1/assets/c1/telemetry/location')).toBe(true);
    expect(topicMatchesFilter('enterprise/locations/S1/assets/+/#', 'enterprise/locations/S1/assets/c1')).toBe(true);
    expect(topicMatchesFilter('a/+', 'a/b/c')).toBe(false);
    expect(topicMatchesFilter('#', '$SYS/broker')).toBe(false);
  });
});

describe('Sparkplug B topics', () => {
  it('removes reserved characters from ids', () => {
    expect(sanitizeSparkplugId('Hall 3/Line#1+x')).toBe('Hall_3_Line_1_x');
  });

  it('builds node and device topics', () => {
    expect(buildSparkplugTopic('Acme', 'NBIRTH', 'Plant-Line1')).toBe('spBv1.0/Acme/NBIRTH/Plant-Line1');
    expect(buildSparkplugTopic('Acme', 'DDATA', 'Plant-Line1', 'Robot 1')).toBe('spBv1.0/Acme/DDATA/Plant-Line1/Robot_1');
  });

  it('builds the Sparkplug 3.0 STATE topic', () => {
    expect(buildSparkplugStateTopic('scada-host')).toBe('spBv1.0/STATE/scada-host');
  });

  it('parses only spec-compliant topics', () => {
    expect(parseSparkplugTopic('spBv1.0/G/DDATA/E/D')).toEqual({ groupId: 'G', messageType: 'DDATA', edgeNodeId: 'E', deviceId: 'D' });
    expect(parseSparkplugTopic('spBv1.0/G/NDATA/E')).toEqual({ groupId: 'G', messageType: 'NDATA', edgeNodeId: 'E' });
    expect(parseSparkplugTopic('spBv1.0/STATE/host')?.messageType).toBe('STATE');
    expect(parseSparkplugTopic('spBv1.0/G/DDATA/E')).toBeNull(); // device message without device id
    expect(parseSparkplugTopic('spBv1.0/G/NDATA/E/D')).toBeNull(); // node message with device id
    expect(parseSparkplugTopic('spBv1.0/G/STANS/DDATA/X')).toBeNull(); // invalid message type
    expect(parseSparkplugTopic('spBv1.0/a/b/DDATA/E/D')).toBeNull(); // group with '/'
  });
});
