import { MapPin, Link2, Layers, AlertTriangle, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getAssetOverview } from '@/lib/assetOverview';
import type { AAS, RDSDesignation, UNSNode } from '@/types/industrial';

export function AssetOverview({ aas, unsNodes, rdsList }: { aas: AAS; unsNodes: UNSNode[]; rdsList: RDSDesignation[] }) {
  const summary = getAssetOverview(aas, unsNodes, rdsList);
  return <section className="space-y-5" aria-label="Asset overview">
    <dl className="grid grid-cols-1 gap-4 border-b pb-5 sm:grid-cols-2">
      <div className="min-w-0"><dt className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />UNS placement</dt><dd className="break-words text-sm">{summary.path || (aas.isType ? 'Not assigned to a physical location' : 'Not linked')}</dd></div>
      <div className="min-w-0"><dt className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><Link2 className="h-4 w-4" />RDS designation</dt><dd className="break-all font-mono text-sm">{summary.rds?.designation || 'Not linked'}</dd></div>
      <div><dt className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><Layers className="h-4 w-4" />Stored submodels</dt><dd className="text-sm">{aas.submodels.length} submodels · {summary.properties.length} properties</dd></div>
      <div><dt className="mb-1 text-sm text-muted-foreground">Manufacturer / serial number</dt><dd className="break-words text-sm">{aas.manufacturer || 'Not recorded'} / {aas.serialNumber || 'Not recorded'}</dd></div>
    </dl>
    <div>
      <h3 className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold">Data checks<Badge variant={summary.issues.length ? 'outline' : 'secondary'}>{summary.issues.length ? `${summary.issues.length} to review` : 'No link or value gaps detected'}</Badge></h3>
      {summary.issues.length > 0 ? <ul className="space-y-2">{summary.issues.map(issue => <li key={issue} className="flex gap-2 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>{issue}</span></li>)}</ul> : <p className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4" />Stored links and values pass these basic checks.</p>}
      <p className="mt-3 text-xs text-muted-foreground">Standards certification and engineering completeness are not verified by these checks.</p>
    </div>
  </section>;
}