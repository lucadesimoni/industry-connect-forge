import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { NavigationTabs } from '@/components/layout/NavigationTabs';
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
import { useUNSNodes } from '@/hooks/useUNSNodes';
import { useAAS } from '@/hooks/useAAS';
import { useRDS } from '@/hooks/useRDS';

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
    <div className="flex h-screen flex-col bg-background">
      <Header />
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col p-6 gap-6">
          <div className="flex items-center justify-between">
            <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm">
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
          </div>

          <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
            {activeTab === 'uns' && (
              <>
                <Card className="col-span-1 p-4">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    ISA-95 Hierarchy
                  </h2>
                  <ScrollArea className="h-[calc(100%-3rem)]">
                    {unsLoading ? (
                      <div className="p-4 text-muted-foreground">Loading...</div>
                    ) : (
                      <UNSHierarchyTree
                        nodes={unsNodes}
                        selectedNodeId={selectedUNSNodeId}
                        onSelectNode={setSelectedUNSNodeId}
                      />
                    )}
                  </ScrollArea>
                </Card>
                <div className="col-span-2">
                  <ScrollArea className="h-full">
                    {selectedUNSNode && <UNSDetailPanel node={selectedUNSNode} />}
                  </ScrollArea>
                </div>
              </>
            )}

            {activeTab === 'aas' && (
              <>
                <Card className="col-span-1 p-4">
                  <h2 className="text-lg font-semibold mb-4">Asset Administration Shells</h2>
                  <ScrollArea className="h-[calc(100%-3rem)]">
                    {aasLoading ? (
                      <div className="p-4 text-muted-foreground">Loading...</div>
                    ) : (
                      <AASList
                        aasList={aasList}
                        selectedAASId={selectedAASId}
                        onSelectAAS={setSelectedAASId}
                      />
                    )}
                  </ScrollArea>
                </Card>
                <div className="col-span-2">
                  <ScrollArea className="h-full">
                    {selectedAAS && <AASDetailPanel aas={selectedAAS} />}
                  </ScrollArea>
                </div>
              </>
            )}

            {activeTab === 'rds' && (
              <>
                <div className="col-span-3 space-y-4">
                  <ScrollArea className="h-[40%]">
                    {rdsLoading ? (
                      <div className="p-4 text-muted-foreground">Loading...</div>
                    ) : (
                      <RDSTable
                        rdsList={rdsList}
                        selectedRDSId={selectedRDSId}
                        onSelectRDS={setSelectedRDSId}
                      />
                    )}
                  </ScrollArea>
                  <ScrollArea className="h-[55%]">
                    {selectedRDS && <RDSDetailPanel rds={selectedRDS} />}
                  </ScrollArea>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* RDS Builder Dialog */}
      <RDSBuilderDialog
        open={rdsBuilderOpen}
        onOpenChange={setRdsBuilderOpen}
        unsNodes={unsNodes.map(n => ({ id: n.id, name: n.name }))}
        aasList={aasList.map(a => ({ id: a.id, idShort: a.idShort }))}
      />
    </div>
  );
};

// Simple card component for layout
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card border border-border rounded-lg ${className}`}>
    {children}
  </div>
);

export default Index;
