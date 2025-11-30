import { RDSDesignation } from '@/types/industrial';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RDSTableProps {
  rdsList: RDSDesignation[];
  selectedRDSId: string | null;
  onSelectRDS: (rdsId: string) => void;
}

export const RDSTable = ({ rdsList, selectedRDSId, onSelectRDS }: RDSTableProps) => {
  return (
    <div className="border rounded-lg border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-mono">Designation</TableHead>
            <TableHead>Aspect</TableHead>
            <TableHead>Object Class</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Links</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rdsList.map((rds) => (
            <TableRow
              key={rds.id}
              className={cn(
                'cursor-pointer',
                selectedRDSId === rds.id && 'bg-primary/5 border-l-2 border-primary'
              )}
              onClick={() => onSelectRDS(rds.id)}
            >
              <TableCell className="font-mono font-bold text-primary">{rds.designation}</TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono">{rds.aspectCode}</Badge>
              </TableCell>
              <TableCell className="font-mono">{rds.objectClass}</TableCell>
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
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
