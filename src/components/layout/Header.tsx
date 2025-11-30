import { Factory } from 'lucide-react';

export const Header = () => {
  return (
    <header className="border-b border-border bg-card">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Factory className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Industrial IoT Platform</h1>
            <p className="text-xs text-muted-foreground font-mono">UNS • AAS • RDS Manager</p>
          </div>
        </div>
      </div>
    </header>
  );
};
