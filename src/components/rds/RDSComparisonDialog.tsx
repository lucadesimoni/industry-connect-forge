import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RDSDesignation } from '@/types/industrial';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RDSComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rdsItems: RDSDesignation[];
}

const getAspectCodeColor = (aspectCode: string) => {
  if (aspectCode.startsWith('=')) return 'text-blue-400';
  if (aspectCode.startsWith('-')) return 'text-green-400';
  if (aspectCode.startsWith('+')) return 'text-orange-400';
  return 'text-foreground';
};

export const RDSComparisonDialog = ({ open, onOpenChange, rdsItems }: RDSComparisonDialogProps) => {
  if (rdsItems.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[90vh]">
        <DialogHeader>
          <DialogTitle>Compare RDS Designations ({rdsItems.length})</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-full pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rdsItems.map((rds) => (
              <div key={rds.id} className="border rounded-lg border-border overflow-hidden">
                {/* Header */}
                <div className="bg-primary/5 p-4 border-b border-border">
                  <div className="font-mono font-bold text-lg mb-1">
                    <span className={cn(getAspectCodeColor(rds.aspectCode))}>{rds.designation}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{rds.description}</p>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                  {/* Aspect & Object Class */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Aspect Code</p>
                    <Badge variant="secondary" className={cn('font-mono', getAspectCodeColor(rds.aspectCode))}>
                      {rds.aspectCode}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {rds.aspectCode === '=' && 'Function Aspect'}
                      {rds.aspectCode === '-' && 'Product Aspect'}
                      {rds.aspectCode === '+' && 'Location Aspect'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Object Class</p>
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{rds.objectClass}</code>
                  </div>

                  <Separator />

                  {/* UNS & Broker Topics */}
                  {rds.metadata?.uns_topic && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">UNS Topic</p>
                      <code className="text-xs font-mono bg-green-400/10 text-green-400 px-2 py-1 rounded break-all block">
                        {rds.metadata.uns_topic}
                      </code>
                    </div>
                  )}

                  {rds.metadata?.broker_topic && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Broker Path</p>
                      <code className="text-xs font-mono bg-green-400/10 text-green-400 px-2 py-1 rounded break-all block">
                        {rds.metadata.broker_topic}
                      </code>
                    </div>
                  )}

                  {/* Hierarchy Details */}
                  {rds.metadata?.hierarchy_level && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Hierarchy Level</p>
                      <Badge variant="outline">{rds.metadata.hierarchy_level}</Badge>
                    </div>
                  )}

                  <Separator />

                  {/* Linked Entities */}
                  <div>
                    <p className="text-xs font-semibold mb-2">Linked Entities</p>
                    <div className="space-y-2">
                      {rds.linkedUNSNodeId ? (
                        <div className="flex items-center gap-2 text-xs bg-muted p-2 rounded">
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">UNS:</span>
                          <code className="font-mono flex-1 truncate">{rds.linkedUNSNodeId}</code>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground italic">No UNS link</div>
                      )}
                      
                      {rds.linkedAASId ? (
                        <div className="flex items-center gap-2 text-xs bg-muted p-2 rounded">
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">AAS:</span>
                          <code className="font-mono flex-1 truncate">{rds.linkedAASId}</code>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground italic">No AAS link</div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Timestamps */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Created:</span>
                      <span className="font-mono">{rds.createdAt.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Updated:</span>
                      <span className="font-mono">{rds.updatedAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
