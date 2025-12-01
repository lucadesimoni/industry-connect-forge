import { UNSNode } from '@/types/industrial';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Link, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useUNSNodes } from '@/hooks/useUNSNodes';
import { useState } from 'react';
import { UNSDialog } from './UNSDialog';

interface UNSDetailPanelProps {
  node: UNSNode;
  allNodes: UNSNode[];
}

export const UNSDetailPanel = ({ node, allNodes }: UNSDetailPanelProps) => {
  const { deleteNode } = useUNSNodes();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${node.name}"?`)) {
      await deleteNode.mutateAsync(node.id);
    }
  };

  return (
    <>
      <UNSDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        node={node}
        nodes={allNodes}
      />
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{node.name}</CardTitle>
            <CardDescription className="mt-1">{node.description || 'No description provided'}</CardDescription>
            {node.metadata?.uns_path && (
              <div className="mt-2 flex items-start gap-2">
                <span className="text-xs text-muted-foreground font-semibold">UNS Path:</span>
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1">
                  {node.metadata.uns_path}
                </code>
              </div>
            )}
            {node.metadata?.rds_location && (
              <div className="mt-1 flex items-start gap-2">
                <span className="text-xs text-muted-foreground font-semibold">RDS Location:</span>
                <code className="text-xs font-mono bg-blue-400/10 text-blue-400 px-2 py-1 rounded">
                  {node.metadata.rds_location}
                </code>
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Link</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">ISA-95 Level</p>
            <Badge variant="secondary" className="font-mono">{node.level}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Node ID</p>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{node.id}</code>
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-sm text-muted-foreground mb-1">Parent Node</p>
          <p className="text-sm font-mono">{node.parentId || 'Root'}</p>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created
            </p>
            <p className="text-sm font-mono">{node.createdAt.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Updated
            </p>
            <p className="text-sm font-mono">{node.updatedAt.toLocaleString()}</p>
          </div>
        </div>

        {node.metadata && Object.keys(node.metadata).length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Additional Metadata</p>
              <div className="bg-muted p-3 rounded-md space-y-2">
                {Object.entries(node.metadata)
                  .filter(([key]) => !['rds_location', 'uns_path', 'code', 'type'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2">
                      <span className="text-xs font-semibold text-muted-foreground min-w-[100px]">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                      </span>
                      <code className="text-xs font-mono flex-1">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </code>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
    </>
  );
};
