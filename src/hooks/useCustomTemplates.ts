import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SubmodelTemplate } from '@/lib/aasTemplates';
import { toast } from '@/hooks/use-toast';
import { mapErrorToUserMessage } from '@/lib/errorHandler';
import { useSiteContext } from '@/contexts/SiteContext';

interface CustomTemplateRow {
  id: string;
  name: string;
  id_short: string;
  semantic_id: string;
  description: string;
  standard: string;
  properties: any;
  site_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const mapRowToTemplate = (row: CustomTemplateRow): SubmodelTemplate & { id: string } => ({
  id: row.id,
  idShort: row.id_short,
  semanticId: row.semantic_id,
  description: row.description,
  standard: row.standard,
  properties: Array.isArray(row.properties) ? row.properties : [],
});

export const useCustomTemplates = () => {
  const queryClient = useQueryClient();
  const { selectedSiteId } = useSiteContext();

  const { data: customTemplates = [], isLoading } = useQuery({
    queryKey: ['custom-submodel-templates', selectedSiteId],
    queryFn: async () => {
      const query = supabase
        .from('custom_submodel_templates')
        .select('*')
        .order('name');

      if (selectedSiteId) {
        query.eq('site_id', selectedSiteId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as CustomTemplateRow[]).map(mapRowToTemplate);
    },
  });

  const saveTemplate = useMutation({
    mutationFn: async (template: {
      name: string;
      idShort: string;
      semanticId: string;
      description: string;
      standard?: string;
      properties: any[];
    }) => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required.');

      if (!selectedSiteId) throw new Error('Please select a site first.');

      const { data, error } = await supabase
        .from('custom_submodel_templates')
        .insert({
          name: template.name,
          id_short: template.idShort,
          semantic_id: template.semanticId,
          description: template.description,
          standard: template.standard || 'Custom',
          properties: template.properties,
          site_id: selectedSiteId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-submodel-templates'] });
      toast({ title: 'Template saved successfully' });
    },
    onError: (e: unknown) => {
      toast({ title: 'Failed to save template', description: mapErrorToUserMessage(e), variant: 'destructive' });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_submodel_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-submodel-templates'] });
      toast({ title: 'Template deleted' });
    },
    onError: (e: unknown) => {
      toast({ title: 'Failed to delete template', description: mapErrorToUserMessage(e), variant: 'destructive' });
    },
  });

  return { customTemplates, isLoading, saveTemplate, deleteTemplate };
};
