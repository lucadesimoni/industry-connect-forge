import { RDSDesignation } from '@/types/industrial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RDSComparisonViewProps {
  selectedRDS: RDSDesignation[];
  onRemove: (id: string) => void;
  onClose: () => void;
  unsNodes?: Array<{ id: string; name: string }>;
  aasList?: Array<{ id: string; idShort: string }>;
}

const getAspectCodeColor = (aspectCode: string) => {
  if (aspectCode.startsWith('+')) return 'text-blue-600 dark:text-blue-400';
  if (aspectCode.startsWith('=')) return 'text-green-600 dark:text-green-400';
  if (aspectCode.startsWith('-')) return 'text-purple-600 dark:text-purple-400';
  return 'text-muted-foreground';
};

const getAspectCodeLabel = (aspectCode: string) => {
  if (aspectCode.startsWith('+')) return 'Location';
  if (aspectCode.startsWith('=')) return 'Function';
  if (aspectCode.startsWith('-')) return 'Product';
  return 'Unknown';
};

export const RDSComparisonView = ({ 
  selectedRDS, 
  onRemove, 
  onClose,
  unsNodes = [],
  aasList = []
}: RDSComparisonViewProps) => {
  if (selectedRDS.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center p-8">
          <p className="text-muted-foreground">
            Select RDS designations to compare them side by side
          </p>
        </CardContent>
      </Card>
    );
  }

  const getLinkedUNSName = (id: string | null | undefined) => {
    if (!id) return null;
    return unsNodes.find(n => n.id === id)?.name;
  };

  const getLinkedAASName = (id: string | null | undefined) => {
    if (!id) return null;
    return aasList.find(a => a.id === id)?.idShort;
  };

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">
          Comparison View ({selectedRDS.length} items)
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {selectedRDS.map((rds) => {
              const linkedUNSName = getLinkedUNSName(rds.linkedUNSNodeId);
              const linkedAASName = getLinkedAASName(rds.linkedAASId);
              
              return (
                <Card key={rds.id} className="relative border-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => onRemove(rds.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold pr-8 break-all">
                      {rds.designation}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Aspect & Object */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Aspect Code</p>
                        <Badge 
                          variant="outline" 
                          className={`${getAspectCodeColor(rds.aspectCode)} font-mono text-xs`}
                        >
                          {rds.aspectCode} - {getAspectCodeLabel(rds.aspectCode)}
                        </Badge>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Object Class</p>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {rds.objectClass}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    {/* Description */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{rds.description}</p>
                    </div>

                    <Separator />

                    {/* Linked Entities */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">UNS Node</p>
                        {linkedUNSName ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <Badge variant="outline" className="text-xs">
                              {linkedUNSName}
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Not linked</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">AAS</p>
                        {linkedAASName ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <Badge variant="outline" className="text-xs">
                              {linkedAASName}
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Not linked</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    {rds.metadata && Object.keys(rds.metadata).length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Metadata</p>
                          <div className="space-y-1">
                            {rds.metadata.uns_topic && (
                              <div>
                                <p className="text-xs font-medium">UNS Topic:</p>
                                <Badge variant="outline" className="font-mono text-xs mt-1 bg-blue-400/10">
                                  {rds.metadata.uns_topic as string}
                                </Badge>
                              </div>
                            )}
                            {rds.metadata.broker_topic && (
                              <div>
                                <p className="text-xs font-medium">Broker Topic:</p>
                                <Badge variant="outline" className="font-mono text-xs mt-1 bg-green-400/10">
                                  {rds.metadata.broker_topic as string}
                                </Badge>
                              </div>
                            )}
                            {rds.metadata.hierarchy_level && (
                              <div>
                                <p className="text-xs font-medium">Level:</p>
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {rds.metadata.hierarchy_level as string}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
