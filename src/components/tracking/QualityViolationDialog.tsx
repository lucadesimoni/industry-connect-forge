import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TrackedAsset } from '@/types/industrial';
import { useTrackedAssets } from '@/hooks/useTrackedAssets';

interface QualityViolationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: TrackedAsset;
}

export const QualityViolationDialog = ({ open, onOpenChange, asset }: QualityViolationDialogProps) => {
  const { createEvent } = useTrackedAssets();
  const [violationType, setViolationType] = useState('temperature');
  const [measured, setMeasured] = useState('');
  const [limit, setLimit] = useState('');

  const handleSubmit = () => {
    createEvent.mutate(
      {
        asset_id: asset.id,
        event_type: 'qualityViolation',
        reason: `${violationType} violation`,
        payload: {
          type: violationType,
          measured,
          limit,
          location: asset.currentLocationPath,
          timestamp: new Date().toISOString(),
        },
        site_id: asset.siteId,
      },
      { onSuccess: () => { setMeasured(''); setLimit(''); onOpenChange(false); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Quality Violation — {asset.assetId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Violation Type</Label>
            <Input value={violationType} onChange={e => setViolationType(e.target.value)} placeholder="temperature" />
          </div>
          <div>
            <Label>Measured Value</Label>
            <Input value={measured} onChange={e => setMeasured(e.target.value)} placeholder="11.3°C" />
          </div>
          <div>
            <Label>Limit</Label>
            <Input value={limit} onChange={e => setLimit(e.target.value)} placeholder="2-8°C" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={createEvent.isPending}>Report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
