import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTrackedAssets } from '@/hooks/useTrackedAssets';
import { useSiteContext } from '@/contexts/SiteContext';
import { validateAssetId } from '@/lib/validation';

interface CreateTrackedAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateTrackedAssetDialog = ({ open, onOpenChange }: CreateTrackedAssetDialogProps) => {
  const { createAsset } = useTrackedAssets();
  const { selectedSiteId } = useSiteContext();
  const [assetId, setAssetId] = useState('');
  const [assetType, setAssetType] = useState('container');
  const [description, setDescription] = useState('');

  const assetIdValidation = useMemo(() => {
    if (!assetId.trim()) return null;
    return validateAssetId(assetId);
  }, [assetId]);

  const handleSuggestId = () => {
    const slug = description.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_.]/g, '').toLowerCase() || assetType;
    setAssetId(`urn:your-company:tracked:${assetType}:${slug}`);
  };

  const handleSubmit = () => {
    const iriCheck = validateAssetId(assetId);
    if (!iriCheck.valid) return;
    createAsset.mutate(
      { asset_id: assetId.trim(), asset_type: assetType, description: description.trim(), site_id: selectedSiteId ?? undefined },
      { onSuccess: () => { setAssetId(''); setDescription(''); onOpenChange(false); } }
    );
  };

  const isValid = assetId.trim() && (!assetIdValidation || assetIdValidation.valid);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Tracked Asset</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Asset ID (IRI) *</Label>
            <div className="flex gap-2">
              <Input
                placeholder="urn:your-company:tracked:container:box-812"
                value={assetId}
                onChange={e => setAssetId(e.target.value)}
                className={assetIdValidation && !assetIdValidation.valid ? 'border-destructive' : ''}
              />
              <Button type="button" variant="outline" size="sm" onClick={handleSuggestId}>
                Auto
              </Button>
            </div>
            {assetIdValidation && !assetIdValidation.valid && (
              <p className="text-xs text-destructive">{assetIdValidation.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Globally unique IRI per IEC 63278. Use URN (urn:company:tracked:ID) or HTTPS URI.
            </p>
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
          <Button onClick={handleSubmit} disabled={!isValid || createAsset.isPending}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};