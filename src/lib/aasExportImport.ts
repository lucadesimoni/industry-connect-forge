import { AAS, AASSubmodel, AASProperty } from '@/types/industrial';

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
      value: any;
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

