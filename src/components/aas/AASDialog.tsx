import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AAS, UNSNode } from '@/types/industrial';
import { useAAS } from '@/hooks/useAAS';
import { useToast } from '@/hooks/use-toast';
import { Layers, Package, AlertTriangle } from 'lucide-react';
import { useSiteContext } from '@/contexts/SiteContext';
import { 
  filterUNSForAAS, 
  filterRDSForAAS, 
  validateAASUNSLink, 
  validateAASRDSLink,
  checkCircularReference 
} from '@/lib/relationshipValidation';
import { isUniqueAssetId, validateAssetId, generateAssetIdSuggestion } from '@/lib/validation';

interface AASDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aas?: AAS | null;
  unsNodes: UNSNode[];
  rdsList: Array<{ id: string; designation: string; aspectCode: string; isInstance: boolean }>;
}

export const AASDialog = ({ open, onOpenChange, aas, unsNodes, rdsList }: AASDialogProps) => {
  const { createAAS, updateAAS, aasList } = useAAS();
  const { toast } = useToast();
  const { selectedSiteId } = useSiteContext();
  
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

  // Filter UNS nodes for AAS linking (Line/Cell levels only)
  const filteredUNSNodes = useMemo(() => {
    return filterUNSForAAS(unsNodes);
  }, [unsNodes]);

  // Filter RDS for AAS linking (instances for instance AAS, definitions for type AAS)
  const filteredRDSList = useMemo(() => {
    // For type AAS, show RDS definitions (not instances)
    // For instance AAS, show RDS instances
    return rdsList.filter(r => r.isInstance !== isType);
  }, [rdsList, isType]);

  // Validation results
  const validationResults = useMemo(() => {
    const results: Array<{ type: 'uns' | 'rds'; result: ReturnType<typeof validateAASUNSLink> }> = [];
    
    // Create a temporary AAS object for validation (when creating new AAS, aas is null/undefined)
    const tempAAS: AAS = aas || {
      id: '',
      assetId: assetId || '',
      idShort: idShort || '',
      description: description || '',
      manufacturer: manufacturer || undefined,
      serialNumber: serialNumber || undefined,
      submodels: [],
      linkedUNSNodeId: linkedUNSNodeId || undefined,
      linkedRDSId: linkedRDSId || undefined,
      isType: isType,
      typeAASId: typeAASId || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    if (linkedUNSNodeId) {
      const unsNode = unsNodes.find(n => n.id === linkedUNSNodeId);
      if (unsNode) {
        results.push({ 
          type: 'uns', 
          result: validateAASUNSLink({ ...tempAAS, linkedUNSNodeId }, unsNode) 
        });
      }
    }

    if (linkedRDSId) {
      const rds = rdsList.find(r => r.id === linkedRDSId);
      if (rds) {
        results.push({ 
          type: 'rds', 
          result: validateAASRDSLink({ ...tempAAS, linkedRDSId, isType }, rds as any) 
        });
        // Check circular reference (only for existing AAS with an ID)
        if (tempAAS.id) {
          const circularCheck = checkCircularReference(
            'AAS',
            tempAAS.id,
            'RDS',
            linkedRDSId,
            aasList,
            rdsList as any[]
          );
          if (!circularCheck.valid) {
            results.push({ type: 'rds', result: circularCheck });
          }
        }
      }
    }

    return results;
  }, [linkedUNSNodeId, linkedRDSId, unsNodes, rdsList, aas, isType, aasList, idShort, assetId, description, manufacturer, serialNumber, typeAASId]);

  // Asset ID IRI validation
  const assetIdValidation = useMemo(() => {
    if (!assetId.trim()) return null;
    return validateAssetId(assetId);
  }, [assetId]);

  const handleSuggestAssetId = () => {
    setAssetId(generateAssetIdSuggestion(idShort, isType));
  };

  const handleSubmit = async () => {
    if (!idShort.trim() || !assetId.trim() || !description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (ID Short, Asset ID, and Description).',
        variant: 'destructive',
      });
      return;
    }

    const iriCheck = validateAssetId(assetId);
    if (!iriCheck.valid) {
      toast({
        title: 'Invalid Asset ID format',
        description: iriCheck.message,
        variant: 'destructive',
      });
      return;
    }

    if (!isUniqueAssetId(assetId, aasList, aas?.id)) {
      toast({
        title: 'Validation Error',
        description: 'Asset ID must be unique. Another AAS already uses this Asset ID.',
        variant: 'destructive',
      });
      return;
    }

    // Check for validation errors
    const errors = validationResults.filter(r => !r.result.valid && r.result.severity === 'error');
    if (errors.length > 0) {
      toast({
        title: 'Validation Error',
        description: errors.map(e => e.result.message).join('; '),
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
          siteId: selectedSiteId ?? undefined,
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
            <Label htmlFor="assetId">Global Asset ID (IRI) *</Label>
            <div className="flex gap-2">
              <Input
                id="assetId"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                placeholder={isType ? "urn:your-company:aas:type:CNC-5Axis" : "urn:your-company:aas:instance:CNC-001"}
                className={assetIdValidation && !assetIdValidation.valid ? 'border-destructive' : ''}
              />
              <Button type="button" variant="outline" size="sm" onClick={handleSuggestAssetId} disabled={!idShort.trim()}>
                Auto
              </Button>
            </div>
            {assetIdValidation && !assetIdValidation.valid && (
              <p className="text-xs text-destructive">{assetIdValidation.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Per IEC 63278: globally unique IRI that accompanies this asset throughout its lifecycle. Use URN (urn:company:asset:ID) or HTTPS URI.
            </p>
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
                    <SelectValue placeholder="Select UNS node (Line/Cell level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Link</SelectItem>
                    {filteredUNSNodes.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        <div className="flex items-center gap-2">
                          <span>{node.name}</span>
                          <Badge variant="outline" className="text-xs">{node.level}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only Line and Cell level nodes are shown (where physical assets are located)
                </p>
                {validationResults.find(r => r.type === 'uns')?.result && (() => {
                  const result = validationResults.find(r => r.type === 'uns')!.result;
                  if (result.severity === 'warning') {
                    return (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{result.message}</AlertDescription>
                      </Alert>
                    );
                  }
                  if (!result.valid) {
                    return (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{result.message}</AlertDescription>
                      </Alert>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rds">Linked RDS (Optional)</Label>
                <Select value={linkedRDSId || 'none'} onValueChange={(v) => setLinkedRDSId(v === 'none' ? null : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select RDS designation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Link</SelectItem>
                    {filteredRDSList.map((rds) => (
                      <SelectItem key={rds.id} value={rds.id}>
                        <div className="flex items-center gap-2">
                          <span>{rds.designation}</span>
                          {rds.isInstance && <Badge variant="outline" className="text-xs">Instance</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only RDS instances are shown (abstract definitions not available for Instance AAS)
                </p>
                {(() => {
                  // Get all RDS validation results
                  const rdsResults = validationResults.filter(r => r.type === 'rds');
                  if (rdsResults.length === 0) return null;

                  // Prioritize errors over warnings over valid
                  const errorResult = rdsResults.find(r => !r.result.valid && r.result.severity === 'error');
                  const warningResult = rdsResults.find(r => r.result.severity === 'warning');
                  
                  // Show error if exists, otherwise show warning
                  const resultToShow = errorResult || warningResult;
                  
                  if (!resultToShow) return null;
                  
                  const result = resultToShow.result;
                  if (result.severity === 'warning') {
                    return (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{result.message}</AlertDescription>
                      </Alert>
                    );
                  }
                  if (!result.valid) {
                    return (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{result.message}</AlertDescription>
                      </Alert>
                    );
                  }
                  return null;
                })()}
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
