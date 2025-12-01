import { useState } from 'react';
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
import { RDSComparisonView } from '@/components/rds/RDSComparisonView';
import { Button } from '@/components/ui/button';
import { Plus, Download, Upload } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useUNSNodes } from '@/hooks/useUNSNodes';
import { useAAS } from '@/hooks/useAAS';
import { useRDS } from '@/hooks/useRDS';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  // All hooks must be called unconditionally at the top
  const [activeTab, setActiveTab] = useState('uns');
  const [selectedUNSNodeId, setSelectedUNSNodeId] = useState<string | null>(null);
  const [selectedAASId, setSelectedAASId] = useState<string | null>(null);
  const [selectedRDSId, setSelectedRDSId] = useState<string | null>(null);
  const [unsDialogOpen, setUnsDialogOpen] = useState(false);
  const [aasDialogOpen, setAasDialogOpen] = useState(false);
  const [rdsBuilderOpen, setRdsBuilderOpen] = useState(false);
  const [rdsComparisonMode, setRdsComparisonMode] = useState(false);
  const [rdsComparisonItems, setRdsComparisonItems] = useState<string[]>([]);

  // Data hooks
  const { nodes: unsNodes, isLoading: unsLoading } = useUNSNodes();
  const { aasList, isLoading: aasLoading } = useAAS();
  const { rdsList, isLoading: rdsLoading } = useRDS();

  // Derived state
  const selectedUNSNode = unsNodes.find(n => n.id === selectedUNSNodeId);
  const selectedAAS = aasList.find(a => a.id === selectedAASId);
  const selectedRDS = rdsList.find(r => r.id === selectedRDSId);
  const comparisonRDSList = rdsList.filter(r => rdsComparisonItems.includes(r.id));

  const handleRDSSelect = (id: string) => {
    if (rdsComparisonMode) {
      setRdsComparisonItems(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    } else {
      setSelectedRDSId(id);
    }
  };

  const handleRemoveFromComparison = (id: string) => {
    setRdsComparisonItems(prev => prev.filter(i => i !== id));
  };

  const handleCloseComparison = () => {
    setRdsComparisonMode(false);
    setRdsComparisonItems([]);
  };

  return (
    <SidebarProvider defaultOpen={true}>
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
                  {activeTab === 'rds' && (rdsComparisonMode ? 'RDS Comparison View' : 'Reference Designation System')}
                </h2>
                
                <div className="flex items-center gap-2">
                  {activeTab === 'rds' && (
                    <Button 
                      variant={rdsComparisonMode ? "default" : "outline"} 
                      size="sm" 
                      className="hidden sm:inline-flex items-center"
                      onClick={() => {
                        setRdsComparisonMode(!rdsComparisonMode);
                        if (rdsComparisonMode) {
                          setRdsComparisonItems([]);
                        }
                      }}
                    >
                      {rdsComparisonMode ? 'Exit Comparison' : 'Compare'}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="hidden sm:inline-flex items-center">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                  <Button variant="outline" size="sm" className="hidden sm:inline-flex items-center">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  {!rdsComparisonMode && (
                    <Button 
                      size="sm" 
                      className="inline-flex items-center"
                      onClick={() => {
                        if (activeTab === 'uns') {
                          setUnsDialogOpen(true);
                        } else if (activeTab === 'aas') {
                          setAasDialogOpen(true);
                        } else if (activeTab === 'rds') {
                          setRdsBuilderOpen(true);
                        }
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New
                    </Button>
                  )}
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 min-h-0">
                {activeTab === 'uns' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 h-[calc(100vh-14rem)] md:h-[calc(100vh-12rem)]">
                    <Card className="lg:col-span-1 flex flex-col overflow-hidden">
                      <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base font-semibold">Hierarchy Tree</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 overflow-hidden p-0">
                        <ScrollArea className="h-full p-4">
                          {unsLoading ? (
                            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                              Loading...
                            </div>
                          ) : unsNodes.length === 0 ? (
                            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                              No nodes found. Create your first node.
                            </div>
                          ) : (
                            <UNSHierarchyTree
                              nodes={unsNodes}
                              selectedNodeId={selectedUNSNodeId}
                              onSelectNode={setSelectedUNSNodeId}
                            />
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                    
                    <div className="lg:col-span-2 overflow-hidden">
                      <ScrollArea className="h-full">
                        {selectedUNSNode ? (
                          <UNSDetailPanel node={selectedUNSNode} allNodes={unsNodes} />
                        ) : (
                          <Card className="h-full flex items-center justify-center">
                            <CardContent className="text-center p-8">
                              <p className="text-muted-foreground">Select a node to view details</p>
                            </CardContent>
                          </Card>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                )}

                {activeTab === 'aas' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 h-[calc(100vh-14rem)] md:h-[calc(100vh-12rem)]">
                    <Card className="lg:col-span-1 flex flex-col overflow-hidden">
                      <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base font-semibold">AAS List</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 overflow-hidden p-0">
                        <ScrollArea className="h-full p-4">
                          {aasLoading ? (
                            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                              Loading...
                            </div>
                          ) : aasList.length === 0 ? (
                            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                              No AAS found. Create your first shell.
                            </div>
                          ) : (
                            <AASList
                              aasList={aasList}
                              selectedAASId={selectedAASId}
                              onSelectAAS={setSelectedAASId}
                            />
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                    
                    <div className="lg:col-span-2 overflow-hidden">
                      <ScrollArea className="h-full">
                        {selectedAAS ? (
                          <AASDetailPanel 
                            aas={selectedAAS}
                            unsNodes={unsNodes.map(n => ({ id: n.id, name: n.name }))}
                            rdsList={rdsList.map(r => ({ id: r.id, designation: r.designation }))}
                          />
                        ) : (
                          <Card className="h-full flex items-center justify-center">
                            <CardContent className="text-center p-8">
                              <p className="text-muted-foreground">Select an AAS to view details</p>
                            </CardContent>
                          </Card>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                )}

                {activeTab === 'rds' && !rdsComparisonMode && (
                  <div className="flex flex-col gap-4 md:gap-6">
                    <Card className="overflow-hidden">
                      <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base font-semibold">RDS Designations</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="h-[50vh]">
                          {rdsLoading ? (
                            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                              Loading...
                            </div>
                          ) : rdsList.length === 0 ? (
                            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                              No RDS designations found. Create your first designation.
                            </div>
                          ) : (
                            <RDSTable
                              rdsList={rdsList}
                              selectedRDSId={selectedRDSId}
                              onSelectRDS={handleRDSSelect}
                            />
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                    
                    <Card className="overflow-hidden">
                      <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base font-semibold">Details</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="h-[40vh]">
                          <div className="p-4">
                            {selectedRDS ? (
                              <RDSDetailPanel rds={selectedRDS} />
                            ) : (
                              <div className="flex items-center justify-center h-32">
                                <p className="text-muted-foreground text-center">
                                  Select an RDS designation to view details
                                </p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'rds' && rdsComparisonMode && (
                  <RDSComparisonView
                    selectedRDS={comparisonRDSList}
                    onRemove={handleRemoveFromComparison}
                    onClose={handleCloseComparison}
                    unsNodes={unsNodes.map(n => ({ id: n.id, name: n.name }))}
                    aasList={aasList.map(a => ({ id: a.id, idShort: a.idShort }))}
                  />
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Dialogs */}
      <UNSDialog
        open={unsDialogOpen}
        onOpenChange={setUnsDialogOpen}
        nodes={unsNodes}
      />

      <AASDialog
        open={aasDialogOpen}
        onOpenChange={setAasDialogOpen}
        unsNodes={unsNodes.map(n => ({ id: n.id, name: n.name }))}
        rdsList={rdsList.map(r => ({ id: r.id, designation: r.designation }))}
      />

      <RDSBuilderDialog
        open={rdsBuilderOpen}
        onOpenChange={setRdsBuilderOpen}
        unsNodes={unsNodes.map(n => ({ id: n.id, name: n.name }))}
        aasList={aasList.map(a => ({ id: a.id, idShort: a.idShort }))}
      />
    </SidebarProvider>
  );
};

export default Index;
