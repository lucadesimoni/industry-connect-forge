/**
 * Live movable assets: the realtime migration publishes the tracking tables,
 * a location change is recognised as a move, and the moved asset lands on
 * its new UNS node.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it, vi } from 'vitest';
import { ISA95Level, TrackedAsset, UNSNode } from '@/types/industrial';
import { buildUNSMetadata } from '../hierarchyUtils';
import { placeTrackedAssets } from '../unsContext';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
const { isMove } = await import('@/hooks/useTrackedAssetsRealtime');

const MIGRATION = readFileSync(
  resolve(__dirname, '../../../supabase/migrations/20261116000100_realtime_tracked_assets.sql'), 'utf8');
const now = new Date('2026-11-16T00:00:00Z');

describe('realtime migration', () => {
  it('publishes tracked_assets and asset_events, idempotently', async () => {
    const db = new PGlite();
    await db.exec(`
      CREATE TABLE public.tracked_assets (id serial primary key);
      CREATE TABLE public.asset_events (id serial primary key);
      CREATE TABLE public.aas (id serial primary key);
      CREATE PUBLICATION supabase_realtime;
    `);
    await db.exec(MIGRATION);
    await db.exec(MIGRATION); // running it again must not fail
    const r = await db.query<{ tablename: string }>(
      `SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY 1`);
    expect(r.rows.map(x => x.tablename)).toEqual(['asset_events', 'tracked_assets']);
  }, 60_000);

  it('does nothing where Realtime is not installed', async () => {
    const db = new PGlite();
    await db.exec(`CREATE TABLE public.tracked_assets (id serial primary key); CREATE TABLE public.asset_events (id serial primary key);`);
    await expect(db.exec(MIGRATION)).resolves.toBeDefined();
  }, 60_000);
});

const tracked = (id: string, location: string | null): TrackedAsset => ({
  id, assetId: `urn:x:${id}`, assetType: 'sensor', description: '', currentLocationPath: location,
  currentState: 'in_use', currentQualityState: 'ok', createdAt: now, updatedAt: now,
});

describe('isMove', () => {
  const cache = [tracked('a', 'Site/Hall/Line1')];
  it('recognises a location change, but not other updates', () => {
    expect(isMove('UPDATE', { id: 'a', current_location_path: 'Site/Hall/Line2' }, cache)).toBe(true);
    expect(isMove('UPDATE', { id: 'a', current_location_path: 'Site/Hall/Line1' }, cache)).toBe(false);
    expect(isMove('UPDATE', { id: 'a', current_location_path: null }, cache)).toBe(true);
  });
  it('treats new and unknown assets as arrivals, deletes as no move', () => {
    expect(isMove('INSERT', { id: 'b', current_location_path: 'Site' }, cache)).toBe(true);
    expect(isMove('UPDATE', { id: 'zz', current_location_path: 'Site' }, cache)).toBe(true);
    expect(isMove('DELETE', { id: 'a' }, cache)).toBe(false);
    expect(isMove('UPDATE', null, cache)).toBe(false);
  });
});

describe('a moved asset changes its UNS node', () => {
  const nodes: UNSNode[] = [];
  const add = (id: string, name: string, level: ISA95Level, parentId: string | null) => {
    const parent = parentId ? nodes.find(n => n.id === parentId)! : null;
    nodes.push({ id, name, level, parentId, metadata: buildUNSMetadata(level, name, parent, nodes), createdAt: now, updatedAt: now });
  };
  add('e', 'Ent', 'Enterprise', null);
  add('s', 'Site', 'Site', 'e');
  add('h', 'Hall', 'Area', 's');
  add('l1', 'Line1', 'Line', 'h');
  add('l2', 'Line2', 'Line', 'h');

  it('leaves the old node and appears on the new one', () => {
    const before = placeTrackedAssets(nodes, [tracked('a', 'Site/Hall/Line1')]);
    const after = placeTrackedAssets(nodes, [tracked('a', 'Site/Hall/Line2')]);
    expect(before.byNode.get('l1')?.map(p => p.asset.id)).toEqual(['a']);
    expect(after.byNode.get('l1')).toBeUndefined();
    expect(after.byNode.get('l2')?.map(p => p.asset.id)).toEqual(['a']);
  });
});
