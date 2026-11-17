import { UNSNode, AAS, RDSDesignation, AssetEvent } from '@/types/industrial';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Link, Calendar, Server, Database, Package, Hash, ExternalLink, AlertTriangle, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUNSNodes } from '@/hooks/useUNSNodes';
import { useState, useMemo } from 'react';
import { UNSDialog } from './UNSDialog';
import { getEntitiesAtLocation } from '@/lib/relationshipValidation';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { AuditLogPanel } from '@/components/shared/AuditLogPanel';
import { buildUNSDashboard, TrackedAssetPlacement } from '@/lib/unsContext';
import { UNSDashboardPanel } from './UNSDashboardPanel';
import { LiveDataPanel } from './LiveDataPanel';

interface UNSDetailPanelProps {
  node: UNSNode;
  allNodes: UNSNode[];
  aasList?: AAS[];
  rdsList?: RDSDesignation[];
  placement?: TrackedAssetPlacement;
  events?: AssetEvent[];
  onSelectTrackedAsset?: (trackedAssetId: string) => void;
}

const NO_PLACEMENT: TrackedAssetPlacement = { byNode: new Map(), unplaced: [] };

/** Metadata keys shown elsewhere in the panel (or internal); the rest is listed as "Additional metadata". */
const SHOWN_METADATA = [
  'rds_location', 'uns_path', 'code', 'type', 'extended_uns_path',
  'mqtt_topic', 'mqtt_topics', 'sparkplug_topic', 'sparkplug_device_topics',
  'location_topic', 'location_assets_topic',
  'hierarchy_level', 'is_location_level', 'is_asset_level', 'data_model',
  'full_rds_designation', 'function_aspect', 'product_aspect',
];

