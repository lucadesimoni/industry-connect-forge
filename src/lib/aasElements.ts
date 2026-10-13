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

/**
 * Untyped AAS v3 JSON (external input/output: BaSyx environments, AASX parts).
 * Its shape is checked at runtime while (un)flattening, so a single explicit
 * escape hatch is used instead of modelling the full IDTA-01001 schema.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AasJson = any;

export type StructureEntry = {
  /** AAS modelType of the element at this path */
  modelType: string;
  /** Extra, non-value fields we must preserve (contentType, min/max, variables, ...) */
  extra?: Record<string, AasJson>;
};

export type StructureMap = Record<string, StructureEntry>;

export type FlatElement = {
  idShort: string;
  valueType: string;
  value: AasJson;
  unit?: string;
  description?: string;
  semanticId?: string;
};

const VALUE_BEARING = new Set(['Property', 'MultiLanguageProperty', 'File', 'Blob', 'Range', 'ReferenceElement']);
const CONTAINERS = new Set(['SubmodelElementCollection', 'SubmodelElementList', 'Entity', 'AnnotatedRelationshipElement']);

const plainText = (v: AasJson): string => {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v[0]?.text ?? '';
  return '';
};

const firstKey = (ref: AasJson): string | undefined => ref?.keys?.[0]?.value;

const childrenOf = (el: AasJson): AasJson[] =>
  el.value && Array.isArray(el.value) ? el.value : el.statements ?? [];

const scalarValueOf = (el: AasJson, modelType: string): AasJson => {
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

const extraOf = (el: AasJson, modelType: string): Record<string, AasJson> | undefined => {
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
      return compact({
        semanticId: el.semanticId,
        typeValueListElement: el.typeValueListElement,
        orderRelevant: el.orderRelevant,
        valueTypeListElement: el.valueTypeListElement,
        semanticIdListElement: el.semanticIdListElement,
      });
    case 'Entity':
      return compact({ semanticId: el.semanticId, entityType: el.entityType, globalAssetId: el.globalAssetId });
    case 'SubmodelElementCollection':
    case 'AnnotatedRelationshipElement':
      // keep the container's own semanticId so it survives the round trip
      return compact({ semanticId: el.semanticId });
    default:
      return undefined;
  }
};

const compact = (obj: Record<string, unknown>): Record<string, AasJson> | undefined => {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined && v !== null);
  return entries.length ? Object.fromEntries(entries) : undefined;
};

/** IEC 61360 unit carried on a property, per IDTA data specification templates. */
export const unitOfElement = (el: AasJson): string | undefined => {
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
  elements: AasJson[],
  toXsdValueType: (t: string) => string
): { properties: FlatElement[]; structure: StructureMap } {
  const properties: FlatElement[] = [];
  const structure: StructureMap = {};

  const walk = (els: AasJson[], prefix: string) => {
    (els ?? []).forEach((el: AasJson, index: number) => {
      const modelType: string = el.modelType ?? 'Property';
      // list items have no idShort (AASd-120): name them by their position in
      // the list so siblings never collide (item01, item02, ...)
      const idShort: string = el.idShort ?? `item${String(index + 1).padStart(2, '0')}`;
      const path = prefix ? `${prefix}.${idShort}` : idShort;
      const extra = extraOf(el, modelType);
      structure[path] = extra ? { modelType, extra } : { modelType };

      if (CONTAINERS.has(modelType)) {
        walk(childrenOf(el), path);
        return;
      }

      if (modelType === 'Operation') return; // no value; fully described by structure map

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
    });
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

export const readStructure = (properties: { idShort: string; value: AasJson }[]): StructureMap => {
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
  buildLeaf: (path: string, prop: FlatElement | undefined, entry: StructureEntry | undefined) => AasJson
): AasJson[] {
  const root: AasJson[] = [];
  const containers = new Map<string, AasJson>();
  const isListPath = (p: string) => !!p && structure[p]?.modelType === 'SubmodelElementList';

  const paths = new Set<string>([
    ...properties.filter((p) => p.idShort !== STRUCTURE_PROP).map((p) => p.idShort),
    ...Object.keys(structure),
  ]);

  const ensureContainer = (path: string): AasJson[] => {
    if (!path) return root;
    const existing = containers.get(path);
    if (existing) return existing.modelType === 'Entity' ? existing.statements : existing.value;

    const parentPath = path.split('.').slice(0, -1).join('.');
    const parent = ensureContainer(parentPath);
    const entry = structure[path];
    const modelType = entry?.modelType ?? 'SubmodelElementCollection';
    const node: AasJson = {
      modelType,
      // AASd-120: elements directly inside a SubmodelElementList have no idShort
      ...(isListPath(parentPath) ? {} : { idShort: path.split('.').pop() }),
      ...(entry?.extra ?? {}),
    };
    // AAS v3: an Entity holds its children in `statements`, all other containers in `value`
    const childKey = modelType === 'Entity' ? 'statements' : 'value';
    node[childKey] = [];
    containers.set(path, node);
    parent.push(node);
    return node[childKey];
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
    const leaf = buildLeaf(path, prop, entry);
    if (isListPath(parentPath)) delete leaf.idShort; // AASd-120
    target.push(leaf);
  }

  return root;
}
