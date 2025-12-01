import { RDSDesignation } from '@/types/industrial';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Link, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface RDSDetailPanelProps {
  rds: RDSDesignation;
}

export const RDSDetailPanel = ({ rds }: RDSDetailPanelProps) => {
  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-mono">{rds.designation}</CardTitle>
            <CardDescription className="mt-1">{rds.description}</CardDescription>
            {rds.metadata?.uns_topic && (
              <div className="mt-2 flex items-start gap-2">
                <span className="text-xs text-muted-foreground font-semibold">UNS Topic:</span>
                <code className="text-xs font-mono bg-green-400/10 text-green-400 px-2 py-1 rounded flex-1">
                  {rds.metadata.uns_topic}
                </code>
              </div>
            )}
            {rds.metadata?.broker_topic && (
              <div className="mt-1 flex items-start gap-2">
                <span className="text-xs text-muted-foreground font-semibold">Broker Path:</span>
                <code className="text-xs font-mono bg-green-400/10 text-green-400 px-2 py-1 rounded flex-1">
                  {rds.metadata.broker_topic}
                </code>
              </div>
            )}
            {rds.metadata?.aas_id && (
              <div className="mt-1 flex items-start gap-2">
                <span className="text-xs text-muted-foreground font-semibold">AAS ID:</span>
                <code className="text-xs font-mono bg-purple-400/10 text-purple-400 px-2 py-1 rounded">
                  {rds.metadata.aas_id}
                </code>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Link className="h-4 w-4 mr-2" />
              Link
            </Button>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Aspect Code (IEC 81346)</p>
            <Badge variant="secondary" className="font-mono text-base">{rds.aspectCode}</Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {rds.aspectCode === '=' && 'Function Aspect'}
              {rds.aspectCode === '-' && 'Product Aspect'}
              {rds.aspectCode === '+' && 'Location Aspect'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Object Class</p>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{rds.objectClass}</code>
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-sm text-muted-foreground mb-1">RDS ID</p>
          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{rds.id}</code>
        </div>

        {rds.metadata && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-semibold mb-2">Hierarchy Details</p>
              <div className="space-y-2">
                {rds.metadata.level && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Hierarchy Level</p>
                    <p className="text-sm font-medium">Level {rds.metadata.level}</p>
                  </div>
                )}
                {rds.metadata.type && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Type</p>
                    <p className="text-sm font-medium capitalize">{String(rds.metadata.type).replace(/_/g, ' ')}</p>
                  </div>
                )}
                {rds.metadata.full_path && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Full RDS Path</p>
                    <code className="text-xs font-mono">{rds.metadata.full_path}</code>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {rds.metadata && (rds.metadata.functionAspect || rds.metadata.productAspect || rds.metadata.locationAspect) && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-semibold mb-2">IEC 81346 Aspect Details</p>
              <div className="space-y-2">
                {rds.metadata.functionAspect && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Function Aspect (=)</p>
                    <p className="text-sm font-medium">{rds.metadata.functionAspect}</p>
                  </div>
                )}
                {rds.metadata.productAspect && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Product Aspect (-)</p>
                    <p className="text-sm font-medium">{rds.metadata.productAspect}</p>
                  </div>
                )}
                {rds.metadata.locationAspect && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Location Aspect (+)</p>
                    <p className="text-sm font-medium">{rds.metadata.locationAspect}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <Separator />

        <div>
          <h3 className="text-sm font-semibold mb-2">Entity Links</h3>
          <div className="space-y-2">
            {rds.linkedUNSNodeId && (
              <div className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                <span className="text-muted-foreground">Linked UNS Node:</span>
                <code className="font-mono">{rds.linkedUNSNodeId}</code>
              </div>
            )}
            {rds.linkedAASId && (
              <div className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                <span className="text-muted-foreground">Linked AAS:</span>
                <code className="font-mono">{rds.linkedAASId}</code>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created
            </p>
            <p className="text-sm font-mono">{rds.createdAt.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Updated
            </p>
            <p className="text-sm font-mono">{rds.updatedAt.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
