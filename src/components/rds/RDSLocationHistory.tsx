import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, MapPin, Clock, User } from 'lucide-react';
import { useAssetMovement, LocationHistoryEntry } from '@/hooks/useAssetMovement';
import { format } from 'date-fns';
import { UNSNode } from '@/types/industrial';

interface RDSLocationHistoryProps {
  rdsId: string;
  unsNodes: UNSNode[];
}

export const RDSLocationHistory = ({ rdsId, unsNodes }: RDSLocationHistoryProps) => {
  const { useLocationHistory } = useAssetMovement();
  const { data: history, isLoading } = useLocationHistory('RDS', rdsId);

  const getNodeName = (nodeId: string | null) => {
    if (!nodeId) return 'Unlinked';
    return unsNodes.find(n => n.id === nodeId)?.name || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No location history recorded</p>
        <p className="text-xs">Movement history will appear here after relocations</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-3 pr-4">
        {history.map((entry: LocationHistoryEntry, index: number) => (
          <div 
            key={entry.id} 
            className="relative pl-6 pb-4 border-l-2 border-muted last:border-transparent"
          >
            {/* Timeline dot */}
            <div className="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background" />
            
            <div className="space-y-2">
              {/* Timestamp */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {format(entry.createdAt, 'PPp')}
                {index === 0 && (
                  <Badge variant="secondary" className="text-[10px]">Latest</Badge>
                )}
              </div>

              {/* Location Change */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs">
                  {getNodeName(entry.previousUnsNodeId)}
                </Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="default" className="font-mono text-xs">
                  {getNodeName(entry.newUnsNodeId)}
                </Badge>
              </div>

              {/* Designation Change */}
              {entry.previousDesignation && entry.newDesignation && (
                <div className="flex items-center gap-2 text-xs">
                  <code className="text-muted-foreground line-through">
                    {entry.previousDesignation}
                  </code>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <code className="text-primary font-semibold">
                    {entry.newDesignation}
                  </code>
                </div>
              )}

              {/* Reason */}
              {entry.reason && (
                <p className="text-xs text-muted-foreground italic">
                  "{entry.reason}"
                </p>
              )}

              {/* Moved by */}
              {entry.movedBy && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>by user</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
