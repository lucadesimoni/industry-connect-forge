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
