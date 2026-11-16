import { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { UNSHierarchyTree } from '@/components/uns/UNSHierarchyTree';
import { UNSDetailPanel } from '@/components/uns/UNSDetailPanel';
import { UNSDialog } from '@/components/uns/UNSDialog';
import { AASList } from '@/components/aas/AASList';
import { AASDetailPanel } from '@/components/aas/AASDetailPanel';
import { AASDialog } from '@/components/aas/AASDialog';
import { RDSTable } from '@/components/rds/RDSTable';
import { RDSDetailPanel } from '@/components/rds/RDSDetailPanel';
import { RDSBuilderDialog } from '@/components/rds/RDSBuilderDialog';
import { RDSComparisonDialog } from '@/components/rds/RDSComparisonDialog';
import { EntityValidationPanel } from '@/components/rds/EntityValidationPanel';
import { AssetList } from '@/components/tracking/AssetList';
import { AssetDetailPanel } from '@/components/tracking/AssetDetailPanel';
import { CreateTrackedAssetDialog } from '@/components/tracking/CreateTrackedAssetDialog';
import { MoveAssetDialog } from '@/components/tracking/MoveAssetDialog';
import { BindContextDialog } from '@/components/tracking/BindContextDialog';
import { QualityViolationDialog } from '@/components/tracking/QualityViolationDialog';
import { Button } from '@/components/ui/button';
import { Plus, Download, Upload, MapPin, Link2, AlertTriangle, RefreshCw, Package, CloudUpload } from 'lucide-react';
import { AssetPlacementSuggestDialog } from '@/components/aas/AssetPlacementSuggestDialog';
import { Sparkles, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AASImportDialog } from '@/components/aas/AASImportDialog';
import { BaSyxPushDialog } from '@/components/aas/BaSyxPushDialog';
import { exportAASToJSON, downloadJSON } from '@/lib/aasExportImport';
import { exportToBaSyxEnvironment } from '@/lib/basyxEnvironment';
import { downloadAASX } from '@/lib/aasxPackage';


import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useUNSNodes } from '@/hooks/useUNSNodes';
import { useAAS } from '@/hooks/useAAS';
import { useRDS } from '@/hooks/useRDS';
import { useTrackedAssets } from '@/hooks/useTrackedAssets';
import { placeTrackedAssets, subtreeIds } from '@/lib/unsContext';
import { useTrackedAssetsRealtime } from '@/hooks/useTrackedAssetsRealtime';
import { ForgeGuideLauncher } from '@/components/shared/ForgeGuideLauncher';
import type { ForgeGuideScope } from '@/lib/forgeGuide';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
const ADD_LABEL: Record<string, string> = {
  uns: 'Add node',
  aas: 'Add AAS',
  rds: 'Add designation',
  tracking: 'Add movable asset',
};

const today = () => new Date().toISOString().slice(0, 10);

