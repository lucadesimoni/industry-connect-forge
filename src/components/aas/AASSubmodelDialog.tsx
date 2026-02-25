import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AASSubmodel, AASProperty, AASValueType } from '@/types/industrial';
import { Plus, Trash2, LayoutTemplate, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  SUBMODEL_TEMPLATES,
  SEMANTIC_ID_SUGGESTIONS,
  VALUE_TYPE_OPTIONS,
  isNumericType,
  isBooleanType,
  normalizeLegacyValueType,
  SubmodelTemplate,
} from '@/lib/aasTemplates';

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
      setProperties(
        (submodel.properties || []).map(p => ({
          ...p,
          valueType: normalizeLegacyValueType(p.valueType),
        }))
      );
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

  const applyTemplate = (template: SubmodelTemplate) => {
    setIdShort(template.idShort);
    setSemanticId(template.semanticId);
    setDescription(template.description);
    setProperties(
      template.properties.map((p, i) => ({
        id: `temp-${Date.now()}-${i}`,
        idShort: p.idShort,
        valueType: p.valueType as AASValueType,
        value: p.value,
        unit: p.unit,
        description: p.description,
        semanticId: p.semanticId,
      }))
    );
  };

  const addProperty = () => {
    setProperties([
      ...properties,
      {
        id: `temp-${Date.now()}`,
        idShort: '',
        valueType: 'xs:string',
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

  // Group value types for the select
  const groupedTypes = useMemo(() => {
    const groups: Record<string, typeof VALUE_TYPE_OPTIONS> = {};
    VALUE_TYPE_OPTIONS.forEach(opt => {
      if (!groups[opt.group]) groups[opt.group] = [];
      groups[opt.group].push(opt);
    });
    return groups;
  }, []);

  const handleSave = () => {
    if (!idShort.trim() || !semanticId.trim() || !description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (ID Short, Semantic ID, and Description).',
        variant: 'destructive',
      });
      return;
    }

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
        id: p.id?.startsWith('temp-') ? undefined : p.id,
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
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{submodel ? 'Edit Submodel' : 'Add Submodel'}</DialogTitle>
        </DialogHeader>

        {/* IDTA Template Picker */}
        {!submodel && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <LayoutTemplate className="h-3 w-3" />
              Start from an IDTA standard template (optional)
            </Label>
            <div className="flex flex-wrap gap-2">
              {SUBMODEL_TEMPLATES.map(t => (
                <Button
                  key={t.idShort}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => applyTemplate(t)}
                >
                  {t.idShort}
                  <Badge variant="secondary" className="ml-1 text-[10px]">{t.standard}</Badge>
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="idShort">ID Short *</Label>
            <Input
              id="idShort"
              value={idShort}
              onChange={(e) => setIdShort(e.target.value)}
              placeholder="e.g., Nameplate, TechnicalData, OperationalData"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="semanticId">Semantic ID (IRI) *</Label>
            <Input
              id="semanticId"
              value={semanticId}
              onChange={(e) => setSemanticId(e.target.value)}
              placeholder="e.g., https://admin-shell.io/zvei/nameplate/2/0/Nameplate"
            />
            {/* Quick-pick semantic IDs */}
            <div className="flex flex-wrap gap-1">
              {SEMANTIC_ID_SUGGESTIONS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                  onClick={() => setSemanticId(s.value)}
                  title={s.value}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Submodel description"
              rows={2}
            />
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Properties (SubmodelElements)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addProperty}>
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
            </div>

            <Alert className="border-primary/20 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs text-muted-foreground">
                Property value types follow XSD datatypes per IEC 63278. Use <code>xs:string</code>, <code>xs:double</code>, <code>xs:boolean</code>, etc.
              </AlertDescription>
            </Alert>

            {properties.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No properties. Click "Add Property" or select a template above.
              </p>
            ) : (
              <div className="space-y-3">
                {properties.map((prop, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Property {index + 1}</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeProperty(index)}>
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
                          placeholder="e.g., ManufacturerName"
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`prop-type-${index}`} className="text-xs">Value Type (XSD) *</Label>
                        <Select
                          value={prop.valueType}
                          onValueChange={(value: AASValueType) =>
                            updateProperty(index, { valueType: value, value: isNumericType(value) ? 0 : isBooleanType(value) ? false : '' })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(groupedTypes).map(([group, types]) => (
                              <SelectGroup key={group}>
                                <SelectLabel>{group}</SelectLabel>
                                {types.map(t => (
                                  <SelectItem key={t.value} value={t.value}>
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`prop-value-${index}`} className="text-xs">Value</Label>
                      {isBooleanType(prop.valueType) ? (
                        <Select
                          value={String(prop.value)}
                          onValueChange={(v) => updateProperty(index, { value: v === 'true' })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">true</SelectItem>
                            <SelectItem value="false">false</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={`prop-value-${index}`}
                          value={String(prop.value ?? '')}
                          onChange={(e) => {
                            let value: any = e.target.value;
                            if (isNumericType(prop.valueType)) {
                              value = parseFloat(value) || 0;
                            }
                            updateProperty(index, { value });
                          }}
                          type={isNumericType(prop.valueType) ? 'number' : 'text'}
                          placeholder={
                            isNumericType(prop.valueType) ? 'Enter number' :
                            prop.valueType === 'xs:dateTime' ? '2024-01-01T00:00:00Z' :
                            prop.valueType === 'xs:date' ? 'YYYY-MM-DD' :
                            prop.valueType === 'xs:anyURI' ? 'https://...' :
                            'Enter value'
                          }
                          className="h-8"
                        />
                      )}
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
