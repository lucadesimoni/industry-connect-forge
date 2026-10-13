/**
 * Regression tests for findings of the independent code review of PR #3.
 */
import { describe, expect, it } from 'vitest';
import { AAS, AASSubmodel, ISA95Level, UNSNode } from '@/types/industrial';
import {
  buildLocationFromUNS,
  buildUNSMetadata,
  composeRDSDesignation,
  generateAssetSparkplugTopics,
  normalizeRDSLocation,
  sparkplugEdgePath,
  stripAspectPrefix,
  validateRDSDesignation,
} from '../hierarchyUtils';
import { generateAASSparkplugTopic } from '../sparkplugPayload';
import { parseSparkplugTopic } from '../mqttTopics';
import { buildBaSyxEnvironment, parseBaSyxEnvironment } from '../basyxEnvironment';
import { flattenElements } from '../aasElements';
import { assertImportableIdShorts } from '../aasExportImport';
import { generateAssetTopics } from '../trackingTopics';

const now = new Date('2026-01-01');
const node = (id: string, name: string, level: ISA95Level, parentId: string | null, rds?: string): UNSNode => ({
  id, name, level, parentId, createdAt: now, updatedAt: now,
  metadata: rds ? { rds_location: rds } : undefined,
});

describe('legacy RDS location codes are re-sanitized before reuse', () => {
  // codes written by the old formatName (kept '_', umlauts, '-')
  const legacy = [
    node('e', 'PIL', 'Enterprise', null, '+PIL'),
    node('s', 'Süd', 'Site', 'e', '+PIL.SÜD'),
    node('l', 'Line_01', 'Line', 's', '+PIL.SÜD.LINE_01'),
    node('c', 'Robot', 'Cell', 'l', '+PIL.SÜD.LINE_01'),
  ];

  it('normalizeRDSLocation produces valid IEC 81346 location codes', () => {
    expect(normalizeRDSLocation('+PIL.SÜD.LINE_01')).toBe('+PIL.SD.LINE01');
    expect(normalizeRDSLocation(undefined)).toBe('');
    expect(validateRDSDesignation(normalizeRDSLocation('+A-B.C/D')).valid).toBe(true);
  });

  it('moving to / building at a legacy node yields a designation the DB accepts', () => {
    const loc = buildLocationFromUNS(legacy[3], legacy);
    const designation = composeRDSDesignation({ aspectCode: '=', functionAspect: 'M1', locationAspect: loc });
    expect(validateRDSDesignation(designation).valid).toBe(true);
  });

  it('new child nodes under a legacy parent get valid codes', () => {
    const md = buildUNSMetadata('Line', 'Line 02', legacy[1], legacy);
    expect(validateRDSDesignation(md.rds_location!).valid).toBe(true);
    const cell = buildUNSMetadata('Cell', 'X', legacy[2], legacy, { functionAspect: '=M', productAspect: '-K' });
    expect(cell.full_rds_designation).toBe('=M-K+PIL.SD.LINE01');
  });
});

describe('one physical asset has one Sparkplug edge node', () => {
  const tree: UNSNode[] = [];
  const add = (id: string, name: string, level: ISA95Level, parentId: string | null) => {
    const parent = parentId ? tree.find(n => n.id === parentId)! : null;
    tree.push({ id, name, level, parentId, metadata: buildUNSMetadata(level, name, parent, tree), createdAt: now, updatedAt: now });
  };
  add('e', 'PIL', 'Enterprise', null); add('s', 'STANS', 'Site', 'e'); add('a', 'HALL3', 'Area', 's');
  add('l', 'LN01', 'Line', 'a'); add('c', 'CNC1', 'Cell', 'l');
  const cell = tree.find(n => n.id === 'c')!;

  it('RDS device topics, AAS topics and Cell device topics share the edge node', () => {
    const rds = parseSparkplugTopic(generateAssetSparkplugTopics(sparkplugEdgePath(cell, tree), '=M1').dataTopic)!;
    const aas = parseSparkplugTopic(generateAASSparkplugTopic({ idShort: 'Robot01' } as AAS, cell, 'DDATA', tree))!;
    const own = parseSparkplugTopic(cell.metadata!.sparkplug_device_topics!.dataTopic!)!;
    expect(rds.edgeNodeId).toBe('STANS-HALL3-LN01');
    expect(aas.edgeNodeId).toBe(rds.edgeNodeId);
    expect(own.edgeNodeId).toBe(rds.edgeNodeId);
  });
});

