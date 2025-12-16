import { useState, useEffect } from 'react';
import { RDSDesignation, UNSNode, AAS } from '@/types/industrial';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRDS } from '@/hooks/useRDS';
import { toast } from 'sonner';

interface RDSEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rds: RDSDesignation;
  unsNodes?: UNSNode[];
  aasList?: AAS[];
}

export const RDSEditDialog = ({
  open,
  onOpenChange,
  rds,
  unsNodes = [],
  aasList = [],
}: RDSEditDialogProps) => {
  const { updateRDS } = useRDS();
  const [description, setDescription] = useState(rds.description);
  const [linkedUNSNodeId, setLinkedUNSNodeId] = useState<string | null>(rds.linkedUNSNodeId);
  const [linkedAASId, setLinkedAASId] = useState<string | null>(rds.linkedAASId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens with new RDS
  useEffect(() => {
    if (open) {
      setDescription(rds.description);
      setLinkedUNSNodeId(rds.linkedUNSNodeId);
      setLinkedAASId(rds.linkedAASId);
    }
  }, [open, rds]);

  // Filter UNS nodes to appropriate levels (Line/Cell for instances)
  const availableUNSNodes = unsNodes.filter(
    (node) => node.level === 'Line' || node.level === 'Cell'
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await updateRDS.mutateAsync({
        id: rds.id,
        description,
        linkedUNSNodeId,
        linkedAASId,
      });
      toast.success('RDS updated successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update RDS');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit RDS Designation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Designation (read-only) */}
          <div className="space-y-2">
            <Label>Designation</Label>
            <Input value={rds.designation} disabled className="font-mono" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description..."
            />
          </div>

          {/* UNS Link */}
          <div className="space-y-2">
            <Label>Linked UNS Node</Label>
            <Select
              value={linkedUNSNodeId || 'none'}
              onValueChange={(value) =>
                setLinkedUNSNodeId(value === 'none' ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select UNS node..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No link</SelectItem>
                {availableUNSNodes.map((node) => (
                  <SelectItem key={node.id} value={node.id}>
                    [{node.level}] {node.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* AAS Link */}
          <div className="space-y-2">
            <Label>Linked AAS</Label>
            <Select
              value={linkedAASId || 'none'}
              onValueChange={(value) =>
                setLinkedAASId(value === 'none' ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select AAS..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No link</SelectItem>
                {aasList.map((aas) => (
                  <SelectItem key={aas.id} value={aas.id}>
                    {aas.idShort} {aas.isType ? '(Type)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
