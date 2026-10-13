#!/usr/bin/env node
/**
 * Extract a conformance fixture from the official IDTA submodel templates.
 *
 * Usage:
 *   git clone --depth 1 https://github.com/admin-shell-io/submodel-templates /tmp/smt
 *   node scripts/extract-idta-fixture.mjs /tmp/smt > src/lib/__tests__/fixtures/idta-templates.json
 *
 * For every template the fixture records each element path with its
 * modelType, valueType, semanticId and whether it is mandatory (SMT cardinality
 * One / OneToMany). Items of a SubmodelElementList have no idShort (AASd-120)
 * and are normalized to the path segment "[]".
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.argv[2];
if (!root) {
  console.error('usage: extract-idta-fixture.mjs <path-to-submodel-templates-checkout>');
  process.exit(1);
}

const TEMPLATES = {
  Nameplate: 'published/Digital nameplate/3/0/2/IDTA 02006-3-0-2_Template_Digital Nameplate.json',
  TechnicalData: 'published/Technical_Data/2/0/2/IDTA 02003_2-0-2_Template_TechnicalData.json',
  HandoverDocumentation: 'published/Handover Documentation/2/0/2/IDTA 02004-2-0-2_Template_HandoverDocumentation.json',
  ContactInformations: 'published/Contact Information/1/0/2/IDTA 02002-1-0-2_Template_ContactInformation.json',
};

const semanticIdOf = (el) => el?.semanticId?.keys?.[0]?.value ?? null;
const cardinalityOf = (el) =>
  (el.qualifiers ?? []).find((q) => (q.type ?? '').includes('Cardinality'))?.value ?? null;
const childrenOf = (el) => {
  if (el.modelType === 'Entity') return el.statements ?? [];
  return ['SubmodelElementCollection', 'SubmodelElementList'].includes(el.modelType) ? el.value ?? [] : [];
};

const commit = execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
const fixture = { source: 'https://github.com/admin-shell-io/submodel-templates', commit, templates: {} };

for (const [key, file] of Object.entries(TEMPLATES)) {
  const env = JSON.parse(readFileSync(join(root, file), 'utf8'));
  const sm = env.submodels[0];
  const elements = {};
  const walk = (els, prefix, parentIsList) => {
    for (const el of els ?? []) {
      const segment = parentIsList ? '[]' : el.idShort;
      const path = prefix ? `${prefix}.${segment}` : segment;
      if (elements[path]) continue; // list items: first item describes the shape
      const cardinality = cardinalityOf(el);
      elements[path] = {
        modelType: el.modelType,
        valueType: el.valueType ?? null,
        semanticId: semanticIdOf(el),
        mandatory: cardinality === 'One' || cardinality === 'OneToMany',
      };
      walk(childrenOf(el), path, el.modelType === 'SubmodelElementList');
    }
  };
  walk(sm.submodelElements, '', false);
  fixture.templates[key] = { file, idShort: sm.idShort, semanticId: semanticIdOf(sm), elements };
}

process.stdout.write(JSON.stringify(fixture, null, 2) + '\n');
