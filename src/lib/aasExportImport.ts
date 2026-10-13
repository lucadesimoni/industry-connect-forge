import type { AasJson } from './aasElements';
import { AAS, AASSubmodel, AASProperty } from '@/types/industrial';
import { isBaSyxEnvironment, parseBaSyxEnvironment } from './basyxEnvironment';
import { STRUCTURE_PROP } from './aasElements';
import { validateIdShort } from './validation';


export interface AASExportFormat {
  version: '1.0';
  exportedAt: string;
  assetAdministrationShells: AASExportEntry[];
}

export interface AASExportEntry {
  idShort: string;
  assetId: string;
  description: string;
  manufacturer?: string;
  serialNumber?: string;
  isType: boolean;
  submodels: {
    idShort: string;
    semanticId: string;
    description: string;
    properties: {
      idShort: string;
      valueType: string;
      value: AasJson;
      unit?: string;
      description?: string;
      semanticId?: string;
    }[];
  }[];
}

export function exportAASToJSON(aasList: AAS[]): string {
  const payload: AASExportFormat = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    assetAdministrationShells: aasList.map(aas => ({
      idShort: aas.idShort,
      assetId: aas.assetId,
      description: aas.description,
      manufacturer: aas.manufacturer || undefined,
      serialNumber: aas.serialNumber || undefined,
      isType: aas.isType,
      submodels: aas.submodels.map(sm => ({
        idShort: sm.idShort,
        semanticId: sm.semanticId,
        description: sm.description,
        properties: sm.properties.map(p => ({
          idShort: p.idShort,
          valueType: p.valueType,
          value: p.value,
          unit: p.unit || undefined,
          description: p.description || undefined,
          semanticId: p.semanticId || undefined,
        })),
      })),
    })),
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadJSON(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseAASImport(jsonString: string): AASExportEntry[] {
  const raw = JSON.parse(jsonString);

  // Eclipse BaSyx / IDTA-01001-3-0 "Environment" documents are accepted directly.
  if (isBaSyxEnvironment(raw)) {
    return parseBaSyxEnvironment(raw);
  }

  const data = raw as AASExportFormat;
  if (data.version !== '1.0' || !Array.isArray(data.assetAdministrationShells)) {
    throw new Error('Unsupported format. Expected our export (version 1.0) or an AAS v3 Environment JSON (BaSyx).');
  }
  // Basic validation
  for (const entry of data.assetAdministrationShells) {
    if (!entry.idShort || !entry.assetId || !entry.description) {
      throw new Error(`Invalid AAS entry: missing required fields (idShort, assetId, description).`);
    }
  }
  return data.assetAdministrationShells;
}


/**
 * Throw if any idShort of the import would be rejected (AASd-002, v3.0/v3.1
 * compatible rule; same rule as the database constraints). Prevents partial
 * imports where some rows are written before the database refuses one.
 */
export function assertImportableIdShorts(entries: AASExportEntry[]): AASExportEntry[] {
  const problems: string[] = [];
  const check = (value: string, where: string, allowPath = false) => {
    const r = validateIdShort(value, { allowPath });
    if (!r.valid) problems.push(`${where}: ${r.message}`);
  };
  for (const e of entries) {
    check(e.idShort, `AAS "${e.idShort}"`);
    for (const sm of e.submodels) {
      check(sm.idShort, `Submodel "${e.idShort}/${sm.idShort}"`);
      for (const p of sm.properties) {
        if (p.idShort !== STRUCTURE_PROP) check(p.idShort, `Element "${e.idShort}/${sm.idShort}/${p.idShort}"`, true);
      }
    }
  }
  if (problems.length) {
    const more = problems.length > 5 ? ` (+${problems.length - 5} more)` : '';
    throw new Error(`Invalid idShort(s): ${problems.slice(0, 5).join(' | ')}${more}`);
  }
  return entries;
}
