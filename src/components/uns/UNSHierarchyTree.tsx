import { useState } from 'react';
import { UNSNode } from '@/types/industrial';
import { ChevronRight, ChevronDown, Building2, MapPin, Box, Workflow, Cpu, Radio, AlertTriangle } from 'lucide-react';
import { subtreeIds, TrackedAssetPlacement } from '@/lib/unsContext';
import { qualityClass } from './movableStyles';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface UNSHierarchyTreeProps {
  nodes: UNSNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  /** Movable (tracked) assets placed on UNS nodes, shown as leaves. */
  placement?: TrackedAssetPlacement;
  onSelectTrackedAsset?: (trackedAssetId: string) => void;
  /** Tracked assets that just moved (live update), highlighted briefly. */
  movedAssetIds?: Set<string>;
}

const UNPLACED_REASON = {
  noLocation: 'no location',
  unknownLocation: 'location not in UNS',
  ambiguous: 'location matches several nodes',
} as const;

const getLevelIcon = (level: string) => {
  switch (level) {
    case 'Enterprise': return Building2;
    case 'Site': return MapPin;
    case 'Area': return Box;
    case 'Line': return Workflow;
    case 'Cell': return Cpu;
    default: return Box;
  }
};

const getLevelColor = (level: string) => {
  switch (level) {
    case 'Enterprise': return 'text-primary';
    case 'Site': return 'text-blue-400';
    case 'Area': return 'text-green-400';
    case 'Line': return 'text-yellow-400';
    case 'Cell': return 'text-orange-400';
    default: return 'text-foreground';
  }
};

export const UNSHierarchyTree = ({ nodes, selectedNodeId, onSelectNode, placement, onSelectTrackedAsset, movedAssetIds }: UNSHierarchyTreeProps) => {
  // Auto-expand Enterprise and Site levels for better visibility
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const enterpriseNodes = nodes.filter(n => n.level === 'Enterprise');
    const siteNodes = nodes.filter(n => n.level === 'Site');
    return new Set([...enterpriseNodes.map(n => n.id), ...siteNodes.map(n => n.id)]);
  });

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const levels: string[] = ['Enterprise', 'Site', 'Area', 'Line', 'Cell'];

  const getLevelIndex = (level: string) => levels.indexOf(level);

  const getChildren = (parentId: string | null, parentLevel?: string) => {
    // If we have an explicit parentId from the database, use it first
    if (parentId) {
      return nodes.filter((node) => node.parentId === parentId);
    }

    // Root call: return only Enterprise nodes when no parent is provided
    if (!parentLevel) {
      const enterpriseNodes = nodes.filter((node) => node.level === 'Enterprise');
      if (enterpriseNodes.length > 0) return enterpriseNodes;
      // Fallback: if no Enterprise node exists yet, show all top-level nodes
      return nodes.filter((node) => node.parentId === null);
    }

    // Virtual hierarchy when parent-child links are not set in the DB
    const parentIndex = getLevelIndex(parentLevel);
    if (parentIndex === -1) return [];
    const childLevel = levels[parentIndex + 1];
    if (!childLevel) return [];

    // Attach all nodes of the next ISA-95 level that don't have an explicit parent
    return nodes.filter(
      (node) => node.level === childLevel && node.parentId === null,
    );
  };

  const movableIn = (nodeId: string) => {
    if (!placement) return [];
    return [...subtreeIds(nodeId, nodes)].flatMap(id => placement.byNode.get(id) ?? []);
  };
  const justMoved = (assetId: string) => movedAssetIds?.has(assetId) ?? false;

  const renderNode = (node: UNSNode, depth: number = 0) => {
    const children = getChildren(node.id, node.level);
    const movable = placement?.byNode.get(node.id) ?? [];
    const hasChildren = children.length > 0 || movable.length > 0;
    const hidden = expandedNodes.has(node.id) ? [] : movableIn(node.id);
    const hiddenMovable = hidden.length;
    const hiddenMoved = hidden.some(p => justMoved(p.asset.id));
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const Icon = getLevelIcon(node.level);

    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-muted',
            isSelected && 'bg-primary/10 border-l-2 border-primary'
          )}
          style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
          onClick={() => onSelectNode(node.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="flex-shrink-0 hover:bg-accent rounded-sm p-1 transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-6 flex-shrink-0" />
          )}
          <Icon className={cn('h-4 w-4', getLevelColor(node.level))} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{node.name}</span>
              {node.metadata?.rds_location && (
                <code className="text-xs font-mono text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
                  {node.metadata.rds_location}
                </code>
              )}
            </div>
          </div>
          {hiddenMovable > 0 && (
            <Badge variant="secondary" className={cn('text-xs gap-1 flex-shrink-0', hiddenMoved && 'animate-pulse bg-primary/20')} title={`${hiddenMovable} movable assets here or below`}>
              <Radio className="h-3 w-3" />{hiddenMovable}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs font-mono flex-shrink-0">
            {node.level}
          </Badge>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {movable.map(({ asset, kind }) => (
              <button
                type="button"
                key={asset.id}
                onClick={() => onSelectTrackedAsset?.(asset.id)}
                className={cn('flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left transition-colors hover:bg-muted', justMoved(asset.id) && 'animate-pulse bg-primary/15')}
                style={{ paddingLeft: `${(depth + 1) * 1.5 + 0.75 + 1.5}rem` }}
                title={`${asset.assetId} · ${asset.currentState} · quality ${asset.currentQualityState}${kind === 'subLocation' ? ` · ${asset.currentLocationPath}` : ''}`}
              >
                <Radio className={cn('h-3.5 w-3.5 shrink-0', qualityClass(asset.currentQualityState))} />
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{asset.assetId}</span>
                <Badge variant="outline" className="text-[10px] flex-shrink-0">{asset.assetType}</Badge>
              </button>
            ))}
            {children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Root: start from Enterprise level as highest ISA-95 node
  const rootNodes = getChildren(null);

  return (
    <div className="space-y-1">
      {rootNodes.length === 0 ? (
        <div className="text-sm text-muted-foreground p-4">
          No UNS nodes found. Create an Enterprise node to start building your ISA-95 hierarchy.
        </div>
      ) : (
        rootNodes.map((node) => renderNode(node, 0))
      )}
      {placement && placement.unplaced.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <p className="mb-1 flex items-center gap-2 px-3 text-xs font-semibold text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
            Movable assets not in the UNS ({placement.unplaced.length})
          </p>
          {placement.unplaced.map(({ asset, reason }) => (
            <button
              type="button"
              key={asset.id}
              onClick={() => onSelectTrackedAsset?.(asset.id)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left hover:bg-muted"
              title={asset.currentLocationPath ?? ''}
            >
              <Radio className={cn('h-3.5 w-3.5 shrink-0', qualityClass(asset.currentQualityState))} />
              <span className="min-w-0 flex-1 truncate font-mono text-xs">{asset.assetId}</span>
              <span className="text-[10px] text-muted-foreground flex-shrink-0">{UNPLACED_REASON[reason]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
