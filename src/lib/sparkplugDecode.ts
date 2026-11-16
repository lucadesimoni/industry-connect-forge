/**
 * Read-only decoder for Sparkplug B 3.0 payloads (protobuf, message
 * `org.eclipse.tahu.protobuf.Payload` in sparkplug_b.proto). Only what a viewer
 * needs: timestamp, seq, metrics with name/alias/datatype/value/is_null and
 * metric properties (e.g. engUnit). DataSet, Template and extension values are
 * reported as unsupported instead of being guessed. Checked against the Eclipse
 * Tahu reference encoder (devDependency sparkplug-payload) in the tests.
 */

/** Sparkplug B DataType enum (sparkplug_b.proto). */
export const SPARKPLUG_DATATYPES: Record<number, string> = {
  1: 'Int8', 2: 'Int16', 3: 'Int32', 4: 'Int64', 5: 'UInt8', 6: 'UInt16', 7: 'UInt32', 8: 'UInt64',
  9: 'Float', 10: 'Double', 11: 'Boolean', 12: 'String', 13: 'DateTime', 14: 'Text', 15: 'UUID',
  16: 'DataSet', 17: 'Bytes', 18: 'File', 19: 'Template', 20: 'PropertySet', 21: 'PropertySetList',
};

export type SparkplugValue = number | string | boolean | null;

export interface DecodedMetric {
  name?: string;
  alias?: number;
  timestamp?: number;
  datatype?: number;
  isHistorical?: boolean;
  isTransient?: boolean;
  isNull: boolean;
  /** Decoded value; null when is_null or the value type is not supported by this viewer. */
  value: SparkplugValue;
  unsupported?: string;
  properties?: Record<string, SparkplugValue>;
}

export interface DecodedPayload {
  timestamp?: number;
  seq?: number;
  uuid?: string;
  metrics: DecodedMetric[];
}

class Reader {
  pos = 0;
  constructor(private buf: Uint8Array, private end = buf.length) {}
  get done() { return this.pos >= this.end; }
  varint(): bigint {
    let result = 0n;
    for (let shift = 0n; shift < 70n; shift += 7n) {
      if (this.pos >= this.end) throw new Error('truncated varint');
      const b = this.buf[this.pos++];
      result |= BigInt(b & 0x7f) << shift;
      if (!(b & 0x80)) return result & 0xffffffffffffffffn;
    }
    throw new Error('varint too long');
  }
  fixed(n: 4 | 8): DataView {
    if (this.pos + n > this.end) throw new Error('truncated fixed field');
    const view = new DataView(this.buf.buffer, this.buf.byteOffset + this.pos, n);
    this.pos += n;
    return view;
  }
  bytes(): Uint8Array {
    const len = Number(this.varint());
    if (this.pos + len > this.end) throw new Error('truncated length-delimited field');
    const out = this.buf.subarray(this.pos, this.pos + len);
    this.pos += len;
    return out;
  }
  skip(wireType: number) {
    if (wireType === 0) this.varint();
    else if (wireType === 1) this.fixed(8);
    else if (wireType === 2) this.bytes();
    else if (wireType === 5) this.fixed(4);
    else throw new Error(`unsupported wire type ${wireType}`);
  }
  tag(): [number, number] {
    const t = Number(this.varint());
    return [t >>> 3, t & 7];
  }
}

const utf8 = new TextDecoder();
const toNumber = (v: bigint): number | string => (v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : v.toString());
const signed = (v: bigint, bits: number): number | string => {
  const s = BigInt.asIntN(bits, v);
  return s >= BigInt(Number.MIN_SAFE_INTEGER) && s <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(s) : s.toString();
};

/** Value of a metric or property, applying the Sparkplug signed-integer convention. */
const typedValue = (datatype: number | undefined, raw: { int?: bigint; long?: bigint; float?: number; double?: number; bool?: boolean; str?: string; bytes?: Uint8Array }): SparkplugValue => {
  switch (datatype) {
    case 1: return raw.int !== undefined ? signed(raw.int, 8) as number : null;
    case 2: return raw.int !== undefined ? signed(raw.int, 16) as number : null;
    case 3: return raw.int !== undefined ? signed(raw.int, 32) as number : null;
    case 4: return raw.long !== undefined ? signed(raw.long, 64) : null;
    case 5: case 6: return raw.int !== undefined ? Number(raw.int & 0xffffffffn) : null;
    // Sparkplug 3.0 carries UInt32 in long_value; accept int_value from older encoders
    case 7: { const v = raw.long ?? raw.int; return v !== undefined ? Number(v & 0xffffffffn) : null; }
    case 8: case 13: return raw.long !== undefined ? toNumber(raw.long) : null;
    case 9: return raw.float ?? null;
    case 10: return raw.double ?? null;
    case 11: return raw.bool ?? null;
    case 12: case 14: case 15: return raw.str ?? null;
    case 17: case 18: return raw.bytes ? `${raw.bytes.length} bytes` : null;
    default:
      // datatype missing (allowed in DATA messages when known from BIRTH): take whichever value is present
      if (raw.str !== undefined) return raw.str;
      if (raw.bool !== undefined) return raw.bool;
      if (raw.double !== undefined) return raw.double;
      if (raw.float !== undefined) return raw.float;
      if (raw.long !== undefined) return toNumber(raw.long);
      if (raw.int !== undefined) return Number(raw.int);
      return null;
  }
};

