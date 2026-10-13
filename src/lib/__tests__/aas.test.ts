import { describe, expect, it } from 'vitest';
import { AAS, AASSubmodel } from '@/types/industrial';
import {
  buildBaSyxEnvironment,
  buildShellId,
  buildSubmodelId,
  exportToBaSyxEnvironment,
  isBaSyxEnvironment,
  parseBaSyxEnvironment,
} from '../basyxEnvironment';
import { buildAASXPackage, parseAASXFile } from '../aasxPackage';
import { assertImportableIdShorts, exportAASToJSON, parseAASImport } from '../aasExportImport';
import { STRUCTURE_PROP, flattenElements, structureProperty } from '../aasElements';
import { SUBMODEL_TEMPLATES, VALUE_TYPE_OPTIONS } from '../aasTemplates';
import { validateAssetId, validateIdShort, isUniqueAssetId } from '../validation';

const now = new Date('2026-01-01');

const nameplate: AASSubmodel = {
  id: 'sm1',
  idShort: 'Nameplate',
  semanticId: 'https://admin-shell.io/zvei/nameplate/2/0/Nameplate',
  description: 'Digital nameplate',
  properties: [
    { id: 'p1', idShort: 'ManufacturerName', valueType: 'xs:string', value: 'Acme', semanticId: '0173-1#02-AAO677#002' },
    { id: 'p2', idShort: 'MaxSpeed', valueType: 'xs:double', value: 12000, unit: '1/min', semanticId: '0173-1#02-AAA001#001' },
    { id: 'p3', idShort: 'Weight', valueType: 'number', value: '' },
    { id: 'p4', idShort: 'Contact.Phone.TelephoneNumber', valueType: 'xs:string', value: '+41 41 000' },
  ],
};

const typeAAS: AAS = {
  id: 't1', assetId: 'urn:acme:aas:type:CNC', idShort: 'CNC_Type', description: 'CNC type',
  submodels: [], isType: true, createdAt: now, updatedAt: now,
};

const instanceAAS: AAS = {
  id: 'i1', assetId: 'urn:acme:aas:instance:CNC-001', idShort: 'CNC_001', description: 'CNC instance',
  manufacturer: 'Acme', serialNumber: 'SN-1', submodels: [nameplate], isType: false,
  typeAASId: 't1', typeAAS, createdAt: now, updatedAt: now,
};

describe('AAS v3 Environment (IDTA-01001 / BaSyx)', () => {
  const env = buildBaSyxEnvironment([typeAAS, instanceAAS]);
  const shell = env.assetAdministrationShells[1];

  it('separates shell id from globalAssetId and references submodels', () => {
    expect(shell.modelType).toBe('AssetAdministrationShell');
    expect(shell.id).toBe(buildShellId(instanceAAS.assetId));
    expect(shell.id).not.toBe(shell.assetInformation.globalAssetId);
    expect(shell.assetInformation.globalAssetId).toBe(instanceAAS.assetId);
    expect(shell.assetInformation.assetKind).toBe('Instance');
    expect(shell.submodels[0]).toEqual({
      type: 'ModelReference',
      keys: [{ type: 'Submodel', value: buildSubmodelId(instanceAAS.assetId, 'Nameplate') }],
    });
  });

  it('derivedFrom points at the type shell id', () => {
    expect(shell.derivedFrom.keys[0].value).toBe(env.assetAdministrationShells[0].id);
  });

  it('serializes specificAssetIds once', () => {
    expect(shell.assetInformation.specificAssetIds).toEqual([
      { name: 'serialNumber', value: 'SN-1' },
      { name: 'manufacturer', value: 'Acme' },
    ]);
  });

  it('serializes properties with XSD types, units and semanticIds', () => {
    const sm = env.submodels.find((s: { idShort: string }) => s.idShort === 'Nameplate');
    expect(sm.kind).toBe('Instance');
    const speed = sm.submodelElements.find((e: { idShort: string }) => e.idShort === 'MaxSpeed');
    expect(speed).toMatchObject({ modelType: 'Property', valueType: 'xs:double', value: '12000' });
    expect(speed.semanticId.keys[0].value).toBe('0173-1#02-AAA001#001');
    expect(speed.embeddedDataSpecifications[0].dataSpecificationContent.unit).toBe('1/min');
    // legacy 'number' mapped to xs:double; empty value omitted (invalid lexical value)
    const weight = sm.submodelElements.find((e: { idShort: string }) => e.idShort === 'Weight');
    expect(weight.valueType).toBe('xs:double');
    expect(weight.value).toBeUndefined();
    // dotted paths become nested collections
    const contact = sm.submodelElements.find((e: { idShort: string }) => e.idShort === 'Contact');
    expect(contact.modelType).toBe('SubmodelElementCollection');
    expect(contact.value[0].value[0].idShort).toBe('TelephoneNumber');
  });

  it('creates ConceptDescriptions for semanticIds', () => {
    expect(env.conceptDescriptions.map((c: { id: string }) => c.id)).toContain('0173-1#02-AAO677#002');
  });

  it('round-trips through JSON export/import', () => {
    const json = exportToBaSyxEnvironment([instanceAAS]);
    const parsed = JSON.parse(json);
    expect(isBaSyxEnvironment(parsed)).toBe(true);
    const [entry] = parseBaSyxEnvironment(parsed);
    expect(entry.assetId).toBe(instanceAAS.assetId);
    expect(entry.serialNumber).toBe('SN-1');
    const props = entry.submodels[0].properties;
    expect(props.find(p => p.idShort === 'MaxSpeed')).toMatchObject({ unit: '1/min', semanticId: '0173-1#02-AAA001#001' });
    expect(props.find(p => p.idShort === 'Contact.Phone.TelephoneNumber')?.value).toBe('+41 41 000');
    expect(props.some(p => p.idShort === STRUCTURE_PROP)).toBe(true);
  });

  it('round-trips through an AASX package', async () => {
    const blob = buildAASXPackage([instanceAAS]);
    const entries = parseAASXFile(await blob.arrayBuffer());
    expect(entries).toHaveLength(1);
    expect(entries[0].submodels[0].semanticId).toBe(nameplate.semanticId);
  });

  it('rejects imports with idShorts the database would refuse, before writing anything', () => {
    const [entry] = parseBaSyxEnvironment(buildBaSyxEnvironment([instanceAAS]));
    expect(() => assertImportableIdShorts([entry])).not.toThrow();
    const bad = { ...entry, submodels: [{ ...entry.submodels[0], properties: [{ idShort: 'Max-Speed', valueType: 'xs:double', value: 1 }] }] };
    expect(() => assertImportableIdShorts([bad])).toThrow(/Max-Speed/);
    expect(() => assertImportableIdShorts([{ ...entry, idShort: 'CNC 1' }])).toThrow(/CNC 1/);
  });

  it('accepts the legacy app export format', () => {
    const entries = parseAASImport(exportAASToJSON([instanceAAS]));
    expect(entries[0].idShort).toBe('CNC_001');
    expect(() => parseAASImport('{"version":"2"}')).toThrow();
  });

  it('preserves non-Property element structure (File, Range)', () => {
    const elements = [
      { modelType: 'File', idShort: 'Manual', contentType: 'application/pdf', value: 'manual.pdf' },
      { modelType: 'Range', idShort: 'Temp', valueType: 'xs:double', min: '0', max: '80' },
    ];
    const { properties, structure } = flattenElements(elements, t => t);
    const sm: AASSubmodel = {
      id: 'x', idShort: 'Tech', semanticId: 'urn:x', description: 'x',
      properties: [...properties, structureProperty(structure)!].map((p, i) => ({ ...p, id: String(i) })) as AASSubmodel['properties'],
    };
    const env2 = buildBaSyxEnvironment([{ ...instanceAAS, submodels: [sm] }]);
    const els = env2.submodels[0].submodelElements;
    expect(els[0]).toMatchObject({ modelType: 'File', contentType: 'application/pdf', value: 'manual.pdf' });
    expect(els[1]).toMatchObject({ modelType: 'Range', min: '0', max: '80' });
  });
});

