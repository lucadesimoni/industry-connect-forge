import { useEffect, useState } from 'react';
import { Activity, Pause, Play, PlugZap, Power, Radio, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UNSNode } from '@/types/industrial';
import { liveConnection, loadLiveSettings, saveLiveSettings, validateLiveUrl } from '@/lib/liveMqttClient';
import { useLiveStatus, useLiveUns } from '@/hooks/useLiveUns';
import type { LiveDevice } from '@/lib/liveUns';
import { PublicMqttSample } from './PublicMqttSample';

const MAX_METRICS = 25;
const MAX_TOPICS = 15;

const age = (at: number, now: number) => {
  const s = Math.max(0, Math.round((now - at) / 1000));
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)}m` : `${Math.round(s / 3600)}h`;
};
const show = (v: unknown) => (v === null ? 'null' : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/\.?0+$/, '')) : String(v));

/** Connect form, shown until the shared live connection is up. */
const ConnectForm = ({ error }: { error?: string }) => {
  const [{ url, username }, setSettings] = useState(loadLiveSettings);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const urlError = validateLiveUrl(url);
  const connect = async () => {
    setBusy(true);
    saveLiveSettings({ url, username });
    await liveConnection.connect({ url: url.trim(), username: username.trim(), password });
    setBusy(false);
  };
  return (
    <form className="space-y-2" onSubmit={e => { e.preventDefault(); void connect(); }}>
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-1">
          <Label htmlFor="live-url" className="text-xs">Broker (secure WebSocket)</Label>
          <Input id="live-url" value={url} onChange={e => setSettings(s => ({ ...s, url: e.target.value }))} placeholder="wss://localhost:8884" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="live-user" className="text-xs">Username</Label>
          <Input id="live-user" value={username} onChange={e => setSettings(s => ({ ...s, username: e.target.value }))} autoComplete="username" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="live-password" className="text-xs">Password</Label>
          <Input id="live-password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={busy || !!urlError || !username.trim()}>
          <PlugZap className="h-4 w-4 mr-2" />{busy ? 'Connecting…' : 'Connect'}
        </Button>
        <p className="text-xs text-muted-foreground">Read-only. The password stays in this tab only. The browser must trust the broker's certificate.</p>
      </div>
      {(urlError && url.trim()) || error ? <p role="alert" className="text-xs text-destructive">{urlError ?? error}</p> : null}
    </form>
  );
};

const DeviceCard = ({ device, now }: { device: LiveDevice; now: number }) => {
  const [all, setAll] = useState(false);
  const metrics = all ? device.metrics : device.metrics.slice(0, MAX_METRICS);
  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-xs">
        <Server className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 break-all font-mono sm:truncate sm:break-normal" title={device.key}>{device.deviceId ?? device.edgeNodeId}</span>
        {device.online !== undefined && (
          <Badge variant={device.online ? 'secondary' : 'destructive'} className="text-[10px]">{device.online ? 'online' : 'offline'}</Badge>
        )}
        <span className="w-full text-muted-foreground sm:w-auto">{device.lastType} · {age(device.at, now)} ago{device.seq !== undefined ? ` · seq ${device.seq}` : ''}</span>
      </div>
      {metrics.length > 0 ? (
        <ul className="divide-y text-xs">
          {metrics.map(m => (
            <li key={m.name} className="flex items-baseline gap-2 px-3 py-1.5">
              <span className={cn('min-w-0 flex-1 truncate', m.unresolved && 'text-muted-foreground italic')} title={m.unresolved ? 'Alias without a birth message seen by this viewer; the name appears with the next BIRTH' : m.name}>{m.name}</span>
              <span className={cn('font-mono tabular-nums', m.isNull && 'text-muted-foreground')}>{show(m.value)}{m.unit ? ` ${m.unit}` : ''}</span>
              <span className="w-8 shrink-0 text-right text-muted-foreground">{age(m.at, now)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="px-3 py-2 text-xs text-muted-foreground">No metrics yet.</p>}
      {device.metrics.some(m => m.unresolved) && (
        <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
          Names come from the edge node's birth message, which arrived before you connected. They appear with its next birth (e.g. reconnect), or right away on a Sparkplug-aware broker.
        </p>
      )}
      {device.metrics.length > MAX_METRICS && (
        <button type="button" className="w-full border-t px-3 py-1.5 text-xs text-primary" onClick={() => setAll(a => !a)}>
          {all ? 'Show fewer' : `Show all ${device.metrics.length} metrics`}
        </button>
      )}
    </div>
  );
};

/**
 * Live MQTT data of a UNS node (and everything below it): Sparkplug B devices
 * with decoded metrics, plain UNS messages and movable-asset messages. Only
 * subscribes; see lib/liveMqttClient.ts and docs/MQTT_BROKER_CONFIGURATION.md.
 */
export const LiveDataPanel = ({ node, allNodes }: { node: UNSNode; allNodes: UNSNode[] }) => {
  const { status, error } = useLiveStatus();
  const [paused, setPaused] = useState(false);
  const { scope, snapshot } = useLiveUns(node, allNodes, paused);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const connected = status === 'connected' || status === 'reconnecting';

  return (
    <section aria-label="Live data" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4" />Live data</h3>
        <Badge variant={status === 'connected' ? 'secondary' : status === 'error' ? 'destructive' : 'outline'} className="gap-1 text-[10px]">
          <span className={cn('h-1.5 w-1.5 rounded-full', status === 'connected' ? 'bg-green-500' : status === 'reconnecting' || status === 'connecting' ? 'bg-yellow-500' : 'bg-muted-foreground')} />
          {status}
        </Badge>
        {connected && (
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-1 text-xs text-muted-foreground tabular-nums">{snapshot.messages} msg</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPaused(p => !p)} aria-label={paused ? 'Resume' : 'Pause'} title={paused ? 'Resume' : 'Pause'}>
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => void liveConnection.disconnect()} aria-label="Disconnect" title="Disconnect">
              <Power className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {!connected ? <ConnectForm error={error} /> : (
        <>
          {snapshot.devices.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Sparkplug B</p>
              {snapshot.devices.map(d => <DeviceCard key={d.key} device={d} now={now} />)}
            </div>
          )}
          {snapshot.topics.some(t => t.kind !== 'sparkplug') && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">UNS and movable-asset messages</p>
              <ul className="divide-y rounded-md border text-xs">
                {snapshot.topics.filter(t => t.kind !== 'sparkplug').slice(0, MAX_TOPICS).map(t => (
                  <li key={t.topic} className="space-y-0.5 px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      {t.topic.startsWith('enterprise/') && <Radio className="h-3 w-3 shrink-0 text-muted-foreground" />}
                      <span className="min-w-0 flex-1 truncate font-mono" title={t.topic}>{t.topic}</span>
                      {t.retained && <Badge variant="outline" className="text-[10px]">retained</Badge>}
                      <span className="shrink-0 text-muted-foreground">{age(t.at, now)}</span>
                    </div>
                    <p className={cn('break-all font-mono', t.kind === 'undecodable' ? 'text-destructive' : 'text-muted-foreground')}>{t.preview}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {snapshot.messages === 0 && (
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              <p className="mb-1">Waiting for messages on:</p>
              {scope.subscriptions.map(f => <code key={f} className="block break-all">{f}</code>)}
              {scope.sparkplug.edgePrefix && <p className="mt-1">Sparkplug edge nodes starting with <code>{scope.sparkplug.edgePrefix}</code></p>}
            </div>
          )}
          {paused && <p className="text-xs text-muted-foreground">Paused – messages are still collected.</p>}
        </>
      )}
      <PublicMqttSample />
    </section>
  );
};
