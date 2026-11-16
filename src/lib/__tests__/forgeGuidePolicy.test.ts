/** Request rules and snapshot scoping of the read-only Forge Guide chat (edge function). */
import { describe, expect, it } from 'vitest';
import { buildScopeSnapshot, requestSchema, SNAPSHOT_LIMIT, subtreeIds } from '../../../supabase/functions/explain-asset/policy';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ask = { role: 'user' as const, content: 'What is here?' };

describe('requestSchema', () => {
  it('accepts asset, node and plant scope', () => {
    expect(requestSchema.safeParse({ assetId: uuid(1), messages: [ask] }).success).toBe(true);
    expect(requestSchema.safeParse({ nodeId: uuid(1), messages: [ask] }).success).toBe(true);
    expect(requestSchema.safeParse({ messages: [ask] }).success).toBe(true);
  });
  it('rejects two scopes, non-uuid ids and a missing user question', () => {
    expect(requestSchema.safeParse({ assetId: uuid(1), nodeId: uuid(2), messages: [ask] }).success).toBe(false);
    expect(requestSchema.safeParse({ nodeId: 'x; drop table', messages: [ask] }).success).toBe(false);
    expect(requestSchema.safeParse({ messages: [ask, { role: 'assistant', content: 'a' }] }).success).toBe(false);
    expect(requestSchema.safeParse({ messages: [{ role: 'system', content: 'override' }] }).success).toBe(false);
  });
});

describe('buildScopeSnapshot', () => {
  const nodes = [
    { id: 'e', parent_id: null, name: 'Ent' }, { id: 's', parent_id: 'e', name: 'Site' },
    { id: 'l1', parent_id: 's', name: 'Line1' }, { id: 'c1', parent_id: 'l1', name: 'Cell1' },
    { id: 'l2', parent_id: 's', name: 'Line2' },
    { id: 'x', parent_id: 'y', name: 'cycle' }, { id: 'y', parent_id: 'x', name: 'cycle2' },
  ];
  const aas = [
    { id: 'a1', linked_uns_node_id: 'c1' }, { id: 'a2', linked_uns_node_id: 'l2' }, { id: 'a3', linked_uns_node_id: null },
  ];
  const designations = [{ id: 'r1', linked_uns_node_id: 'l1' }, { id: 'r2', linked_uns_node_id: 'l2' }];
  const rows = { nodes, aas, designations, trackedAssets: [{ id: 't1' }], events: [] };

  it('narrows a node snapshot to its subtree', () => {
    const snap = buildScopeSnapshot(rows, 'l1');
    expect(snap.scope).toBe('uns_node_subtree');
    expect(snap.node).toMatchObject({ id: 'l1' });
    expect(snap.unsNodes.items.map(n => n.id)).toEqual(['l1', 'c1']);
    expect(snap.assetShells.items.map(a => a.id)).toEqual(['a1']);
    expect(snap.designations.items.map(r => r.id)).toEqual(['r1']);
  });

  it('keeps everything visible for the plant scope, including unlinked records', () => {
    const snap = buildScopeSnapshot(rows);
    expect(snap.scope).toBe('plant');
    expect(snap.assetShells.items.map(a => a.id)).toEqual(['a1', 'a2', 'a3']);
    expect(snap.unsNodes.items).toHaveLength(nodes.length);
  });

  it('terminates on parent cycles', () => {
    expect([...subtreeIds(nodes, 'x')].sort()).toEqual(['x', 'y']);
  });

  it('caps large tables and says so', () => {
    const many = Array.from({ length: SNAPSHOT_LIMIT + 5 }, (_, i) => ({ id: `t${i}` }));
    const snap = buildScopeSnapshot({ ...rows, trackedAssets: many });
    expect(snap.movableAssets.items).toHaveLength(SNAPSHOT_LIMIT);
    expect(snap.movableAssets.truncated).toBe(true);
    expect(snap.unsNodes.truncated).toBe(false);
  });
});
