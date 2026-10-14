/**
 * Integration test against a REAL Eclipse BaSyx AAS Environment and broker
 * (deploy/docker-compose.yml). Runs only when BASYX_URL is set, i.e. in
 * scripts/test-stack.sh and the CI job "Runtime stack"; `npm test` skips it.
 *
 * Checks the full path the app uses: app records -> AAS v3 Environment ->
 * POST/PUT via the AAS API -> read back -> identical semantics; plus the MQTT
 * event BaSyx publishes into the broker (verified by test-stack.sh).
 */
import { describe, expect, it } from 'vitest';
import { AAS, AASSubmodel } from '@/types/industrial';
import { SUBMODEL_TEMPLATES } from '../aasTemplates';
import { buildBaSyxEnvironment, buildShellId, buildSubmodelId, parseBaSyxEnvironment } from '../basyxEnvironment';
import { basicAuthHeader, checkBaSyxConnection, encodeAasId, pushAASToBaSyx } from '../basyxClient';

const BASYX_URL = process.env.BASYX_URL;
// login for the HTTPS proxy (deploy/proxy); unset when testing BaSyx directly
const credentials = process.env.BASYX_USER
  ? { username: process.env.BASYX_USER, password: process.env.BASYX_PASSWORD ?? '' }
  : undefined;
const authHeaders: Record<string, string> = credentials ? { Authorization: basicAuthHeader(credentials) } : {};
const RUN_ID = process.env.TEST_RUN_ID ?? String(Date.now());
const now = new Date();

const templateSubmodel = (idShort: string): AASSubmodel => {
  const t = SUBMODEL_TEMPLATES.find(x => x.idShort === idShort)!;
  return {
    id: idShort, idShort: t.idShort, semanticId: t.semanticId, description: t.description,
    properties: t.properties.map((p, i) => ({ ...p, id: String(i), value: p.idShort === 'SerialNumber' ? 'SN-4711' : p.value })),
  };
};

const aas: AAS = {
  id: 'it', assetId: `urn:connect-forge:test:${RUN_ID}:cnc-01`, idShort: 'CNC_01', description: 'Integration test asset',
  manufacturer: 'Pilatus', serialNumber: 'SN-4711', isType: false, createdAt: now, updatedAt: now,
  submodels: [templateSubmodel('Nameplate'), templateSubmodel('HandoverDocumentation'), templateSubmodel('ContactInformations')],
};

describe.skipIf(!BASYX_URL)('BaSyx AAS Environment (live)', () => {
  it('is reachable', async () => {
    expect(await checkBaSyxConnection(BASYX_URL!, { credentials })).toBeNull();
  });

  it('accepts the exported environment (create) and is idempotent (update)', async () => {
    const first = await pushAASToBaSyx(BASYX_URL!, [aas], { credentials });
    expect(first.failed, JSON.stringify(first.items.filter(i => i.outcome === 'failed'))).toBe(0);
    expect(first.created).toBe(first.items.length);

    const second = await pushAASToBaSyx(BASYX_URL!, [aas], { credentials });
    expect(second.failed, JSON.stringify(second.items.filter(i => i.outcome === 'failed'))).toBe(0);
    expect(second.updated).toBe(second.items.length);
  });

  it('serves back the shell and submodels with ids, semanticIds and nested structure intact', async () => {
    const shell = await (await fetch(`${BASYX_URL}/shells/${encodeAasId(buildShellId(aas.assetId))}`, { headers: authHeaders })).json();
    expect(shell.assetInformation.globalAssetId).toBe(aas.assetId);
    expect(shell.submodels).toHaveLength(3);

    const expected = buildBaSyxEnvironment([aas]);
    const submodels = await Promise.all(
      aas.submodels.map(async sm => (await fetch(`${BASYX_URL}/submodels/${encodeAasId(buildSubmodelId(aas.assetId, sm.idShort))}`, { headers: authHeaders })).json())
    );
    // round trip through the app's own parser must give the same semantics
    const [roundTrip] = parseBaSyxEnvironment({ assetAdministrationShells: [shell], submodels, conceptDescriptions: [] });
    const [original] = parseBaSyxEnvironment(expected);
    const semantics = (e: typeof original) => e.submodels.map(sm => ({
      idShort: sm.idShort, semanticId: sm.semanticId,
      props: sm.properties.filter(p => !p.idShort.startsWith('_')).map(p => [p.idShort, p.semanticId, p.valueType]).sort(),
    }));
    expect(semantics(roundTrip)).toEqual(semantics(original));
    expect(roundTrip.serialNumber).toBe('SN-4711');

    // list items keep no idShort (AASd-120) and the Handover structure survives
    const handover = submodels.find(s => s.idShort === 'HandoverDocumentation');
    const documents = handover.submodelElements.find((e: { idShort: string }) => e.idShort === 'Documents');
    expect(documents.modelType).toBe('SubmodelElementList');
    expect(documents.value[0].idShort).toBeUndefined();
  });
});
