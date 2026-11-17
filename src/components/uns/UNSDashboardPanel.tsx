import { Activity, AlertTriangle, ArrowRight, Hash, Network, Package, Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { qualityClass } from './movableStyles';
import type { UNSDashboard } from '@/lib/unsContext';
import type { ISA95Level } from '@/types/industrial';

const LEVEL_ORDER: ISA95Level[] = ['Site', 'Area', 'Line', 'Cell'];


const Tile = ({ icon: Icon, label, value, hint, alert }: {
  icon: typeof Activity; label: string; value: string | number; hint?: string; alert?: boolean;
}) => (
  <div className={cn('rounded-md border p-3', alert && 'border-yellow-500/40 bg-yellow-500/5')}>
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</p>
    <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground" title={hint}>{hint}</p>}
  </div>
);

/**
 * Dashboard of a UNS node and everything below it. Shows the stored state
 * (structure, AAS, RDS, movable assets and their recorded events), not live
 * broker values: this app does not subscribe to MQTT.
 */
export const UNSDashboardPanel = ({ dashboard, onSelectAsset }: {
  dashboard: UNSDashboard;
  onSelectAsset?: (trackedAssetId: string) => void;
}) => {
  const { levelCounts, sparkplug, aas, rds, movable, topics, recentEvents } = dashboard;
  const structure = LEVEL_ORDER.filter(l => levelCounts[l]).map(l => `${levelCounts[l]} ${l}`).join(' · ');

  return (
    <section aria-label="Node dashboard" className="space-y-4">
      <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
        <Tile icon={Network} label="Below this node" value={Object.values(levelCounts).reduce((a, b) => a + (b ?? 0), 0)} hint={structure || 'No child nodes'} />
        <Tile icon={Package} label="Instance AAS" value={aas.total} hint={aas.withIssues ? `${aas.withIssues} with data gaps` : 'No data gaps found'} alert={aas.withIssues > 0} />
        <Tile icon={Hash} label="RDS designations" value={rds} hint={`${sparkplug.edgeNodes} edge nodes · ${sparkplug.devices} devices`} />
        <Tile icon={Radio} label="Movable assets" value={movable.inSubtree.length} hint={movable.attention.length ? `${movable.attention.length} need attention` : `${movable.here.length} directly here`} alert={movable.attention.length > 0} />
      </div>

      {movable.inSubtree.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Radio className="h-4 w-4" />Movable assets in this area</h3>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {Object.entries(movable.byState).map(([state, n]) => <Badge key={state} variant="secondary" className="text-xs">{state.replace(/_/g, ' ')}: {n}</Badge>)}
          </div>
          <ul className="divide-y rounded-md border">
            {movable.inSubtree.map(({ asset, kind }) => (
              <li key={asset.id}>
                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted" onClick={() => onSelectAsset?.(asset.id)}>
                  <Radio className={cn('h-3.5 w-3.5 shrink-0', qualityClass(asset.currentQualityState))} />
                  <span className="min-w-0 flex-1 truncate font-mono" title={asset.assetId}>{asset.assetId}</span>
                  <Badge variant="outline" className="text-[10px]">{asset.assetType}</Badge>
                  <span className="hidden text-muted-foreground sm:inline">{asset.currentState.replace(/_/g, ' ')}</span>
                  {kind === 'subLocation' && <span className="hidden text-muted-foreground md:inline" title={asset.currentLocationPath ?? ''}>sub-location</span>}
                  {asset.currentQualityState !== 'ok' && <Badge variant={asset.currentQualityState === 'blocked' ? 'destructive' : 'outline'} className="text-[10px]">{asset.currentQualityState}</Badge>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {aas.issues.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-yellow-500" />AAS data gaps</h3>
          <ul className="space-y-1 text-xs">
            {aas.issues.slice(0, 8).map(({ aas: a, issues }) => (
              <li key={a.id} className="rounded bg-muted px-2 py-1.5"><span className="font-medium">{a.idShort}</span><span className="text-muted-foreground"> — {issues.join(' ')}</span></li>
            ))}
          </ul>
          {aas.missingValues > 0 && <p className="mt-1 text-xs text-muted-foreground">{aas.missingValues} stored properties without a value in this area.</p>}
        </div>
      )}

      {recentEvents.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4" />Recent movements and events</h3>
          <ul className="space-y-1 text-xs">
            {recentEvents.map(e => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-2 rounded bg-muted px-2 py-1.5">
                <span className="text-muted-foreground tabular-nums">{e.createdAt.toLocaleString()}</span>
                <Badge variant="outline" className="text-[10px]">{e.eventType}</Badge>
                {(e.fromLocation || e.toLocation) && (
                  <span className="flex min-w-0 items-center gap-1 font-mono">
                    <span className="truncate">{e.fromLocation ?? '—'}</span><ArrowRight className="h-3 w-3 shrink-0" /><span className="truncate">{e.toLocation ?? '—'}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {topics.assetsInSubtree && (
        <div className="rounded-md border p-3 text-xs">
          <p className="mb-1 font-semibold">Subscribe to movable assets (MQTT filters)</p>
          <p className="text-muted-foreground">Directly here</p>
          <code className="block break-all font-mono">{topics.assetsHere}</code>
          <p className="mt-1 text-muted-foreground">Here and below</p>
          <code className="block break-all font-mono">{topics.assetsInSubtree}</code>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Stored state from the database. Live broker values: see Live data below.</p>
    </section>
  );
};
