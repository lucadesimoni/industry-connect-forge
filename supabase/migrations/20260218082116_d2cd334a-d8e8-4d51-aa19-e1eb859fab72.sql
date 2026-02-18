
-- =============================================
-- Track & Trace: tracked_assets
-- =============================================
CREATE TABLE public.tracked_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id TEXT NOT NULL UNIQUE,
  asset_type TEXT NOT NULL DEFAULT 'container',
  description TEXT NOT NULL DEFAULT '',
  current_location_path TEXT,
  current_state TEXT NOT NULL DEFAULT 'at_rest',
  current_quality_state TEXT NOT NULL DEFAULT 'ok',
  metadata JSONB DEFAULT '{}'::jsonb,
  site_id UUID REFERENCES public.sites(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tracked_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tracked_assets in their sites" ON public.tracked_assets
  FOR SELECT USING ((site_id IS NULL) OR (site_id IN (SELECT get_user_site_ids(auth.uid()))));
CREATE POLICY "Users can insert tracked_assets in their sites" ON public.tracked_assets
  FOR INSERT WITH CHECK ((site_id IS NULL) OR (site_id IN (SELECT get_user_site_ids(auth.uid()))));
CREATE POLICY "Users can update tracked_assets in their sites" ON public.tracked_assets
  FOR UPDATE USING ((site_id IS NULL) OR (site_id IN (SELECT get_user_site_ids(auth.uid()))))
  WITH CHECK ((site_id IS NULL) OR (site_id IN (SELECT get_user_site_ids(auth.uid()))));
CREATE POLICY "Users can delete tracked_assets in their sites" ON public.tracked_assets
  FOR DELETE USING ((site_id IS NULL) OR (site_id IN (SELECT get_user_site_ids(auth.uid()))));

CREATE TRIGGER update_tracked_assets_updated_at
  BEFORE UPDATE ON public.tracked_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Track & Trace: asset_events
-- =============================================
CREATE TABLE public.asset_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.tracked_assets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_location TEXT,
  to_location TEXT,
  reason TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_by TEXT,
  site_id UUID REFERENCES public.sites(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view asset_events in their sites" ON public.asset_events
  FOR SELECT USING ((site_id IS NULL) OR (site_id IN (SELECT get_user_site_ids(auth.uid()))));
CREATE POLICY "Users can insert asset_events in their sites" ON public.asset_events
  FOR INSERT WITH CHECK ((site_id IS NULL) OR (site_id IN (SELECT get_user_site_ids(auth.uid()))));
CREATE POLICY "Users can update asset_events in their sites" ON public.asset_events
  FOR UPDATE USING ((site_id IS NULL) OR (site_id IN (SELECT get_user_site_ids(auth.uid()))))
  WITH CHECK ((site_id IS NULL) OR (site_id IN (SELECT get_user_site_ids(auth.uid()))));
CREATE POLICY "Users can delete asset_events in their sites" ON public.asset_events
  FOR DELETE USING ((site_id IS NULL) OR (site_id IN (SELECT get_user_site_ids(auth.uid()))));

CREATE INDEX idx_asset_events_asset_id ON public.asset_events(asset_id);
CREATE INDEX idx_asset_events_event_type ON public.asset_events(event_type);
CREATE INDEX idx_asset_events_created_at ON public.asset_events(created_at DESC);

-- =============================================
-- Track & Trace: asset_context_bindings
-- =============================================
CREATE TABLE public.asset_context_bindings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.tracked_assets(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL,
  context_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  bound_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unbound_at TIMESTAMPTZ,
  site_id UUID REFERENCES public.sites(id)
);

ALTER TABLE public.asset_context_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view asset_context_bindings in their sites" ON public.asset_context_bindings
  FOR SELECT USING ((site_id IS NULL) OR (site_id IN (SELECT get_user_site_ids(auth.uid()))));
CREATE POLICY "Users can insert asset_context_bindings in their sites" ON public.asset_context_bindings
  FOR INSERT WITH CHECK ((site_id IS NULL) OR (site_id IN (SELECT get_user_site_ids(auth.uid()))));
CREATE POLICY "Users can update asset_context_bindings in their sites" ON public.asset_context_bindings
  FOR UPDATE USING ((site_id IS NULL) OR (site_id IN (SELECT get_user_site_ids(auth.uid()))))
  WITH CHECK ((site_id IS NULL) OR (site_id IN (SELECT get_user_site_ids(auth.uid()))));
CREATE POLICY "Users can delete asset_context_bindings in their sites" ON public.asset_context_bindings
  FOR DELETE USING ((site_id IS NULL) OR (site_id IN (SELECT get_user_site_ids(auth.uid()))));

CREATE INDEX idx_asset_context_bindings_asset_id ON public.asset_context_bindings(asset_id);
CREATE INDEX idx_asset_context_bindings_active ON public.asset_context_bindings(is_active) WHERE is_active = true;
