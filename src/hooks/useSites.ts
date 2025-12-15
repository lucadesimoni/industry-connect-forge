import { useState } from 'react';
import { Site } from '@/types/industrial';

// Placeholder hook - sites table doesn't exist yet
// When you need site management, create a sites table first
export const useSites = () => {
  const [sites] = useState<Site[]>([]);
  const isLoading = false;

  return {
    sites,
    isLoading,
    createSite: { mutateAsync: async () => {}, isPending: false },
    updateSite: { mutateAsync: async () => {}, isPending: false },
    deleteSite: { mutateAsync: async () => {}, isPending: false },
  };
};
