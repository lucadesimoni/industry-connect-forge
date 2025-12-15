import { useState, useMemo } from 'react';
import { AAS } from '@/types/industrial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, ExternalLink, Edit, ChevronRight, ChevronDown, Box, FileText, Layers, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AASListProps {
  aasList: AAS[];
  selectedAASId: string | null;
  onSelectAAS: (aasId: string) => void;
}

export const AASList = ({ aasList, selectedAASId, onSelectAAS }: AASListProps) => {
  const [expandedAAS, setExpandedAAS] = useState<Set<string>>(new Set());
  const [expandedSubmodels, setExpandedSubmodels] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'types' | 'instances'>('all');

  const toggleAAS = (aasId: string) => {
    const newExpanded = new Set(expandedAAS);
    if (newExpanded.has(aasId)) {
      newExpanded.delete(aasId);
    } else {
      newExpanded.add(aasId);
    }
    setExpandedAAS(newExpanded);
  };

  const toggleSubmodel = (submodelId: string) => {
    const newExpanded = new Set(expandedSubmodels);
    if (newExpanded.has(submodelId)) {
      newExpanded.delete(submodelId);
    } else {
      newExpanded.add(submodelId);
    }
    setExpandedSubmodels(newExpanded);
  };

  // Filter AAS based on active tab
  const filteredAAS = useMemo(() => {
    switch (activeTab) {
      case 'types':
        return aasList.filter(a => a.isType);
      case 'instances':
        return aasList.filter(a => !a.isType);
      default:
        return aasList;
    }
  }, [aasList, activeTab]);

  // Get Type AAS by ID for showing inheritance
  const getTypeAAS = (typeId?: string) => {
    return aasList.find(a => a.id === typeId);
  };

  // Count instances for a type
  const getInstanceCount = (typeId: string) => {
    return aasList.filter(a => a.typeAASId === typeId).length;
  };

  const renderAASCard = (aas: AAS) => {
    const isExpanded = expandedAAS.has(aas.id);
    const isSelected = selectedAASId === aas.id;
    const typeAAS = getTypeAAS(aas.typeAASId);
    const instanceCount = aas.isType ? getInstanceCount(aas.id) : 0;

    return (
      <Card
        key={aas.id}
        className={cn(
          'transition-all hover:border-primary',
          isSelected && 'border-primary bg-primary/5',
          aas.isType && 'border-l-4 border-l-blue-500'
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAAS(aas.id);
                }}
                className="mt-1 hover:bg-muted rounded p-0.5"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              <div 
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg cursor-pointer",
                  aas.isType ? "bg-blue-500/10" : "bg-primary/10"
                )}
                onClick={() => onSelectAAS(aas.id)}
              >
                {aas.isType ? (
                  <Layers className="h-5 w-5 text-blue-500" />
                ) : (
                  <Package className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 cursor-pointer" onClick={() => onSelectAAS(aas.id)}>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{aas.idShort}</CardTitle>
                  <Badge variant={aas.isType ? "default" : "secondary"} className="text-xs">
                    {aas.isType ? 'Type' : 'Instance'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{aas.description}</p>
                {typeAAS && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-blue-400">
                    <Link2 className="h-3 w-3" />
                    Inherits from: {typeAAS.idShort}
                  </div>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
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
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {aas.submodels.length} Submodels
            </Badge>
            {aas.isType && instanceCount > 0 && (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                {instanceCount} Instances
              </Badge>
            )}
            {aas.linkedUNSNodeId && (
              <Badge variant="outline" className="text-xs">
                <ExternalLink className="h-3 w-3 mr-1" />
                UNS
              </Badge>
            )}
            {aas.linkedRDSId && (
              <Badge variant="outline" className="text-xs">
                <ExternalLink className="h-3 w-3 mr-1" />
                RDS
              </Badge>
            )}
          </div>

          {/* Submodels Hierarchy */}
          {isExpanded && aas.submodels.length > 0 && (
            <div className="mt-4 space-y-2 pl-6 border-l-2 border-muted">
              {aas.submodels.map((submodel) => {
                const isSubmodelExpanded = expandedSubmodels.has(submodel.id);
                
                return (
                  <div key={submodel.id} className="space-y-2">
                    <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSubmodel(submodel.id);
                        }}
                        className="hover:bg-background rounded p-0.5"
                      >
                        {isSubmodelExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </button>
                      <Box className="h-4 w-4 text-blue-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{submodel.idShort}</div>
                        <div className="text-xs text-muted-foreground">{submodel.description}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs font-mono">
                            {submodel.semanticId}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {submodel.properties.length} Properties
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Properties Hierarchy */}
                    {isSubmodelExpanded && submodel.properties.length > 0 && (
                      <div className="ml-6 space-y-1 pl-4 border-l-2 border-muted">
                        {submodel.properties.map((property) => (
                          <div
                            key={property.idShort}
                            className="flex items-start gap-2 p-2 rounded-md bg-background hover:bg-muted/30 transition-colors text-xs"
                          >
                            <FileText className="h-3 w-3 text-green-400 mt-0.5" />
                            <div className="flex-1">
                              <div className="font-medium">{property.idShort}</div>
                              {property.description && (
                                <div className="text-muted-foreground text-xs">{property.description}</div>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {property.valueType}
                                </Badge>
                                <span className="font-mono text-primary">
                                  {String(property.value)}
                                </span>
                                {property.unit && (
                                  <span className="text-muted-foreground">{property.unit}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const typeCount = aasList.filter(a => a.isType).length;
  const instanceCount = aasList.filter(a => !a.isType).length;

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="text-xs">
            All ({aasList.length})
          </TabsTrigger>
          <TabsTrigger value="types" className="text-xs">
            <Layers className="h-3 w-3 mr-1" />
            Types ({typeCount})
          </TabsTrigger>
          <TabsTrigger value="instances" className="text-xs">
            <Package className="h-3 w-3 mr-1" />
            Instances ({instanceCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {filteredAAS.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 text-center">
            {activeTab === 'types' 
              ? 'No Type AAS found. Create a Type AAS as a template for asset types.'
              : activeTab === 'instances'
              ? 'No Instance AAS found. Create an Instance AAS for specific physical assets.'
              : 'No Asset Administration Shells found. Create an AAS to start managing digital twins.'}
          </div>
        ) : (
          filteredAAS.map(renderAASCard)
        )}
      </div>
    </div>
  );
};