const Index = () => {
  // All hooks must be called unconditionally at the top
  const [activeTab, setActiveTab] = useState('uns');
  const [basyxPushOpen, setBasyxPushOpen] = useState(false);
  const [selectedUNSNodeId, setSelectedUNSNodeId] = useState<string | null>(null);
  const [selectedAASId, setSelectedAASId] = useState<string | null>(null);
  const [selectedRDSId, setSelectedRDSId] = useState<string | null>(null);
  const [unsDialogOpen, setUnsDialogOpen] = useState(false);
  const [aasDialogOpen, setAasDialogOpen] = useState(false);
  const [aasImportOpen, setAasImportOpen] = useState(false);
  const [rdsBuilderOpen, setRdsBuilderOpen] = useState(false);
  const [rdsComparisonOpen, setRdsComparisonOpen] = useState(false);
  const [selectedRDSForComparison, setSelectedRDSForComparison] = useState<Set<string>>(new Set());
  const [selectedTrackingAssetId, setSelectedTrackingAssetId] = useState<string | null>(null);
  const [createAssetOpen, setCreateAssetOpen] = useState(false);
  const [moveAssetOpen, setMoveAssetOpen] = useState(false);
  const [bindContextOpen, setBindContextOpen] = useState(false);
  const [qualityViolationOpen, setQualityViolationOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

  // Data hooks
  const {
    nodes: unsNodes,
    isLoading: unsLoading,
    regenerateAllMetadata
  } = useUNSNodes();
  const {
    aasList,
    isLoading: aasLoading
  } = useAAS();
  const {
    rdsList,
    isLoading: rdsLoading
  } = useRDS();
  const {
    assets: trackedAssets,
    assetsLoading: trackingLoading,
    useRecentAssetEvents,
  } = useTrackedAssets();
  const { data: recentAssetEvents = [] } = useRecentAssetEvents();
  const movedAssetIds = useTrackedAssetsRealtime();
  const movablePlacement = useMemo(() => placeTrackedAssets(unsNodes, trackedAssets), [unsNodes, trackedAssets]);
  const openTrackedAsset = (trackedAssetId: string) => {
    setSelectedTrackingAssetId(trackedAssetId);
    setActiveTab('tracking');
  };

  // Derived state
  // Open the UNS on the largest enterprise, so its dashboard is visible right away
  useEffect(() => {
    if (selectedUNSNodeId || unsNodes.length === 0) return;
    const enterprises = unsNodes.filter(n => n.level === 'Enterprise');
    const size = (id: string) => subtreeIds(id, unsNodes).size;
    const first = [...enterprises].sort((a, b) => size(b.id) - size(a.id))[0] ?? unsNodes[0];
    setSelectedUNSNodeId(first.id);
  }, [unsNodes, selectedUNSNodeId]);

  // On small screens the details sit below the list: bring them into view on selection
  const unsDetailRef = useRef<HTMLDivElement>(null);
  const aasDetailRef = useRef<HTMLDivElement>(null);
  const revealOnMobile = (ref: React.RefObject<HTMLDivElement>) => {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };
  const selectUNSNode = (id: string) => { setSelectedUNSNodeId(id); revealOnMobile(unsDetailRef); };
  const selectAAS = (id: string) => { setSelectedAASId(id); revealOnMobile(aasDetailRef); };

  const selectedUNSNode = unsNodes.find(n => n.id === selectedUNSNodeId);
  const [chatOpen, setChatOpen] = useState(false);
  const selectedAAS = aasList.find(a => a.id === selectedAASId);
  const selectedRDS = rdsList.find(r => r.id === selectedRDSId);
  const comparisonRDSList = rdsList.filter(rds => selectedRDSForComparison.has(rds.id));
  const selectedTrackingAsset = trackedAssets.find(a => a.id === selectedTrackingAssetId) ?? null;
  // Forge Guide answers about what is in view
  const chatScope: ForgeGuideScope = (() => {
    if (activeTab === 'aas' && selectedAAS) return { kind: 'asset', id: selectedAAS.id, label: selectedAAS.idShort };
    const trackedNodeId = activeTab === 'tracking' && selectedTrackingAsset
      ? [...movablePlacement.byNode].find(([, placed]) => placed.some(p => p.asset.id === selectedTrackingAsset.id))?.[0]
      : undefined;
    const node = activeTab === 'uns' ? selectedUNSNode : unsNodes.find(n => n.id === trackedNodeId);
    if (node) return { kind: 'node', id: node.id, label: node.name, level: node.level };
    return { kind: 'plant', label: 'All visible plant data' };
  })();

  const toggleRDSComparison = (rdsId: string) => {
    const newSet = new Set(selectedRDSForComparison);
    if (newSet.has(rdsId)) {
      newSet.delete(rdsId);
    } else {
      newSet.add(rdsId);
    }
    setSelectedRDSForComparison(newSet);
  };
  return <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="flex flex-1 flex-col min-w-0">
          <Header />
          
          <main className="flex-1 overflow-auto">
            <div className="h-full flex flex-col p-4 md:p-6 gap-4 md:gap-6 pb-24 md:pb-6">
              {/* Action Bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-lg md:text-xl font-semibold">
                  {activeTab === 'uns' && 'ISA-95 Hierarchy (UNS)'}
                  {activeTab === 'aas' && 'Asset Administration Shells'}
                  {activeTab === 'rds' && 'Reference Designation System'}
                  {activeTab === 'tracking' && 'Track and Trace'}
                </h2>
                
                <div className="flex flex-wrap items-center gap-2">
                  {activeTab === 'rds' && selectedRDSForComparison.size > 0 && <Button size="sm" variant="secondary" onClick={() => setRdsComparisonOpen(true)}>
                      Compare ({selectedRDSForComparison.size})
                    </Button>}
                  {activeTab === 'uns' && unsNodes.length > 0 && (
                    <Button size="sm" variant="outline" onClick={() => regenerateAllMetadata.mutate()} disabled={regenerateAllMetadata.isPending}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${regenerateAllMetadata.isPending ? 'animate-spin' : ''}`} />
                      {regenerateAllMetadata.isPending ? 'Regenerating...' : 'Regenerate Topics'}
                    </Button>
                  )}
                  {activeTab === 'tracking' && selectedTrackingAssetId && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setMoveAssetOpen(true)}>
                        <MapPin className="h-4 w-4 mr-2" />Move
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setBindContextOpen(true)}>
                        <Link2 className="h-4 w-4 mr-2" />Bind Context
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setQualityViolationOpen(true)}>
                        <AlertTriangle className="h-4 w-4 mr-2" />Quality
                      </Button>
                    </>
                  )}
                  {activeTab === 'aas' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setSuggestOpen(true)}>
                        <Sparkles className="h-4 w-4 mr-2" />AI Suggest
                      </Button>
                      <AssetPlacementSuggestDialog open={suggestOpen} onOpenChange={setSuggestOpen} nodes={unsNodes} />
                      <Button size="sm" variant="outline" onClick={() => setAasImportOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" />Import
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" disabled={aasList.length === 0}>
                            <Download className="h-4 w-4 mr-2" />Export<ChevronDown className="h-4 w-4 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-72">
                          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">All {aasList.length} AAS</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => downloadJSON(exportAASToJSON(aasList), `aas-export-${today()}.json`)}>
                            <Download className="h-4 w-4 mr-2" />JSON (this app)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadJSON(exportToBaSyxEnvironment(aasList), `aas-environment-${today()}.json`)}>
                            <Download className="h-4 w-4 mr-2" />AAS v3 Environment JSON (BaSyx)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadAASX(aasList, `aas-package-${today()}.aasx`)}>
                            <Package className="h-4 w-4 mr-2" />AASX package
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setBasyxPushOpen(true)}>
                            <CloudUpload className="h-4 w-4 mr-2" />Push to BaSyx server…
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                  <Button size="sm" className="bg-primary inline-flex items-center" onClick={() => {
                  if (activeTab === 'uns') {
                    setUnsDialogOpen(true);
                  } else if (activeTab === 'aas') {
                    setAasDialogOpen(true);
                  } else if (activeTab === 'rds') {
                    setRdsBuilderOpen(true);
                  } else if (activeTab === 'tracking') {
                    setCreateAssetOpen(true);
                  }
                }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {ADD_LABEL[activeTab] ?? 'Add'}
                  </Button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 min-h-0">
                {activeTab === 'uns' && <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 h-[calc(100vh-14rem)] md:h-[calc(100vh-12rem)]">
                    <Card className="lg:col-span-2 flex flex-col overflow-hidden">
                      <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base font-semibold">Hierarchy Tree</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 overflow-hidden p-0">
                        <ScrollArea className="h-full p-4">
                          {unsLoading ? <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                              Loading...
                            </div> : unsNodes.length === 0 ? <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                              No nodes found. Create your first node.
                            </div> : <UNSHierarchyTree nodes={unsNodes} selectedNodeId={selectedUNSNodeId} onSelectNode={selectUNSNode} placement={movablePlacement} onSelectTrackedAsset={openTrackedAsset} movedAssetIds={movedAssetIds} />}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                    
                    <div ref={unsDetailRef} className="lg:col-span-3 overflow-hidden scroll-mt-4">
                      <ScrollArea className="h-full">
                                {selectedUNSNode ? <UNSDetailPanel node={selectedUNSNode} allNodes={unsNodes} aasList={aasList} rdsList={rdsList} placement={movablePlacement} events={recentAssetEvents} onSelectTrackedAsset={openTrackedAsset} /> : <Card className="h-full flex items-center justify-center">
                            <CardContent className="text-center p-8">
                              <p className="text-muted-foreground">Select a node to view details</p>
                            </CardContent>
                          </Card>}
                      </ScrollArea>
                    </div>
                  </div>}

                {activeTab === 'aas' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 h-[calc(100vh-14rem)] md:h-[calc(100vh-12rem)]">
                    <Card className="lg:col-span-1 flex flex-col overflow-hidden">
                      <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base font-semibold">AAS List</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 overflow-hidden p-0">
                        <ScrollArea className="h-full p-4">
                          {aasLoading ? <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                              Loading...
                            </div> : aasList.length === 0 ? <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                              No AAS found. Create your first shell.
                            </div> : <AASList aasList={aasList} selectedAASId={selectedAASId} onSelectAAS={selectAAS} />}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                    
                    <div ref={aasDetailRef} className="lg:col-span-2 overflow-hidden scroll-mt-4">
                      <ScrollArea className="h-full">
                        {selectedAAS ? <AASDetailPanel aas={selectedAAS} unsNodes={unsNodes} rdsList={rdsList} onAsk={() => setChatOpen(true)} /> : <Card className="h-full flex items-center justify-center">
                            <CardContent className="text-center p-8">
                              <p className="text-muted-foreground">Select an AAS to view details</p>
                            </CardContent>
                          </Card>}
                      </ScrollArea>
                    </div>
                  </div>}

                {activeTab === 'rds' && <div className="flex flex-col gap-4 md:gap-6">
                    <Card className="overflow-hidden">
                      
                      <CardContent className="p-0">
                        <ScrollArea className="h-[50vh]">
                          {rdsLoading ? <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                              Loading...
                            </div> : rdsList.length === 0 ? <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                              No RDS designations found. Create your first designation.
                            </div> : <RDSTable rdsList={rdsList} selectedRDSId={selectedRDSId} onSelectRDS={setSelectedRDSId} selectedForComparison={selectedRDSForComparison} onToggleComparison={toggleRDSComparison} />}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                      <div className="lg:col-span-2">
                        <Card className="overflow-hidden">
                          <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-base font-semibold">Details</CardTitle>
                          </CardHeader>
                          <CardContent className="p-0">
                            <ScrollArea className="h-[40vh]">
                              <div className="p-4">
                                {selectedRDS ? <RDSDetailPanel rds={selectedRDS} unsNodes={unsNodes} aasList={aasList} allRDS={rdsList} /> : <div className="flex items-center justify-center h-32">
                                    <p className="text-muted-foreground text-center">
                                      Select an RDS designation to view details
                                    </p>
                                  </div>}
                              </div>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="lg:col-span-1">
                        <EntityValidationPanel />
                      </div>
                    </div>
                  </div>}

                {activeTab === 'tracking' && <div className="flex flex-col gap-4 md:gap-6 h-[calc(100vh-14rem)] md:h-[calc(100vh-12rem)]">
                    <Card className="flex-shrink-0 overflow-hidden">
                      <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base font-semibold">Tracked Assets</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        {trackingLoading ? (
                          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">Loading...</div>
                        ) : (
                          <AssetList assets={trackedAssets} selectedAssetId={selectedTrackingAssetId} onSelectAsset={setSelectedTrackingAssetId} unsNodes={unsNodes} placement={movablePlacement} />
                        )}
                      </CardContent>
                    </Card>

                    {selectedTrackingAsset ? (
                      <AssetDetailPanel asset={selectedTrackingAsset} />
                    ) : (
                      <Card className="flex-1 flex items-center justify-center">
                        <CardContent className="text-center p-8">
                          <p className="text-muted-foreground">Select a tracked asset to view its journey</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>}
              </div>
            </div>
          </main>
        </div>
      </div>

      <ForgeGuideLauncher scope={chatScope} open={chatOpen} onOpenChange={setChatOpen} />

      {/* Mobile Navigation */}
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Dialogs */}
      <UNSDialog open={unsDialogOpen} onOpenChange={setUnsDialogOpen} nodes={unsNodes} />

      <AASDialog open={aasDialogOpen} onOpenChange={setAasDialogOpen} unsNodes={unsNodes} rdsList={rdsList.map(r => ({
      id: r.id,
      designation: r.designation,
      aspectCode: r.aspectCode,
      isInstance: r.isInstance
    }))} />

      <AASImportDialog open={aasImportOpen} onOpenChange={setAasImportOpen} />
      <BaSyxPushDialog open={basyxPushOpen} onOpenChange={setBasyxPushOpen} aasList={aasList} />

      <RDSBuilderDialog open={rdsBuilderOpen} onOpenChange={setRdsBuilderOpen} unsNodes={unsNodes.map(n => ({
      id: n.id,
      name: n.name,
      level: n.level,
      parentId: n.parentId,
      metadata: n.metadata
    }))} aasList={aasList.map(a => ({
      id: a.id,
      idShort: a.idShort,
      isType: a.isType
    }))} />

      <RDSComparisonDialog open={rdsComparisonOpen} onOpenChange={setRdsComparisonOpen} rdsItems={comparisonRDSList} />

      <CreateTrackedAssetDialog open={createAssetOpen} onOpenChange={setCreateAssetOpen} />
      {selectedTrackingAsset && (
        <>
          <MoveAssetDialog open={moveAssetOpen} onOpenChange={setMoveAssetOpen} asset={selectedTrackingAsset} />
          <BindContextDialog open={bindContextOpen} onOpenChange={setBindContextOpen} asset={selectedTrackingAsset} />
          <QualityViolationDialog open={qualityViolationOpen} onOpenChange={setQualityViolationOpen} asset={selectedTrackingAsset} />
        </>
      )}
    </SidebarProvider>;
};
export default Index;