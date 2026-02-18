import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrackedAsset } from '@/types/industrial';
import { useTrackedAssets } from '@/hooks/useTrackedAssets';

interface BindContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: TrackedAsset;
}

export const BindContextDialog = ({ open, onOpenChange, asset }: BindContextDialogProps) => {
  const { bindContext } = useTrackedAssets();
  const [contextType, setContextType] = useState('order');
  const [contextId, setContextId] = useState('');

  const handleSubmit = () => {
    if (!contextId.trim()) return;
    bindContext.mutate(
      { asset_id: asset.id, context_type: contextType, context_id: contextId.trim(), site_id: asset.siteId },
      { onSuccess: () => { setContextId(''); onOpenChange(false); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bind Context to {asset.assetId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Context Type</Label>
            <Select value={contextType} onValueChange={setContextType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="order">Order (PO)</SelectItem>
                <SelectItem value="workorder">Work Order (WO)</SelectItem>
                <SelectItem value="shipment">Shipment (SHP)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Context ID</Label>
            <Input placeholder="PO-471193" value={contextId} onChange={e => setContextId(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!contextId.trim() || bindContext.isPending}>Bind</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
