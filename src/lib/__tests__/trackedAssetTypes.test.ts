/**
 * Runs the original tracked-asset trigger and the new asset-type migration on
 * an in-process PostgreSQL (PGlite) and checks that every asset type offered
 * in the UI is accepted, and that the other checks still hold.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const dir = resolve(__dirname, '../../../supabase/migrations');
const ORIGINAL = readFileSync(resolve(dir, '20260308172233_72b2058a-a6c4-4575-8c82-74f2f7298254.sql'), 'utf8');
const MIGRATION = readFileSync(resolve(dir, '20261116000000_tracked_asset_types_sensor_tool.sql'), 'utf8');
const DIALOG = readFileSync(resolve(__dirname, '../../components/tracking/CreateTrackedAssetDialog.tsx'), 'utf8');
const uiTypes = [...DIALOG.matchAll(/<SelectItem value="([a-z_]+)"/g)].map(m => m[1]);

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    DO $$ BEGIN CREATE ROLE anon; CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE TABLE public.tracked_assets (
      id serial primary key, asset_id text not null, asset_type text not null, description text not null default '',
      current_location_path text, current_state text not null default 'at_rest', current_quality_state text not null default 'ok');
    CREATE TABLE public.asset_events (id serial primary key, event_type text, from_location text, to_location text, reason text);
    CREATE TABLE public.asset_context_bindings (id serial primary key, context_type text, context_id text);
  `);
  // only the tracked-asset part of the original migration (it also defines other triggers)
  await db.exec(ORIGINAL.split('-- Validation trigger for asset_events')[0]);
  await db.exec(`INSERT INTO public.tracked_assets (asset_id, asset_type) VALUES ('urn:x:old', 'container')`);
  await db.exec(MIGRATION);
}, 60_000);

const insert = async (assetType: string, extra = '') => {
  try {
    await db.query(`INSERT INTO public.tracked_assets (asset_id, asset_type${extra ? ', current_state' : ''}) VALUES ($1, $2${extra ? ', $3' : ''})`,
      extra ? ['urn:x:a', assetType, extra] : ['urn:x:a', assetType]);
    return true;
  } catch {
    return false;
  }
};

describe('tracked asset types', () => {
  it('the UI offers types', () => {
    expect(uiTypes).toEqual(['container', 'pallet', 'carrier', 'sensor', 'tool']);
  });

  it('accepts every type the create dialog offers', async () => {
    for (const t of uiTypes) expect(await insert(t), t).toBe(true);
  });

  it('still rejects unknown types and states', async () => {
    expect(await insert('drone')).toBe(false);
    expect(await insert('sensor', 'flying')).toBe(false);
  });

  it('keeps existing rows', async () => {
    const r = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM public.tracked_assets WHERE asset_id = 'urn:x:old'`);
    expect(r.rows[0].n).toBe(1);
  });
});
