import { TrackedAsset, AssetContextBinding } from '@/types/industrial';

/**
 * Generate UNS-compliant topic paths for a tracked asset.
 * Topics are computed, not stored as UNS nodes.
 */
export function generateAssetTopics(asset: TrackedAsset, bindings: AssetContextBinding[] = []) {
  const id = asset.assetId;

  const identity = `enterprise/assets/${id}`;

  const telemetry = [
    `${identity}/telemetry/location`,
    `${identity}/telemetry/temperature`,
    `${identity}/telemetry/shock`,
  ];

  const status = [
    `${identity}/status/state`,
    `${identity}/status/quality`,
  ];

  const events = [
    `${identity}/events/locationChanged`,
    `${identity}/events/qualityViolation`,
    `${identity}/events/stateChanged`,
  ];

  const location = asset.currentLocationPath
    ? `enterprise/locations/${asset.currentLocationPath}/assets/${id}`
    : null;

  const contexts = bindings
    .filter(b => b.isActive)
    .map(b => `enterprise/contexts/${b.contextType}/${b.contextId}/assets/${id}`);

  return { identity, telemetry, status, events, location, contexts };
}