function decodePropertyValue(buf: Uint8Array): SparkplugValue {
  const r = new Reader(buf);
  let type: number | undefined; let isNull = false;
  const raw: Parameters<typeof typedValue>[1] = {};
  while (!r.done) {
    const [field, wt] = r.tag();
    if (field === 1 && wt === 0) type = Number(r.varint());
    else if (field === 2 && wt === 0) isNull = r.varint() !== 0n;
    else if (field === 3 && wt === 0) raw.int = r.varint();
    else if (field === 4 && wt === 0) raw.long = r.varint();
    else if (field === 5 && wt === 5) raw.float = r.fixed(4).getFloat32(0, true);
    else if (field === 6 && wt === 1) raw.double = r.fixed(8).getFloat64(0, true);
    else if (field === 7 && wt === 0) raw.bool = r.varint() !== 0n;
    else if (field === 8 && wt === 2) raw.str = utf8.decode(r.bytes());
    else r.skip(wt);
  }
  return isNull ? null : typedValue(type, raw);
}

function decodePropertySet(buf: Uint8Array): Record<string, SparkplugValue> {
  const r = new Reader(buf);
  const keys: string[] = []; const values: SparkplugValue[] = [];
  while (!r.done) {
    const [field, wt] = r.tag();
    if (field === 1 && wt === 2) keys.push(utf8.decode(r.bytes()));
    else if (field === 2 && wt === 2) values.push(decodePropertyValue(r.bytes()));
    else r.skip(wt);
  }
  return Object.fromEntries(keys.map((k, i) => [k, values[i] ?? null]));
}

function decodeMetric(buf: Uint8Array): DecodedMetric {
  const r = new Reader(buf);
  const m: DecodedMetric = { isNull: false, value: null };
  const raw: Parameters<typeof typedValue>[1] = {};
  while (!r.done) {
    const [field, wt] = r.tag();
    switch (true) {
      case field === 1 && wt === 2: m.name = utf8.decode(r.bytes()); break;
      case field === 2 && wt === 0: m.alias = Number(r.varint()); break;
      case field === 3 && wt === 0: m.timestamp = Number(r.varint()); break;
      case field === 4 && wt === 0: m.datatype = Number(r.varint()); break;
      case field === 5 && wt === 0: m.isHistorical = r.varint() !== 0n; break;
      case field === 6 && wt === 0: m.isTransient = r.varint() !== 0n; break;
      case field === 7 && wt === 0: m.isNull = r.varint() !== 0n; break;
      case field === 9 && wt === 2: m.properties = decodePropertySet(r.bytes()); break;
      case field === 10 && wt === 0: raw.int = r.varint(); break;
      case field === 11 && wt === 0: raw.long = r.varint(); break;
      case field === 12 && wt === 5: raw.float = r.fixed(4).getFloat32(0, true); break;
      case field === 13 && wt === 1: raw.double = r.fixed(8).getFloat64(0, true); break;
      case field === 14 && wt === 0: raw.bool = r.varint() !== 0n; break;
      case field === 15 && wt === 2: raw.str = utf8.decode(r.bytes()); break;
      case field === 16 && wt === 2: raw.bytes = r.bytes(); break;
      case field === 17 && wt === 2: r.bytes(); m.unsupported = 'DataSet'; break;
      case field === 18 && wt === 2: r.bytes(); m.unsupported = 'Template'; break;
      case field === 19 && wt === 2: r.bytes(); m.unsupported = 'extension'; break;
      default: r.skip(wt);
    }
  }
  m.value = m.isNull || m.unsupported ? null : typedValue(m.datatype, raw);
  return m;
}

/** Decode a Sparkplug B payload. Throws on malformed protobuf. */
export function decodeSparkplugPayload(buf: Uint8Array): DecodedPayload {
  const r = new Reader(buf);
  const out: DecodedPayload = { metrics: [] };
  while (!r.done) {
    const [field, wt] = r.tag();
    if (field === 1 && wt === 0) out.timestamp = Number(r.varint());
    else if (field === 2 && wt === 2) out.metrics.push(decodeMetric(r.bytes()));
    else if (field === 3 && wt === 0) out.seq = Number(r.varint());
    else if (field === 4 && wt === 2) out.uuid = utf8.decode(r.bytes());
    else r.skip(wt);
  }
  return out;
}
