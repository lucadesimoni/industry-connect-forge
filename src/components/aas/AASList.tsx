import { useState } from 'react';
import { AAS } from '@/types/industrial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Package, ExternalLink, Edit, ChevronRight, ChevronDown, Box, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AASListProps {
  aasList: AAS[];
  selectedAASId: string | null;
  onSelectAAS: (aasId: string) => void;
}

export const AASList = ({ aasList, selectedAASId, onSelectAAS }: AASListProps) => {
  const [expandedAAS, setExpandedAAS] = useState<Set<string>>(new Set());
  const [expandedSubmodels, setExpandedSubmodels] = useState<Set<string>>(new Set());

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

  return (
    <div className="space-y-3">
      {aasList.length === 0 ? (
        <div className="text-sm text-muted-foreground p-4">
          No Asset Administration Shells found. Create an AAS to start managing digital twins.
        </div>
      ) : (
        aasList.map((aas) => {
        const isExpanded = expandedAAS.has(aas.id);
        const isSelected = selectedAASId === aas.id;

        return (
          <Card
            key={aas.id}
            className={cn(
              'transition-all hover:border-primary',
              isSelected && 'border-primary bg-primary/5'
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
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 cursor-pointer"
                    onClick={() => onSelectAAS(aas.id)}
                  >
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 cursor-pointer" onClick={() => onSelectAAS(aas.id)}>
                    <CardTitle className="text-base">{aas.idShort}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{aas.description}</p>
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
      }))}
    </div>
  );
};
