import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Site } from '@/types/industrial';
import { toast } from '@/hooks/use-toast';

export const useSites = () => {
  const queryClient = useQueryClient();

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      return data.map(site => ({
        id: site.id,
        code: site.code,
        name: site.name,
        region: site.region || undefined,
        country: site.country || undefined,
        timezone: site.timezone || 'UTC',
        defaultLanguage: site.default_language || 'en',
        currencyCode: site.currency_code || 'USD',
        createdAt: new Date(site.created_at),
        updatedAt: new Date(site.updated_at),
      })) as Site[];
    },
  });

  const createSite = useMutation({
    mutationFn: async (site: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>) => {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required. Please sign in to create sites.');
      }

      const { data, error } = await supabase
        .from('sites')
        .insert({
          code: site.code,
          name: site.name,
          region: site.region,
          country: site.country,
          timezone: site.timezone,
          default_language: site.defaultLanguage,
          currency_code: site.currencyCode,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({ title: 'Site created successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create site', 
        description: error.message || 'An unknown error occurred',
        variant: 'destructive' 
      });
    },
  });

  const updateSite = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Site> & { id: string }) => {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required. Please sign in to update sites.');
      }

      const { data, error } = await supabase
        .from('sites')
        .update({
          code: updates.code,
          name: updates.name,
          region: updates.region,
          country: updates.country,
          timezone: updates.timezone,
          default_language: updates.defaultLanguage,
          currency_code: updates.currencyCode,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({ title: 'Site updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update site', 
        description: error.message || 'An unknown error occurred',
        variant: 'destructive' 
      });
    },
  });

  const deleteSite = useMutation({
    mutationFn: async (id: string) => {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required. Please sign in to delete sites.');
      }

      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({ title: 'Site deleted successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to delete site', 
        description: error.message || 'An unknown error occurred',
        variant: 'destructive' 
      });
    },
  });

  return {
    sites,
    isLoading,
    createSite,
    updateSite,
    deleteSite,
  };
};

