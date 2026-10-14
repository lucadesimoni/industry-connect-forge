/**
 * Minimal client for the AAS HTTP API (IDTA-01002 "Part 2", AAS Repository /
 * Submodel Repository / ConceptDescription Repository), as served by the
 * Eclipse BaSyx AAS Environment (deploy/docker-compose.yml).
 *
 * Push semantics (idempotent): POST the element; if it already exists (409)
 * replace it with PUT /{collection}/{base64url(id)}. Submodels and concept
 * descriptions are pushed before the shells that reference them.
 */
import { AAS } from '@/types/industrial';
import { AasJson } from './aasElements';
import { buildBaSyxEnvironment } from './basyxEnvironment';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Login for the HTTPS proxy in front of BaSyx (deploy/proxy, HTTP Basic). */
export interface BaSyxCredentials {
  username: string;
  password: string;
}

export interface BaSyxRequestOptions {
  fetchImpl?: FetchLike;
  credentials?: BaSyxCredentials;
}

const defaultFetch: FetchLike = (input, init) => fetch(input, init);

/** RFC 7617 Basic credentials, UTF-8 encoded. */
export const basicAuthHeader = ({ username, password }: BaSyxCredentials): string => {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return `Basic ${btoa(binary)}`;
};

const requestHeaders = (credentials?: BaSyxCredentials, json = false): Record<string, string> => ({
  Accept: 'application/json',
  ...(json ? { 'Content-Type': 'application/json' } : {}),
  ...(credentials?.username ? { Authorization: basicAuthHeader(credentials) } : {}),
});

/** base64url without padding over UTF-8 (IDTA-01002 identifier encoding). */
export const encodeAasId = (id: string): string => {
  const bytes = new TextEncoder().encode(id);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const normalizeBaseUrl = (url: string): string => url.trim().replace(/\/+$/, '');

export type PushOutcome = 'created' | 'updated' | 'failed';

export interface PushItemResult {
  kind: 'Submodel' | 'ConceptDescription' | 'AssetAdministrationShell';
  id: string;
  outcome: PushOutcome;
  status?: number;
  message?: string;
}

export interface PushResult {
  items: PushItemResult[];
  created: number;
  updated: number;
  failed: number;
}

const COLLECTIONS = {
  Submodel: 'submodels',
  ConceptDescription: 'concept-descriptions',
  AssetAdministrationShell: 'shells',
} as const;

const errorText = async (res: Response): Promise<string> => {
  try {
    const body = await res.text();
    return body.slice(0, 300) || res.statusText;
  } catch {
    return res.statusText;
  }
};

async function upsert(
  baseUrl: string,
  kind: PushItemResult['kind'],
  element: AasJson,
  fetchImpl: FetchLike,
  credentials?: BaSyxCredentials
): Promise<PushItemResult> {
  const collection = COLLECTIONS[kind];
  const id: string = element.id;
  const headers = requestHeaders(credentials, true);
  const body = JSON.stringify(element);
  try {
    const created = await fetchImpl(`${baseUrl}/${collection}`, { method: 'POST', headers, body });
    if (created.ok) return { kind, id, outcome: 'created', status: created.status };
    if (created.status !== 409) {
      return { kind, id, outcome: 'failed', status: created.status, message: await errorText(created) };
    }
    const updated = await fetchImpl(`${baseUrl}/${collection}/${encodeAasId(id)}`, { method: 'PUT', headers, body });
    if (updated.ok) return { kind, id, outcome: 'updated', status: updated.status };
    return { kind, id, outcome: 'failed', status: updated.status, message: await errorText(updated) };
  } catch (err) {
    // network error / CORS rejection: fetch throws without a response
    return { kind, id, outcome: 'failed', message: err instanceof Error ? err.message : String(err) };
  }
}

/** Push an AAS v3 Environment to a BaSyx AAS Environment (or any IDTA-01002 server). */
export async function pushEnvironment(
  baseUrl: string,
  environment: AasJson,
  { fetchImpl = defaultFetch, credentials }: BaSyxRequestOptions = {}
): Promise<PushResult> {
  const base = normalizeBaseUrl(baseUrl);
  const items: PushItemResult[] = [];
  for (const sm of environment.submodels ?? []) items.push(await upsert(base, 'Submodel', sm, fetchImpl, credentials));
  for (const cd of environment.conceptDescriptions ?? []) {
    items.push(await upsert(base, 'ConceptDescription', cd, fetchImpl, credentials));
  }
  for (const shell of environment.assetAdministrationShells ?? []) {
    items.push(await upsert(base, 'AssetAdministrationShell', shell, fetchImpl, credentials));
  }
  return {
    items,
    created: items.filter(i => i.outcome === 'created').length,
    updated: items.filter(i => i.outcome === 'updated').length,
    failed: items.filter(i => i.outcome === 'failed').length,
  };
}

/** Convenience: serialize app AAS records and push them. */
export const pushAASToBaSyx = (baseUrl: string, aasList: AAS[], options: BaSyxRequestOptions = {}) =>
  pushEnvironment(baseUrl, buildBaSyxEnvironment(aasList), options);

/** Reachability check (GET /shells?limit=1). Returns an error message or null. */
export async function checkBaSyxConnection(
  baseUrl: string,
  { fetchImpl = defaultFetch, credentials }: BaSyxRequestOptions = {}
): Promise<string | null> {
  try {
    const res = await fetchImpl(`${normalizeBaseUrl(baseUrl)}/shells?limit=1`, { headers: requestHeaders(credentials) });
    if (res.status === 401) return 'HTTP 401: login required or wrong username/password';
    return res.ok ? null : `HTTP ${res.status}: ${await errorText(res)}`;
  } catch (err) {
    // browsers hide the reason: unreachable, untrusted certificate, CORS origin, or a 401 without CORS headers
    return `${err instanceof Error ? err.message : String(err)} (server unreachable, certificate not trusted, CORS origin not allowed, or wrong login)`;
  }
}

// ---------------------------------------------------------------------------
// Endpoint setting: per browser, because the BaSyx server is usually only
// reachable inside the plant network the browser is in.
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'connect-forge.basyx-url';
const USER_STORAGE_KEY = 'connect-forge.basyx-user';
/** HTTPS proxy of the runtime stack (deploy/proxy). The password is never stored. */
export const DEFAULT_BASYX_URL = 'https://localhost:8443';

export const loadBaSyxUrl = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_BASYX_URL;
  } catch {
    return DEFAULT_BASYX_URL;
  }
};

export const saveBaSyxUrl = (url: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, normalizeBaseUrl(url));
  } catch {
    /* storage unavailable (private mode) - setting is not persisted */
  }
};

export const loadBaSyxUser = (): string => {
  try {
    return localStorage.getItem(USER_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
};

export const saveBaSyxUser = (username: string): void => {
  try {
    localStorage.setItem(USER_STORAGE_KEY, username.trim());
  } catch {
    /* storage unavailable - not persisted */
  }
};
