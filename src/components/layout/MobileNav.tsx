import { Network, Package, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'uns', icon: Network, label: 'UNS' },
  { id: 'aas', icon: Package, label: 'AAS' },
  { id: 'rds', icon: FileText, label: 'RDS' },
];

export const MobileNav = ({ activeTab, onTabChange }: MobileNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            size="sm"
            onClick={() => onTabChange(item.id)}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 h-auto py-2',
              activeTab === item.id && 'bg-primary/10 text-primary'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs">{item.label}</span>
          </Button>
        ))}
      </div>
    </nav>
  );
};
