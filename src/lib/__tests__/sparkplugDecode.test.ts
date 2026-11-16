/**
 * The viewer's Sparkplug B decoder against payloads built by the Eclipse Tahu
 * reference implementation (sparkplug-payload, devDependency): same values out
 * as went in, for every supported data type, signed integers, nulls, aliases
 * and metric properties.
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { decodeSparkplugPayload, SPARKPLUG_DATATYPES } from '../sparkplugDecode';

const require = createRequire(import.meta.url);
const tahu = require('sparkplug-payload').get('spBv1.0');
const encode = (payload: unknown): Uint8Array => new Uint8Array(tahu.encodePayload(payload));

describe('decodeSparkplugPayload (vs Eclipse Tahu encoder)', () => {
  it('decodes every scalar data type with the Sparkplug signed-integer convention', () => {
    const metrics = [
      { name: 'i8', type: 'Int8', value: -5 },
      { name: 'i16', type: 'Int16', value: -300 },
      { name: 'i32', type: 'Int32', value: -70000 },
      { name: 'i64', type: 'Int64', value: -1234567890123 },
      { name: 'u8', type: 'UInt8', value: 250 },
      { name: 'u16', type: 'UInt16', value: 65000 },
      { name: 'u32', type: 'UInt32', value: 4000000000 },
      { name: 'u64', type: 'UInt64', value: 1234567890123 },
      { name: 'f', type: 'Float', value: 1.5 },
      { name: 'd', type: 'Double', value: 3.14159 },
      { name: 'b', type: 'Boolean', value: true },
      { name: 's', type: 'String', value: 'Hällo/ä' },
      { name: 'dt', type: 'DateTime', value: 1794826000000 },
      { name: 't', type: 'Text', value: 'line\nbreak' },
      { name: 'uuid', type: 'UUID', value: '3f2a1c9e-0000-4000-8000-000000000001' },
    ];
    const out = decodeSparkplugPayload(encode({ timestamp: 1794826000123, seq: 7, metrics }));
    expect(out.timestamp).toBe(1794826000123);
    expect(out.seq).toBe(7);
    expect(out.metrics.map(m => [m.name, SPARKPLUG_DATATYPES[m.datatype!], m.value])).toEqual(
      metrics.map(m => [m.name, m.type, m.value]),
    );
  });

  it('keeps 64-bit values beyond the safe integer range exact (as text)', () => {
    const big = tahu.encodePayload({ metrics: [{ name: 'u64', type: 'UInt64', value: require('long').fromString('18446744073709551615', true) }] });
    expect(decodeSparkplugPayload(new Uint8Array(big)).metrics[0].value).toBe('18446744073709551615');
  });

  it('reports nulls as null, never 0', () => {
    const out = decodeSparkplugPayload(encode({ metrics: [{ name: 'Flow', type: 'Double', value: null, isNull: true }] }));
    expect(out.metrics[0]).toMatchObject({ name: 'Flow', isNull: true, value: null });
  });

  it('decodes alias-only DATA metrics and BIRTH name+alias pairs', () => {
    const birth = decodeSparkplugPayload(encode({ seq: 1, metrics: [{ name: 'OperationalData/Speed', alias: 1000, type: 'Double', value: 12.5 }] }));
    const data = decodeSparkplugPayload(encode({ seq: 2, metrics: [{ alias: 1000, type: 'Double', value: 13 }] }));
    expect(birth.metrics[0]).toMatchObject({ name: 'OperationalData/Speed', alias: 1000 });
    expect(data.metrics[0].name).toBeUndefined();
    expect(data.metrics[0]).toMatchObject({ alias: 1000, value: 13 });
  });

  it('decodes metric properties such as the engineering unit', () => {
    const out = decodeSparkplugPayload(encode({ metrics: [{
      name: 'Speed', type: 'Double', value: 1,
      properties: { engUnit: { type: 'String', value: 'm/s' }, max: { type: 'Int32', value: -1 } },
    }] }));
    expect(out.metrics[0].properties).toEqual({ engUnit: 'm/s', max: -1 });
  });

  it('flags data sets as unsupported instead of guessing a value', () => {
    const out = decodeSparkplugPayload(encode({ metrics: [{
      name: 'Table', type: 'DataSet',
      value: { numOfColumns: 1, columns: ['a'], types: ['Int32'], rows: [[1]] },
    }] }));
    expect(out.metrics[0]).toMatchObject({ name: 'Table', unsupported: 'DataSet', value: null });
  });

  it('rejects truncated and non-protobuf input', () => {
    const ok = encode({ seq: 1, metrics: [{ name: 'x', type: 'String', value: 'hello world' }] });
    expect(() => decodeSparkplugPayload(ok.subarray(0, ok.length - 3))).toThrow();
    expect(() => decodeSparkplugPayload(new TextEncoder().encode('{"temp": 21.5}'))).toThrow();
  });
});
