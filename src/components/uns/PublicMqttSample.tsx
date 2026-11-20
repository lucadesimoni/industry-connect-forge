import { useEffect, useRef, useState } from 'react';
import { ChevronDown, PlugZap, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LiveMqttConnection, type LiveStatus } from '@/lib/liveMqttClient';
import { LiveStore, type LiveSnapshot } from '@/lib/liveUns';
import { PUBLIC_SAMPLE_TOPIC, PUBLIC_SAMPLE_URL, validateSampleTopic } from '@/lib/publicMqttSample';

const empty: LiveSnapshot = { messages: 0, topics: [], devices: [] };

/** Separate read-only connection: public messages never enter the plant live store. */
export function PublicMqttSample() {
  const [open, setOpen] = useState(false);
  const [connection] = useState(() => new LiveMqttConnection());
  const [state, setState] = useState<{ status: LiveStatus; error?: string }>({ status: 'disconnected' });
  const [topic, setTopic] = useState(PUBLIC_SAMPLE_TOPIC);
  const [snapshot, setSnapshot] = useState(empty);
  const store = useRef(new LiveStore());
  const activeTopic = useRef('');
  const unsubscribe = useRef<(() => void) | undefined>();
  const topicError = validateSampleTopic(topic);
  const active = ['connected', 'connecting', 'reconnecting'].includes(state.status);

  useEffect(() => {
    const offStatus = connection.onStatus((status, error) => setState({ status, error }));
    const offMessage = connection.onMessage((receivedTopic, payload, retained) => {
      if (receivedTopic === activeTopic.current) store.current.handle(receivedTopic, payload, Date.now(), retained);
    });
    let version = -1;
    const timer = setInterval(() => {
      if (store.current.version !== version) {
        version = store.current.version;
        setSnapshot(store.current.snapshot());
      }
    }, 500);
    return () => {
      clearInterval(timer);
      offStatus();
      offMessage();
      unsubscribe.current?.();
      void connection.disconnect();
    };
  }, [connection]);

  const connect = async () => {
    if (topicError || active) return;
    unsubscribe.current?.();
    store.current = new LiveStore();
    setSnapshot(empty);
    activeTopic.current = topic;
    unsubscribe.current = connection.subscribe([topic]);
    try {
      await connection.connect({ url: PUBLIC_SAMPLE_URL, username: '', password: '' });
    } catch {
      setState({ status: 'error', error: 'Could not connect to the public test broker.' });
    }
  };

  return (
    <section aria-label="Public MQTT sample" className="border-t pt-3 space-y-3">
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(value => !value)} aria-expanded={open} className="gap-2">
        <PlugZap className="h-4 w-4" />Public MQTT sample<ChevronDown className="h-4 w-4" />
      </Button>
      {open && <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono break-all">{PUBLIC_SAMPLE_URL}</span>
          <Badge variant={state.status === 'error' ? 'destructive' : 'outline'}>{state.status}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">Public test data · No login · Not plant data</p>
        <form className="flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); void connect(); }}>
          <div className="min-w-0 flex-1 space-y-1">
            <Label htmlFor="sample-topic">Sample topic</Label>
            <Input id="sample-topic" value={topic} disabled={active} onChange={event => setTopic(event.target.value)} />
          </div>
          {active ? <Button key="disconnect" type="button" size="sm" variant="outline" onClick={event => { event.preventDefault(); void connection.disconnect(); }}>
            <Power className="h-4 w-4 mr-2" />Disconnect sample
          </Button> : <Button key="connect" type="submit" size="sm" disabled={!!topicError}>
            <PlugZap className="h-4 w-4 mr-2" />Connect sample
          </Button>}
        </form>
        {(topicError || state.error) && <p role="alert" className="text-xs text-destructive">{topicError || state.error}</p>}
        {snapshot.messages > 0 ? <div className="space-y-1 text-xs">
          <p className="text-muted-foreground tabular-nums">{snapshot.messages} sample messages received</p>
          {snapshot.topics.map(message => <div key={message.topic} className="border rounded-md p-3 space-y-1">
            <p className="font-mono break-all">{message.topic}</p>
            <p className="font-mono break-all">{message.preview}</p>
            <p className="text-muted-foreground">Last received {new Date(message.at).toLocaleTimeString()}</p>
          </div>)}
        </div> : state.status === 'connected' && <p className="text-xs text-muted-foreground">Waiting for a public message on {activeTopic.current}.</p>}
      </div>}
    </section>
  );
}