import { AAS, RDSDesignation, UNSNode } from '@/types/industrial';

/**
 * Validate that an Asset ID follows IRI format (URI/URN) per IDTA-01001 / IEC 63278.
 * The globalAssetId must be a globally unique, persistent identifier that accompanies
 * the asset throughout its entire lifecycle and value chain.
 *
 * Accepted formats:
 *  - URN: urn:<namespace>:<asset-identifier>  (e.g., urn:example.com:asset:CNC-001)
 *  - HTTPS IRI: https://<domain>/<path>       (e.g., https://example.com/assets/CNC-001)
 */
export const validateAssetId = (assetId: string): { valid: boolean; message?: string } => {
  const trimmed = assetId.trim();
  if (!trimmed) {
    return { valid: false, message: 'Asset ID (globalAssetId) is required.' };
  }

  const isURN = /^urn:[a-zA-Z0-9][a-zA-Z0-9-]{0,31}:[a-zA-Z0-9()+,\-./:=@;$_!*'%]+$/.test(trimmed);
  const isHTTPS = /^https?:\/\/.+/.test(trimmed);

  if (!isURN && !isHTTPS) {
    return {
      valid: false,
      message: 'Asset ID must be a globally unique IRI per IEC 63278. Use URN format (urn:company:asset:ID) or HTTPS (https://company.com/assets/ID).',
    };
  }

  return { valid: true };
};

/**
 * Generate a suggested globalAssetId in URN format.
 */
export const generateAssetIdSuggestion = (idShort: string, isType: boolean): string => {
  const slug = idShort.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_.]/g, '') || 'asset';
  const prefix = isType ? 'type' : 'instance';
  return `urn:your-company:aas:${prefix}:${slug}`;
};

/**
 * idShort per AASd-002, valid in ALL metamodel versions we exchange with:
 *  - v3.0 (IDTA-01001-3-0, our export format): ^[a-zA-Z][a-zA-Z0-9_]*$
 *  - v3.1 / v3.2:                             ^[a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9_]+$
 * Intersection: letter first, then letters/digits/'_' only, at least 2 chars,
 * max. 128 (source: aas-core-works/aas-core-meta v3.py, v3_1.py, v3_2.py).
 * With `allowPath`, dotted paths (Collection.Property) are accepted: this app
 * stores nested SubmodelElements with dotted idShort paths (see aasElements.ts),
 * and each segment must be a valid idShort.
 */
export const ID_SHORT_PATTERN = '^[a-zA-Z][a-zA-Z0-9_]+$';
const ID_SHORT_RE = new RegExp(ID_SHORT_PATTERN);

export const validateIdShort = (
  idShort: string,
  options: { allowPath?: boolean } = {}
): { valid: boolean; message?: string } => {
  const trimmed = idShort.trim();
  if (!trimmed) return { valid: false, message: 'ID Short is required.' };

  const segments = options.allowPath ? trimmed.split('.') : [trimmed];
  for (const segment of segments) {
    if (segment.length > 128) {
      return { valid: false, message: 'ID Short must be 128 characters or less.' };
    }
    if (!ID_SHORT_RE.test(segment)) {
      return {
        valid: false,
        message: `"${segment || '(empty)'}" is not a valid idShort: start with a letter, then at least one more letter, digit or "_" (no "-", spaces or dots; AAS v3.0/v3.1 compatible).`,
      };
    }
  }
  return { valid: true };
};

export const validateUNSNodeName = (name: string): { valid: boolean; message?: string } => {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, message: 'UNS node name is required.' };
  }
  if (trimmed.length > 60) {
    return { valid: false, message: 'UNS node name must be 60 characters or less.' };
  }
  if (!/^[A-Za-z0-9 _.-]+$/.test(trimmed)) {
    return { valid: false, message: 'UNS node name can only contain letters, numbers, spaces, underscores, hyphens, and dots.' };
  }
  return { valid: true };
};

export const isUniqueUNSNameUnderParent = (
  name: string,
  parentId: string | null,
  nodes: UNSNode[],
  currentId?: string
): boolean => {
  const normalized = name.trim().toLowerCase();
  return !nodes.some(node => {
    if (currentId && node.id === currentId) return false;
    return node.parentId === parentId && node.name.trim().toLowerCase() === normalized;
  });
};

export const isUniqueAssetId = (assetId: string, aasList: AAS[], currentId?: string): boolean => {
  const normalized = assetId.trim().toLowerCase();
  return !aasList.some(aas => {
    if (currentId && aas.id === currentId) return false;
    return aas.assetId.trim().toLowerCase() === normalized;
  });
};

export const isUniqueRDSDesignation = (
  designation: string,
  rdsList: RDSDesignation[],
  currentId?: string
): boolean => {
  const normalized = designation.trim().toLowerCase();
  return !rdsList.some(rds => {
    if (currentId && rds.id === currentId) return false;
    return rds.designation.trim().toLowerCase() === normalized;
  });
};
