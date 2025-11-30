import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { UNSHierarchyTree } from '@/components/uns/UNSHierarchyTree';
import { UNSDetailPanel } from '@/components/uns/UNSDetailPanel';
import { AASList } from '@/components/aas/AASList';
import { AASDetailPanel } from '@/components/aas/AASDetailPanel';
import { RDSTable } from '@/components/rds/RDSTable';
import { RDSDetailPanel } from '@/components/rds/RDSDetailPanel';
import { RDSBuilderDialog } from '@/components/rds/RDSBuilderDialog';
import { Button } from '@/components/ui/button';
import { Plus, Download, Upload } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useUNSNodes } from '@/hooks/useUNSNodes';
import { useAAS } from '@/hooks/useAAS';
import { useRDS } from '@/hooks/useRDS';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  const [activeTab, setActiveTab] = useState('uns');
  const [selectedUNSNodeId, setSelectedUNSNodeId] = useState<string | null>(null);
  const [selectedAASId, setSelectedAASId] = useState<string | null>(null);
  const [selectedRDSId, setSelectedRDSId] = useState<string | null>(null);
  const [rdsBuilderOpen, setRdsBuilderOpen] = useState(false);

  const { nodes: unsNodes, isLoading: unsLoading } = useUNSNodes();
  const { aasList, isLoading: aasLoading } = useAAS();
  const { rdsList, isLoading: rdsLoading } = useRDS();

  const selectedUNSNode = unsNodes.find(n => n.id === selectedUNSNodeId);
  const selectedAAS = aasList.find(a => a.id === selectedAASId);
  const selectedRDS = rdsList.find(r => r.id === selectedRDSId);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="flex flex-1 flex-col">
          <Header />
          
          <main className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col p-3 md:p-4 lg:p-6 gap-3 md:gap-4 lg:gap-6 pb-20 md:pb-6">
              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button 
                  size="sm" 
                  className="bg-primary"
                  onClick={() => {
                    if (activeTab === 'rds') {
                      setRdsBuilderOpen(true);
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New
                </Button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'uns' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 h-full">
                    <Card className="lg:col-span-1 flex flex-col max-h-[calc(100vh-12rem)]">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base md:text-lg">ISA-95 Hierarchy</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 overflow-hidden p-4">
                        <ScrollArea className="h-full">
                          {unsLoading ? (
                            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
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
                    
                    <div className="lg:col-span-2 max-h-[calc(100vh-12rem)]">
                      <ScrollArea className="h-full">
                        {selectedUNSNode && <UNSDetailPanel node={selectedUNSNode} />}
                      </ScrollArea>
                    </div>
                  </div>
                )}

                {activeTab === 'aas' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 h-full">
                    <Card className="lg:col-span-1 flex flex-col max-h-[calc(100vh-12rem)]">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base md:text-lg">Asset Administration Shells</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 overflow-hidden p-4">
                        <ScrollArea className="h-full">
                          {aasLoading ? (
                            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
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
                    
                    <div className="lg:col-span-2 max-h-[calc(100vh-12rem)]">
                      <ScrollArea className="h-full">
                        {selectedAAS && <AASDetailPanel aas={selectedAAS} />}
                      </ScrollArea>
                    </div>
                  </div>
                )}

                {activeTab === 'rds' && (
                  <div className="flex flex-col gap-4 h-full">
                    <div className="flex-1 min-h-0">
                      <ScrollArea className="h-full max-h-[40vh] lg:max-h-[45vh]">
                        {rdsLoading ? (
                          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
                        ) : (
                          <RDSTable
                            rdsList={rdsList}
                            selectedRDSId={selectedRDSId}
                            onSelectRDS={setSelectedRDSId}
                          />
                        )}
                      </ScrollArea>
                    </div>
                    
                    <div className="flex-1 min-h-0">
                      <ScrollArea className="h-full max-h-[40vh] lg:max-h-[45vh]">
                        {selectedRDS && <RDSDetailPanel rds={selectedRDS} />}
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* RDS Builder Dialog */}
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
