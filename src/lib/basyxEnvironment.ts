/**
 * Eclipse BaSyx / IDTA-01001-3-0 compatible serialization.
 *
 * BaSyx (AAS Environment, AAS Repository, Submodel Repository) consumes the
 * official "Environment" JSON of AAS Part 1 v3.0:
 *   { assetAdministrationShells: [...], submodels: [...], conceptDescriptions: [...] }
 *
 * Supported here:
 *  - `modelType` discriminators on every element
 *  - AAS identity `id` (IRI) + `assetInformation.globalAssetId`
 *  - top-level submodels referenced from the shell
 *  - `Reference` objects for semanticIds
 *  - units as IEC 61360 embedded data specifications (+ generated ConceptDescriptions)
 *  - nested SubmodelElementCollection / SubmodelElementList / File / Blob / Range /
 *    MultiLanguageProperty / ReferenceElement / Operation via the structure map
 *    (see `aasElements.ts`)
 */
import { AAS } from '@/types/industrial';
import { AASExportEntry } from './aasExportImport';
import {
  FlatElement,
  STRUCTURE_PROP,
  StructureEntry,
  flattenElements,
  readStructure,
  structureProperty,
  unflattenElements,
  unitOfElement,
} from './aasElements';

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

const langText = (text?: string) => (text ? [{ language: 'en', text }] : undefined);

/** Deterministic submodel IRI derived from the asset id + submodel idShort. */
export const buildSubmodelId = (assetId: string, idShort: string) =>
  `${assetId.replace(/\/$/, '')}/submodel/${encodeURIComponent(idShort)}`;

/** Unit carried as an IEC 61360 data specification (the AAS-native place for units). */
const unitDataSpecification = (unit: string, idShort: string) => ({
  dataSpecification: externalRef('https://admin-shell.io/DataSpecificationTemplates/DataSpecificationIec61360/3/0'),
  dataSpecificationContent: {
    modelType: 'DataSpecificationIec61360',
    preferredName: [{ language: 'en', text: idShort }],
    unit,
  },
});

const conceptDescriptionFor = (semanticId: string, idShort: string, unit?: string) => ({
  modelType: 'ConceptDescription',
  id: semanticId,
  idShort: idShort.split('.').pop(),
  embeddedDataSpecifications: [
    {
      dataSpecification: externalRef('https://admin-shell.io/DataSpecificationTemplates/DataSpecificationIec61360/3/0'),
      dataSpecificationContent: {
        modelType: 'DataSpecificationIec61360',
        preferredName: [{ language: 'en', text: idShort.split('.').pop() }],
        ...(unit ? { unit } : {}),
      },
    },
  ],
});

const buildLeafElement = (
  path: string,
  prop: FlatElement | undefined,
  entry: StructureEntry | undefined
): any => {
  const idShort = path.split('.').pop();
  const modelType = entry?.modelType ?? 'Property';
  const base: any = {
    modelType,
    idShort,
    description: langText(prop?.description),
    semanticId: externalRef(prop?.semanticId),
    ...(prop?.unit ? { embeddedDataSpecifications: [unitDataSpecification(prop.unit, idShort!)] } : {}),
  };

  switch (modelType) {
    case 'MultiLanguageProperty':
      return { ...base, value: langText(toValueString(prop?.value)) ?? [] };
    case 'File':
    case 'Blob':
      return { ...base, contentType: entry?.extra?.contentType ?? 'application/octet-stream', value: toValueString(prop?.value) };
    case 'Range': {
      const [min, max] = toValueString(prop?.value).split('..');
      return {
        ...base,
        valueType: entry?.extra?.valueType ?? toXsdValueType(prop?.valueType ?? 'xs:string'),
        min: entry?.extra?.min ?? min,
        max: entry?.extra?.max ?? max,
      };
    }
    case 'ReferenceElement':
      return { ...base, value: externalRef(toValueString(prop?.value)) };
    case 'Operation':
      return {
        ...base,
        inputVariables: entry?.extra?.inputVariables,
        outputVariables: entry?.extra?.outputVariables,
        inoutputVariables: entry?.extra?.inoutputVariables,
      };
    default:
      return {
        ...base,
        modelType: 'Property',
        valueType: toXsdValueType(prop?.valueType ?? 'xs:string'),
        value: toValueString(prop?.value),
      };
  }
};