describe('IDTA submodel templates', () => {
  it('use valid idShorts and XSD value types', () => {
    const allowed = new Set(VALUE_TYPE_OPTIONS.map(o => o.value));
    for (const t of SUBMODEL_TEMPLATES) {
      expect(validateIdShort(t.idShort).valid, t.idShort).toBe(true);
      expect(t.semanticId).toBeTruthy();
      for (const p of t.properties.filter(p => p.idShort !== STRUCTURE_PROP)) {
        expect(validateIdShort(p.idShort, { allowPath: true }).valid, p.idShort).toBe(true);
        expect(allowed.has(p.valueType), p.valueType).toBe(true);
      }
    }
  });

  it('use the semanticIds published by IDTA', () => {
    const byId = Object.fromEntries(SUBMODEL_TEMPLATES.map(t => [t.idShort, t.semanticId]));
    // details are checked against the official templates in idtaConformance.test.ts
    expect(byId.Nameplate).toBe('https://admin-shell.io/idta/nameplate/3/0/Nameplate');
    expect(byId.TechnicalData).toBe('0173-1#01-AHX837#002');
    expect(byId.HandoverDocumentation).toBe('0173-1#01-AHF578#003');
    expect(byId.ContactInformations).toBe('https://admin-shell.io/zvei/nameplate/1/0/ContactInformations');
  });

  it('do not claim the IDTA namespace for custom submodels', () => {
    for (const t of SUBMODEL_TEMPLATES.filter(t => t.standard.startsWith('Custom'))) {
      expect(t.semanticId.startsWith('https://admin-shell.io/')).toBe(false);
    }
  });
});

describe('AAS validation', () => {
  it('validates idShort per AASd-002 (valid in AAS v3.0 AND v3.1/v3.2)', () => {
    expect(validateIdShort('CNC_001').valid).toBe(true);
    expect(validateIdShort('Ab').valid).toBe(true);
    expect(validateIdShort('A').valid).toBe(false); // v3.1+: min. 2 characters
    expect(validateIdShort('Motor-Drive').valid).toBe(false); // v3.0: no hyphen
    expect(validateIdShort('1Motor').valid).toBe(false);
    expect(validateIdShort('Motor-').valid).toBe(false);
    expect(validateIdShort('Motor Drive').valid).toBe(false);
    expect(validateIdShort('a'.repeat(129)).valid).toBe(false);
    expect(validateIdShort('Contact.Phone').valid).toBe(false);
    expect(validateIdShort('Contact.Phone', { allowPath: true }).valid).toBe(true);
    expect(validateIdShort('Contact..Phone', { allowPath: true }).valid).toBe(false);
  });

  it('validates globalAssetId as IRI', () => {
    expect(validateAssetId('urn:acme:aas:instance:CNC-001').valid).toBe(true);
    expect(validateAssetId('https://acme.com/assets/CNC-001').valid).toBe(true);
    expect(validateAssetId('CNC-001').valid).toBe(false);
    expect(validateAssetId('').valid).toBe(false);
  });

  it('checks asset id uniqueness case-insensitively', () => {
    expect(isUniqueAssetId('URN:ACME:AAS:INSTANCE:CNC-001', [instanceAAS])).toBe(false);
    expect(isUniqueAssetId(instanceAAS.assetId, [instanceAAS], 'i1')).toBe(true);
  });
});
