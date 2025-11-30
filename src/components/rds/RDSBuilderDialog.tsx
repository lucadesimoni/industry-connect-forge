import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertCircle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useRDS } from '@/hooks/useRDS';

interface RDSBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unsNodes: Array<{ id: string; name: string }>;
  aasList: Array<{ id: string; idShort: string }>;
}

// IEC 81346 aspect codes
const ASPECT_CODES = [
  { code: '=', name: 'Function', description: 'Functional aspect - what the object does' },
  { code: '-', name: 'Product', description: 'Product aspect - what the object is' },
  { code: '+', name: 'Location', description: 'Location aspect - where the object is' },
] as const;

// Validation schema
const rdsSchema = z.object({
  aspectCode: z.enum(['=', '-', '+']),
  objectClass: z.string()
    .min(1, 'Object class is required')
    .max(10, 'Object class must be 10 characters or less')
    .regex(/^[A-Z0-9]+$/, 'Object class must contain only uppercase letters and numbers'),
  locationCode: z.string()
    .min(1, 'Location code is required')
    .max(20, 'Location code must be 20 characters or less')
    .regex(/^[A-Z0-9.]+$/, 'Location code must contain only uppercase letters, numbers, and dots'),
  description: z.string()
    .min(1, 'Description is required')
    .max(200, 'Description must be 200 characters or less'),
});

export const RDSBuilderDialog = ({ open, onOpenChange, unsNodes, aasList }: RDSBuilderDialogProps) => {
  const { toast } = useToast();
  const { createRDS } = useRDS();
  const [aspectCode, setAspectCode] = useState<'=' | '-' | '+'>('=');
  const [objectClass, setObjectClass] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [description, setDescription] = useState('');
  const [functionAspect, setFunctionAspect] = useState('');
  const [productAspect, setProductAspect] = useState('');
  const [locationAspect, setLocationAspect] = useState('');
  const [linkedUNSNodeId, setLinkedUNSNodeId] = useState<string>('');
  const [linkedAASId, setLinkedAASId] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Generate designation preview
  const generateDesignation = () => {
    if (!objectClass || !locationCode) return '';
    return `${aspectCode}${objectClass}-${locationCode}`;
  };

  const validateForm = () => {
    try {
      rdsSchema.parse({
        aspectCode,
        objectClass,
        locationCode,
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

    const designation = generateDesignation();
    
    await createRDS.mutateAsync({
      designation,
      aspectCode,
      objectClass,
      description,
      linkedUNSNodeId: linkedUNSNodeId || undefined,
      linkedAASId: linkedAASId || undefined,
      metadata: {
        functionAspect: functionAspect || undefined,
        productAspect: productAspect || undefined,
        locationAspect: locationAspect || undefined,
      },
    });

    handleReset();
    onOpenChange(false);
  };

  const handleReset = () => {
    setAspectCode('=');
    setObjectClass('');
    setLocationCode('');
    setDescription('');
    setFunctionAspect('');
    setProductAspect('');
    setLocationAspect('');
    setLinkedUNSNodeId('');
    setLinkedAASId('');
    setErrors({});
  };

  const designation = generateDesignation();
  const selectedAspect = ASPECT_CODES.find(a => a.code === aspectCode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>RDS Designation Builder</DialogTitle>
          <DialogDescription>
            Create a new Reference Designation System entry compliant with IEC 81346
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Designation Preview */}
          {designation && (
            <Alert className="bg-primary/5 border-primary">
              <Check className="h-4 w-4 text-primary" />
              <AlertDescription>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Generated Designation:</span>
                  <code className="text-lg font-mono font-bold text-primary">{designation}</code>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Aspect Code Selection */}
          <div className="space-y-2">
            <Label htmlFor="aspect-code">
              IEC 81346 Aspect Code <span className="text-destructive">*</span>
            </Label>
            <Select value={aspectCode} onValueChange={(value: '=' | '-' | '+') => setAspectCode(value)}>
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
                  <strong>{selectedAspect.name} Aspect ({selectedAspect.code}):</strong> {selectedAspect.description}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Object Class */}
          <div className="space-y-2">
            <Label htmlFor="object-class">
              Object Class <span className="text-destructive">*</span>
            </Label>
            <Input
              id="object-class"
              placeholder="e.g., M1, C1, P2"
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
            <p className="text-xs text-muted-foreground">
              Uppercase letters and numbers only (e.g., M1 for Motor type 1)
            </p>
          </div>

          {/* Location Code */}
          <div className="space-y-2">
            <Label htmlFor="location-code">
              Location Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="location-code"
              placeholder="e.g., A1.1, L2.3"
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value.toUpperCase())}
              className={errors.locationCode ? 'border-destructive' : ''}
            />
            {errors.locationCode && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.locationCode}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Hierarchical location (e.g., A1.1 for Area A, Position 1.1)
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the asset or system..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.description}
              </p>
            )}
          </div>

          {/* Aspect Details */}
          <div className="space-y-4 pt-2 border-t">
            <h3 className="text-sm font-semibold">IEC 81346 Aspect Details (Optional)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="function-aspect">Function Aspect Description</Label>
              <Input
                id="function-aspect"
                placeholder="What does this object do?"
                value={functionAspect}
                onChange={(e) => setFunctionAspect(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-aspect">Product Aspect Description</Label>
              <Input
                id="product-aspect"
                placeholder="What is this object?"
                value={productAspect}
                onChange={(e) => setProductAspect(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-aspect">Location Aspect Description</Label>
              <Input
                id="location-aspect"
                placeholder="Where is this object located?"
                value={locationAspect}
                onChange={(e) => setLocationAspect(e.target.value)}
              />
            </div>
          </div>

          {/* Entity Links */}
          <div className="space-y-4 pt-2 border-t">
            <h3 className="text-sm font-semibold">Link to Entities (Optional)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="uns-link">Link to UNS Node</Label>
              <Select value={linkedUNSNodeId} onValueChange={setLinkedUNSNodeId}>
                <SelectTrigger id="uns-link">
                  <SelectValue placeholder="Select UNS node..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {unsNodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aas-link">Link to AAS</Label>
              <Select value={linkedAASId} onValueChange={setLinkedAASId}>
                <SelectTrigger id="aas-link">
                  <SelectValue placeholder="Select AAS..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {aasList.map((aas) => (
                    <SelectItem key={aas.id} value={aas.id}>
                      {aas.idShort}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleCreate}>
            Create RDS Designation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
