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
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['uns-1', 'uns-2', 'uns-3']));

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getChildren = (parentId: string | null) => {
    return nodes.filter(node => node.parentId === parentId);
  };

  const renderNode = (node: UNSNode, depth: number = 0) => {
    const children = getChildren(node.id);
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
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="hover:bg-muted-foreground/20 rounded p-0.5"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
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

  const rootNodes = getChildren(null);

  return (
    <div className="space-y-1">
      {rootNodes.map(node => renderNode(node))}
    </div>
  );
};
