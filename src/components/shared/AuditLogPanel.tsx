import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Plus, Pencil, Trash2, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { AuditLogEntry } from '@/hooks/useAuditLogs';

interface AuditLogPanelProps {
  logs: AuditLogEntry[] | undefined;
  isLoading: boolean;
  emptyMessage?: string;
}

const actionConfig: Record<string, { icon: typeof Plus; label: string; color: string }> = {
  INSERT: { icon: Plus, label: 'Created', color: 'text-green-500' },
  UPDATE: { icon: Pencil, label: 'Updated', color: 'text-amber-500' },
  DELETE: { icon: Trash2, label: 'Deleted', color: 'text-destructive' },
};

/** Extract meaningful change summary from the changes JSON */
function getChangeSummary(entry: AuditLogEntry): string[] {
  const summaries: string[] = [];
  const { changes, action, entityType } = entry;

  if (action === 'INSERT') {
    const snap = changes.new || {};
    if (entityType === 'AAS') {
      summaries.push(`Created AAS "${snap.id_short || ''}"`);
    } else if (entityType === 'UNS') {
      summaries.push(`Created node "${snap.name || ''}" (${snap.level || ''})`);
    } else if (entityType === 'RDS') {
      summaries.push(`Created designation "${snap.designation || ''}"`);
    } else if (entityType === 'AAS_SUBMODEL') {
      summaries.push(`Added submodel "${snap.id_short || ''}"`);
    }
    return summaries;
  }

  if (action === 'DELETE') {
    const snap = changes.old || {};
    const name = snap.id_short || snap.name || snap.designation || snap.id;
    summaries.push(`Deleted "${name}"`);
    return summaries;
  }

  // UPDATE — show changed fields
  const oldVal = changes.old || {};
  const newVal = changes.new || {};
  const ignoredKeys = ['updated_at', 'created_at', 'id', 'site_id'];

  for (const key of Object.keys(newVal)) {
    if (ignoredKeys.includes(key)) continue;
    if (JSON.stringify(oldVal[key]) !== JSON.stringify(newVal[key])) {
      const label = key.replace(/_/g, ' ');
      summaries.push(`${label} changed`);
    }
  }

  return summaries.length > 0 ? summaries.slice(0, 4) : ['Properties updated'];
}

export const AuditLogPanel = ({ logs, isLoading, emptyMessage }: AuditLogPanelProps) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{emptyMessage || 'No changes recorded yet'}</p>
        <p className="text-xs">Changes will appear here automatically</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[350px]">
      <div className="space-y-2 pr-4">
        {logs.map((entry, index) => {
          const config = actionConfig[entry.action] || actionConfig.UPDATE;
          const Icon = config.icon;
          const summaries = getChangeSummary(entry);

          return (
            <div
              key={entry.id}
              className="relative pl-6 pb-3 border-l-2 border-muted last:border-transparent"
            >
              <div className={`absolute left-0 top-0.5 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-background ${
                entry.action === 'INSERT' ? 'bg-green-500' :
                entry.action === 'DELETE' ? 'bg-destructive' :
                'bg-amber-500'
              }`} />

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(entry.createdAt, 'PPp')}
                  {index === 0 && (
                    <Badge variant="secondary" className="text-[10px]">Latest</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                  <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                  {entry.entityType !== 'AAS' && entry.entityType !== 'UNS' && entry.entityType !== 'RDS' && (
                    <Badge variant="outline" className="text-[10px]">
                      {entry.entityType.replace('_', ' ')}
                    </Badge>
                  )}
                </div>

                <div className="space-y-0.5">
                  {summaries.map((s, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{s}</p>
                  ))}
                </div>

                {entry.performedBy && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>by user</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
