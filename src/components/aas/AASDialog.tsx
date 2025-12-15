import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AAS } from '@/types/industrial';
import { useAAS } from '@/hooks/useAAS';
import { useToast } from '@/hooks/use-toast';
import { Layers, Package } from 'lucide-react';

interface AASDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aas?: AAS | null;
  unsNodes: Array<{ id: string; name: string }>;
  rdsList: Array<{ id: string; designation: string }>;
}

export const AASDialog = ({ open, onOpenChange, aas, unsNodes, rdsList }: AASDialogProps) => {
  const { createAAS, updateAAS, aasList } = useAAS();
  const { toast } = useToast();
  
  const [idShort, setIdShort] = useState(aas?.idShort || '');
  const [assetId, setAssetId] = useState(aas?.assetId || '');
  const [description, setDescription] = useState(aas?.description || '');
  const [manufacturer, setManufacturer] = useState(aas?.manufacturer || '');
  const [serialNumber, setSerialNumber] = useState(aas?.serialNumber || '');
  const [linkedUNSNodeId, setLinkedUNSNodeId] = useState<string | null>(aas?.linkedUNSNodeId || null);
  const [linkedRDSId, setLinkedRDSId] = useState<string | null>(aas?.linkedRDSId || null);
  const [isType, setIsType] = useState(aas?.isType ?? false);
  const [typeAASId, setTypeAASId] = useState<string | null>(aas?.typeAASId || null);

  // Get available Type AAS for instance selection
  const typeAASOptions = useMemo(() => {
    return aasList.filter(a => a.isType && a.id !== aas?.id);
  }, [aasList, aas?.id]);

  // Get the selected Type AAS
  const selectedTypeAAS = useMemo(() => {
    return typeAASOptions.find(t => t.id === typeAASId);
  }, [typeAASOptions, typeAASId]);

  const handleSubmit = async () => {
    if (!idShort.trim() || !assetId.trim() || !description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (ID Short, Asset ID, and Description).',
        variant: 'destructive',
      });
      return;
    }

    try {
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
          isType,
          typeAASId: isType ? undefined : typeAASId || undefined,
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
          isType,
          typeAASId: isType ? undefined : typeAASId || undefined,
        });
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast({
        title: aas ? 'Failed to update AAS' : 'Failed to create AAS',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setIdShort('');
    setAssetId('');
    setDescription('');
    setManufacturer('');
    setSerialNumber('');
    setLinkedUNSNodeId(null);
    setLinkedRDSId(null);
    setIsType(false);
    setTypeAASId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isType ? <Layers className="h-5 w-5" /> : <Package className="h-5 w-5" />}
            {aas ? 'Edit Asset Administration Shell' : 'Create Asset Administration Shell'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Type/Instance Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
            <div className="space-y-1">
              <Label htmlFor="isType" className="text-sm font-medium">AAS Classification</Label>
              <p className="text-xs text-muted-foreground">
                {isType 
                  ? 'Type AAS: Template/class for asset types (reusable blueprint)'
                  : 'Instance AAS: Specific physical asset (inherits from Type)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isType ? "default" : "secondary"} className="text-xs">
                {isType ? 'Type' : 'Instance'}
              </Badge>
              <Switch
                id="isType"
                checked={isType}
                onCheckedChange={(checked) => {
                  setIsType(checked);
                  if (checked) {
                    setTypeAASId(null);
                    setSerialNumber('');
                    setLinkedUNSNodeId(null);
                  }
                }}
              />
            </div>
          </div>

          {/* Type AAS Selection (for Instance only) */}
          {!isType && typeAASOptions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="typeAAS">Inherit from Type AAS</Label>
              <Select value={typeAASId || 'none'} onValueChange={(v) => setTypeAASId(v === 'none' ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a Type AAS to inherit from" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Type (standalone instance)</SelectItem>
                  {typeAASOptions.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <Layers className="h-3 w-3" />
                        {type.idShort}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTypeAAS && (
                <p className="text-xs text-muted-foreground">
                  Inherits structure from: {selectedTypeAAS.description}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="idShort">ID Short *</Label>
            <Input
              id="idShort"
              value={idShort}
              onChange={(e) => setIdShort(e.target.value)}
              placeholder={isType ? "e.g., CNC_Machine_Type_5Axis" : "e.g., CNC_Machine_001"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assetId">Asset ID *</Label>
            <Input
              id="assetId"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder={isType ? "e.g., TYPE-CNC-5AXIS" : "e.g., ASSET-2024-001"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isType 
                ? "Template description for this asset type" 
                : "Description of this specific asset instance"}
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
                placeholder="e.g., DMG Mori"
              />
            </div>

            {!isType && (
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="e.g., SN-12345"
                />
              </div>
            )}
          </div>

          {/* Instance-only: UNS and RDS linking */}
          {!isType && (
            <>
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
            </>
          )}
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