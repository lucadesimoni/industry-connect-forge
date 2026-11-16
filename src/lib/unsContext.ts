/**
 * Movable (tracked) assets and dashboards in the context of the UNS.
 *
 * A tracked asset stores its position as a free location path
 * (`tracked_assets.current_location_path`). Its location topic is
 * `enterprise/locations/{path}/assets/{id}` (ADR 0002), and a UNS node's
 * location topic is `enterprise/locations/{Site/Area/Line/Cell}` (enterprise
 * level dropped, levels sanitized: hierarchyUtils.generateLocationTopic).
 * An asset therefore belongs to the UNS node whose location path is equal to
 * the normalized asset path. If the asset path goes deeper than the UNS
 * (e.g. a rack position inside a cell), it belongs to the deepest node that is
 * a prefix, flagged as a sub-location. Matching is case-sensitive like MQTT.
 * Paths that match no node, or more than one node (two enterprises with the
 * same site path), are reported and never guessed.
 */
import { AAS, AssetEvent, ISA95Level, RDSDesignation, TrackedAsset, UNSNode } from '@/types/industrial';
import { normalizeTopicPath } from './mqttTopics';
import { generateLocationTopic } from './hierarchyUtils';
import { getAssetOverview } from './assetOverview';

/** ISA-95 path built from the tree itself (not from possibly stale metadata). */
export const unsTreePath = (node: UNSNode, nodes: UNSNode[]): string => {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const parts: string[] = [];
  const seen = new Set<string>();
  let current: UNSNode | undefined = node;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    parts.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return parts.join('/');
};

/** Location path of a node as used by Track & Trace; '' for Enterprise nodes. */
export const locationPathForNode = (node: UNSNode, nodes: UNSNode[]): string =>
  normalizeTopicPath(unsTreePath(node, nodes)).split('/').slice(1).join('/');

/** Location topic of a node (ADR 0002), '' for Enterprise nodes. */
export const locationTopicForNode = (node: UNSNode, nodes: UNSNode[]): string =>
  generateLocationTopic(normalizeTopicPath(unsTreePath(node, nodes)));

export type PlacementKind = 'exact' | 'subLocation';

export interface AssetPlacement {
  asset: TrackedAsset;
  nodeId: string;
  kind: PlacementKind;
}

export interface UnplacedAsset {
  asset: TrackedAsset;
  reason: 'noLocation' | 'unknownLocation' | 'ambiguous';
  candidates?: string[];
}

export interface TrackedAssetPlacement {
  /** node id -> assets located exactly at / below this node (not its children) */
  byNode: Map<string, AssetPlacement[]>;
  unplaced: UnplacedAsset[];
}

/** Assign each tracked asset to the UNS node it is located at. */
export function placeTrackedAssets(nodes: UNSNode[], assets: TrackedAsset[]): TrackedAssetPlacement {
  const nodesByPath = new Map<string, string[]>();
  for (const node of nodes) {
    const path = locationPathForNode(node, nodes);
    if (!path) continue;
    nodesByPath.set(path, [...(nodesByPath.get(path) ?? []), node.id]);
  }

  const byNode = new Map<string, AssetPlacement[]>();
  const unplaced: UnplacedAsset[] = [];
  for (const asset of assets) {
    const path = asset.currentLocationPath ? normalizeTopicPath(asset.currentLocationPath) : '';
    if (!path) {
      unplaced.push({ asset, reason: 'noLocation' });
      continue;
    }
    const levels = path.split('/');
    let placed = false;
    for (let depth = levels.length; depth > 0; depth--) {
      const ids = nodesByPath.get(levels.slice(0, depth).join('/'));
      if (!ids) continue;
      if (ids.length > 1) {
        unplaced.push({ asset, reason: 'ambiguous', candidates: ids });
      } else {
        const kind: PlacementKind = depth === levels.length ? 'exact' : 'subLocation';
        byNode.set(ids[0], [...(byNode.get(ids[0]) ?? []), { asset, nodeId: ids[0], kind }]);
      }
      placed = true;
      break;
    }
    if (!placed) unplaced.push({ asset, reason: 'unknownLocation' });
  }
  return { byNode, unplaced };
}

