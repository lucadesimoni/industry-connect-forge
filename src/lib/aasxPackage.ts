/**
 * AASX package (.aasx) reader/writer.
 *
 * An AASX file is an OPC (Open Packaging Conventions) ZIP containing:
 *   [Content_Types].xml
 *   _rels/.rels                       -> points at aasx/aasx-origin
 *   aasx/aasx-origin                  (empty marker part)
 *   aasx/_rels/aasx-origin.rels       -> points at the AAS spec part
 *   aasx/data.json                    (the AAS v3 Environment, JSON serialization)
 *
 * Eclipse BaSyx and the AASX Package Explorer both read this layout.
 */
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { AAS } from '@/types/industrial';
import { buildBaSyxEnvironment, isBaSyxEnvironment, parseBaSyxEnvironment } from './basyxEnvironment';
import { AASExportEntry } from './aasExportImport';

const ORIGIN_REL = 'http://admin-shell.io/aasx/relationships/aasx-origin';
const SPEC_REL = 'http://admin-shell.io/aasx/relationships/aas-spec';

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="text/xml"/>
  <Default Extension="json" ContentType="application/json"/>
  <Override PartName="/aasx/aasx-origin" ContentType="text/plain"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="${ORIGIN_REL}" Target="aasx/aasx-origin"/>
</Relationships>`;

const ORIGIN_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="${SPEC_REL}" Target="/aasx/data.json"/>
</Relationships>`;

/** Build an .aasx package (as a Blob) from our AAS records. */
export function buildAASXPackage(aasList: AAS[]): Blob {
  const environment = JSON.stringify(buildBaSyxEnvironment(aasList), (_k, v) => (v === undefined ? undefined : v), 2);

  const zipped = zipSync(
    {
      '[Content_Types].xml': strToU8(CONTENT_TYPES),
      '_rels/.rels': strToU8(ROOT_RELS),
      'aasx/aasx-origin': strToU8(''),
      'aasx/_rels/aasx-origin.rels': strToU8(ORIGIN_RELS),
      'aasx/data.json': strToU8(environment),
    },
    { level: 6 }
  );

  // Copy into a fresh ArrayBuffer so the Blob is not tied to fflate's view.
  return new Blob([zipped.slice().buffer as ArrayBuffer], {
    type: 'application/asset-administration-shell-package+xml',
  });
}

export function downloadAASX(aasList: AAS[], filename: string) {
  const url = URL.createObjectURL(buildAASXPackage(aasList));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.aasx') ? filename : `${filename}.aasx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Extract the AAS Environment JSON out of an .aasx package. */
export function readAASXEnvironment(buffer: ArrayBuffer): any {
  const files = unzipSync(new Uint8Array(buffer));

  // Prefer the part referenced by aasx-origin.rels, then any JSON under aasx/.
  const relsEntry = files['aasx/_rels/aasx-origin.rels'];
  const candidates: string[] = [];
  if (relsEntry) {
    const rels = strFromU8(relsEntry);
    const match = rels.match(/Target="([^"]+)"/g) ?? [];
    for (const m of match) {
      const target = m.slice(8, -1).replace(/^\//, '');
      if (target.toLowerCase().endsWith('.json')) candidates.push(target);
    }
  }
  candidates.push(...Object.keys(files).filter((n) => n.toLowerCase().endsWith('.json')));

  for (const name of candidates) {
    const entry = files[name];
    if (!entry) continue;
    try {
      const parsed = JSON.parse(strFromU8(entry));
      if (isBaSyxEnvironment(parsed)) return parsed;
    } catch {
      /* try next candidate */
    }
  }

  const hasXml = Object.keys(files).some((n) => n.toLowerCase().endsWith('.xml') && n.startsWith('aasx/'));
  throw new Error(
    hasXml
      ? 'This .aasx contains an XML serialization. Please re-export it as JSON (AASX Package Explorer: "Save as ... JSON") and try again.'
      : 'No AAS Environment JSON found inside the .aasx package.'
  );
}

export function parseAASXFile(buffer: ArrayBuffer): AASExportEntry[] {
  return parseBaSyxEnvironment(readAASXEnvironment(buffer));
}
