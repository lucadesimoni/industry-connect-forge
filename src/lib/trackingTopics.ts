import { TrackedAsset, AssetContextBinding } from '@/types/industrial';
import { normalizeTopicPath, sanitizeTopicLevel } from './mqttTopics';

/**
 * Generate UNS-compliant topic paths for a tracked asset.
 * Topics are computed, not stored as UNS nodes.
 *
 * Namespace (shared with UNS location projection, see hierarchyUtils.generateLocationTopic):
 *   enterprise/assets/{assetId}/...
 *   enterprise/locations/{site}/{area}/{line}/assets/{assetId}
 *   enterprise/contexts/{type}/{contextId}/assets/{assetId}
 *
 * Every dynamic level is sanitized so the result is always a valid MQTT
 * topic name (no wildcards, whitespace, empty levels or embedded '/').
 */
export function generateAssetTopics(asset: TrackedAsset, bindings: AssetContextBinding[] = []) {
  const id = sanitizeTopicLevel(asset.assetId) || 'unknown';

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

  const locationPath = asset.currentLocationPath ? normalizeTopicPath(asset.currentLocationPath) : '';
  const location = locationPath ? `enterprise/locations/${locationPath}/assets/${id}` : null;

  const contexts = bindings
    .filter(b => b.isActive)
    .map(b => {
      const type = sanitizeTopicLevel(b.contextType) || 'context';
      const ctxId = sanitizeTopicLevel(b.contextId) || 'unknown';
      return `enterprise/contexts/${type}/${ctxId}/assets/${id}`;
    });

  return { identity, telemetry, status, events, location, contexts };
}
