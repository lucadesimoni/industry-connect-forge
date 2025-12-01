import { RDSDesignation } from '@/types/industrial';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Edit, Network } from 'lucide-react';
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

interface RDSTableProps {
  rdsList: RDSDesignation[];
  selectedRDSId: string | null;
  onSelectRDS: (rdsId: string) => void;
}

export const RDSTable = ({ rdsList, selectedRDSId, onSelectRDS }: RDSTableProps) => {
  // Group by aspect code to show hierarchy
  const groupedByAspect = rdsList.reduce((acc, rds) => {
    const aspectType = getAspectCodeLabel(rds.aspectCode);
    if (!acc[aspectType]) {
      acc[aspectType] = [];
    }
    acc[aspectType].push(rds);
    return acc;
  }, {} as Record<string, RDSDesignation[]>);

  return (
    <div className="space-y-4">
      {Object.entries(groupedByAspect).map(([aspectType, items]) => (
        <div key={aspectType} className="border rounded-lg border-border">
          <div className="bg-muted/50 px-4 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Network className={cn('h-4 w-4', getAspectCodeColor(items[0].aspectCode))} />
              <h3 className="font-semibold text-sm">{aspectType} Aspect</h3>
              <Badge variant="secondary" className="text-xs ml-auto">
                {items.length} Items
              </Badge>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono">Designation</TableHead>
                <TableHead>Aspect Code</TableHead>
                <TableHead>Object Class</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Links</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((rds) => (
                <TableRow
                  key={rds.id}
                  className={cn(
                    'cursor-pointer transition-colors',
                    selectedRDSId === rds.id && 'bg-primary/5 border-l-2 border-primary'
                  )}
                  onClick={() => onSelectRDS(rds.id)}
                >
                  <TableCell className="font-mono font-bold">
                    <span className={getAspectCodeColor(rds.aspectCode)}>
                      {rds.designation}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn('font-mono', getAspectCodeColor(rds.aspectCode))}
                    >
                      {rds.aspectCode}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{rds.objectClass}</TableCell>
                  <TableCell className="text-sm">{rds.description}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
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
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
};
