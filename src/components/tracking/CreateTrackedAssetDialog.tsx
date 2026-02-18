import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTrackedAssets } from '@/hooks/useTrackedAssets';

interface CreateTrackedAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateTrackedAssetDialog = ({ open, onOpenChange }: CreateTrackedAssetDialogProps) => {
  const { createAsset } = useTrackedAssets();
  const [assetId, setAssetId] = useState('');
  const [assetType, setAssetType] = useState('container');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!assetId.trim()) return;
    createAsset.mutate(
      { asset_id: assetId.trim(), asset_type: assetType, description: description.trim() },
      { onSuccess: () => { setAssetId(''); setDescription(''); onOpenChange(false); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Tracked Asset</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Asset ID</Label>
            <Input placeholder="container-000812" value={assetId} onChange={e => setAssetId(e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={assetType} onValueChange={setAssetType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="container">Container</SelectItem>
                <SelectItem value="pallet">Pallet</SelectItem>
                <SelectItem value="carrier">Carrier</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Input placeholder="Transport container for…" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!assetId.trim() || createAsset.isPending}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
