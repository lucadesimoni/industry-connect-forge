import { describe, expect, it } from 'vitest';
import { basicAuthHeader, checkBaSyxConnection, encodeAasId, normalizeBaseUrl, pushEnvironment, FetchLike } from '../basyxClient';

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
    const r = await pushEnvironment('http://basyx:8081/', env, { fetchImpl: impl });
    expect(r).toMatchObject({ created: 4, updated: 0, failed: 0 });
    expect(calls.map(c => c.url)).toEqual([
      'http://basyx:8081/submodels', 'http://basyx:8081/submodels',
      'http://basyx:8081/concept-descriptions', 'http://basyx:8081/shells',
    ]);
  });

  it('replaces existing elements with PUT on their encoded id (idempotent)', async () => {
    const { impl, calls } = fakeServer(new Set(['urn:x/aas', 'urn:x/submodel/A']));
    const r = await pushEnvironment('http://basyx:8081', env, { fetchImpl: impl });
    expect(r).toMatchObject({ created: 2, updated: 2, failed: 0 });
    expect(calls).toContainEqual({ method: 'PUT', url: `http://basyx:8081/shells/${encodeAasId('urn:x/aas')}` });
  });

  it('reports server errors and network/CORS failures per element without aborting', async () => {
    const { impl } = fakeServer(new Set(), '/concept-descriptions');
    const r = await pushEnvironment('http://basyx:8081', env, { fetchImpl: impl });
    expect(r.failed).toBe(1);
    expect(r.items.find(i => i.kind === 'ConceptDescription')).toMatchObject({ outcome: 'failed', status: 400, message: 'boom' });

    const offline: FetchLike = async () => { throw new TypeError('Failed to fetch'); };
    const r2 = await pushEnvironment('http://basyx:8081', env, { fetchImpl: offline });
    expect(r2.failed).toBe(4);
    expect(await checkBaSyxConnection('http://basyx:8081', { fetchImpl: offline })).toMatch(/CORS/);
  });

  it('normalizes the base URL', () => {
    expect(normalizeBaseUrl(' http://h:8081/// ')).toBe('http://h:8081');
  });
});

describe('login for the HTTPS proxy', () => {
  it('builds RFC 7617 Basic credentials (UTF-8)', () => {
    expect(basicAuthHeader({ username: 'Aladdin', password: 'open sesame' })).toBe('Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ=='); // RFC 7617 example
    expect(basicAuthHeader({ username: 'test', password: '123£' })).toBe('Basic dGVzdDoxMjPCow=='); // RFC 7617 §2.1 UTF-8 example
  });

  it('sends the Authorization header on every request when credentials are given', async () => {
    const seen: (string | undefined)[] = [];
    const impl: FetchLike = async (_url, init) => {
      seen.push((init?.headers as Record<string, string>)?.Authorization);
      return new Response('{}', { status: 201 });
    };
    await pushEnvironment('https://proxy:8443', env, { fetchImpl: impl, credentials: { username: 'forge', password: 'pw' } });
    expect(seen).toHaveLength(4);
    expect(new Set(seen)).toEqual(new Set([basicAuthHeader({ username: 'forge', password: 'pw' })]));
  });

  it('reports a 401 as a login problem', async () => {
    const unauthorized: FetchLike = async () => new Response('', { status: 401 });
    expect(await checkBaSyxConnection('https://proxy:8443', { fetchImpl: unauthorized })).toMatch(/login/);
  });
});
