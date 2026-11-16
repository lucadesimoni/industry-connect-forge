/** What one Forge Guide conversation is about. The server loads the matching records with the caller's access rights. */
export type ForgeGuideScope =
  | { kind: 'asset'; id: string; label: string }
  | { kind: 'node'; id: string; label: string; level: string }
  | { kind: 'plant'; label: string };

/** Changing scope starts a new conversation. */
export const scopeKey = (scope: ForgeGuideScope) => (scope.kind === 'plant' ? 'plant' : `${scope.kind}:${scope.id}`);
