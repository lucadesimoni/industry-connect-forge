/**
 * Eclipse BaSyx / IDTA-01001-3-0 compatible serialization.
 *
 * BaSyx (AAS Environment, AAS Repository, Submodel Repository) consumes the
 * official "Environment" JSON of AAS Part 1 v3.0:
 *   { assetAdministrationShells: [...], submodels: [...], conceptDescriptions: [...] }
 *
 * Key differences vs. our internal export format:
 *  - every element carries `modelType` ("AssetAdministrationShell", "Submodel", "Property")
 *  - AAS identity is `id` (IRI) + `assetInformation.globalAssetId`
 *  - submodels are top-level objects, referenced from the AAS via `submodels[].keys`
 *  - semanticIds are `Reference` objects, not plain strings
 *  - values are always serialized as strings, typed via `valueType` (xs:*)
 */
import { AAS } from '@/types/industrial';
import { AASExportEntry } from './aasExportImport';

type Reference = {
  type: 'ExternalReference' | 'ModelReference';
  keys: { type: string; value: string }[];
};

const externalRef = (value?: string): Reference | undefined =>
  value
    ? { type: 'ExternalReference', keys: [{ type: 'GlobalReference', value }] }
    : undefined;

const modelRef = (type: string, value: string): Reference => ({
  type: 'ModelReference',
  keys: [{ type, value }],
});

const LEGACY_TYPE_MAP: Record<string, string> = {
  string: 'xs:string',
  number: 'xs:double',
  boolean: 'xs:boolean',
  date: 'xs:dateTime',
};

export const toXsdValueType = (valueType: string): string =>
  LEGACY_TYPE_MAP[valueType] ?? (valueType.startsWith('xs:') ? valueType : 'xs:string');

const toValueString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const langText = (text?: string) =>
  text ? [{ language: 'en', text }] : undefined;

/** Deterministic submodel IRI derived from the asset id + submodel idShort. */
export const buildSubmodelId = (assetId: string, idShort: string) =>
  `${assetId.replace(/\/$/, '')}/submodel/${encodeURIComponent(idShort)}`;

export function exportToBaSyxEnvironment(aasList: AAS[]): string {
  const shells: any[] = [];
  const submodels: any[] = [];

  for (const aas of aasList) {
    const smRefs: Reference[] = [];

    for (const sm of aas.submodels) {
      const smId = buildSubmodelId(aas.assetId, sm.idShort);
      smRefs.push(modelRef('Submodel', smId));

      submodels.push({
        modelType: 'Submodel',
        id: smId,
        idShort: sm.idShort,
        kind: aas.isType ? 'Template' : 'Instance',
        description: langText(sm.description),
        semanticId: externalRef(sm.semanticId),
        submodelElements: sm.properties.map((p) => ({
          modelType: 'Property',
          idShort: p.idShort,
          valueType: toXsdValueType(p.valueType),
          value: toValueString(p.value),
          description: langText(
            p.unit ? `${p.description ?? ''}${p.description ? ' ' : ''}[${p.unit}]`.trim() : p.description
          ),
          semanticId: externalRef(p.semanticId),
        })),
      });
    }

    shells.push({
      modelType: 'AssetAdministrationShell',
      id: aas.assetId,
      idShort: aas.idShort,
      description: langText(aas.description),
      assetInformation: {
        assetKind: aas.isType ? 'Type' : 'Instance',
        globalAssetId: aas.assetId,
        specificAssetIds: aas.serialNumber
          ? [{ name: 'serialNumber', value: aas.serialNumber }]
          : undefined,
      },
      derivedFrom:
        !aas.isType && aas.typeAAS?.assetId
          ? modelRef('AssetAdministrationShell', aas.typeAAS.assetId)
          : undefined,
      submodels: smRefs.length ? smRefs : undefined,
    });
  }

  return JSON.stringify(
    { assetAdministrationShells: shells, submodels, conceptDescriptions: [] },
    (_k, v) => (v === undefined ? undefined : v),
    2
  );
}

/** True when the JSON looks like an AAS v3 Environment (BaSyx) document. */
export function isBaSyxEnvironment(data: any): boolean {
  return (
    !!data &&
    Array.isArray(data.assetAdministrationShells) &&
    (data.submodels === undefined || Array.isArray(data.submodels)) &&
    data.version === undefined
  );
}

const firstKey = (ref: any): string | undefined => ref?.keys?.[0]?.value;

const plainText = (v: any): string => {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v[0]?.text ?? '';
  return '';
};

/** Parse an AAS v3 Environment (BaSyx export) into our internal import entries. */
export function parseBaSyxEnvironment(data: any): AASExportEntry[] {
  const submodelsById = new Map<string, any>();
  for (const sm of data.submodels ?? []) submodelsById.set(sm.id, sm);

  return (data.assetAdministrationShells ?? []).map((shell: any) => {
    const assetId = shell.assetInformation?.globalAssetId || shell.id;
    if (!assetId || !shell.idShort) {
      throw new Error('Invalid AAS Environment: shell missing id/idShort.');
    }

    const refs: any[] = shell.submodels ?? [];
    const linked = refs
      .map((r) => submodelsById.get(firstKey(r) ?? ''))
      .filter(Boolean);

    return {
      idShort: shell.idShort,
      assetId,
      description: plainText(shell.description) || shell.idShort,
      manufacturer: undefined,
      serialNumber: (shell.assetInformation?.specificAssetIds ?? []).find(
        (s: any) => s.name?.toLowerCase() === 'serialnumber'
      )?.value,
      isType: shell.assetInformation?.assetKind === 'Type',
      submodels: linked.map((sm: any) => ({
        idShort: sm.idShort,
        semanticId: firstKey(sm.semanticId) ?? '',
        description: plainText(sm.description) || sm.idShort,
        properties: (sm.submodelElements ?? [])
          .filter((el: any) => (el.modelType ?? 'Property') === 'Property')
          .map((el: any) => ({
            idShort: el.idShort,
            valueType: toXsdValueType(el.valueType ?? 'xs:string'),
            value: el.value ?? '',
            description: plainText(el.description) || undefined,
            semanticId: firstKey(el.semanticId) || undefined,
          })),
      })),
    } satisfies AASExportEntry;
  });
}
