import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TrackedAsset } from '@/types/industrial';

/** How long a moved asset stays highlighted in the UNS tree. */
export const MOVE_HIGHLIGHT_MS = 8000;

interface TrackedAssetRow {
  id?: string;
  current_location_path?: string | null;
}

/**
 * Did this change move the asset? Compared with the cached list, because with
 * RLS Supabase sends only the primary key of the old row.
 */
export const isMove = (eventType: string, row: TrackedAssetRow | null, cached: TrackedAsset[] | undefined): boolean => {
  if (!row?.id) return false;
  if (eventType === 'INSERT') return true;
  if (eventType !== 'UPDATE') return false;
  const before = cached?.find(a => a.id === row.id);
  return !before || (before.currentLocationPath ?? null) !== (row.current_location_path ?? null);
};

/**
 * Keeps movable assets live: subscribes to Supabase Realtime changes of
 * `tracked_assets` and `asset_events` (published by migration
 * 20261116000100_realtime_tracked_assets) and refreshes the cached queries,
 * so the UNS tree and dashboards place an asset on its new node as soon as
 * it moves, whoever moved it. Returns the ids of assets whose location
 * changed in the last few seconds, for highlighting.
 */
export const useTrackedAssetsRealtime = (): Set<string> => {
  const qc = useQueryClient();
  const [recentlyMoved, setRecentlyMoved] = useState<Set<string>>(() => new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    const markMoved = (id: string) => {
      setRecentlyMoved(prev => new Set(prev).add(id));
      clearTimeout(pending.get(id));
      pending.set(id, setTimeout(() => {
        pending.delete(id);
        setRecentlyMoved(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, MOVE_HIGHLIGHT_MS));
    };

    const channel = supabase
      .channel('uns-movable-assets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracked_assets' }, payload => {
        const next = payload.new as TrackedAssetRow;
        if (isMove(payload.eventType, next, qc.getQueryData<TrackedAsset[]>(['tracked-assets']))) markMoved(next.id!);
        qc.invalidateQueries({ queryKey: ['tracked-assets'] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'asset_events' }, () => {
        qc.invalidateQueries({ queryKey: ['asset-events'] });
      })
      .subscribe();

    return () => {
      for (const t of pending.values()) clearTimeout(t);
      pending.clear();
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  return recentlyMoved;
};
