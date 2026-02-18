import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrackedAsset } from '@/types/industrial';
import { useTrackedAssets } from '@/hooks/useTrackedAssets';

interface MoveAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: TrackedAsset;
}

export const MoveAssetDialog = ({ open, onOpenChange, asset }: MoveAssetDialogProps) => {
  const { moveAsset } = useTrackedAssets();
  const [toLocation, setToLocation] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!toLocation.trim()) return;
    moveAsset.mutate(
      { assetDbId: asset.id, toLocation: toLocation.trim(), reason: reason.trim() },
      { onSuccess: () => { setToLocation(''); setReason(''); onOpenChange(false); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move {asset.assetId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Current Location</Label>
            <Input value={asset.currentLocationPath ?? 'Unknown'} disabled />
          </div>
          <div>
            <Label>New Location</Label>
            <Input placeholder="plant-ch/line-3" value={toLocation} onChange={e => setToLocation(e.target.value)} />
          </div>
          <div>
            <Label>Reason</Label>
            <Input placeholder="material_consumption" value={reason} onChange={e => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!toLocation.trim() || moveAsset.isPending}>Move</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
