import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Info, CheckCircle2 } from 'lucide-react';
import { RDS_STANDARDS, searchStandards, getStandardsByAspect, type RDSStandard } from '@/lib/rdsStandards';

interface RDSCatalogueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (standard: RDSStandard) => void;
}

export const RDSCatalogueDialog = ({ open, onOpenChange, onSelect }: RDSCatalogueDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStandard, setSelectedStandard] = useState<RDSStandard | null>(null);
  const [activeTab, setActiveTab] = useState<'function' | 'product' | 'location'>('function');

  const filteredStandards = searchQuery 
    ? searchStandards(searchQuery)
    : getStandardsByAspect(activeTab);

  const handleSelect = (standard: RDSStandard) => {
    setSelectedStandard(standard);
    if (onSelect) {
      onSelect(standard);
    }
  };

  const categoryGroups = filteredStandards.reduce((acc, std) => {
    if (!acc[std.category]) {
      acc[std.category] = [];
    }
    acc[std.category].push(std);
    return acc;
  }, {} as Record<string, RDSStandard[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            IEC 81346 Standard Designations Catalogue
          </DialogTitle>
          <DialogDescription>
            Browse and select standard RDS designations for industrial production systems
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by code, name, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs for Aspect Types */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="function">
                Function Aspect (=)
              </TabsTrigger>
              <TabsTrigger value="product">
                Product Aspect (-)
              </TabsTrigger>
              <TabsTrigger value="location">
                Location Aspect (+)
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <ScrollArea className="h-[50vh] pr-4">
                <div className="space-y-6">
                  {Object.entries(categoryGroups).map(([category, standards]) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                        {category}
                      </h3>
                      <div className="grid gap-3">
                        {standards.map((standard) => (
                          <Card 
                            key={standard.code}
                            className={`cursor-pointer transition-all hover:border-primary ${
                              selectedStandard?.code === standard.code ? 'border-primary bg-primary/5' : ''
                            }`}
                            onClick={() => handleSelect(standard)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                                    {standard.code}
                                  </Badge>
                                  <div>
                                    <CardTitle className="text-base">{standard.name}</CardTitle>
                                    <CardDescription className="text-xs mt-1">
                                      {standard.description}
                                    </CardDescription>
                                  </div>
                                </div>
                                {selectedStandard?.code === standard.code && (
                                  <CheckCircle2 className="h-5 w-5 text-primary" />
                                )}
                              </div>
                            </CardHeader>
                            {standard.examples && standard.examples.length > 0 && (
                              <CardContent className="pt-0">
                                <div className="text-xs text-muted-foreground">
                                  <span className="font-medium">Examples: </span>
                                  {standard.examples.join(', ')}
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Footer Info */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              {filteredStandards.length} standard{filteredStandards.length !== 1 ? 's' : ''} found
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {selectedStandard && onSelect && (
                <Button onClick={() => onOpenChange(false)}>
                  Use Selected
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
