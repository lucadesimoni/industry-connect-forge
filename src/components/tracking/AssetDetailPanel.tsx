import { TrackedAsset } from '@/types/industrial';
import { useTrackedAssets } from '@/hooks/useTrackedAssets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AssetJourneyTimeline } from './AssetJourneyTimeline';
import { generateAssetTopics } from '@/lib/trackingTopics';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Unlink } from 'lucide-react';

interface AssetDetailPanelProps {
  asset: TrackedAsset;
}

export const AssetDetailPanel = ({ asset }: AssetDetailPanelProps) => {
  const { useAssetEvents, useContextBindings, unbindContext } = useTrackedAssets();
  const { data: events = [] } = useAssetEvents(asset.id);
  const { data: bindings = [] } = useContextBindings(asset.id);
  const topics = generateAssetTopics(asset, bindings);

  return (
    <div className="space-y-4">
      {/* Journey visualization */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold">
            Journey — <span className="font-mono">{asset.assetId}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 overflow-x-auto">
          <AssetJourneyTimeline events={events} currentLocation={asset.currentLocationPath} />
        </CardContent>
      </Card>

      {/* Detail tabs */}
      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">Events ({events.length})</TabsTrigger>
          <TabsTrigger value="contexts">Contexts ({bindings.filter(b => b.isActive).length})</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[30vh]">
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">No events recorded.</p>
                ) : (
                  <div className="divide-y">
                    {events.map(ev => (
                      <div key={ev.id} className="px-4 py-3 flex items-start gap-3">
                        <Badge variant="outline" className="text-xs shrink-0 mt-0.5">{ev.eventType}</Badge>
                        <div className="flex-1 min-w-0">
                          {ev.fromLocation && ev.toLocation && (
                            <p className="text-sm font-mono">
                              {ev.fromLocation} → {ev.toLocation}
                            </p>
                          )}
                          {ev.reason && <p className="text-xs text-muted-foreground">{ev.reason}</p>}
                          {ev.payload && Object.keys(ev.payload).length > 0 && (
                            <pre className="text-xs text-muted-foreground mt-1 font-mono whitespace-pre-wrap">
                              {JSON.stringify(ev.payload, null, 2)}
                            </pre>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {format(ev.createdAt, 'MMM d HH:mm')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contexts">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[30vh]">
                {bindings.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">No context bindings.</p>
                ) : (
                  <div className="divide-y">
                    {bindings.map(b => (
                      <div key={b.id} className="px-4 py-3 flex items-center gap-3">
                        <Badge variant={b.isActive ? 'default' : 'secondary'} className="text-xs">{b.contextType}</Badge>
                        <span className="font-mono text-sm flex-1">{b.contextId}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(b.boundAt, 'MMM d HH:mm')}
                        </span>
                        {b.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unbindContext.mutate({ bindingId: b.id, assetDbId: asset.id })}
                          >
                            <Unlink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="topics">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Identity</p>
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded block">{topics.identity}</code>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Telemetry</p>
                  {topics.telemetry.map(t => (
                    <code key={t} className="text-sm font-mono bg-muted px-2 py-1 rounded block mb-1">{t}</code>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Status</p>
                  {topics.status.map(t => (
                    <code key={t} className="text-sm font-mono bg-muted px-2 py-1 rounded block mb-1">{t}</code>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Events</p>
                  {topics.events.map(t => (
                    <code key={t} className="text-sm font-mono bg-muted px-2 py-1 rounded block mb-1">{t}</code>
                  ))}
                </div>
                {topics.location && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Location Projection</p>
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded block">{topics.location}</code>
                  </div>
                )}
                {topics.contexts.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Context Projections</p>
                    {topics.contexts.map(t => (
                      <code key={t} className="text-sm font-mono bg-muted px-2 py-1 rounded block mb-1">{t}</code>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
