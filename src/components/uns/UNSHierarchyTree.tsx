import { useState } from 'react';
import { UNSNode } from '@/types/industrial';
import { ChevronRight, ChevronDown, Building2, MapPin, Box, Workflow, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface UNSHierarchyTreeProps {
  nodes: UNSNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

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

export const UNSHierarchyTree = ({ nodes, selectedNodeId, onSelectNode }: UNSHierarchyTreeProps) => {
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

  const renderNode = (node: UNSNode, depth: number = 0) => {
    const children = getChildren(node.id, node.level);
    const hasChildren = children.length > 0;
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
          <span className="flex-1 text-sm font-medium">{node.name}</span>
          <Badge variant="outline" className="text-xs font-mono">
            {node.level}
          </Badge>
        </div>
        {hasChildren && isExpanded && (
          <div>
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
    </div>
  );
};
