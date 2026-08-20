import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileJson, AlertTriangle } from 'lucide-react';
import { parseAASImport, AASExportEntry } from '@/lib/aasExportImport';
import { parseAASXFile } from '@/lib/aasxPackage';

import { useToast } from '@/hooks/use-toast';
import { useAAS } from '@/hooks/useAAS';
import { useSiteContext } from '@/contexts/SiteContext';

interface AASImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AASImportDialog = ({ open, onOpenChange }: AASImportDialogProps) => {
  const { toast } = useToast();
  const { createAAS } = useAAS();
  const { selectedSiteId } = useSiteContext();
  const [jsonContent, setJsonContent] = useState('');
  const [parsed, setParsed] = useState<AASExportEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.aasx')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const entries = parseAASXFile(ev.target?.result as ArrayBuffer);
          setParsed(entries);
          setError(null);
          setJsonContent(`[AASX package: ${file.name}]`);
        } catch (err: any) {
          setParsed(null);
          setError(err.message);
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setJsonContent(text);
      tryParse(text);
    };
    reader.readAsText(file);
  };


  const tryParse = (text: string) => {
    try {
      const entries = parseAASImport(text);
      setParsed(entries);
      setError(null);
    } catch (err: any) {
      setParsed(null);
      setError(err.message);
    }
  };

  const handleImport = async () => {
    if (!parsed || !selectedSiteId) return;
    setImporting(true);
    try {
      for (const entry of parsed) {
        await createAAS.mutateAsync({
          assetId: entry.assetId,
          idShort: entry.idShort,
          description: entry.description,
          manufacturer: entry.manufacturer,
          serialNumber: entry.serialNumber,
          isType: entry.isType,
          submodels: entry.submodels.map(sm => ({
            id: `temp-${Date.now()}-${Math.random()}`,
            idShort: sm.idShort,
            semanticId: sm.semanticId,
            description: sm.description,
            properties: sm.properties.map((p, i) => ({
              id: `temp-prop-${Date.now()}-${i}`,
              idShort: p.idShort,
              valueType: p.valueType as any,
              value: p.value,
              unit: p.unit,
              description: p.description,
            })),
          })),
          siteId: selectedSiteId,
        });
      }
      toast({ title: `Imported ${parsed.length} AAS successfully` });
      onOpenChange(false);
      setJsonContent('');
      setParsed(null);
    } catch (err: any) {
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import AAS from JSON
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <FileJson className="h-4 w-4 mr-2" />
              Choose JSON File
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Or paste JSON content:</Label>
            <p className="text-xs text-muted-foreground">
              Accepts our export format (v1.0) or an AAS v3 Environment file (IDTA-01001-3-0) as produced by Eclipse BaSyx / AASX Package Explorer.
            </p>
            <Textarea
              value={jsonContent}
              onChange={(e) => {
                setJsonContent(e.target.value);
                if (e.target.value.trim()) tryParse(e.target.value);
              }}
              placeholder='{"assetAdministrationShells":[...],"submodels":[...]}'
              rows={8}
              className="font-mono text-xs"
            />
          </div>


          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {parsed && (
            <div className="space-y-2">
              <Label className="text-sm">Preview ({parsed.length} AAS to import):</Label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {parsed.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                    <Badge variant={entry.isType ? 'default' : 'secondary'} className="text-[10px]">
                      {entry.isType ? 'Type' : 'Instance'}
                    </Badge>
                    <span className="font-medium">{entry.idShort}</span>
                    <span className="text-muted-foreground">— {entry.submodels.length} submodels</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={!parsed || importing || !selectedSiteId}>
            {importing ? 'Importing...' : `Import ${parsed?.length || 0} AAS`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
