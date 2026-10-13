/**
 * Conformance of the built-in submodel templates with the OFFICIAL IDTA templates.
 *
 * The fixture is extracted from admin-shell-io/submodel-templates by
 * scripts/extract-idta-fixture.mjs (commit recorded in the fixture). Each
 * template is exported exactly as the app exports it (AAS v3 Environment) and
 * compared element by element:
 *  - every exported element exists in the official template with the same
 *    modelType, valueType and semanticId
 *  - every mandatory official element whose parent was exported is present
 *  - list items carry no idShort (AASd-120)
 */
import { describe, expect, it } from 'vitest';
import { AAS, AASSubmodel } from '@/types/industrial';
import { buildBaSyxEnvironment } from '../basyxEnvironment';
import { SUBMODEL_TEMPLATES } from '../aasTemplates';
import fixture from './fixtures/idta-templates.json';

type FixtureElement = { modelType: string; valueType: string | null; semanticId: string | null; mandatory: boolean };
type Exported = { modelType: string; valueType?: string; semanticId?: { keys: { value: string }[] }; idShort?: string; value?: unknown };

const now = new Date('2026-01-01');

const exportTemplate = (idShort: string) => {
  const t = SUBMODEL_TEMPLATES.find(x => x.idShort === idShort)!;
  const sm: AASSubmodel = {
    id: 'sm', idShort: t.idShort, semanticId: t.semanticId, description: t.description,
    properties: t.properties.map((p, i) => ({ ...p, id: String(i) })),
  };
  const aas: AAS = {
    id: 'a', assetId: 'urn:test:asset', idShort: 'Test', description: 'x', submodels: [sm], isType: false,
    createdAt: now, updatedAt: now,
  };
  return buildBaSyxEnvironment([aas]).submodels[0];
};

/** Normalize the exported tree into the fixture's path notation. */
const collect = (els: Exported[], prefix: string, parentIsList: boolean, out: Map<string, Exported>) => {
  for (const el of els) {
    if (parentIsList) expect(el.idShort, `list item under ${prefix} must not have an idShort`).toBeUndefined();
    const path = prefix ? `${prefix}.${parentIsList ? '[]' : el.idShort}` : el.idShort!;
    out.set(path, el);
    if (['SubmodelElementCollection', 'SubmodelElementList'].includes(el.modelType) && Array.isArray(el.value)) {
      collect(el.value as Exported[], path, el.modelType === 'SubmodelElementList', out);
    }
  }
  return out;
};

/**
 * The official templates mark extension points with placeholder elements
 * (ArbitraryProperty, ArbitraryMLP, ArbitrarySMC, ...): any element of that
 * modelType is allowed there, with a free semanticId.
 */
const PLACEHOLDER: Record<string, string[]> = {
  Property: ['ArbitraryProperty'],
  MultiLanguageProperty: ['ArbitraryMLP'],
  File: ['ArbitraryFile'],
  Range: ['ArbitraryRange'],
  SubmodelElementCollection: ['ArbitrarySMC', 'Section'],
  SubmodelElementList: ['ArbitrarySML'],
};
const placeholderFor = (elements: Record<string, FixtureElement>, path: string, modelType: string) => {
  const parent = path.split('.').slice(0, -1).join('.');
  return (PLACEHOLDER[modelType] ?? [])
    .map(name => elements[parent ? `${parent}.${name}` : name])
    .find(Boolean);
};

const templates = fixture.templates as Record<string, { idShort: string; semanticId: string; elements: Record<string, FixtureElement> }>;

describe(`IDTA template conformance (submodel-templates @ ${fixture.commit.slice(0, 8)})`, () => {
  for (const [idShort, official] of Object.entries(templates)) {
    describe(idShort, () => {
      const sm = exportTemplate(idShort);
      const exported = collect(sm.submodelElements, '', false, new Map());

      it('uses the official submodel semanticId', () => {
        expect(sm.semanticId.keys[0].value).toBe(official.semanticId);
      });

      it('exports only elements of the official template, with matching type and semanticId', () => {
        for (const [path, el] of exported) {
          const placeholder = official.elements[path] ? undefined : placeholderFor(official.elements, path, el.modelType);
          if (placeholder) {
            expect(el.modelType, path).toBe(placeholder.modelType);
            continue;
          }
          const ref = official.elements[path];
          expect(ref, `${path} is not part of the official template`).toBeDefined();
          expect(el.modelType, path).toBe(ref.modelType);
          if (ref.valueType) expect(el.valueType, path).toBe(ref.valueType);
          expect(el.semanticId?.keys[0].value ?? null, path).toBe(ref.semanticId);
        }
      });

      it('contains every mandatory element below the exported parents', () => {
        for (const [path, ref] of Object.entries(official.elements)) {
          if (!ref.mandatory) continue;
          const parent = path.split('.').slice(0, -1).join('.');
          if (parent && !exported.has(parent)) continue; // optional parent not used
          expect(exported.has(path), `mandatory element ${path} missing`).toBe(true);
        }
      });
    });
  }
});
