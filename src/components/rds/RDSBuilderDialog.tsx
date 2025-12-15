import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertCircle, Check, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useRDS } from '@/hooks/useRDS';
import { RDSCatalogueDialog } from './RDSCatalogueDialog';
import { buildAssetRDSDesignation, generateAssetSparkplugTopics } from '@/lib/hierarchyUtils';
import type { RDSStandard } from '@/lib/rdsStandards';
import type { UNSNode, AAS, RDSDesignation } from '@/types/industrial';
import { 
  filterUNSForRDS, 
  filterAASForRDS, 
  validateRDSUNSLink, 
  validateRDSAASLink,
  checkCircularReference 
} from '@/lib/relationshipValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface UNSNodeSimple {
  id: string;
  name: string;
  level?: string;
  metadata?: Record<string, any>;
}

interface RDSBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unsNodes: UNSNodeSimple[];
  aasList: Array<{ id: string; idShort: string; isType: boolean }>;
}

// IEC 81346 aspect codes for assets (function and product only - location is handled by UNS)
const ASPECT_CODES = [
  { code: '=', name: 'Function', description: 'Functional aspect - what the asset does (e.g., =M1 Motor, =P2 Pump)' },
  { code: '-', name: 'Product', description: 'Product aspect - what the asset is (e.g., -CNC1 CNC Machine)' },
] as const;

// Validation schema
const rdsSchema = z.object({
  aspectCode: z.enum(['=', '-']),
  objectClass: z.string()
    .min(1, 'Function/Product code is required')
    .max(10, 'Code must be 10 characters or less')
    .regex(/^[A-Z][A-Z0-9]*$/, 'Code must start with letter and contain only uppercase letters/numbers'),
  instanceNumber: z.number().int().min(1).max(9999).optional(),
  description: z.string()
    .min(1, 'Description is required')
    .max(200, 'Description must be 200 characters or less'),
});

