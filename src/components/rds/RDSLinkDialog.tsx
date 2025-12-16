import { useState, useEffect } from 'react';
import { RDSDesignation, UNSNode } from '@/types/industrial';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, AlertTriangle } from 'lucide-react';
import { useRDS } from '@/hooks/useRDS';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RDSLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rds: RDSDesignation;
  unsNodes: UNSNode[];
}

export const RDSLinkDialog = ({
  open,
  onOpenChange,
  rds,
  unsNodes,
}: RDSLinkDialogProps) => {
  const { updateRDS } = useRDS();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(rds.linkedUNSNodeId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedNodeId(rds.linkedUNSNodeId);
    }
  }, [open, rds.linkedUNSNodeId]);

  // Filter UNS nodes to appropriate levels
  const availableNodes = unsNodes.filter(
    (node) => node.level === 'Line' || node.level === 'Cell'
  );

  const selectedNode = unsNodes.find((n) => n.id === selectedNodeId);

  const handleLink = async () => {
    setIsSubmitting(true);
    try {
      await updateRDS.mutateAsync({
        id: rds.id,
        linkedUNSNodeId: selectedNodeId,
      });
      toast.success(
        selectedNodeId
          ? `Linked to ${selectedNode?.name}`
          : 'UNS link removed'
      );
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update UNS link');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Link to UNS Location
          </DialogTitle>
          <DialogDescription>
            Link this RDS designation to a UNS location node.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current RDS */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">RDS Designation</p>
            <p className="font-mono font-medium">{rds.designation}</p>
          </div>

          {/* Current Link */}
          {rds.linkedUNSNodeId && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Currently linked to: <strong>{unsNodes.find(n => n.id === rds.linkedUNSNodeId)?.name || 'Unknown'}</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* UNS Node Selection */}
          <div className="space-y-2">
            <Label>Select UNS Node</Label>
            <Select
              value={selectedNodeId || 'none'}
              onValueChange={(value) =>
                setSelectedNodeId(value === 'none' ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a location..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Remove link</span>
                </SelectItem>
                {availableNodes.map((node) => (
                  <SelectItem key={node.id} value={node.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {node.level}
                      </Badge>
                      <span>{node.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only Line and Cell level nodes can be linked to RDS designations.
            </p>
          </div>

          {/* Preview */}
          {selectedNode && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm font-medium mb-1">Selected Location</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedNode.level}</Badge>
                <span>{selectedNode.name}</span>
              </div>
              {selectedNode.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedNode.description}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleLink} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
