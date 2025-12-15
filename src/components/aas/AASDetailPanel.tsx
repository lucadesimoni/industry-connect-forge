import { AAS } from '@/types/industrial';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Link, ChevronDown, ChevronRight, Layers, Package, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState, useMemo } from 'react';
import { useAAS } from '@/hooks/useAAS';
import { AASDialog } from './AASDialog';
import { AASSubmodelDialog } from './AASSubmodelDialog';
import { AASSubmodel } from '@/types/industrial';
import { Plus } from 'lucide-react';

interface AASDetailPanelProps {
  aas: AAS;
  unsNodes: Array<{ id: string; name: string }>;
  rdsList: Array<{ id: string; designation: string }>;
}

export const AASDetailPanel = ({ aas, unsNodes, rdsList }: AASDetailPanelProps) => {
  const { deleteAAS, updateAAS, aasList } = useAAS();
  const [expandedSubmodels, setExpandedSubmodels] = useState<Set<string>>(new Set());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [submodelDialogOpen, setSubmodelDialogOpen] = useState(false);
  const [editingSubmodel, setEditingSubmodel] = useState<AASSubmodel | null>(null);

  // Get Type AAS if this is an instance
  const typeAAS = useMemo(() => {
    return aasList.find(a => a.id === aas.typeAASId);
  }, [aasList, aas.typeAASId]);

  // Get instances if this is a type
  const instances = useMemo(() => {
    return aas.isType ? aasList.filter(a => a.typeAASId === aas.id) : [];
  }, [aasList, aas]);

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

  const handleAddSubmodel = () => {
    setEditingSubmodel(null);
    setSubmodelDialogOpen(true);
  };

  const handleEditSubmodel = (submodel: AASSubmodel) => {
    setEditingSubmodel(submodel);
    setSubmodelDialogOpen(true);
  };

  const handleDeleteSubmodel = async (submodelId: string) => {
    if (confirm('Are you sure you want to delete this submodel and all its properties?')) {
      const updatedSubmodels = aas.submodels.filter(s => s.id !== submodelId);
      await updateAAS.mutateAsync({
        id: aas.id,
        submodels: updatedSubmodels,
      });
    }
  };

  const handleSaveSubmodel = async (submodelData: Omit<AASSubmodel, 'id'> & { id?: string }) => {
    const submodelToSave: AASSubmodel = {
      id: editingSubmodel?.id || `temp-${Date.now()}`,
      idShort: submodelData.idShort,
      semanticId: submodelData.semanticId,
      description: submodelData.description,
      properties: submodelData.properties.map((p, idx) => ({
        id: p.id || `temp-prop-${Date.now()}-${idx}`,
        idShort: p.idShort,
        valueType: p.valueType,
        value: p.value,
        unit: p.unit,
        description: p.description,
      })),
    };

    let updatedSubmodels: AASSubmodel[];
    
    if (editingSubmodel) {
      updatedSubmodels = aas.submodels.map(s =>
        s.id === editingSubmodel.id ? submodelToSave : s
      );
    } else {
      updatedSubmodels = [...aas.submodels, submodelToSave];
    }

    await updateAAS.mutateAsync({
      id: aas.id,
      submodels: updatedSubmodels,
    });
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
      <AASSubmodelDialog
        open={submodelDialogOpen}
        onOpenChange={setSubmodelDialogOpen}
        submodel={editingSubmodel}
        onSave={handleSaveSubmodel}
      />
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {aas.isType ? (
                <Layers className="h-5 w-5 text-blue-500" />
              ) : (
                <Package className="h-5 w-5 text-primary" />
              )}
              <CardTitle className="text-xl">{aas.idShort}</CardTitle>
              <Badge variant={aas.isType ? "default" : "secondary"}>
                {aas.isType ? 'Type AAS' : 'Instance AAS'}
              </Badge>
            </div>
            <CardDescription className="mt-1">{aas.description}</CardDescription>
            <div className="mt-2 flex items-start gap-2">
              <span className="text-xs text-muted-foreground font-semibold">Asset ID:</span>
              <code className="text-xs font-mono bg-purple-400/10 text-purple-400 px-2 py-1 rounded">
                {aas.assetId}
              </code>
            </div>
            {typeAAS && (
              <div className="mt-2 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-muted-foreground">Inherits from:</span>
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                  {typeAAS.idShort}
                </Badge>
              </div>
            )}
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
            <p className="text-sm text-muted-foreground mb-1">Classification</p>
            <Badge variant={aas.isType ? "default" : "secondary"}>
              {aas.isType ? 'Type (Template)' : 'Instance (Physical)'}
            </Badge>
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

        {/* Show instances for Type AAS */}
        {aas.isType && instances.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Instances ({instances.length})
              </h3>
              <div className="space-y-2">
                {instances.map(instance => (
                  <div key={instance.id} className="bg-muted/50 p-3 rounded-md flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{instance.idShort}</p>
                      <p className="text-xs text-muted-foreground">{instance.serialNumber || instance.assetId}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {instance.submodels.length} submodels
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Show inherited submodels from Type for Instance AAS */}
        {typeAAS && typeAAS.submodels.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold mb-2 text-blue-400 flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Inherited from Type: {typeAAS.idShort}
              </h3>
              <div className="space-y-2">
                {typeAAS.submodels.map(submodel => (
                  <div key={submodel.id} className="bg-blue-500/5 border border-blue-500/20 p-3 rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{submodel.idShort}</p>
                        <p className="text-xs text-muted-foreground">{submodel.description}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {submodel.properties.length} properties
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              {aas.isType ? 'Template Submodels (IEC 63278)' : 'Instance Submodels (IEC 63278)'}
            </h3>
            <Button variant="outline" size="sm" onClick={handleAddSubmodel}>
              <Plus className="h-4 w-4 mr-2" />
              Add Submodel
            </Button>
          </div>
          <div className="space-y-2">
            {aas.submodels.length === 0 ? (
              <div className="bg-muted/50 p-4 rounded-md border border-dashed text-center">
                <p className="text-sm text-muted-foreground">
                  {aas.isType 
                    ? 'No template submodels. Add submodels to define the structure for instances.'
                    : 'No instance submodels. Click "Add Submodel" to create one.'}
                </p>
              </div>
            ) : (
              aas.submodels.map((submodel) => (
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
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-muted-foreground">
                              Semantic ID: <code className="font-mono">{submodel.semanticId}</code>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditSubmodel(submodel);
                                }}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSubmodel(submodel.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <div className="bg-muted rounded-md p-3 space-y-2">
                            {submodel.properties.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2">
                                No properties in this submodel
                              </p>
                            ) : (
                              submodel.properties.map((prop) => (
                                <div key={prop.id} className="flex items-start justify-between text-xs">
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
                              ))
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))
            )}
          </div>
        </div>

        {!aas.isType && (
          <>
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
          </>
        )}
      </CardContent>
    </Card>
    </>
  );
};
