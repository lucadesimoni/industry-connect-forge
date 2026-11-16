DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tracked_assets') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.tracked_assets;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'asset_events') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.asset_events;
    END IF;
  END IF;
END $$;