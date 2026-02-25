import { useState, useMemo, useCallback } from 'react';
import { RDSDesignation, UNSNode, AAS } from '@/types/industrial';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Link, Calendar, MapPin, History, RefreshCw, ExternalLink, AlertTriangle, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RDSMoveDialog } from './RDSMoveDialog';
import { RDSLocationHistory } from './RDSLocationHistory';
import { RDSEditDialog } from './RDSEditDialog';
import { RDSLinkDialog } from './RDSLinkDialog';
import { useAssetMovement } from '@/hooks/useAssetMovement';
import { useRDS } from '@/hooks/useRDS';
import { getRelationshipSummary, findAllEntitiesAtLocation } from '@/lib/relationshipHelpers';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RDSDetailPanelProps {
  rds: RDSDesignation;
  unsNodes?: UNSNode[];
  aasList?: AAS[];
  allRDS?: RDSDesignation[];
}

export const RDSDetailPanel = ({ rds, unsNodes = [], aasList = [], allRDS = [] }: RDSDetailPanelProps) => {
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const { syncRDSWithUNS } = useAssetMovement();
  const { deleteRDS } = useRDS();

  const linkedNode = unsNodes.find(n => n.id === rds.linkedUNSNodeId);
  const linkedAAS = aasList.find(a => a.id === rds.linkedAASId);

  // Check for entities that link to this RDS
  const linkedEntities = useMemo(() => {
    const linked: { type: string; id: string; name: string }[] = [];
    
    // Check if any AAS links to this RDS
    const linkedAASList = aasList.filter(a => a.linkedRDSId === rds.id);
    linkedAASList.forEach(aas => {
      linked.push({ type: 'AAS', id: aas.id, name: aas.idShort });
    });

    return linked;
  }, [rds.id, aasList]);

  // Build heritage/ancestry chain using parentDefinitionId
  const heritage = useMemo(() => {
    const chain: RDSDesignation[] = [];
    let current: RDSDesignation | undefined = rds;
    const visited = new Set<string>();
    
    while (current?.parentDefinitionId && !visited.has(current.parentDefinitionId)) {
      visited.add(current.parentDefinitionId);
      const parent = allRDS.find(r => r.id === current!.parentDefinitionId);
      if (parent) {
        chain.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }
    return chain;
  }, [rds, allRDS]);

  const handleDelete = async () => {
    let message = `Are you sure you want to delete RDS "${rds.designation}"?`;
    
    if (linkedEntities.length > 0) {
      message += `\n\nThis will break links to:\n${linkedEntities.map(e => `- ${e.type}: ${e.name}`).join('\n')}`;
    }

    if (confirm(message)) {
      await deleteRDS.mutateAsync(rds.id);
    }
  };

  return (
    <>
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
            <div className="flex gap-2 flex-wrap justify-end">
              {rds.isInstance && rds.linkedUNSNodeId && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setMoveDialogOpen(true)}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Move
                </Button>
              )}
              {rds.linkedUNSNodeId && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => syncRDSWithUNS.mutate(rds.id)}
                  disabled={syncRDSWithUNS.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncRDSWithUNS.isPending ? 'animate-spin' : ''}`} />
                  Sync
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setLinkDialogOpen(true)}>
                <Link className="h-4 w-4 mr-2" />
                Link
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1">
                <History className="h-3 w-3" />
                Location History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Aspect Code (IEC 81346)</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-base">{rds.aspectCode}</Badge>
                    {rds.isInstance && (
                      <Badge variant="outline" className="text-xs">Instance</Badge>
                    )}
                    {!rds.isInstance && rds.aspectCode !== '+' && (
                      <Badge variant="outline" className="text-xs">Abstract</Badge>
                    )}
                  </div>
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

              {/* Heritage / Ancestry Chain */}
              {heritage.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Heritage
                    </p>
                    <div className="space-y-1 pl-2 border-l-2 border-muted">
                      {heritage.map((ancestor, idx) => (
                        <div key={ancestor.id} className="flex items-center gap-2 py-1" style={{ paddingLeft: `${idx * 0.75}rem` }}>
                          <span className="text-xs text-muted-foreground">›</span>
                          <Badge variant="outline" className="font-mono text-xs">
                            {ancestor.aspectCode}{ancestor.objectClass}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{ancestor.description}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 py-1 font-semibold" style={{ paddingLeft: `${heritage.length * 0.75}rem` }}>
                        <span className="text-xs text-primary">›</span>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {rds.aspectCode}{rds.objectClass}
                        </Badge>
                        <span className="text-xs">{rds.description}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {linkedNode && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Current Location
                    </p>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Badge variant="outline">{linkedNode.level}</Badge>
                      <span className="font-medium">{linkedNode.name}</span>
                    </div>
                    {rds.locationAspect && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Location Aspect: <code className="font-mono">{rds.locationAspect}</code>
                      </p>
                    )}
                  </div>
                </>
              )}

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
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Entity Links
                </h3>
                <div className="space-y-2">
                  {linkedNode && (
                    <div className="bg-muted p-3 rounded-md border border-blue-500/20">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-400" />
                          <span className="text-muted-foreground font-medium">UNS Location:</span>
                          <Badge variant="secondary" className="text-xs">{linkedNode.level}</Badge>
                        </div>
                        <Badge variant="outline" className="text-xs">ISA-95</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{linkedNode.name}</p>
                        {linkedNode.description && (
                          <p className="text-xs text-muted-foreground">{linkedNode.description}</p>
                        )}
                        <code className="text-xs font-mono text-muted-foreground">{rds.linkedUNSNodeId}</code>
                      </div>
                    </div>
                  )}
                  
                  {linkedAAS && (
                    <div className="bg-muted p-3 rounded-md border border-purple-500/20">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-purple-400" />
                          <span className="text-muted-foreground font-medium">Linked AAS:</span>
                          {linkedAAS.isType && <Badge variant="outline" className="text-xs">Type</Badge>}
                        </div>
                        <Badge variant="outline" className="text-xs">IEC 63278</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{linkedAAS.idShort}</p>
                        <p className="text-xs text-muted-foreground">{linkedAAS.description}</p>
                        <code className="text-xs font-mono text-muted-foreground">{rds.linkedAASId}</code>
                      </div>
                    </div>
                  )}

                  {rds.parentDefinitionId && (
                    <div className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                      <span className="text-muted-foreground">Parent Definition:</span>
                      <code className="font-mono text-xs">{rds.parentDefinitionId}</code>
                    </div>
                  )}

                  {linkedEntities.length > 0 && (
                    <div className="bg-yellow-400/10 border border-yellow-500/20 p-3 rounded text-xs">
                      <p className="font-semibold mb-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Linked From ({linkedEntities.length})
                      </p>
                      <div className="space-y-1 mt-2">
                        {linkedEntities.map(entity => (
                          <div key={entity.id} className="flex items-center gap-2">
                            <ExternalLink className="h-3 w-3" />
                            <span>{entity.type}: {entity.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!rds.isInstance && rds.aspectCode !== '+' && (
                    <div className="bg-blue-400/10 text-blue-400 p-3 rounded text-xs">
                      <p className="font-semibold mb-1">Abstract Definition</p>
                      <p>This is an abstract {rds.aspectCode === '=' ? 'functional' : 'product'} definition. Create instances at specific locations to use this in production.</p>
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
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <RDSLocationHistory rdsId={rds.id} unsNodes={unsNodes} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <RDSMoveDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        rds={rds}
        unsNodes={unsNodes}
      />

      <RDSEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        rds={rds}
        unsNodes={unsNodes}
        aasList={aasList}
      />

      <RDSLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        rds={rds}
        unsNodes={unsNodes}
      />
    </>
  );
};
