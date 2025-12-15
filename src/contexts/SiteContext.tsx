import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Site } from '@/types/industrial';
import { useSites } from '@/hooks/useSites';

interface SiteContextType {
  selectedSiteId: string | null;
  setSelectedSiteId: (siteId: string | null) => void;
  selectedSite: Site | null;
  sites: Site[];
  isLoading: boolean;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const SiteProvider = ({ children }: { children: ReactNode }) => {
  const { sites, isLoading } = useSites();
  const [selectedSiteId, setSelectedSiteIdState] = useState<string | null>(null);

  // Load selected site from localStorage on mount
  useEffect(() => {
    const savedSiteId = localStorage.getItem('selectedSiteId');
    if (savedSiteId && sites.some(s => s.id === savedSiteId)) {
      setSelectedSiteIdState(savedSiteId);
    } else if (sites.length > 0 && !savedSiteId) {
      // Auto-select first site if none selected
      setSelectedSiteIdState(sites[0].id);
    }
  }, [sites]);

  const setSelectedSiteId = (siteId: string | null) => {
    setSelectedSiteIdState(siteId);
    if (siteId) {
      localStorage.setItem('selectedSiteId', siteId);
    } else {
      localStorage.removeItem('selectedSiteId');
    }
  };

  const selectedSite = sites.find(s => s.id === selectedSiteId) || null;

  return (
    <SiteContext.Provider
      value={{
        selectedSiteId,
        setSelectedSiteId,
        selectedSite,
        sites,
        isLoading,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
};

export const useSiteContext = () => {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error('useSiteContext must be used within a SiteProvider');
  }
  return context;
};

