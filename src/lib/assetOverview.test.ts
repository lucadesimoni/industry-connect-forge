import { describe, expect, it } from 'vitest';
import { getAssetOverview } from './assetOverview';
import type { AAS } from '@/types/industrial';

const asset: AAS = { id: 'asset', assetId: 'urn:test:asset:1', idShort: 'Asset01', description: '', isType: false,
  submodels: [], createdAt: new Date(), updatedAt: new Date() };
describe('read-only asset overview', () => {
  it('reports unresolved UNS and RDS links without inventing records', () => {
    const result = getAssetOverview(asset, [], []);
    expect(result.node).toBeUndefined();
    expect(result.rds).toBeUndefined();
    expect(result.issues).toContain('UNS location is not linked or unavailable.');
    expect(result.issues).toContain('RDS designation is not linked or unavailable.');
  });
  it('keeps zero and false as recorded values, not missing data', () => {
    const withProperties = { ...asset, submodels: [{ id: 'sm', idShort: 'Data', semanticId: '', description: '', properties: [
      { id: 'p1', idShort: 'Count', valueType: 'xs:int' as const, value: 0 },
      { id: 'p2', idShort: 'Enabled', valueType: 'xs:boolean' as const, value: false },
      { id: 'p3', idShort: 'Unknown', valueType: 'xs:string' as const, value: null },
    ] }] };
    expect(getAssetOverview(withProperties, [], []).missingValues).toBe(1);
  });
  it('does not mutate asset data', () => {
    const original = structuredClone(asset);
    getAssetOverview(asset, [], []);
    expect(asset).toEqual(original);
  });
});