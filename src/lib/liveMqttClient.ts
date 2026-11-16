/**
 * Read-only MQTT connection for the live UNS view: MQTT 5 over secure
 * WebSockets to the Mosquitto `wss` listener (deploy/mosquitto, port 8884),
 * logged in as the read-only role `uns-viewer`. This module only subscribes;
 * it has no publish function, and the broker ACL denies writes for the role.
 *
 * mqtt.js is loaded on first connect, so it is not part of the initial bundle.
 */
export type LiveStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface LiveCredentials {
  url: string;
  username: string;
  password: string;
}

export interface LiveConnectionOptions {
  /** Node only (tests): CA certificate to trust for wss. Browsers use their trust store. */
  ca?: string | Buffer;
  reconnectPeriod?: number;
}

type MessageHandler = (topic: string, payload: Uint8Array, retained: boolean) => void;
type StatusHandler = (status: LiveStatus, error?: string) => void;

interface MinimalClient {
  on(event: 'connect' | 'reconnect' | 'close' | 'offline', cb: () => void): void;
  on(event: 'error', cb: (err: Error) => void): void;
  on(event: 'message', cb: (topic: string, payload: Uint8Array, packet: { retain?: boolean }) => void): void;
  subscribe(filters: string[], opts: { qos: 0 | 1 }, cb?: (err: Error | null) => void): void;
  unsubscribe(filters: string[]): void;
  end(force?: boolean, cb?: () => void): void;
}

/** Shared by all live panels; subscriptions are reference-counted per filter. */
export class LiveMqttConnection {
  private client: MinimalClient | null = null;
  private refs = new Map<string, number>();
  private handlers = new Set<MessageHandler>();
  private statusHandlers = new Set<StatusHandler>();
  status: LiveStatus = 'disconnected';
  lastError?: string;

  private setStatus(status: LiveStatus, error?: string) {
    this.status = status;
    this.lastError = error;
    for (const h of this.statusHandlers) h(status, error);
  }

  onStatus(h: StatusHandler) { this.statusHandlers.add(h); return () => { this.statusHandlers.delete(h); }; }
  onMessage(h: MessageHandler) { this.handlers.add(h); return () => { this.handlers.delete(h); }; }

  async connect({ url, username, password }: LiveCredentials, opts: LiveConnectionOptions = {}): Promise<void> {
    await this.disconnect();
    this.setStatus('connecting');
    const { default: mqtt } = await import('mqtt');
    return new Promise(resolve => {
      const client = mqtt.connect(url, {
        username, password,
        protocolVersion: 5,
        clean: true,
        clientId: `forge-viewer-${Math.random().toString(16).slice(2, 10)}`,
        reconnectPeriod: opts.reconnectPeriod ?? 5000,
        connectTimeout: 10_000,
        ...(opts.ca ? { ca: opts.ca } : {}),
      }) as unknown as MinimalClient;
      this.client = client;
      let settled = false;
      const settle = () => { if (!settled) { settled = true; resolve(); } };
      client.on('connect', () => {
        this.setStatus('connected');
        const filters = [...this.refs.keys()];
        if (filters.length) client.subscribe(filters, { qos: 0 });
        settle();
      });
      client.on('reconnect', () => this.setStatus('reconnecting', this.lastError));
      client.on('error', err => {
        // a refused login is final: stop retrying with the same password
        const refused = /not authori[sz]ed|bad user name or password|connection refused/i.test(err.message);
        this.setStatus('error', refused ? 'Login refused: check username and password' : err.message);
        if (refused) client.end(true);
        settle();
      });
      client.on('close', () => { if (this.status === 'connected') this.setStatus('reconnecting'); settle(); });
      client.on('message', (topic, payload, packet) => {
        for (const h of this.handlers) h(topic, payload, Boolean(packet.retain));
      });
    });
  }

  async disconnect(): Promise<void> {
    const c = this.client;
    this.client = null;
    if (c) await new Promise<void>(r => c.end(true, () => r()));
    if (this.status !== 'disconnected') this.setStatus('disconnected');
  }

  /** Subscribe to filters (QoS 0, display only); returns the matching unsubscribe. */
  subscribe(filters: string[]): () => void {
    const added = filters.filter(f => {
      const n = (this.refs.get(f) ?? 0) + 1;
      this.refs.set(f, n);
      return n === 1;
    });
    if (added.length && this.status === 'connected') this.client?.subscribe(added, { qos: 0 });
    return () => {
      const removed = filters.filter(f => {
        const n = (this.refs.get(f) ?? 1) - 1;
        if (n <= 0) this.refs.delete(f); else this.refs.set(f, n);
        return n <= 0;
      });
      if (removed.length && this.status === 'connected') this.client?.unsubscribe(removed);
    };
  }
}

/** The app-wide connection (one per browser tab). */
export const liveConnection = new LiveMqttConnection();

// ---------------------------------------------------------------------------
// Settings: URL and username per browser, the password is never stored.
// ---------------------------------------------------------------------------
const URL_KEY = 'connect-forge.live-mqtt-url';
const USER_KEY = 'connect-forge.live-mqtt-user';
/** Mosquitto wss listener of the runtime stack (deploy/docker-compose.yml). */
export const DEFAULT_LIVE_URL = 'wss://localhost:8884';
export const DEFAULT_LIVE_USER = 'uns-viewer';

const read = (key: string, fallback: string) => {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
};
const write = (key: string, value: string) => {
  try { localStorage.setItem(key, value.trim()); } catch { /* storage unavailable - not persisted */ }
};
export const loadLiveSettings = () => ({ url: read(URL_KEY, DEFAULT_LIVE_URL), username: read(USER_KEY, DEFAULT_LIVE_USER) });
export const saveLiveSettings = ({ url, username }: { url: string; username: string }) => { write(URL_KEY, url); write(USER_KEY, username); };

/** Only secure WebSockets: an HTTPS page may not open ws:// and credentials must not travel in clear text. */
export const validateLiveUrl = (url: string): string | null => {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== 'wss:') return 'Use a secure WebSocket URL (wss://…)';
    return null;
  } catch {
    return 'Not a valid URL';
  }
};
