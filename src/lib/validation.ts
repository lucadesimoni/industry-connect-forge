import { AAS, RDSDesignation, UNSNode } from '@/types/industrial';

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
