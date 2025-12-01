import { useState } from 'react';
import { RDSDesignation } from '@/types/industrial';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ExternalLink, Edit, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Parse hierarchy level from designation (e.g., "=M1.A2.3" has 3 levels)
const getHierarchyLevel = (designation: string): number => {
  const withoutAspect = designation.substring(1); // Remove aspect code (=, -, +)
  return withoutAspect.split('.').length;
};

// Get parent designation (e.g., "=M1.A2.3" -> "=M1.A2")
const getParentDesignation = (designation: string): string | null => {
  const parts = designation.split('.');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('.');
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
              <Badge variant="secondary" className="text-xs font-mono font-semibold bg-primary/10 text-primary border-primary/20">
                L{hierarchyLevel}
              </Badge>
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
  const groupedByAspect = rdsList.reduce((acc, rds) => {
    const aspectType = getAspectCodeLabel(rds.aspectCode);
    if (!acc[aspectType]) {
      acc[aspectType] = [];
    }
    acc[aspectType].push(rds);
    return acc;
  }, {} as Record<string, RDSDesignation[]>);

  if (rdsList.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        No RDS designations found. Create a designation to start building your IEC 81346 hierarchy.
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
