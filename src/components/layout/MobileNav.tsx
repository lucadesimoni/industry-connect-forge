import { Home, Package, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'uns', icon: Home, label: 'UNS' },
  { id: 'aas', icon: Package, label: 'AAS' },
  { id: 'rds', icon: FileText, label: 'RDS' },
];

export const MobileNav = ({ activeTab, onTabChange }: MobileNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-2 h-16">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onTabChange(item.id)}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 h-auto py-2 min-w-[72px]',
              activeTab !== item.id && 'bg-transparent'
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="text-xs whitespace-nowrap">{item.label}</span>
          </Button>
        ))}
      </div>
    </nav>
  );
};
