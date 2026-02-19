import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Site } from '@/types/industrial';
import { toast } from '@/hooks/use-toast';
import { mapErrorToUserMessage } from '@/lib/errorHandler';

const mapSite = (row: any): Site => ({
  id: row.id,
  code: row.code,
  name: row.name,
  region: row.region ?? undefined,
  country: row.country ?? undefined,
  timezone: row.timezone,
  defaultLanguage: row.default_language,
  currencyCode: row.currency_code,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

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
      return data.map(mapSite);
    },
  });

  const createSite = useMutation({
    mutationFn: async (input: { code: string; name: string; region?: string; country?: string; timezone?: string }) => {
      const { data, error } = await supabase.from('sites').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({ title: 'Site created' });
    },
    onError: (e: unknown) => toast({ title: 'Failed to create site', description: mapErrorToUserMessage(e), variant: 'destructive' }),
  });

  const updateSite = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Site>) => {
      const { data, error } = await supabase.from('sites').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({ title: 'Site updated' });
    },
    onError: (e: unknown) => toast({ title: 'Failed to update site', description: mapErrorToUserMessage(e), variant: 'destructive' }),
  });

  const deleteSite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sites').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({ title: 'Site deleted' });
    },
    onError: (e: unknown) => toast({ title: 'Failed to delete site', description: mapErrorToUserMessage(e), variant: 'destructive' }),
  });

  return {
    sites,
    isLoading,
    createSite,
    updateSite,
    deleteSite,
  };
};
