import { Building2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';

export const Header = () => {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="lg:hidden shrink-0" />
        <Building2 className="h-6 w-6 text-primary shrink-0" />
        <div className="hidden sm:block min-w-0">
          <h1 className="text-base font-semibold text-foreground truncate">Industrial IoT Platform</h1>
          <p className="text-xs text-muted-foreground truncate">ISA-95 | IEC 63278 | IEC 81346</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-status-warning rounded-full" />
        </Button>
      </div>
    </header>
  );
};
