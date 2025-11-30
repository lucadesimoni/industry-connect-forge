import { UNSNode } from '@/types/industrial';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Link, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface UNSDetailPanelProps {
  node: UNSNode;
}

export const UNSDetailPanel = ({ node }: UNSDetailPanelProps) => {
  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{node.name}</CardTitle>
            <CardDescription className="mt-1">{node.description || 'No description provided'}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Link className="h-4 w-4 mr-2" />
              Link
            </Button>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm">
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
              <p className="text-sm text-muted-foreground mb-2">Metadata</p>
              <div className="bg-muted p-3 rounded-md">
                <pre className="text-xs font-mono">{JSON.stringify(node.metadata, null, 2)}</pre>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
