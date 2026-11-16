import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUNSNodes } from '@/hooks/useUNSNodes';
import { locationPathForNode, unsTreePath } from '@/lib/unsContext';

/**
 * Pick a UNS node (Site to Cell) as location of a movable asset. The value is
 * the node's Track & Trace location path, so the asset shows up on that node
 * in the UNS tree and publishes below its location topic (ADR 0002).
 */
export const UNSLocationSelect = ({ value, onChange }: { value: string; onChange: (locationPath: string) => void }) => {
  const { nodes } = useUNSNodes();
  const options = useMemo(() => {
    const seen = new Map<string, number>();
    const list = nodes
      .filter(n => n.level !== 'Enterprise')
      .map(n => ({ id: n.id, path: locationPathForNode(n, nodes), label: unsTreePath(n, nodes), level: n.level }))
      .filter(o => o.path);
    for (const o of list) seen.set(o.path, (seen.get(o.path) ?? 0) + 1);
    // a path used by several nodes cannot be resolved to one node: do not offer it
    return list.filter(o => seen.get(o.path) === 1).sort((a, b) => a.label.localeCompare(b.label));
  }, [nodes]);
  const selected = options.find(o => o.path === value)?.path ?? '';

  return (
    <Select value={selected} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Choose a UNS location…" /></SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o.id} value={o.path}>
            <span className="text-muted-foreground">{o.level}: </span>{o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
