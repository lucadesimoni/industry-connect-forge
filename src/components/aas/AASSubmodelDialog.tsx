import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AASSubmodel, AASProperty } from '@/types/industrial';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AASSubmodelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submodel?: AASSubmodel | null;
  onSave: (submodel: Omit<AASSubmodel, 'id'> & { id?: string }) => void;
}

export const AASSubmodelDialog = ({ open, onOpenChange, submodel, onSave }: AASSubmodelDialogProps) => {
  const { toast } = useToast();
  const [idShort, setIdShort] = useState('');
  const [semanticId, setSemanticId] = useState('');
  const [description, setDescription] = useState('');
  const [properties, setProperties] = useState<AASProperty[]>([]);

  useEffect(() => {
    if (submodel) {
      setIdShort(submodel.idShort);
      setSemanticId(submodel.semanticId);
      setDescription(submodel.description);
      setProperties(submodel.properties || []);
    } else {
      resetForm();
    }
  }, [submodel, open]);

  const resetForm = () => {
    setIdShort('');
    setSemanticId('');
    setDescription('');
    setProperties([]);
  };

  const addProperty = () => {
    setProperties([
      ...properties,
      {
        id: `temp-${Date.now()}`,
        idShort: '',
        valueType: 'string',
        value: '',
        unit: '',
        description: '',
      },
    ]);
  };

  const removeProperty = (index: number) => {
    setProperties(properties.filter((_, i) => i !== index));
  };

  const updateProperty = (index: number, updates: Partial<AASProperty>) => {
    const updated = [...properties];
    updated[index] = { ...updated[index], ...updates };
    setProperties(updated);
  };

  const handleSave = () => {
    if (!idShort.trim() || !semanticId.trim() || !description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (ID Short, Semantic ID, and Description).',
        variant: 'destructive',
      });
      return;
    }

    // Validate properties
    for (const prop of properties) {
      if (!prop.idShort.trim()) {
        toast({
          title: 'Validation Error',
          description: 'All properties must have an ID Short.',
          variant: 'destructive',
        });
        return;
      }
    }

    onSave({
      id: submodel?.id,
      idShort: idShort.trim(),
      semanticId: semanticId.trim(),
      description: description.trim(),
      properties: properties.map(p => ({
        id: p.id.startsWith('temp-') ? undefined : p.id,
        idShort: p.idShort.trim(),
        valueType: p.valueType,
        value: p.value,
        unit: p.unit?.trim() || undefined,
        description: p.description?.trim() || undefined,
      })),
    });

    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{submodel ? 'Edit Submodel' : 'Add Submodel'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="idShort">ID Short *</Label>
            <Input
              id="idShort"
              value={idShort}
              onChange={(e) => setIdShort(e.target.value)}
              placeholder="e.g., TechnicalData"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="semanticId">Semantic ID *</Label>
            <Input
              id="semanticId"
              value={semanticId}
              onChange={(e) => setSemanticId(e.target.value)}
              placeholder="e.g., https://example.com/semantic/TechnicalData"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Submodel description"
              rows={3}
            />
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Properties</Label>
              <Button type="button" variant="outline" size="sm" onClick={addProperty}>
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
            </div>

            {properties.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No properties. Click "Add Property" to add one.
              </p>
            ) : (
              <div className="space-y-3">
                {properties.map((prop, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Property {index + 1}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProperty(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor={`prop-idShort-${index}`} className="text-xs">ID Short *</Label>
                        <Input
                          id={`prop-idShort-${index}`}
                          value={prop.idShort}
                          onChange={(e) => updateProperty(index, { idShort: e.target.value })}
                          placeholder="e.g., Temperature"
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`prop-type-${index}`} className="text-xs">Value Type *</Label>
                        <Select
                          value={prop.valueType}
                          onValueChange={(value: AASProperty['valueType']) =>
                            updateProperty(index, { valueType: value, value: '' })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">String</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`prop-value-${index}`} className="text-xs">Value *</Label>
                      <Input
                        id={`prop-value-${index}`}
                        value={
                          prop.valueType === 'boolean'
                            ? String(prop.value)
                            : prop.valueType === 'number'
                            ? String(prop.value)
                            : String(prop.value || '')
                        }
                        onChange={(e) => {
                          let value: any = e.target.value;
                          if (prop.valueType === 'number') {
                            value = parseFloat(value) || 0;
                          } else if (prop.valueType === 'boolean') {
                            value = value === 'true';
                          }
                          updateProperty(index, { value });
                        }}
                        type={prop.valueType === 'number' ? 'number' : 'text'}
                        placeholder={
                          prop.valueType === 'string'
                            ? 'Enter text'
                            : prop.valueType === 'number'
                            ? 'Enter number'
                            : prop.valueType === 'boolean'
                            ? 'true or false'
                            : 'YYYY-MM-DD'
                        }
                        className="h-8"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor={`prop-unit-${index}`} className="text-xs">Unit</Label>
                        <Input
                          id={`prop-unit-${index}`}
                          value={prop.unit || ''}
                          onChange={(e) => updateProperty(index, { unit: e.target.value })}
                          placeholder="e.g., °C, kg, m/s"
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`prop-desc-${index}`} className="text-xs">Description</Label>
                        <Input
                          id={`prop-desc-${index}`}
                          value={prop.description || ''}
                          onChange={(e) => updateProperty(index, { description: e.target.value })}
                          placeholder="Property description"
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {submodel ? 'Update' : 'Add'} Submodel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

