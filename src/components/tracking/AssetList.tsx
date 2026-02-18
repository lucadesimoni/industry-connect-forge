import { TrackedAsset } from '@/types/industrial';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AssetListProps {
  assets: TrackedAsset[];
  selectedAssetId: string | null;
  onSelectAsset: (id: string) => void;
}

const stateBadge = (state: string) => {
  const map: Record<string, string> = {
    in_transit: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    at_rest: 'bg-muted text-muted-foreground',
    in_use: 'bg-green-500/15 text-green-700 dark:text-green-400',
    maintenance: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  };
  return <Badge variant="outline" className={cn('text-xs', map[state])}>{state.replace('_', ' ')}</Badge>;
};

const qualityBadge = (q: string) => {
  if (q === 'ok') return <Badge variant="outline" className="text-xs bg-green-500/15 text-green-700 dark:text-green-400">OK</Badge>;
  if (q === 'warning') return <Badge variant="outline" className="text-xs bg-yellow-500/15 text-yellow-700 dark:text-yellow-400">Warning</Badge>;
  return <Badge variant="destructive" className="text-xs">Blocked</Badge>;
};

export const AssetList = ({ assets, selectedAssetId, onSelectAsset }: AssetListProps) => {
  const [search, setSearch] = useState('');
  const filtered = assets.filter(a =>
    a.assetId.toLowerCase().includes(search.toLowerCase()) ||
    a.assetType.toLowerCase().includes(search.toLowerCase()) ||
    (a.currentLocationPath ?? '').toLowerCase().includes(search.toLowerCase())
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
                  <TableCell className="font-mono text-sm">{a.assetId}</TableCell>
                  <TableCell className="capitalize">{a.assetType}</TableCell>
                  <TableCell className="font-mono text-xs">{a.currentLocationPath ?? '—'}</TableCell>
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
