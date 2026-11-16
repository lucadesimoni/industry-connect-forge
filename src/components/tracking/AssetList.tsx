import { TrackedAsset, UNSNode } from '@/types/industrial';
import type { TrackedAssetPlacement } from '@/lib/unsContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AssetListProps {
  assets: TrackedAsset[];
  selectedAssetId: string | null;
  onSelectAsset: (id: string) => void;
  unsNodes?: UNSNode[];
  placement?: TrackedAssetPlacement;
}

const stateBadge = (state: string) => {
  const map: Record<string, string> = {
    in_transit: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    at_rest: 'bg-muted text-muted-foreground',
    in_use: 'bg-green-500/15 text-green-700 dark:text-green-400',
    maintenance: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  };
  return <Badge variant="outline" className={cn('text-xs whitespace-nowrap', map[state])}>{state.replace(/_/g, ' ')}</Badge>;
};

const qualityBadge = (q: string) => {
  if (q === 'ok') return <Badge variant="outline" className="text-xs bg-green-500/15 text-green-700 dark:text-green-400">OK</Badge>;
  if (q === 'warning') return <Badge variant="outline" className="text-xs bg-yellow-500/15 text-yellow-700 dark:text-yellow-400">Warning</Badge>;
  return <Badge variant="destructive" className="text-xs">Blocked</Badge>;
};

export const AssetList = ({ assets, selectedAssetId, onSelectAsset, unsNodes = [], placement }: AssetListProps) => {
  const [search, setSearch] = useState('');
  // UNS node each asset is placed on (see lib/unsContext)
  const nodeOf = new Map<string, UNSNode>();
  for (const [nodeId, placed] of placement?.byNode ?? []) {
    const node = unsNodes.find(n => n.id === nodeId);
    if (node) for (const p of placed) nodeOf.set(p.asset.id, node);
  }
  const filtered = assets.filter(a =>
    a.assetId.toLowerCase().includes(search.toLowerCase()) ||
    a.assetType.toLowerCase().includes(search.toLowerCase()) ||
    (a.currentLocationPath ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (nodeOf.get(a.id)?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search by ID, type, or location…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Quality</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No tracked assets found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(a => (
                <TableRow
                  key={a.id}
                  className={cn('cursor-pointer', selectedAssetId === a.id && 'bg-accent')}
                  onClick={() => onSelectAsset(a.id)}
                >
                  <TableCell className="font-mono text-sm break-all">{a.assetId}</TableCell>
                  <TableCell className="capitalize">{a.assetType}</TableCell>
                  <TableCell className="max-w-[22rem]">
                    {nodeOf.get(a.id) ? (
                      <span className="flex items-center gap-1.5 text-sm"><span className="truncate">{nodeOf.get(a.id)!.name}</span><Badge variant="outline" className="text-[10px] text-muted-foreground">{nodeOf.get(a.id)!.level}</Badge></span>
                    ) : a.currentLocationPath ? (
                      <span className="text-xs text-yellow-600 dark:text-yellow-500">Not in the UNS</span>
                    ) : null}
                    <span className="block truncate font-mono text-xs text-muted-foreground" title={a.currentLocationPath ?? ''}>{a.currentLocationPath ?? '—'}</span>
                  </TableCell>
                  <TableCell>{stateBadge(a.currentState)}</TableCell>
                  <TableCell>{qualityBadge(a.currentQualityState)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