export const UNSDetailPanel = ({ node, allNodes, aasList = [], rdsList = [], placement = NO_PLACEMENT, events = [], onSelectTrackedAsset }: UNSDetailPanelProps) => {
  const { deleteNode } = useUNSNodes();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Get entities linked to this UNS node
  const linkedEntities = useMemo(() => {
    return getEntitiesAtLocation(node.id, aasList, rdsList);
  }, [node.id, aasList, rdsList]);

  const parent = allNodes.find(n => n.id === node.parentId);
  const extraTopics = (node.metadata?.mqtt_topics ?? []).filter((t: string) =>
    t !== node.metadata?.mqtt_topic && t !== node.metadata?.location_topic && t !== node.metadata?.location_assets_topic);
  const otherMetadata = Object.entries(node.metadata ?? {}).filter(([key]) => !SHOWN_METADATA.includes(key));

  const dashboard = useMemo(
    () => buildUNSDashboard(node, allNodes, aasList, rdsList, placement, events),
    [node, allNodes, aasList, rdsList, placement, events]
  );

  const handleDelete = async () => {
    let message = `Are you sure you want to delete "${node.name}"?`;
    
    if (linkedEntities.aas.length > 0 || linkedEntities.rds.length > 0) {
      message += `\n\nThis will break links to:\n`;
      if (linkedEntities.aas.length > 0) {
        message += `- ${linkedEntities.aas.length} AAS: ${linkedEntities.aas.map(a => a.idShort).join(', ')}\n`;
      }
      if (linkedEntities.rds.length > 0) {
        message += `- ${linkedEntities.rds.length} RDS: ${linkedEntities.rds.map(r => r.designation).join(', ')}\n`;
      }
      message += '\nThese entities will have their location links removed.';
    }

    if (confirm(message)) {
      await deleteNode.mutateAsync(node.id);
    }
  };

  const isAssetLevel = node.metadata?.is_asset_level === true;

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
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl">{node.name}</CardTitle>
              <Badge variant="secondary" className="font-mono text-xs">{node.level}</Badge>
              {isAssetLevel && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Server className="h-3 w-3" />
                  Asset
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">{node.description || 'No description provided'}</CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
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
        <UNSDashboardPanel dashboard={dashboard} onSelectAsset={onSelectTrackedAsset} />

        <Separator />

        <LiveDataPanel key={node.id} node={node} allNodes={allNodes} />

        <Separator />

        <section aria-label="Topics and identifiers" className="space-y-2">
          <h3 className="text-sm font-semibold">Topics and identifiers</h3>
            {node.metadata?.uns_path && (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                <span className="text-xs text-muted-foreground font-semibold sm:w-36 sm:shrink-0">UNS Path:</span>
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 break-all">
                  {node.metadata.uns_path}
                </code>
              </div>
            )}
            {node.metadata?.mqtt_topic && (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                <span className="text-xs text-muted-foreground font-semibold sm:w-36 sm:shrink-0">UNS Topic:</span>
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 break-all">
                  {node.metadata.mqtt_topic}
                </code>
              </div>
            )}
            {node.metadata?.location_topic && (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                <span className="text-xs text-muted-foreground font-semibold sm:w-36 sm:shrink-0">Location Topic:</span>
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 break-all">
                  {node.metadata.location_topic}
                </code>
              </div>
            )}
            {node.metadata?.location_assets_topic && (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                <span className="text-xs text-muted-foreground font-semibold sm:w-36 sm:shrink-0">Assets at Location:</span>
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 break-all">
                  {node.metadata.location_assets_topic}
                </code>
              </div>
            )}
            {extraTopics.length > 0 && (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                <span className="text-xs text-muted-foreground font-semibold sm:w-36 sm:shrink-0">Additional Topics:</span>
                <div className="flex flex-col gap-1 flex-1 break-all">
                  {extraTopics.map((topic: string) => (
                      <code key={topic} className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {topic}
                      </code>
                    ))}
                </div>
              </div>
            )}
            {node.metadata?.rds_location && (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                <span className="text-xs text-muted-foreground font-semibold sm:w-36 sm:shrink-0">RDS Location:</span>
                <code className="text-xs font-mono bg-blue-400/10 text-blue-400 px-2 py-1 rounded break-all">
                  {node.metadata.rds_location}
                </code>
              </div>
            )}
            {node.metadata?.full_rds_designation && (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                <span className="text-xs text-muted-foreground font-semibold sm:w-36 sm:shrink-0">RDS Designation:</span>
                <code className="text-xs font-mono bg-green-400/10 text-green-400 px-2 py-1 rounded break-all">
                  {node.metadata.full_rds_designation}
                </code>
              </div>
            )}
        </section>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">ISA-95 Level</p>
            <Badge variant="secondary" className="font-mono">{node.level}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Data Model</p>
            <Badge variant={isAssetLevel ? "default" : "secondary"} className="font-mono gap-1">
              {isAssetLevel ? (
                <>
                  <Database className="h-3 w-3" />
                  AAS Submodels
                </>
              ) : (
                'UNS Hierarchy'
              )}
            </Badge>
          </div>
        </div>

        {isAssetLevel && (
          <>
            <Separator />
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs text-blue-400 font-semibold mb-2 flex items-center gap-1">
                <Server className="h-3 w-3" />
                Asset Data Model
              </p>
              <p className="text-xs text-muted-foreground">
                Data below this level is managed by the linked AAS submodels (e.g., OperationalData, TechnicalData, Nameplate). 
                Use the AAS tab to define submodel properties and payloads.
              </p>
            </div>
          </>
        )}

        <Separator />

        {/* Linked Entities */}
        {(linkedEntities.aas.length > 0 || linkedEntities.rds.length > 0) && (
          <>
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Link className="h-4 w-4" />
                Entities at This Location
              </h3>
              <div className="space-y-2">
                {linkedEntities.aas.length > 0 && (
                  <div className="bg-muted p-3 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-semibold">AAS ({linkedEntities.aas.length})</span>
                    </div>
                    <div className="space-y-1">
                      {linkedEntities.aas.map(aas => (
                        <div key={aas.id} className="flex items-center justify-between text-xs bg-background p-2 rounded">
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{aas.idShort}</span>
                            {aas.isType && <Badge variant="outline" className="text-xs">Type</Badge>}
                          </div>
                          <code className="text-xs font-mono text-muted-foreground">{aas.id.substring(0, 8)}...</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {linkedEntities.rds.length > 0 && (
                  <div className="bg-muted p-3 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-semibold">RDS ({linkedEntities.rds.length})</span>
                    </div>
                    <div className="space-y-1">
                      {linkedEntities.rds.map(rds => (
                        <div key={rds.id} className="flex items-center justify-between text-xs bg-background p-2 rounded">
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            <code className="font-mono">{rds.designation}</code>
                            {rds.isInstance && <Badge variant="outline" className="text-xs">Instance</Badge>}
                          </div>
                          <code className="text-xs font-mono text-muted-foreground">{rds.id.substring(0, 8)}...</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Separator />
          </>
        )}

        <div>
          <p className="text-sm text-muted-foreground mb-1">Parent node</p>
          <p className="text-sm">{parent ? `${parent.name} (${parent.level})` : 'None (top level)'}</p>
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

        {node.metadata?.sparkplug_device_topics && (
          <>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Sparkplug B Device Topics</p>
              <div className="bg-muted p-3 rounded-md space-y-1">
                {Object.entries(node.metadata.sparkplug_device_topics).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-muted-foreground min-w-[80px]">
                      {key.replace('Topic', '')}:
                    </span>
                    <code className="text-xs font-mono flex-1 break-all">{String(value)}</code>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {otherMetadata.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Additional Metadata</p>
              <div className="bg-muted p-3 rounded-md space-y-2">
                {otherMetadata
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

        <Separator />

        {/* Audit Log */}
        <UNSAuditSection nodeId={node.id} />
      </CardContent>
    </Card>
    </>
  );
};

function UNSAuditSection({ nodeId }: { nodeId: string }) {
  const { data: auditLogs, isLoading } = useAuditLogs('UNS', nodeId);
  const [expanded, setExpanded] = useState(false);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between py-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Change History
            {auditLogs && auditLogs.length > 0 && (
              <Badge variant="secondary" className="text-xs">{auditLogs.length}</Badge>
            )}
          </h3>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <AuditLogPanel
          logs={auditLogs}
          isLoading={isLoading}
          emptyMessage="No changes recorded for this node"
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
