import { useEffect, useMemo, useRef, useState } from 'react';
import { UNSNode } from '@/types/industrial';
import { liveConnection, LiveStatus } from '@/lib/liveMqttClient';
import { liveScopeForNode, LiveSnapshot, LiveStore } from '@/lib/liveUns';

/** Status of the app-wide live MQTT connection. */
export const useLiveStatus = () => {
  const [state, setState] = useState<{ status: LiveStatus; error?: string }>({ status: liveConnection.status, error: liveConnection.lastError });
  useEffect(() => liveConnection.onStatus((status, error) => setState({ status, error })), []);
  return state;
};

const EMPTY: LiveSnapshot = { devices: [], topics: [], messages: 0 };
/** Re-render at most this often, however busy the broker is. */
const REFRESH_MS = 500;

/**
 * Live state of one UNS node: subscribes to the node's scope on the shared
 * connection and keeps the latest values. `paused` freezes the view (messages
 * are still collected).
 */
export const useLiveUns = (node: UNSNode, nodes: UNSNode[], paused: boolean) => {
  const scope = useMemo(() => liveScopeForNode(node, nodes), [node, nodes]);
  const storeRef = useRef(new LiveStore());
  const [snapshot, setSnapshot] = useState<LiveSnapshot>(EMPTY);

  useEffect(() => {
    const store = new LiveStore();
    storeRef.current = store;
    setSnapshot(EMPTY);
    const offMessage = liveConnection.onMessage((topic, payload, retained) => {
      if (scope.accepts(topic)) store.handle(topic, payload, Date.now(), retained);
    });
    const unsubscribe = liveConnection.subscribe(scope.subscriptions);
    return () => { offMessage(); unsubscribe(); };
  }, [scope]);

  useEffect(() => {
    if (paused) return;
    let seen = -1;
    const timer = setInterval(() => {
      const store = storeRef.current;
      if (store.version !== seen) { seen = store.version; setSnapshot(store.snapshot()); }
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [paused, scope]);

  return { scope, snapshot };
};
