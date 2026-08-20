/**
 * Flatten / unflatten AAS v3 submodel element trees.
 *
 * Our persisted model only stores flat properties (idShort, valueType, value, unit,
 * description, semanticId). AAS v3 allows nested containers and non-Property elements
 * (SubmodelElementCollection, SubmodelElementList, File, Blob, Range, Operation,
 * MultiLanguageProperty, ReferenceElement, Entity...).
 *
 * Strategy for lossless round-tripping without a schema change:
 *  - nested elements are flattened to dotted idShort paths (`Docs.Manual.Sheet`)
 *  - a hidden property `_aasStructure` carries the JSON structure map so export can
 *    rebuild the exact original tree (modelType per path, plus element-specific fields)
 */

export const STRUCTURE_PROP = '_aasStructure';

export type StructureEntry = {
  /** AAS modelType of the element at this path */
  modelType: string;
  /** Extra, non-value fields we must preserve (contentType, min/max, variables, ...) */
  extra?: Record<string, any>;
};

export type StructureMap = Record<string, StructureEntry>;

export type FlatElement = {
  idShort: string;
  valueType: string;
  value: any;
  unit?: string;
  description?: string;
  semanticId?: string;
};

const VALUE_BEARING = new Set(['Property', 'MultiLanguageProperty', 'File', 'Blob', 'Range', 'ReferenceElement']);
const CONTAINERS = new Set(['SubmodelElementCollection', 'SubmodelElementList', 'Entity', 'AnnotatedRelationshipElement']);

const plainText = (v: any): string => {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v[0]?.text ?? '';
  return '';
};

const firstKey = (ref: any): string | undefined => ref?.keys?.[0]?.value;

const childrenOf = (el: any): any[] =>
  el.value && Array.isArray(el.value) ? el.value : el.statements ?? [];

const scalarValueOf = (el: any, modelType: string): any => {
  switch (modelType) {
    case 'MultiLanguageProperty':
      return plainText(el.value);
    case 'File':
    case 'Blob':
      return el.value ?? '';
    case 'Range':
      return `${el.min ?? ''}..${el.max ?? ''}`;
    case 'ReferenceElement':
      return firstKey(el.value) ?? '';
    default:
      return el.value ?? '';
  }
};

const extraOf = (el: any, modelType: string): Record<string, any> | undefined => {
  switch (modelType) {
    case 'File':
    case 'Blob':
      return { contentType: el.contentType };
    case 'Range':
      return { valueType: el.valueType, min: el.min, max: el.max };
    case 'Operation':
      return {
        inputVariables: el.inputVariables,
        outputVariables: el.outputVariables,
        inoutputVariables: el.inoutputVariables,
      };
    case 'SubmodelElementList':
      return {
        typeValueListElement: el.typeValueListElement,
        orderRelevant: el.orderRelevant,
        valueTypeListElement: el.valueTypeListElement,
      };
    case 'Entity':
      return { entityType: el.entityType, globalAssetId: el.globalAssetId };
    default:
      return undefined;
  }
};

/** IEC 61360 unit carried on a property, per IDTA data specification templates. */
export const unitOfElement = (el: any): string | undefined => {
  const specs = el.embeddedDataSpecifications ?? [];
  for (const spec of specs) {
    const content = spec?.dataSpecificationContent;
    if (content?.unit) return content.unit;
    if (content?.unitId?.keys?.[0]?.value) return content.unitId.keys[0].value;
  }
  return undefined;
};

/** Flatten an AAS submodelElements array into flat properties + a structure map. */
export function flattenElements(
  elements: any[],
  toXsdValueType: (t: string) => string
): { properties: FlatElement[]; structure: StructureMap } {
  const properties: FlatElement[] = [];
  const structure: StructureMap = {};

  const walk = (els: any[], prefix: string) => {
    for (const el of els ?? []) {
      const modelType: string = el.modelType ?? 'Property';
      const idShort: string = el.idShort ?? `element_${properties.length}`;
      const path = prefix ? `${prefix}.${idShort}` : idShort;
      const extra = extraOf(el, modelType);
      structure[path] = extra ? { modelType, extra } : { modelType };

      if (CONTAINERS.has(modelType)) {
        walk(childrenOf(el), path);
        continue;
      }

      if (modelType === 'Operation') continue; // no value; fully described by structure map

      if (VALUE_BEARING.has(modelType)) {
        properties.push({
          idShort: path,
          valueType: toXsdValueType(el.valueType ?? 'xs:string'),
          value: scalarValueOf(el, modelType),
          unit: unitOfElement(el),
          description: plainText(el.description) || undefined,
          semanticId: firstKey(el.semanticId) || undefined,
        });
      }
    }
  };

  walk(elements, '');
  return { properties, structure };
}

/** Serialize the structure map into a hidden property for persistence. */
export const structureProperty = (structure: StructureMap): FlatElement | null => {
  if (!Object.keys(structure).length) return null;
  return {
    idShort: STRUCTURE_PROP,
    valueType: 'xs:string',
    value: JSON.stringify(structure),
    description: 'Internal: AAS v3 element structure map (do not edit)',
  };
};

export const readStructure = (properties: { idShort: string; value: any }[]): StructureMap => {
  const raw = properties.find((p) => p.idShort === STRUCTURE_PROP)?.value;
  if (!raw) return {};
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : (raw as StructureMap);
  } catch {
    return {};
  }
};

/** Rebuild a nested AAS submodelElements tree from flat properties + structure map. */
export function unflattenElements(
  properties: FlatElement[],
  structure: StructureMap,
  buildLeaf: (path: string, prop: FlatElement | undefined, entry: StructureEntry | undefined) => any
): any[] {
  const root: any[] = [];
  const containers = new Map<string, any>();

  const paths = new Set<string>([
    ...properties.filter((p) => p.idShort !== STRUCTURE_PROP).map((p) => p.idShort),
    ...Object.keys(structure),
  ]);

  const ensureContainer = (path: string): any[] => {
    if (!path) return root;
    const existing = containers.get(path);
    if (existing) return existing.value;

    const parent = ensureContainer(path.split('.').slice(0, -1).join('.'));
    const entry = structure[path];
    const modelType = entry?.modelType ?? 'SubmodelElementCollection';
    const node: any = {
      modelType,
      idShort: path.split('.').pop(),
      ...(entry?.extra ?? {}),
      value: [],
    };
    containers.set(path, node);
    parent.push(node);
    return node.value;
  };

  // Containers first so ordering is stable, then leaves.
  const sorted = [...paths].sort((a, b) => a.split('.').length - b.split('.').length);
  for (const path of sorted) {
    const entry = structure[path];
    const modelType = entry?.modelType ?? 'Property';
    if (CONTAINERS.has(modelType)) {
      ensureContainer(path);
      continue;
    }
    const parentPath = path.split('.').slice(0, -1).join('.');
    const target = ensureContainer(parentPath);
    const prop = properties.find((p) => p.idShort === path);
    if (!prop && modelType !== 'Operation') continue;
    target.push(buildLeaf(path, prop, entry));
  }

  return root;
}