export const RDSBuilderDialog = ({ open, onOpenChange, unsNodes, aasList }: RDSBuilderDialogProps) => {
  const { toast } = useToast();
  const { createRDS, rdsList } = useRDS();
  
  const [aspectCode, setAspectCode] = useState<'=' | '-'>('=');
  const [objectClass, setObjectClass] = useState('');
  const [instanceNumber, setInstanceNumber] = useState<number | undefined>(1);
  const [productCode, setProductCode] = useState('');
  const [description, setDescription] = useState('');
  const [linkedUNSNodeId, setLinkedUNSNodeId] = useState<string | undefined>(undefined);
  const [linkedAASId, setLinkedAASId] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [catalogueOpen, setCatalogueOpen] = useState(false);

  // Get Line-level and below nodes for location linking (filtered)
  const locationNodes = useMemo(() => {
    const filtered = filterUNSForRDS(unsNodes as UNSNode[]);
    return filtered.map(n => ({
      id: n.id,
      name: n.name,
      level: n.level,
      metadata: n.metadata,
    }));
  }, [unsNodes]);

  // Filter AAS for RDS linking (instances for RDS instances)
  const filteredAASList = useMemo(() => {
    const isInstance = !!linkedUNSNodeId;
    return filterAASForRDS(
      aasList.map(a => ({ ...a, isType: a.isType || false })) as AAS[],
      isInstance
    );
  }, [aasList, linkedUNSNodeId]);

  // Validation results
  const validationResults = useMemo(() => {
    const results: Array<{ type: 'uns' | 'aas'; result: ReturnType<typeof validateRDSUNSLink> }> = [];
    
    if (linkedUNSNodeId) {
      const unsNode = unsNodes.find(n => n.id === linkedUNSNodeId);
      if (unsNode) {
        const rds: RDSDesignation = {
          id: '',
          designation: designationPreview?.designation || '',
          aspectCode: aspectCode,
          objectClass: objectClass,
          description: description,
          isInstance: !!linkedUNSNodeId,
          linkedUNSNodeId: linkedUNSNodeId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        results.push({ 
          type: 'uns', 
          result: validateRDSUNSLink(rds, unsNode as UNSNode) 
        });
      }
    }

    if (linkedAASId) {
      const aas = aasList.find(a => a.id === linkedAASId);
      if (aas) {
        const rds: RDSDesignation = {
          id: '',
          designation: designationPreview?.designation || '',
          aspectCode: aspectCode,
          objectClass: objectClass,
          description: description,
          isInstance: !!linkedUNSNodeId,
          linkedAASId: linkedAASId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        results.push({ 
          type: 'aas', 
          result: validateRDSAASLink(rds, { ...aas, isType: aas.isType || false } as AAS) 
        });
      }
    }

    return results;
  }, [linkedUNSNodeId, linkedAASId, unsNodes, aasList, aspectCode, objectClass, description, designationPreview]);

  // Get selected node's location path
  const selectedNode = useMemo(() => {
    return linkedUNSNodeId ? unsNodes.find(n => n.id === linkedUNSNodeId) : null;
  }, [linkedUNSNodeId, unsNodes]);

  const locationPath = useMemo(() => {
    if (!selectedNode?.metadata?.rds_location) return null;
    return selectedNode.metadata.rds_location as string;
  }, [selectedNode]);

  // Build designation preview
  const designationPreview = useMemo(() => {
    if (!objectClass) return null;
    
    return buildAssetRDSDesignation(
      objectClass,
      productCode || undefined,
      locationPath,
      instanceNumber
    );
  }, [objectClass, productCode, locationPath, instanceNumber]);

  // Build Sparkplug topics preview
  const sparkplugTopics = useMemo(() => {
    if (!selectedNode?.metadata?.uns_path || !objectClass) return null;
    const assetName = `${aspectCode}${objectClass}${instanceNumber || ''}`;
    return generateAssetSparkplugTopics(
      selectedNode.metadata.uns_path as string,
      assetName
    );
  }, [selectedNode, objectClass, aspectCode, instanceNumber]);

  // Check if designation already exists
  const designationExists = useMemo(() => {
    if (!designationPreview) return false;
    return rdsList.some(rds => rds.designation === designationPreview.designation);
  }, [designationPreview, rdsList]);

  const handleStandardSelect = (standard: RDSStandard) => {
    // Only use function and product standards
    if (standard.aspectType === 'location') {
      toast({
        title: 'Location Standards',
        description: 'Location aspects are auto-generated from UNS hierarchy. Select a function or product standard.',
        variant: 'destructive',
      });
      return;
    }
    
    setAspectCode(standard.aspectType === 'function' ? '=' : '-');
    setObjectClass(standard.code.substring(1)); // Remove the aspect prefix
    setDescription(standard.description);
    setCatalogueOpen(false);
    
    toast({
      title: 'Standard Applied',
      description: `${standard.code} - ${standard.name}`,
    });
  };

  const validateForm = () => {
    try {
      rdsSchema.parse({
        aspectCode,
        objectClass,
        instanceNumber,
        description,
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please correct the errors in the form.',
        variant: 'destructive',
      });
      return;
    }

    if (!designationPreview) return;

    if (designationExists) {
      toast({
        title: 'Designation Exists',
        description: `The designation ${designationPreview.designation} already exists.`,
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
    
    await createRDS.mutateAsync({
      designation: designationPreview.designation,
      aspectCode: designationPreview.aspectCode,
      objectClass: designationPreview.objectClass,
      description,
      linkedUNSNodeId: linkedUNSNodeId || undefined,
      linkedAASId: linkedAASId || undefined,
      isInstance: !!linkedUNSNodeId, // Instance if linked to a location
      functionAspect: designationPreview.functionAspect,
      productAspect: designationPreview.productAspect,
      locationAspect: designationPreview.locationAspect,
      metadata: {
        instance_number: instanceNumber,
        mqtt_topic: selectedNode?.metadata?.mqtt_topic,
        sparkplug_topics: sparkplugTopics,
        uns_path: selectedNode?.metadata?.uns_path,
      },
    });

    handleReset();
    onOpenChange(false);
  };

  const handleReset = () => {
    setAspectCode('=');
    setObjectClass('');
    setInstanceNumber(1);
    setProductCode('');
    setDescription('');
    setLinkedUNSNodeId(undefined);
    setLinkedAASId(undefined);
    setErrors({});
  };

  const selectedAspect = ASPECT_CODES.find(a => a.code === aspectCode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Asset RDS Designation</DialogTitle>
          <DialogDescription>
            Create a function or product designation for an asset. Location is derived from linked UNS node.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Designation Preview */}
          {designationPreview && (
            <div className="space-y-3 p-4 rounded-lg border bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Generated Designation</span>
                </div>
                {designationExists && (
                  <Badge variant="destructive">Already Exists</Badge>
                )}
              </div>
              
              <code className="block text-xl font-mono font-bold text-primary">
                {designationPreview.designation}
              </code>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Function:</span>{' '}
                  <span className="font-mono">{designationPreview.functionAspect || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Product:</span>{' '}
                  <span className="font-mono">{designationPreview.productAspect || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Location:</span>{' '}
                  <span className="font-mono">{designationPreview.locationAspect || 'Not linked'}</span>
                </div>
              </div>

              {sparkplugTopics && (
                <div className="pt-2 border-t space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Sparkplug B Topics:</span>
                  <div className="text-xs font-mono space-y-0.5">
                    <div className="text-green-600">DBIRTH: {sparkplugTopics.birthTopic}</div>
                    <div className="text-blue-600">DDATA: {sparkplugTopics.dataTopic}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aspect Code Selection */}
          <div className="space-y-2">
            <Label htmlFor="aspect-code">
              Aspect Type <span className="text-destructive">*</span>
            </Label>
            <Select value={aspectCode} onValueChange={(value: '=' | '-') => setAspectCode(value)}>
              <SelectTrigger id="aspect-code">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_CODES.map((aspect) => (
                  <SelectItem key={aspect.code} value={aspect.code}>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono text-base w-8 justify-center">
                        {aspect.code}
                      </Badge>
                      <div>
                        <p className="font-semibold">{aspect.name}</p>
                        <p className="text-xs text-muted-foreground">{aspect.description}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAspect && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {selectedAspect.description}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Object Class / Code */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="object-class">
                  {aspectCode === '=' ? 'Function Code' : 'Product Code'} <span className="text-destructive">*</span>
                </Label>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => setCatalogueOpen(true)}
                  className="h-7 text-xs"
                >
                  <BookOpen className="h-3 w-3 mr-1" />
                  Standards
                </Button>
              </div>
              <Input
                id="object-class"
                placeholder={aspectCode === '=' ? 'e.g., M, P, V, S' : 'e.g., CNC, DRV, PUMP'}
                value={objectClass}
                onChange={(e) => setObjectClass(e.target.value.toUpperCase())}
                className={errors.objectClass ? 'border-destructive' : ''}
              />
              {errors.objectClass && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.objectClass}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="instance-number">Instance #</Label>
              <Input
                id="instance-number"
                type="number"
                min={1}
                max={9999}
                placeholder="1"
                value={instanceNumber || ''}
                onChange={(e) => setInstanceNumber(e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
          </div>

          {/* Secondary Product Code (for function aspects) */}
          {aspectCode === '=' && (
            <div className="space-y-2">
              <Label htmlFor="product-code">Product Code (Optional)</Label>
              <Input
                id="product-code"
                placeholder="e.g., DRV (drive), BRKT (bracket)"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-muted-foreground">
                Optional product identifier (e.g., =M1-DRV1 for Motor with Drive)
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the asset..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.description}
              </p>
            )}
          </div>

          {/* Location Link (UNS Node at Line level or below) */}
          <div className="space-y-4 pt-2 border-t">
            <h3 className="text-sm font-semibold">Link to Location (Recommended)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="uns-link">UNS Location (Line/Cell)</Label>
              <Select value={linkedUNSNodeId || 'none'} onValueChange={(value) => setLinkedUNSNodeId(value === 'none' ? undefined : value)}>
                <SelectTrigger id="uns-link">
                  <SelectValue placeholder="Select location from UNS hierarchy..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No location link</SelectItem>
                  {locationNodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      <div className="flex items-center gap-2">
                        <span>{node.name}</span>
                        <Badge variant="outline" className="text-xs">{node.level}</Badge>
                        {node.metadata?.rds_location && (
                          <span className="text-xs font-mono text-muted-foreground">
                            {node.metadata.rds_location as string}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Linking to a UNS node adds location suffix to the designation and generates Sparkplug B topics
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
              <Label htmlFor="aas-link">Link to AAS (Optional)</Label>
              <Select value={linkedAASId || 'none'} onValueChange={(value) => setLinkedAASId(value === 'none' ? undefined : value)}>
                <SelectTrigger id="aas-link">
                  <SelectValue placeholder="Select AAS..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No AAS link</SelectItem>
                  {filteredAASList.map((aas) => (
                    <SelectItem key={aas.id} value={aas.id}>
                      <div className="flex items-center gap-2">
                        <span>{aas.idShort}</span>
                        {aas.isType && <Badge variant="outline" className="text-xs">Type</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {linkedUNSNodeId 
                  ? 'Only Instance AAS are shown (for RDS instances)'
                  : 'Only Type AAS are shown (for abstract RDS definitions)'}
              </p>
              {validationResults.find(r => r.type === 'aas')?.result && (() => {
                const result = validationResults.find(r => r.type === 'aas')!.result;
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
          </div>

          {/* Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>RDS Naming:</strong> Location codes (+PIL.STANS.LN01) are derived from UNS hierarchy.
              Assets use function (=) or product (-) codes with instance numbers.
              Example: <code className="font-mono">=M1+PIL.STANS.LN01</code> for Motor 1 at Line 01.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleCreate} disabled={!objectClass || !description || designationExists}>
            Create RDS Designation
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Standards Catalogue Dialog */}
      <RDSCatalogueDialog
        open={catalogueOpen}
        onOpenChange={setCatalogueOpen}
        onSelect={handleStandardSelect}
      />
    </Dialog>
  );
};
