import { AAS } from '@/types/industrial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ExternalLink, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AASListProps {
  aasList: AAS[];
  selectedAASId: string | null;
  onSelectAAS: (aasId: string) => void;
}

export const AASList = ({ aasList, selectedAASId, onSelectAAS }: AASListProps) => {
  return (
    <div className="space-y-3">
      {aasList.map((aas) => (
        <Card
          key={aas.id}
          className={cn(
            'cursor-pointer transition-all hover:border-primary',
            selectedAASId === aas.id && 'border-primary bg-primary/5'
          )}
          onClick={() => onSelectAAS(aas.id)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{aas.idShort}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{aas.description}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Asset ID:</span>
              <code className="font-mono bg-muted px-2 py-0.5 rounded">{aas.assetId}</code>
            </div>
            {aas.manufacturer && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Manufacturer:</span>
                <span className="font-medium">{aas.manufacturer}</span>
              </div>
            )}
            {aas.serialNumber && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">S/N:</span>
                <code className="font-mono">{aas.serialNumber}</code>
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <Badge variant="secondary" className="text-xs">
                {aas.submodels.length} Submodels
              </Badge>
              {aas.linkedUNSNodeId && (
                <Badge variant="outline" className="text-xs">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  UNS Linked
                </Badge>
              )}
              {aas.linkedRDSId && (
                <Badge variant="outline" className="text-xs">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  RDS Linked
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
