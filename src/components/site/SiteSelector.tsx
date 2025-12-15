import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSiteContext } from '@/contexts/SiteContext';
import { Building2, Globe } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const SiteSelector = () => {
  const { selectedSiteId, setSelectedSiteId, selectedSite, sites, isLoading } = useSiteContext();

  if (isLoading) {
    return <Skeleton className="h-10 w-[200px]" />;
  }

  if (sites.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>No sites available</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedSiteId || 'none'} onValueChange={(value) => setSelectedSiteId(value === 'none' ? null : value)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select site" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">All Sites</SelectItem>
          {sites.map((site) => (
            <SelectItem key={site.id} value={site.id}>
              <div className="flex items-center gap-2">
                <span>{site.name}</span>
                {site.country && (
                  <Badge variant="outline" className="text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    {site.country}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedSite && (
        <div className="text-xs text-muted-foreground">
          {selectedSite.code}
        </div>
      )}
    </div>
  );
};

