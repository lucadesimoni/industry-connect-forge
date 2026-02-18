import { useState } from 'react';
import { RDSDesignation } from '@/types/industrial';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ExternalLink, Edit, ChevronRight, ChevronDown, Box, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

type RDSFilter = 'all' | 'abstract' | 'instance';

const getAspectCodeColor = (aspectCode: string) => {
  if (aspectCode.startsWith('=')) return 'text-blue-400';
  if (aspectCode.startsWith('-')) return 'text-green-400';
  if (aspectCode.startsWith('+')) return 'text-orange-400';
  return 'text-foreground';
};

const getAspectCodeLabel = (aspectCode: string) => {
  if (aspectCode.startsWith('=')) return 'Function';
  if (aspectCode.startsWith('-')) return 'Product';
  if (aspectCode.startsWith('+')) return 'Location';
  return 'Other';
};

// Check if designation is an instance (contains + for location)
const isInstanceDesignation = (designation: string): boolean => {
  return designation.includes('+');
};

// Parse hierarchy level from designation
// For abstracts: "=M1.A2.3" has 3 levels (split by .)
// For instances: treated as level 1 (root items in their category)
const getHierarchyLevel = (designation: string): number => {
  if (isInstanceDesignation(designation)) {
    return 1; // Instances are root items
  }
  const withoutAspect = designation.substring(1); // Remove aspect code (=, -, +)
  return withoutAspect.split('.').length;
};

// Get parent designation (e.g., "=M1.A2.3" -> "=M1.A2")
// Instances don't have hierarchy parents in this view
const getParentDesignation = (designation: string): string | null => {
  if (isInstanceDesignation(designation)) {
    return null; // Instances are always root
  }
  const parts = designation.split('.');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('.')
};

interface RDSTableProps {
  rdsList: RDSDesignation[];
  selectedRDSId: string | null;
  onSelectRDS: (rdsId: string) => void;
  selectedForComparison: Set<string>;
  onToggleComparison: (rdsId: string) => void;
}

export const RDSTable = ({ rdsList, selectedRDSId, onSelectRDS, selectedForComparison, onToggleComparison }: RDSTableProps) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<RDSFilter>('all');

  // Apply filter
  const filteredList = rdsList.filter(rds => {
    if (filter === 'all') return true;
    if (filter === 'instance') return rds.isInstance;
    if (filter === 'abstract') return !rds.isInstance;
    return true;
  });

  const toggleExpand = (designation: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(designation)) {
      newExpanded.delete(designation);
    } else {
      newExpanded.add(designation);
    }
    setExpandedNodes(newExpanded);
  };

  // Build hierarchical structure
  const buildHierarchy = (items: RDSDesignation[]) => {
    const rootItems = items.filter(rds => getHierarchyLevel(rds.designation) === 1);
    
    const renderItem = (rds: RDSDesignation, level: number) => {
      const children = items.filter(item => getParentDesignation(item.designation) === rds.designation);
      const hasChildren = children.length > 0;
      const isExpanded = expandedNodes.has(rds.designation);
      const isSelected = selectedRDSId === rds.id;
      const isCheckedForComparison = selectedForComparison.has(rds.id);
      const hierarchyLevel = getHierarchyLevel(rds.designation);
      
      return (
        <div key={rds.id}>
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-muted',
              isSelected && 'bg-primary/5 border-l-2 border-primary'
            )}
            style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
            onClick={() => onSelectRDS(rds.id)}
          >
            <Checkbox
              checked={isCheckedForComparison}
              onCheckedChange={() => onToggleComparison(rds.id)}
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0"
            />
            
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(rds.designation);
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
            
            <div className="flex-1 flex items-center gap-2">
              <span className={cn('font-mono font-bold text-sm', getAspectCodeColor(rds.aspectCode))}>
                {rds.designation}
              </span>
              <Badge 
                variant="outline" 
                className={cn('text-xs font-mono font-semibold', getAspectCodeColor(rds.aspectCode))}
              >
                {rds.aspectCode}
              </Badge>
              {rds.isInstance && (
                <Badge variant="outline" className="text-xs">Instance</Badge>
              )}
              {!rds.isInstance && rds.aspectCode !== '+' && (
                <Badge variant="outline" className="text-xs opacity-60">Abstract</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{rds.objectClass}</span>
              <span className="text-xs max-w-[200px] truncate">{rds.description}</span>
              
              <div className="flex gap-1 ml-2">
                {rds.linkedUNSNodeId && (
                  <Badge variant="secondary" className="text-xs">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    UNS
                  </Badge>
                )}
                {rds.linkedAASId && (
                  <Badge variant="secondary" className="text-xs">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    AAS
                  </Badge>
                )}
              </div>
              
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {hasChildren && isExpanded && (
            <div>
              {children.map(child => renderItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    };

    return rootItems.map(item => renderItem(item, 0));
  };

  // Group by aspect for IEC 81346 6+1 level hierarchy
  const groupedByAspect = filteredList.reduce((acc, rds) => {
    const aspectType = getAspectCodeLabel(rds.aspectCode);
    if (!acc[aspectType]) {
      acc[aspectType] = [];
    }
    acc[aspectType].push(rds);
    return acc;
  }, {} as Record<string, RDSDesignation[]>);

  // Count for filter badges
  const instanceCount = rdsList.filter(r => r.isInstance).length;
  const abstractCount = rdsList.filter(r => !r.isInstance).length;

  if (filteredList.length === 0 && rdsList.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as RDSFilter)}>
            <ToggleGroupItem value="all" aria-label="Show all">
              All ({rdsList.length})
            </ToggleGroupItem>
            <ToggleGroupItem value="abstract" aria-label="Show abstracts only">
              <Layers className="h-4 w-4 mr-1" />
              Abstract ({abstractCount})
            </ToggleGroupItem>
            <ToggleGroupItem value="instance" aria-label="Show instances only">
              <Box className="h-4 w-4 mr-1" />
              Instance ({instanceCount})
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="text-sm text-muted-foreground p-4">
          No RDS designations match the current filter.
        </div>
      </div>
    );
  }

  if (rdsList.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        No RDS designations found. Create a designation to start building your IEC 81346 hierarchy.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as RDSFilter)}>
          <ToggleGroupItem value="all" aria-label="Show all">
            All ({rdsList.length})
          </ToggleGroupItem>
          <ToggleGroupItem value="abstract" aria-label="Show abstracts only">
            <Layers className="h-4 w-4 mr-1" />
            Abstract ({abstractCount})
          </ToggleGroupItem>
          <ToggleGroupItem value="instance" aria-label="Show instances only">
            <Box className="h-4 w-4 mr-1" />
            Instance ({instanceCount})
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {Object.entries(groupedByAspect).map(([aspectType, items]) => (
        <div key={aspectType} className="border rounded-lg border-border">
          <div className="bg-muted/50 px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn('h-2 w-2 rounded-full', getAspectCodeColor(items[0].aspectCode).replace('text-', 'bg-'))} />
                <h3 className="font-semibold text-sm">{aspectType} Aspect</h3>
                <span className="text-xs text-muted-foreground">IEC 81346 Hierarchy</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {items.length} Items
              </Badge>
            </div>
          </div>
          <div className="p-2 space-y-1">
            {buildHierarchy(items)}
          </div>
        </div>
      ))}
    </div>
  );
};