describe('aspect prefixes', () => {
  it('stripAspectPrefix removes stored prefixes from legacy rows', () => {
    expect(stripAspectPrefix('=M')).toBe('M');
    expect(stripAspectPrefix('-K1')).toBe('K1');
    expect(stripAspectPrefix('M1')).toBe('M1');
  });
});

describe('AAS element round trip', () => {
  it('list items without idShort get distinct paths and survive export/import', () => {
    const elements = [{
      modelType: 'SubmodelElementList', idShort: 'Markings', typeValueListElement: 'SubmodelElementCollection',
      value: [
        { modelType: 'SubmodelElementCollection', value: [] },
        { modelType: 'SubmodelElementCollection', value: [] },
      ],
    }];
    const { structure } = flattenElements(elements, t => t);
    expect(Object.keys(structure)).toEqual(['Markings', 'Markings.item01', 'Markings.item02']);
  });

  it('Entity children are exported as statements', () => {
    const entityEnv = {
      assetAdministrationShells: [{ id: 'urn:x:aas', idShort: 'X', assetInformation: { assetKind: 'Instance', globalAssetId: 'urn:x' },
        submodels: [{ type: 'ModelReference', keys: [{ type: 'Submodel', value: 'urn:x:sm' }] }] }],
      submodels: [{ modelType: 'Submodel', id: 'urn:x:sm', idShort: 'BOM', submodelElements: [{
        modelType: 'Entity', idShort: 'Motor', entityType: 'SelfManagedEntity', globalAssetId: 'urn:motor',
        statements: [{ modelType: 'Property', idShort: 'Power', valueType: 'xs:double', value: '5' }],
      }] }],
    };
    const [entry] = parseBaSyxEnvironment(entityEnv);
    const sm = { ...entry.submodels[0], id: 'sm', properties: entry.submodels[0].properties.map((p, i) => ({ ...p, id: String(i) })) } as AASSubmodel;
    const env = buildBaSyxEnvironment([{ id: 'a', assetId: 'urn:x', idShort: 'X', description: 'x', isType: false, submodels: [sm], createdAt: now, updatedAt: now }]);
    const entity = env.submodels[0].submodelElements[0];
    expect(entity.modelType).toBe('Entity');
    expect(entity.value).toBeUndefined();
    expect(entity.statements[0]).toMatchObject({ idShort: 'Power', value: '5' });
    expect(entity.globalAssetId).toBe('urn:motor');
  });

  it('import strips surrounding whitespace from idShorts instead of failing in the DB', () => {
    const [entry] = assertImportableIdShorts([{
      idShort: ' Pump01 ', assetId: 'urn:p', description: 'p', isType: false,
      submodels: [{ idShort: ' Nameplate', semanticId: 'urn:s', description: 'n', properties: [{ idShort: 'Serial ', valueType: 'xs:string', value: '1' }] }],
    }]);
    expect(entry.idShort).toBe('Pump01');
    expect(entry.submodels[0].idShort).toBe('Nameplate');
    expect(entry.submodels[0].properties[0].idShort).toBe('Serial');
  });
});

describe('topic sanitizing keeps identities distinct', () => {
  it('asset ids differing only in reserved characters do not collide', () => {
    const base = { id: 'x', assetType: 'pallet', description: '', currentLocationPath: null, currentState: '', currentQualityState: '', createdAt: now, updatedAt: now };
    const a = generateAssetTopics({ ...base, assetId: 'PAL/001' }).identity;
    const b = generateAssetTopics({ ...base, assetId: 'PAL001' }).identity;
    expect(a).not.toBe(b);
  });
});
