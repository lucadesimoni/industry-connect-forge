import { Factory, Menu } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

export const Header = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="flex h-14 items-center px-4 lg:px-6">
        <SidebarTrigger className="mr-4 hidden md:flex" />
        
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-primary">
            <Factory className="h-4 w-4 md:h-6 md:w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm md:text-lg font-bold text-foreground">Industrial IoT Platform</h1>
            <p className="hidden sm:block text-xs text-muted-foreground font-mono">UNS • AAS • RDS Manager</p>
          </div>
        </div>
      </div>
    </header>
  );
};
