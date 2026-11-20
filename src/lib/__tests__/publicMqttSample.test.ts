import { describe, expect, it } from 'vitest';
import { PUBLIC_SAMPLE_URL, PUBLIC_SAMPLE_TOPIC, validateSampleTopic } from '../publicMqttSample';

describe('public MQTT sample', () => {
  it('uses the unauthenticated secure Mosquitto WebSocket listener', () => {
    expect(PUBLIC_SAMPLE_URL).toBe('wss://test.mosquitto.org:8081/mqtt');
  });
  it('defaults to a read-only broker uptime subscription', () => {
    expect(PUBLIC_SAMPLE_TOPIC).toBe('$SYS/broker/uptime');
    expect(validateSampleTopic(PUBLIC_SAMPLE_TOPIC)).toBeNull();
  });
  it('accepts exact public topics but rejects broad or malformed subscriptions', () => {
    expect(validateSampleTopic('test/topic')).toBeNull();
    for (const topic of ['#', 'test/+', '', 'test//topic', '/test', 'test/', 'test topic', ' test']) {
      expect(validateSampleTopic(topic)).not.toBeNull();
    }
  });
});