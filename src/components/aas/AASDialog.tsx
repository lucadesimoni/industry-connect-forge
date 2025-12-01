import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AAS } from '@/types/industrial';
import { useAAS } from '@/hooks/useAAS';

interface AASDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aas?: AAS | null;
  unsNodes: Array<{ id: string; name: string }>;
  rdsList: Array<{ id: string; designation: string }>;
}

export const AASDialog = ({ open, onOpenChange, aas, unsNodes, rdsList }: AASDialogProps) => {
  const { createAAS, updateAAS } = useAAS();
  
  const [idShort, setIdShort] = useState(aas?.idShort || '');
  const [assetId, setAssetId] = useState(aas?.assetId || '');
  const [description, setDescription] = useState(aas?.description || '');
  const [manufacturer, setManufacturer] = useState(aas?.manufacturer || '');
  const [serialNumber, setSerialNumber] = useState(aas?.serialNumber || '');
  const [linkedUNSNodeId, setLinkedUNSNodeId] = useState<string | null>(aas?.linkedUNSNodeId || null);
  const [linkedRDSId, setLinkedRDSId] = useState<string | null>(aas?.linkedRDSId || null);

  const handleSubmit = async () => {
    if (!idShort.trim() || !assetId.trim() || !description.trim()) return;

    if (aas) {
      // Update existing AAS
      await updateAAS.mutateAsync({
        id: aas.id,
        idShort,
        assetId,
        description,
        manufacturer: manufacturer || undefined,
        serialNumber: serialNumber || undefined,
        linkedUNSNodeId,
        linkedRDSId,
      });
    } else {
      // Create new AAS
      await createAAS.mutateAsync({
        idShort,
        assetId,
        description,
        manufacturer: manufacturer || undefined,
        serialNumber: serialNumber || undefined,
        submodels: [],
        linkedUNSNodeId,
        linkedRDSId,
      });
    }

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setIdShort('');
    setAssetId('');
    setDescription('');
    setManufacturer('');
    setSerialNumber('');
    setLinkedUNSNodeId(null);
    setLinkedRDSId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{aas ? 'Edit Asset Administration Shell' : 'Create Asset Administration Shell'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="idShort">ID Short *</Label>
            <Input
              id="idShort"
              value={idShort}
              onChange={(e) => setIdShort(e.target.value)}
              placeholder="e.g., CNC_Machine_001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assetId">Asset ID *</Label>
            <Input
              id="assetId"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="e.g., ASSET-2024-001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the asset"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g., Siemens"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g., SN-12345"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unsNode">Linked UNS Node (Optional)</Label>
            <Select value={linkedUNSNodeId || 'none'} onValueChange={(v) => setLinkedUNSNodeId(v === 'none' ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select UNS node" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Link</SelectItem>
                {unsNodes.map((node) => (
                  <SelectItem key={node.id} value={node.id}>
                    {node.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rds">Linked RDS (Optional)</Label>
            <Select value={linkedRDSId || 'none'} onValueChange={(v) => setLinkedRDSId(v === 'none' ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select RDS designation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Link</SelectItem>
                {rdsList.map((rds) => (
                  <SelectItem key={rds.id} value={rds.id}>
                    {rds.designation}
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
          <Button 
            onClick={handleSubmit} 
            disabled={!idShort.trim() || !assetId.trim() || !description.trim()}
          >
            {aas ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};