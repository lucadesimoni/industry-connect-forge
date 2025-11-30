import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Network, Package, FileText } from 'lucide-react';

interface NavigationTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export const NavigationTabs = ({ activeTab, onTabChange }: NavigationTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-muted">
        <TabsTrigger value="uns" className="gap-2">
          <Network className="h-4 w-4" />
          <span>Unified Namespace</span>
          <span className="text-xs text-muted-foreground ml-1">(ISA-95)</span>
        </TabsTrigger>
        <TabsTrigger value="aas" className="gap-2">
          <Package className="h-4 w-4" />
          <span>Asset Administration Shell</span>
          <span className="text-xs text-muted-foreground ml-1">(IEC 63278)</span>
        </TabsTrigger>
        <TabsTrigger value="rds" className="gap-2">
          <FileText className="h-4 w-4" />
          <span>Reference Designation</span>
          <span className="text-xs text-muted-foreground ml-1">(IEC 81346)</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
