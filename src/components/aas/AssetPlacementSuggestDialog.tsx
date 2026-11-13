import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { UNSNode } from '@/types';
import { resolveUNSPath, composeRDSDesignation, validateRDSDesignation, sanitizeRDSCode } from '@/lib/hierarchyUtils';
import { validateIdShort } from '@/lib/validation';

interface Suggestion {
  parentNodeId: string; functionCode: string; productCode: string; idShort: string; rationale: string;
}

const cleanAspect = (v: string) => v.replace(/^[=+-]+/, '').split('.').map(l => sanitizeRDSCode(l)).filter(Boolean).join('.');

export function AssetPlacementSuggestDialog({ open, onOpenChange, nodes }: {
  open: boolean; onOpenChange: (o: boolean) => void; nodes: UNSNode[];
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [s, setS] = useState<Suggestion | null>(null);

  const candidates = nodes.filter(n => n.level === 'Line' || n.level === 'Cell');

  const run = async () => {
    setLoading(true); setS(null);
    const { data, error } = await supabase.functions.invoke('suggest-asset-placement', {
      body: {
        name, description,
        candidates: candidates.map(n => ({
          id: n.id, level: n.level, path: resolveUNSPath(n, nodes),
          rdsLocation: (n.metadata?.rds_location as string | undefined) ?? '',
        })),
      },
    });
    setLoading(false);
    if (error || !data?.suggestion) { toast.error(data?.error ?? 'Could not get a suggestion.'); return; }
    setS(data.suggestion);
  };

  const parent = s ? nodes.find(n => n.id === s.parentNodeId) : undefined;
  const loc = (parent?.metadata?.rds_location as string | undefined) ?? '';
  const rds = s ? composeRDSDesignation({ aspectCode: '=', functionAspect: cleanAspect(s.functionCode), productAspect: cleanAspect(s.productCode), locationAspect: loc }) : '';
  const rdsCheck = s ? validateRDSDesignation(rds) : null;
  const idCheck = s ? validateIdShort(s.idShort) : null;

  const Row = ({ label, value, ok, msg }: { label: string; value: string; ok: boolean; msg?: string }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <Badge variant={ok ? 'secondary' : 'destructive'}>{ok ? 'valid' : 'invalid'}</Badge>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded bg-muted px-2 py-1 text-sm break-all">{value || '—'}</code>
        <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(value); toast.success('Copied'); }}><Copy className="h-4 w-4" /></Button>
      </div>
      {!ok && msg && <p className="text-xs text-destructive">{msg}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" />AI placement suggestion</DialogTitle>
          <DialogDescription>Suggests UNS placement, RDS designation and AAS idShort. Every value is checked against the validation rules.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Asset name, e.g. Torque Wrench Station" value={name} onChange={e => setName(e.target.value)} maxLength={200} />
          <Textarea placeholder="Description (function, location, type…)" value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} />
          <Button onClick={run} disabled={loading || !name.trim() || candidates.length === 0} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Suggest
          </Button>
          {candidates.length === 0 && <p className="text-xs text-muted-foreground">Create a Line or Cell in the UNS first.</p>}
          {s && (
            <div className="space-y-3 border-t pt-3">
              <Row label={`UNS placement (${parent?.level ?? 'unknown'})`} value={parent ? resolveUNSPath(parent, nodes) : ''} ok={!!parent} msg="Model chose a node that doesn't exist." />
              <Row label="RDS designation (IEC 81346)" value={rds} ok={!!rdsCheck?.valid} msg={rdsCheck?.message} />
              <Row label="AAS idShort" value={s.idShort} ok={!!idCheck?.valid} msg={idCheck?.message} />
              <p className="text-xs text-muted-foreground">{s.rationale}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
