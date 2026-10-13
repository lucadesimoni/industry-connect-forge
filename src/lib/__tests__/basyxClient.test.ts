import { describe, expect, it } from 'vitest';
import { checkBaSyxConnection, encodeAasId, normalizeBaseUrl, pushEnvironment, FetchLike } from '../basyxClient';

describe('AAS API identifier encoding (IDTA-01002 base64url)', () => {
  it('matches the test vector of Eclipse BaSyx (MqttAasRepositoryTopicFactoryTest)', () => {
    expect(encodeAasId('https://example.org/submodels/ä?x=1')).toBe('aHR0cHM6Ly9leGFtcGxlLm9yZy9zdWJtb2RlbHMvw6Q_eD0x');
  });

  it('never contains /, + or padding', () => {
    for (const id of ['urn:a:b:c', 'https://x.y/z?q=1&r=2', 'äöü€', 'a', 'ab', 'abc']) {
      expect(encodeAasId(id)).not.toMatch(/[/+=]/);
    }
  });
});

type Call = { method: string; url: string };
const fakeServer = (existing: Set<string>, failOn?: string) => {
  const calls: Call[] = [];
  const impl: FetchLike = async (url, init) => {
    const method = init?.method ?? 'GET';
    calls.push({ method, url });
    if (failOn && url.includes(failOn)) return new Response('boom', { status: 400 });
    if (method === 'POST') {
      const id = JSON.parse(String(init!.body)).id;
      if (existing.has(id)) return new Response('conflict', { status: 409 });
      existing.add(id);
      return new Response('{}', { status: 201 });
    }
    if (method === 'PUT') return new Response(null, { status: 204 });
    return new Response('[]', { status: 200 });
  };
  return { impl, calls };
};

const env = {
  assetAdministrationShells: [{ modelType: 'AssetAdministrationShell', id: 'urn:x/aas' }],
  submodels: [{ modelType: 'Submodel', id: 'urn:x/submodel/A' }, { modelType: 'Submodel', id: 'urn:x/submodel/B' }],
  conceptDescriptions: [{ modelType: 'ConceptDescription', id: '0173-1#02-AAO677#002' }],
};

describe('pushEnvironment', () => {
  it('creates submodels and concept descriptions before the shells that reference them', async () => {
    const { impl, calls } = fakeServer(new Set());
    const r = await pushEnvironment('http://basyx:8081/', env, impl);
    expect(r).toMatchObject({ created: 4, updated: 0, failed: 0 });
    expect(calls.map(c => c.url)).toEqual([
      'http://basyx:8081/submodels', 'http://basyx:8081/submodels',
      'http://basyx:8081/concept-descriptions', 'http://basyx:8081/shells',
    ]);
  });

  it('replaces existing elements with PUT on their encoded id (idempotent)', async () => {
    const { impl, calls } = fakeServer(new Set(['urn:x/aas', 'urn:x/submodel/A']));
    const r = await pushEnvironment('http://basyx:8081', env, impl);
    expect(r).toMatchObject({ created: 2, updated: 2, failed: 0 });
    expect(calls).toContainEqual({ method: 'PUT', url: `http://basyx:8081/shells/${encodeAasId('urn:x/aas')}` });
  });

  it('reports server errors and network/CORS failures per element without aborting', async () => {
    const { impl } = fakeServer(new Set(), '/concept-descriptions');
    const r = await pushEnvironment('http://basyx:8081', env, impl);
    expect(r.failed).toBe(1);
    expect(r.items.find(i => i.kind === 'ConceptDescription')).toMatchObject({ outcome: 'failed', status: 400, message: 'boom' });

    const offline: FetchLike = async () => { throw new TypeError('Failed to fetch'); };
    const r2 = await pushEnvironment('http://basyx:8081', env, offline);
    expect(r2.failed).toBe(4);
    expect(await checkBaSyxConnection('http://basyx:8081', offline)).toMatch(/CORS/);
  });

  it('normalizes the base URL', () => {
    expect(normalizeBaseUrl(' http://h:8081/// ')).toBe('http://h:8081');
  });
});
