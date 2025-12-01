import { AAS } from '@/types/industrial';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Link, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { useAAS } from '@/hooks/useAAS';
import { AASDialog } from './AASDialog';

interface AASDetailPanelProps {
  aas: AAS;
  unsNodes: Array<{ id: string; name: string }>;
  rdsList: Array<{ id: string; designation: string }>;
}

export const AASDetailPanel = ({ aas, unsNodes, rdsList }: AASDetailPanelProps) => {
  const { deleteAAS } = useAAS();
  const [expandedSubmodels, setExpandedSubmodels] = useState<Set<string>>(new Set());
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const toggleSubmodel = (submodelId: string) => {
    const newExpanded = new Set(expandedSubmodels);
    if (newExpanded.has(submodelId)) {
      newExpanded.delete(submodelId);
    } else {
      newExpanded.add(submodelId);
    }
    setExpandedSubmodels(newExpanded);
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete AAS "${aas.idShort}"?`)) {
      await deleteAAS.mutateAsync(aas.id);
    }
  };

  return (
    <>
      <AASDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        aas={aas}
        unsNodes={unsNodes}
        rdsList={rdsList}
      />
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{aas.idShort}</CardTitle>
            <CardDescription className="mt-1">{aas.description}</CardDescription>
            <div className="mt-2 flex items-start gap-2">
              <span className="text-xs text-muted-foreground font-semibold">Asset ID:</span>
              <code className="text-xs font-mono bg-purple-400/10 text-purple-400 px-2 py-1 rounded">
                {aas.assetId}
              </code>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Link</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Asset ID</p>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{aas.assetId}</code>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">AAS ID</p>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{aas.id}</code>
          </div>
        </div>

        {aas.manufacturer && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Manufacturer</p>
            <p className="text-sm font-medium">{aas.manufacturer}</p>
          </div>
        )}

        {aas.serialNumber && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Serial Number</p>
            <code className="text-sm font-mono">{aas.serialNumber}</code>
          </div>
        )}

        <Separator />

        <div>
          <h3 className="text-sm font-semibold mb-3">Submodels (IEC 63278)</h3>
          <div className="space-y-2">
            {aas.submodels.map((submodel) => (
              <Collapsible key={submodel.id}>
                <Card className="border-border">
                  <CollapsibleTrigger
                    className="w-full"
                    onClick={() => toggleSubmodel(submodel.id)}
                  >
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <CardTitle className="text-sm">{submodel.idShort}</CardTitle>
                          <CardDescription className="text-xs">{submodel.description}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {submodel.properties.length} Properties
                          </Badge>
                          {expandedSubmodels.has(submodel.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground mb-2">
                          Semantic ID: <code className="font-mono">{submodel.semanticId}</code>
                        </div>
                        <div className="bg-muted rounded-md p-3 space-y-2">
                          {submodel.properties.map((prop) => (
                            <div key={prop.idShort} className="flex items-start justify-between text-xs">
                              <div className="flex-1">
                                <p className="font-mono font-semibold">{prop.idShort}</p>
                                {prop.description && (
                                  <p className="text-muted-foreground text-xs">{prop.description}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-mono">
                                  {prop.value} {prop.unit && <span className="text-muted-foreground">{prop.unit}</span>}
                                </p>
                                <Badge variant="outline" className="text-xs mt-1">{prop.valueType}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-semibold mb-2">Entity Links</h3>
          <div className="space-y-2">
            {aas.linkedUNSNodeId ? (
              <div className="bg-muted p-3 rounded-md">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground font-medium">Linked UNS Node:</span>
                  <Badge variant="secondary" className="text-xs">ISA-95</Badge>
                </div>
                <code className="font-mono text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded block">
                  {aas.linkedUNSNodeId}
                </code>
              </div>
            ) : (
              <div className="bg-muted/50 p-3 rounded-md border border-dashed">
                <p className="text-xs text-muted-foreground">No UNS node linked</p>
              </div>
            )}
            {aas.linkedRDSId ? (
              <div className="bg-muted p-3 rounded-md">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground font-medium">Linked RDS:</span>
                  <Badge variant="secondary" className="text-xs">IEC 81346</Badge>
                </div>
                <code className="font-mono text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded block">
                  {aas.linkedRDSId}
                </code>
              </div>
            ) : (
              <div className="bg-muted/50 p-3 rounded-md border border-dashed">
                <p className="text-xs text-muted-foreground">No RDS designation linked</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
};
