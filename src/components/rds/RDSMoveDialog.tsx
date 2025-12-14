import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertTriangle, MapPin } from 'lucide-react';
import { RDSDesignation, UNSNode } from '@/types/industrial';
import { useAssetMovement, buildLocationFromUNS, generateDynamicDesignation } from '@/hooks/useAssetMovement';

interface RDSMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rds: RDSDesignation | null;
  unsNodes: UNSNode[];
}

export const RDSMoveDialog = ({ open, onOpenChange, rds, unsNodes }: RDSMoveDialogProps) => {
  const { moveRDSToLocation } = useAssetMovement();
  const [newUnsNodeId, setNewUnsNodeId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [updateLinkedAAS, setUpdateLinkedAAS] = useState(true);

  if (!rds) return null;

  const currentNode = unsNodes.find(n => n.id === rds.linkedUNSNodeId);
  const newNode = unsNodes.find(n => n.id === newUnsNodeId);

  // Preview the new designation
  const previewDesignation = newNode
    ? generateDynamicDesignation(
        rds.functionAspect,
        rds.productAspect,
        buildLocationFromUNS(newNode, unsNodes),
        rds.aspectCode
      )
    : null;

  const handleMove = async () => {
    if (!newUnsNodeId) return;

    await moveRDSToLocation.mutateAsync({
      rdsId: rds.id,
      newUnsNodeId,
      reason: reason || undefined,
      updateLinkedAAS,
    });

    onOpenChange(false);
    setNewUnsNodeId('');
    setReason('');
  };

  // Filter to only show Cell level nodes (lowest level where assets typically reside)
  const availableNodes = unsNodes.filter(n => 
    n.id !== rds.linkedUNSNodeId && 
    ['Cell', 'Line', 'Area'].includes(n.level)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Move Asset to New Location
          </DialogTitle>
          <DialogDescription>
            Relocate this RDS instance to a different UNS location. This will update the designation and maintain history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Location */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Current Location</Label>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Badge variant="outline">{currentNode?.level || 'Unlinked'}</Badge>
              <span className="font-medium">{currentNode?.name || 'No location'}</span>
            </div>
            <code className="text-xs text-muted-foreground block">{rds.designation}</code>
          </div>

          {/* New Location Selection */}
          <div className="space-y-2">
            <Label htmlFor="new-location">New Location</Label>
            <Select value={newUnsNodeId} onValueChange={setNewUnsNodeId}>
              <SelectTrigger id="new-location">
                <SelectValue placeholder="Select new location..." />
              </SelectTrigger>
              <SelectContent>
                {availableNodes.map((node) => (
                  <SelectItem key={node.id} value={node.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{node.level}</Badge>
                      {node.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {previewDesignation && (
            <Alert className="bg-primary/5 border-primary">
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">New designation:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-muted-foreground line-through">{rds.designation}</code>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <code className="text-primary font-bold">{previewDesignation}</code>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Move (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Maintenance relocation, production line change..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Linked AAS option */}
          {rds.linkedAASId && (
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="update-aas">Update linked AAS</Label>
                <p className="text-xs text-muted-foreground">
                  Also update the linked digital twin's location
                </p>
              </div>
              <Switch
                id="update-aas"
                checked={updateLinkedAAS}
                onCheckedChange={setUpdateLinkedAAS}
              />
            </div>
          )}

          {/* Warning */}
          <Alert variant="default" className="border-amber-500/50 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-xs">
              Moving an asset will update broker topics and may affect data subscriptions. 
              The previous location will be recorded in history.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleMove} 
            disabled={!newUnsNodeId || moveRDSToLocation.isPending}
          >
            {moveRDSToLocation.isPending ? 'Moving...' : 'Move Asset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
