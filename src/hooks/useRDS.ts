import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RDSDesignation } from '@/types/industrial';
import { toast } from '@/hooks/use-toast';

export const useRDS = () => {
  const queryClient = useQueryClient();

  const { data: rdsList = [], isLoading } = useQuery({
    queryKey: ['rds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rds_designations')
        .select('*')
        .order('designation');
      
      if (error) throw error;
      
      return data.map(rds => ({
        id: rds.id,
        designation: rds.designation,
        aspectCode: rds.aspect_code,
        objectClass: rds.object_class,
        description: rds.description,
        linkedUNSNodeId: rds.linked_uns_node_id || undefined,
        linkedAASId: rds.linked_aas_id || undefined,
        metadata: rds.metadata as Record<string, any>,
        isInstance: rds.is_instance,
        parentDefinitionId: rds.parent_definition_id || undefined,
        functionAspect: rds.function_aspect || undefined,
        productAspect: rds.product_aspect || undefined,
        locationAspect: rds.location_aspect || undefined,
        createdAt: new Date(rds.created_at),
        updatedAt: new Date(rds.updated_at),
      })) as RDSDesignation[];
    },
  });

  const createRDS = useMutation({
    mutationFn: async (rds: Omit<RDSDesignation, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('rds_designations')
        .insert({
          designation: rds.designation,
          aspect_code: rds.aspectCode,
          object_class: rds.objectClass,
          description: rds.description,
          linked_uns_node_id: rds.linkedUNSNodeId,
          linked_aas_id: rds.linkedAASId,
          metadata: rds.metadata || {},
          is_instance: rds.isInstance,
          parent_definition_id: rds.parentDefinitionId,
          function_aspect: rds.functionAspect,
          product_aspect: rds.productAspect,
          location_aspect: rds.locationAspect,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rds'] });
      toast({ title: 'RDS designation created successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create RDS designation', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateRDS = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RDSDesignation> & { id: string }) => {
      const { data, error } = await supabase
        .from('rds_designations')
        .update({
          designation: updates.designation,
          aspect_code: updates.aspectCode,
          object_class: updates.objectClass,
          description: updates.description,
          linked_uns_node_id: updates.linkedUNSNodeId,
          linked_aas_id: updates.linkedAASId,
          metadata: updates.metadata,
          is_instance: updates.isInstance,
          parent_definition_id: updates.parentDefinitionId,
          function_aspect: updates.functionAspect,
          product_aspect: updates.productAspect,
          location_aspect: updates.locationAspect,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rds'] });
      toast({ title: 'RDS designation updated successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to update RDS designation', variant: 'destructive' });
    },
  });

  const deleteRDS = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rds_designations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rds'] });
      toast({ title: 'RDS designation deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to delete RDS designation', variant: 'destructive' });
    },
  });

  return {
    rdsList,
    isLoading,
    createRDS,
    updateRDS,
    deleteRDS,
  };
};
