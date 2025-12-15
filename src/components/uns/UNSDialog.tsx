import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Info, AlertCircle, Check } from 'lucide-react';
import { UNSNode, ISA95Level } from '@/types/industrial';
import { useUNSNodes } from '@/hooks/useUNSNodes';
import { useRDS } from '@/hooks/useRDS';
import { useToast } from '@/hooks/use-toast';
import {
  ISA95_LEVEL_ORDER,
  buildUNSMetadata,
  buildLocationRDSDesignation,
  isLocationLevel,
  validateParentForLevel,
  getAvailableParentsForLevel,
} from '@/lib/hierarchyUtils';
import { RDS_STANDARDS, getStandardsByAspect } from '@/lib/rdsStandards';

interface UNSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node?: UNSNode | null;
  nodes: UNSNode[];
}

export const UNSDialog = ({ open, onOpenChange, node, nodes }: UNSDialogProps) => {
  const { createNode, updateNode } = useUNSNodes();
  const { createRDS, rdsList } = useRDS();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<ISA95Level>('Enterprise');
  const [parentId, setParentId] = useState<string | null>(null);
  
  // Function/Product aspects for Cell level
  const [functionAspect, setFunctionAspect] = useState('');
  const [productAspect, setProductAspect] = useState('');

  // Get function and product standards for dropdowns
  const functionStandards = useMemo(() => getStandardsByAspect('function'), []);
  const productStandards = useMemo(() => getStandardsByAspect('product'), []);

  // Reset form when node changes or dialog opens
  useEffect(() => {
    if (open) {
      setName(node?.name || '');
      setDescription(node?.description || '');
      setLevel(node?.level || 'Enterprise');
      setParentId(node?.parentId || null);
      setFunctionAspect(node?.metadata?.function_aspect || '');
      setProductAspect(node?.metadata?.product_aspect || '');
    }
  }, [open, node]);

  // Get available parents based on selected level
  const availableParents = useMemo(() => {
    return getAvailableParentsForLevel(level, nodes, node?.id);
  }, [level, nodes, node?.id]);

  // Auto-select parent when level changes
  useEffect(() => {
    if (availableParents.length === 1 && !node) {
      setParentId(availableParents[0].id);
    } else if (availableParents.length === 0 && level !== 'Enterprise') {
      setParentId(null);
    }
  }, [availableParents, level, node]);

  // Get parent node for metadata building
  const parentNode = useMemo(() => {
    return parentId ? nodes.find(n => n.id === parentId) || null : null;
  }, [parentId, nodes]);

  // Build linked RDS data for Cell level
  const linkedRDSData = useMemo(() => {
    if (isLocationLevel(level)) return null;
    return {
      functionAspect: functionAspect || undefined,
      productAspect: productAspect || undefined,
    };
  }, [level, functionAspect, productAspect]);

  // Build preview metadata
  const previewMetadata = useMemo(() => {
    if (!name.trim()) return null;
    return buildUNSMetadata(level, name.trim(), parentNode, nodes, linkedRDSData);
  }, [name, level, parentNode, nodes, linkedRDSData]);

  // Build preview RDS designation
  const previewRDS = useMemo(() => {
    if (!name.trim() || !previewMetadata) return null;
    return buildLocationRDSDesignation(level, name.trim(), parentNode, previewMetadata.uns_path);
  }, [name, level, parentNode, previewMetadata]);

  // Validate parent selection
  const parentValidation = useMemo(() => {
    return validateParentForLevel(level, parentNode);
  }, [level, parentNode]);

  // Check if RDS already exists
  const rdsExists = useMemo(() => {
    if (!previewRDS) return false;
    return rdsList.some(rds => rds.designation === previewRDS.designation);
  }, [previewRDS, rdsList]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a name for the node.',
        variant: 'destructive',
      });
      return;
    }

    if (!parentValidation.valid) {
      toast({
        title: 'Hierarchy Error',
        description: parentValidation.message,
        variant: 'destructive',
      });
      return;
    }

    try {
      const metadata = buildUNSMetadata(level, name.trim(), parentNode, nodes, linkedRDSData);

      if (node) {
        // Update existing node
        await updateNode.mutateAsync({
          id: node.id,
          name: name.trim(),
          description: description.trim() || undefined,
          level,
          parentId,
          metadata,
        });
      } else {
        // Create new node
        const result = await createNode.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          level,
          parentId,
          metadata,
        });

        // Auto-create corresponding RDS designation for location levels
        if (result?.id && isLocationLevel(level)) {
          const rdsData = buildLocationRDSDesignation(level, name.trim(), parentNode, metadata.uns_path);
          
          if (rdsData && !rdsExists) {
            try {
              await createRDS.mutateAsync({
                designation: rdsData.designation,
                aspectCode: rdsData.aspectCode,
                objectClass: rdsData.objectClass,
                description: `Location: ${name.trim()} (${level})`,
                linkedUNSNodeId: result.id,
                linkedAASId: undefined,
                isInstance: false,
                locationAspect: rdsData.locationAspect,
                functionAspect: undefined,
                productAspect: undefined,
                metadata: {
                  uns_topic: metadata.uns_path,
                  mqtt_topic: metadata.mqtt_topic,
                  sparkplug_topic: metadata.sparkplug_topic,
                  hierarchy_level: level,
                  auto_created: true,
                },
              });
              
              toast({
                title: 'RDS Created',
                description: `Location RDS ${rdsData.designation} was automatically created.`,
              });
            } catch (rdsError) {
              console.error('RDS creation failed:', rdsError);
              // Non-fatal - UNS node was still created
            }
          }
        }
      }

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Failed to save UNS node',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    }
  };

  const isSubmitDisabled = !name.trim() || !parentValidation.valid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{node ? 'Edit UNS Node' : 'Create UNS Node'}</DialogTitle>
          <DialogDescription>
            Create a node in the Unified Namespace hierarchy following ISA-95 structure.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Preview Section */}
          {previewMetadata && (
            <div className="space-y-2 p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Check className="h-4 w-4 text-primary" />
                <span>Preview</span>
              </div>
              
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UNS Path:</span>
                  <code className="font-mono text-primary">{previewMetadata.uns_path}</code>
                </div>
                {previewMetadata.extended_uns_path !== previewMetadata.uns_path && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Extended Path:</span>
                    <code className="font-mono text-primary">{previewMetadata.extended_uns_path}</code>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MQTT Topic:</span>
                  <code className="font-mono text-xs">{previewMetadata.mqtt_topic}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sparkplug B:</span>
                  <code className="font-mono text-xs">{previewMetadata.sparkplug_topic}</code>
                </div>
                {previewRDS && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">RDS Location:</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-bold">{previewRDS.designation}</code>
                      {rdsExists && (
                        <Badge variant="secondary" className="text-xs">Exists</Badge>
                      )}
                    </div>
                  </div>
                )}
                {previewMetadata.full_rds_designation && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Full RDS:</span>
                    <code className="font-mono font-bold text-primary">{previewMetadata.full_rds_designation}</code>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ISA-95 Level */}
          <div className="space-y-2">
            <Label htmlFor="level">ISA-95 Level</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as ISA95Level)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ISA95_LEVEL_ORDER.map((lvl) => (
                  <SelectItem key={lvl} value={lvl}>
                    <div className="flex items-center gap-2">
                      <span>{lvl}</span>
                      {isLocationLevel(lvl) ? (
                        <Badge variant="outline" className="text-xs">Location RDS</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Asset Level</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isLocationLevel(level) 
                ? 'Location-based RDS will be auto-created (+ENT.SITE.AREA.LN)'
                : 'Below Line level - use function/product RDS for assets'
              }
            </p>
          </div>

          {/* Parent Node */}
          {level !== 'Enterprise' && (
            <div className="space-y-2">
              <Label htmlFor="parent">Parent Node</Label>
              <Select 
                value={parentId || ''} 
                onValueChange={(v) => setParentId(v || null)}
              >
                <SelectTrigger className={!parentValidation.valid ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select parent node" />
                </SelectTrigger>
                <SelectContent>
                  {availableParents.length === 0 ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground">
                      No valid parents available
                    </div>
                  ) : (
                    availableParents.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        <div className="flex items-center gap-2">
                          <span>{n.name}</span>
                          <Badge variant="outline" className="text-xs">{n.level}</Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {!parentValidation.valid && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {parentValidation.message}
                </p>
              )}
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g., ${level === 'Enterprise' ? 'Pilatus' : level === 'Site' ? 'Stans' : level === 'Area' ? 'Hall3' : level === 'Line' ? 'AssemblyLine1' : 'Station01'}`}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Node description"
              rows={2}
            />
          </div>

          {/* Function/Product Aspects for Cell level */}
          {!isLocationLevel(level) && (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <div className="text-sm font-medium">Asset Aspects (IEC 81346)</div>
              <p className="text-xs text-muted-foreground">
                For Cell level and below, define function and product aspects to identify assets/work areas.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="function-aspect">Function Aspect (=)</Label>
                  <Select value={functionAspect || 'none'} onValueChange={(v) => setFunctionAspect(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select function..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No function</SelectItem>
                      {functionStandards.map((std) => (
                        <SelectItem key={std.code} value={std.code}>
                          <div className="flex items-center gap-2">
                            <code className="font-mono">{std.code}</code>
                            <span className="text-muted-foreground text-xs">{std.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="product-aspect">Product Aspect (-)</Label>
                  <Select value={productAspect || 'none'} onValueChange={(v) => setProductAspect(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No product</SelectItem>
                      {productStandards.map((std) => (
                        <SelectItem key={std.code} value={std.code}>
                          <div className="flex items-center gap-2">
                            <code className="font-mono">{std.code}</code>
                            <span className="text-muted-foreground text-xs">{std.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Hierarchy:</strong> Enterprise → Site → Area → Line → Cell. 
              {isLocationLevel(level) 
                ? ' RDS location codes are auto-generated for levels up to Line.'
                : ' Cell level uses function (=) and product (-) aspects to identify assets/work areas.'
              }
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
            {node ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};