export function buildBaSyxEnvironment(aasList: AAS[]): any {
  const shells: any[] = [];
  const submodels: any[] = [];
  const conceptDescriptions = new Map<string, any>();

  for (const aas of aasList) {
    const smRefs: Reference[] = [];

    for (const sm of aas.submodels) {
      const smId = buildSubmodelId(aas.assetId, sm.idShort);
      smRefs.push(modelRef('Submodel', smId));

      const structure = readStructure(sm.properties as any);
      const flat: FlatElement[] = sm.properties
        .filter((p) => p.idShort !== STRUCTURE_PROP)
        .map((p) => ({
          idShort: p.idShort,
          valueType: toXsdValueType(p.valueType),
          value: p.value,
          unit: p.unit,
          description: p.description,
          semanticId: p.semanticId,
        }));

      for (const p of flat) {
        if (p.semanticId && !conceptDescriptions.has(p.semanticId)) {
          conceptDescriptions.set(p.semanticId, conceptDescriptionFor(p.semanticId, p.idShort, p.unit));
        }
      }

      submodels.push({
        modelType: 'Submodel',
        id: smId,
        idShort: sm.idShort,
        kind: aas.isType ? 'Template' : 'Instance',
        description: langText(sm.description),
        semanticId: externalRef(sm.semanticId),
        submodelElements: unflattenElements(flat, structure, buildLeafElement),
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
        specificAssetIds: [
          ...(aas.serialNumber ? [{ name: 'serialNumber', value: aas.serialNumber }] : []),
          ...(aas.manufacturer ? [{ name: 'manufacturer', value: aas.manufacturer }] : []),
        ].length
          ? [
              ...(aas.serialNumber ? [{ name: 'serialNumber', value: aas.serialNumber }] : []),
              ...(aas.manufacturer ? [{ name: 'manufacturer', value: aas.manufacturer }] : []),
            ]
          : undefined,
      },
      derivedFrom:
        !aas.isType && aas.typeAAS?.assetId
          ? modelRef('AssetAdministrationShell', aas.typeAAS.assetId)
          : undefined,
      submodels: smRefs.length ? smRefs : undefined,
    });
  }

  return {
    assetAdministrationShells: shells,
    submodels,
    conceptDescriptions: [...conceptDescriptions.values()],
  };
}

export function exportToBaSyxEnvironment(aasList: AAS[]): string {
  return JSON.stringify(buildBaSyxEnvironment(aasList), (_k, v) => (v === undefined ? undefined : v), 2);
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

  const cdById = new Map<string, any>();
  for (const cd of data.conceptDescriptions ?? []) cdById.set(cd.id, cd);
  const unitFromCD = (semanticId?: string) =>
    semanticId ? unitOfElement(cdById.get(semanticId) ?? {}) : undefined;

  return (data.assetAdministrationShells ?? []).map((shell: any) => {
    const assetId = shell.assetInformation?.globalAssetId || shell.id;
    if (!assetId || !shell.idShort) {
      throw new Error('Invalid AAS Environment: shell missing id/idShort.');
    }

    const specificIds: any[] = shell.assetInformation?.specificAssetIds ?? [];
    const findSpecific = (name: string) =>
      specificIds.find((s) => s.name?.toLowerCase() === name.toLowerCase())?.value;

    const refs: any[] = shell.submodels ?? [];
    const linked = refs.map((r) => submodelsById.get(firstKey(r) ?? '')).filter(Boolean);

    return {
      idShort: shell.idShort,
      assetId,
      description: plainText(shell.description) || shell.idShort,
      manufacturer: findSpecific('manufacturer'),
      serialNumber: findSpecific('serialNumber'),
      isType: shell.assetInformation?.assetKind === 'Type',
      submodels: linked.map((sm: any) => {
        const { properties, structure } = flattenElements(sm.submodelElements ?? [], toXsdValueType);
        const withUnits = properties.map((p) => ({
          idShort: p.idShort,
          valueType: p.valueType,
          value: p.value,
          unit: p.unit ?? unitFromCD(p.semanticId),
          description: p.description,
          semanticId: p.semanticId,
        }));
        const structProp = structureProperty(structure);
        return {
          idShort: sm.idShort,
          semanticId: firstKey(sm.semanticId) ?? '',
          description: plainText(sm.description) || sm.idShort,
          properties: structProp ? [...withUnits, structProp] : withUnits,
        };
      }),
    } satisfies AASExportEntry;
  });
}
