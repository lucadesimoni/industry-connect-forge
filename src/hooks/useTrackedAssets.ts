import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrackedAsset, AssetEvent, AssetContextBinding } from '@/types/industrial';
import { toast } from '@/hooks/use-toast';
import { mapErrorToUserMessage } from '@/lib/errorHandler';

// ── Mappers ──
const mapAsset = (row: any): TrackedAsset => ({
  id: row.id,
  assetId: row.asset_id,
  assetType: row.asset_type,
  description: row.description,
  currentLocationPath: row.current_location_path,
  currentState: row.current_state,
  currentQualityState: row.current_quality_state,
  metadata: row.metadata as Record<string, any>,
  siteId: row.site_id ?? undefined,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

const mapEvent = (row: any): AssetEvent => ({
  id: row.id,
  assetId: row.asset_id,
  eventType: row.event_type,
  fromLocation: row.from_location,
  toLocation: row.to_location,
  reason: row.reason,
  payload: row.payload as Record<string, any>,
  createdBy: row.created_by,
  siteId: row.site_id ?? undefined,
  createdAt: new Date(row.created_at),
});

const mapBinding = (row: any): AssetContextBinding => ({
  id: row.id,
  assetId: row.asset_id,
  contextType: row.context_type,
  contextId: row.context_id,
  isActive: row.is_active,
  boundAt: new Date(row.bound_at),
  unboundAt: row.unbound_at ? new Date(row.unbound_at) : null,
  siteId: row.site_id ?? undefined,
});

// ── Auth helper ──
const requireAuth = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Authentication required.');
  return user;
};

export const useTrackedAssets = () => {
  const qc = useQueryClient();

  // ── Tracked Assets ──
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['tracked-assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracked_assets')
        .select('*')
        .order('asset_id');
      if (error) throw error;
      return data.map(mapAsset);
    },
  });

  const createAsset = useMutation({
    mutationFn: async (input: { asset_id: string; asset_type: string; description: string; current_location_path?: string; site_id?: string }) => {
      await requireAuth();
      const { data, error } = await supabase
        .from('tracked_assets')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracked-assets'] });
      toast({ title: 'Tracked asset created' });
    },
    onError: (e: unknown) => toast({ title: 'Failed to create asset', description: mapErrorToUserMessage(e), variant: 'destructive' }),
  });

  // ── Move Asset ──
  const moveAsset = useMutation({
    mutationFn: async ({ assetDbId, toLocation, reason }: { assetDbId: string; toLocation: string; reason: string }) => {
      await requireAuth();
      const asset = assets.find(a => a.id === assetDbId);
      if (!asset) throw new Error('Asset not found');

      // Insert event
      const { error: evErr } = await supabase.from('asset_events').insert({
        asset_id: assetDbId,
        event_type: 'locationChanged',
        from_location: asset.currentLocationPath,
        to_location: toLocation,
        reason,
        site_id: asset.siteId ?? null,
      });
      if (evErr) throw evErr;

      // Update current location
      const { error: upErr } = await supabase
        .from('tracked_assets')
        .update({ current_location_path: toLocation })
        .eq('id', assetDbId);
      if (upErr) throw upErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracked-assets'] });
      qc.invalidateQueries({ queryKey: ['asset-events'] });
      toast({ title: 'Asset moved successfully' });
    },
    onError: (e: unknown) => toast({ title: 'Failed to move asset', description: mapErrorToUserMessage(e), variant: 'destructive' }),
  });

  // ── Events ──
  const useAssetEvents = (assetDbId: string | null) =>
    useQuery({
      queryKey: ['asset-events', assetDbId],
      enabled: !!assetDbId,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('asset_events')
          .select('*')
          .eq('asset_id', assetDbId!)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data.map(mapEvent);
      },
    });

  const createEvent = useMutation({
    mutationFn: async (input: { asset_id: string; event_type: string; from_location?: string; to_location?: string; reason?: string; payload?: Record<string, any>; site_id?: string }) => {
      await requireAuth();
      const { data, error } = await supabase.from('asset_events').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-events'] });
      toast({ title: 'Event recorded' });
    },
    onError: (e: unknown) => toast({ title: 'Failed to record event', description: mapErrorToUserMessage(e), variant: 'destructive' }),
  });

  // ── Context Bindings ──
  const useContextBindings = (assetDbId: string | null) =>
    useQuery({
      queryKey: ['asset-bindings', assetDbId],
      enabled: !!assetDbId,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('asset_context_bindings')
          .select('*')
          .eq('asset_id', assetDbId!)
          .order('bound_at', { ascending: false });
        if (error) throw error;
        return data.map(mapBinding);
      },
    });

  const bindContext = useMutation({
    mutationFn: async (input: { asset_id: string; context_type: string; context_id: string; site_id?: string }) => {
      await requireAuth();
      const { data, error } = await supabase.from('asset_context_bindings').insert(input).select().single();
      if (error) throw error;
      // Also log event
      await supabase.from('asset_events').insert({
        asset_id: input.asset_id,
        event_type: 'contextBound',
        reason: `Bound to ${input.context_type}: ${input.context_id}`,
        site_id: input.site_id ?? null,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-bindings'] });
      qc.invalidateQueries({ queryKey: ['asset-events'] });
      toast({ title: 'Context bound' });
    },
    onError: (e: unknown) => toast({ title: 'Failed to bind context', description: mapErrorToUserMessage(e), variant: 'destructive' }),
  });

  const unbindContext = useMutation({
    mutationFn: async ({ bindingId, assetDbId }: { bindingId: string; assetDbId: string }) => {
      await requireAuth();
      const { error } = await supabase
        .from('asset_context_bindings')
        .update({ is_active: false, unbound_at: new Date().toISOString() })
        .eq('id', bindingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-bindings'] });
      qc.invalidateQueries({ queryKey: ['asset-events'] });
      toast({ title: 'Context unbound' });
    },
    onError: (e: unknown) => toast({ title: 'Failed to unbind context', description: mapErrorToUserMessage(e), variant: 'destructive' }),
  });

  return {
    assets,
    assetsLoading,
    createAsset,
    moveAsset,
    createEvent,
    useAssetEvents,
    useContextBindings,
    bindContext,
    unbindContext,
  };
};