/** The node and all its descendants (cycle-safe). */
export const subtreeIds = (rootId: string, nodes: UNSNode[]): Set<string> => {
  const ids = new Set<string>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const n of nodes) {
      if (n.parentId && ids.has(n.parentId) && !ids.has(n.id)) {
        ids.add(n.id);
        added = true;
      }
    }
  }
  return ids;
};

/** Is a (free) location path inside the subtree of `node`? */
export const isLocationInSubtree = (location: string | null, node: UNSNode, nodes: UNSNode[]): boolean => {
  if (!location) return false;
  const path = normalizeTopicPath(location);
  const root = locationPathForNode(node, nodes);
  if (!root) {
    // Enterprise: every site path below it
    return nodes
      .filter(n => n.parentId === node.id)
      .some(site => isLocationInSubtree(location, site, nodes));
  }
  return path === root || path.startsWith(`${root}/`);
};

const ATTENTION_QUALITY = new Set(['warning', 'blocked']);

export interface UNSDashboard {
  levelCounts: Partial<Record<ISA95Level, number>>;
  sparkplug: { edgeNodes: number; devices: number };
  aas: { total: number; withIssues: number; missingValues: number; issues: { aas: AAS; issues: string[] }[] };
  rds: number;
  movable: {
    here: AssetPlacement[];
    inSubtree: AssetPlacement[];
    byState: Record<string, number>;
    attention: AssetPlacement[];
  };
  topics: { location: string; assetsHere: string; assetsInSubtree: string };
  recentEvents: AssetEvent[];
}

/** KPIs of a UNS node and everything below it. */
export function buildUNSDashboard(
  node: UNSNode,
  nodes: UNSNode[],
  aasList: AAS[],
  rdsList: RDSDesignation[],
  placement: TrackedAssetPlacement,
  events: AssetEvent[] = [],
  maxEvents = 10,
): UNSDashboard {
  const ids = subtreeIds(node.id, nodes);
  const subtree = nodes.filter(n => ids.has(n.id));

  const levelCounts: Partial<Record<ISA95Level, number>> = {};
  for (const n of subtree) {
    if (n.id === node.id) continue;
    levelCounts[n.level] = (levelCounts[n.level] ?? 0) + 1;
  }

  const aasHere = aasList.filter(a => !a.isType && a.linkedUNSNodeId && ids.has(a.linkedUNSNodeId));
  const issues = aasHere
    .map(a => ({ aas: a, overview: getAssetOverview(a, nodes, rdsList) }))
    .filter(x => x.overview.issues.length > 0)
    .map(x => ({ aas: x.aas, issues: x.overview.issues }));
  const missingValues = aasHere.reduce((n, a) => n + getAssetOverview(a, nodes, rdsList).missingValues, 0);

  const here = placement.byNode.get(node.id) ?? [];
  const inSubtree = subtree.flatMap(n => placement.byNode.get(n.id) ?? []);
  const byState: Record<string, number> = {};
  for (const p of inSubtree) byState[p.asset.currentState] = (byState[p.asset.currentState] ?? 0) + 1;

  const location = locationTopicForNode(node, nodes);
  const assetIds = new Set(inSubtree.map(p => p.asset.id));
  const recentEvents = events
    .filter(e =>
      assetIds.has(e.assetId) ||
      isLocationInSubtree(e.toLocation, node, nodes) ||
      isLocationInSubtree(e.fromLocation, node, nodes))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, maxEvents);

  return {
    levelCounts,
    sparkplug: {
      edgeNodes: subtree.filter(n => n.level === 'Line').length,
      devices: subtree.filter(n => n.level === 'Cell').length,
    },
    aas: { total: aasHere.length, withIssues: issues.length, missingValues, issues },
    rds: rdsList.filter(r => r.linkedUNSNodeId && ids.has(r.linkedUNSNodeId)).length,
    movable: {
      here,
      inSubtree,
      byState,
      attention: inSubtree.filter(p => ATTENTION_QUALITY.has(p.asset.currentQualityState)),
    },
    topics: {
      location,
      assetsHere: location ? `${location}/assets/+/#` : '',
      // every asset at this node or any node below it; none for Enterprise
      // nodes, whose name is not part of the Track & Trace namespace (ADR 0002)
      assetsInSubtree: location ? `${location}/#` : '',
    },
    recentEvents,
  };
}
