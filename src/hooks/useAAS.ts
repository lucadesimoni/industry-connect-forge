import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AAS, AASSubmodel, AASProperty } from '@/types/industrial';
import { toast } from '@/hooks/use-toast';
import { useSiteContext } from '@/contexts/SiteContext';

export const useAAS = () => {
  const queryClient = useQueryClient();
  const { selectedSiteId } = useSiteContext();

  const { data: aasList = [], isLoading } = useQuery({
    queryKey: ['aas', selectedSiteId],
    queryFn: async () => {
      let query = supabase
        .from('aas')
        .select('*');
      
      // Filter by site_id if a site is selected
      if (selectedSiteId) {
        query = query.eq('site_id', selectedSiteId);
      }
      
      const { data: aasData, error: aasError } = await query.order('id_short');
      
      if (aasError) throw aasError;

      const aasWithSubmodels = await Promise.all(
        aasData.map(async (aas) => {
          const { data: submodelsData, error: subError } = await supabase
            .from('aas_submodels')
            .select('*')
            .eq('aas_id', aas.id);
          
          if (subError) throw subError;

          const submodelsWithProperties = await Promise.all(
            submodelsData.map(async (submodel) => {
              const { data: propertiesData, error: propError } = await supabase
                .from('aas_properties')
                .select('*')
                .eq('submodel_id', submodel.id);
              
              if (propError) throw propError;

              return {
                id: submodel.id,
                idShort: submodel.id_short,
                semanticId: submodel.semantic_id,
                description: submodel.description,
                properties: propertiesData.map(prop => ({
                  id: prop.id,
                  idShort: prop.id_short,
                  valueType: prop.value_type,
                  value: prop.value,
                  unit: prop.unit || undefined,
                  description: prop.description || undefined,
                })) as AASProperty[],
              } as AASSubmodel;
            })
          );

          return {
            id: aas.id,
            assetId: aas.asset_id,
            idShort: aas.id_short,
            description: aas.description,
            manufacturer: aas.manufacturer,
            serialNumber: aas.serial_number,
            submodels: submodelsWithProperties,
            linkedUNSNodeId: aas.linked_uns_node_id || undefined,
            linkedRDSId: aas.linked_rds_id || undefined,
            siteId: aas.site_id || undefined,
            isType: aas.is_type,
            typeAASId: aas.type_aas_id || undefined,
            createdAt: new Date(aas.created_at),
            updatedAt: new Date(aas.updated_at),
          } as AAS;
        })
      );
      
      return aasWithSubmodels;
    },
  });

  const createAAS = useMutation({
    mutationFn: async (aas: Omit<AAS, 'id' | 'createdAt' | 'updatedAt'>) => {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required. Please sign in to create AAS.');
      }

      const { data: aasData, error: aasError } = await supabase
        .from('aas')
        .insert({
          asset_id: aas.assetId,
          id_short: aas.idShort,
          description: aas.description,
          manufacturer: aas.manufacturer,
          serial_number: aas.serialNumber,
          linked_uns_node_id: aas.linkedUNSNodeId,
          linked_rds_id: aas.linkedRDSId,
          site_id: aas.siteId || selectedSiteId || null,
          is_type: aas.isType,
          type_aas_id: aas.typeAASId,
        })
        .select()
        .single();
      
      if (aasError) throw aasError;

      for (const submodel of aas.submodels) {
        const { data: submodelData, error: subError } = await supabase
          .from('aas_submodels')
          .insert({
            aas_id: aasData.id,
            id_short: submodel.idShort,
            semantic_id: submodel.semanticId,
            description: submodel.description,
          })
          .select()
          .single();
        
        if (subError) throw subError;

        if (submodel.properties.length > 0) {
          const { error: propError } = await supabase
            .from('aas_properties')
            .insert(
              submodel.properties.map(prop => ({
                submodel_id: submodelData.id,
                id_short: prop.idShort,
                value_type: prop.valueType,
                value: prop.value,
                unit: prop.unit,
                description: prop.description,
              }))
            );
          
          if (propError) throw propError;
        }
      }

      return aasData;
    },
    onSuccess: () => {
      // Invalidate all aas queries (including site-specific ones)
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'aas' });
      toast({ title: 'AAS created successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create AAS', 
        description: error.message || 'An unknown error occurred',
        variant: 'destructive' 
      });
    },
  });

  const updateAAS = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AAS> & { id: string }) => {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required. Please sign in to update AAS.');
      }

      // Update main AAS record
      const { data, error } = await supabase
        .from('aas')
        .update({
          asset_id: updates.assetId,
          id_short: updates.idShort,
          description: updates.description,
          manufacturer: updates.manufacturer,
          serial_number: updates.serialNumber,
          linked_uns_node_id: updates.linkedUNSNodeId,
          linked_rds_id: updates.linkedRDSId,
          site_id: updates.siteId !== undefined ? updates.siteId : selectedSiteId || null,
          is_type: updates.isType,
          type_aas_id: updates.typeAASId,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Handle submodels if provided
      if (updates.submodels !== undefined) {
        // Get existing submodels
        const { data: existingSubmodels, error: subError } = await supabase
          .from('aas_submodels')
          .select('id')
          .eq('aas_id', id);
        
        if (subError) throw subError;

        const existingSubmodelIds = new Set(existingSubmodels.map(s => s.id));
        const newSubmodelIds = new Set(
          updates.submodels
            .map(s => s.id)
            .filter((id): id is string => !!id)
        );

        // Delete submodels that are no longer in the update
        const submodelsToDelete = existingSubmodels
          .filter(s => !newSubmodelIds.has(s.id))
          .map(s => s.id);

        if (submodelsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('aas_submodels')
            .delete()
            .in('id', submodelsToDelete);
          
          if (deleteError) throw deleteError;
        }

        // Update or create submodels
        for (const submodel of updates.submodels) {
          if (submodel.id && existingSubmodelIds.has(submodel.id)) {
            // Update existing submodel
            const { error: updateSubError } = await supabase
              .from('aas_submodels')
              .update({
                id_short: submodel.idShort,
                semantic_id: submodel.semanticId,
                description: submodel.description,
              })
              .eq('id', submodel.id);
            
            if (updateSubError) throw updateSubError;

            // Handle properties for existing submodel
            const { data: existingProps, error: propsError } = await supabase
              .from('aas_properties')
              .select('id')
              .eq('submodel_id', submodel.id);
            
            if (propsError) throw propsError;

            const existingPropIds = new Set(existingProps.map(p => p.id));
            const newPropIds = new Set(
              submodel.properties
                .map(p => p.id)
                .filter((id): id is string => !!id)
            );

            // Delete properties that are no longer in the update
            const propsToDelete = existingProps
              .filter(p => !newPropIds.has(p.id))
              .map(p => p.id);

            if (propsToDelete.length > 0) {
              const { error: deletePropsError } = await supabase
                .from('aas_properties')
                .delete()
                .in('id', propsToDelete);
              
              if (deletePropsError) throw deletePropsError;
            }

            // Update or create properties
            for (const prop of submodel.properties) {
              if (prop.id && existingPropIds.has(prop.id)) {
                // Update existing property
                const { error: updatePropError } = await supabase
                  .from('aas_properties')
                  .update({
                    id_short: prop.idShort,
                    value_type: prop.valueType,
                    value: prop.value,
                    unit: prop.unit,
                    description: prop.description,
                  })
                  .eq('id', prop.id);
                
                if (updatePropError) throw updatePropError;
              } else {
                // Create new property
                const { error: createPropError } = await supabase
                  .from('aas_properties')
                  .insert({
                    submodel_id: submodel.id,
                    id_short: prop.idShort,
                    value_type: prop.valueType,
                    value: prop.value,
                    unit: prop.unit,
                    description: prop.description,
                  });
                
                if (createPropError) throw createPropError;
              }
            }
          } else {
            // Create new submodel
            const { data: newSubmodel, error: createSubError } = await supabase
              .from('aas_submodels')
              .insert({
                aas_id: id,
                id_short: submodel.idShort,
                semantic_id: submodel.semanticId,
                description: submodel.description,
              })
              .select()
              .single();
            
            if (createSubError) throw createSubError;

            // Create properties for new submodel
            if (submodel.properties.length > 0) {
              const { error: createPropsError } = await supabase
                .from('aas_properties')
                .insert(
                  submodel.properties.map(prop => ({
                    submodel_id: newSubmodel.id,
                    id_short: prop.idShort,
                    value_type: prop.valueType,
                    value: prop.value,
                    unit: prop.unit,
                    description: prop.description,
                  }))
                );
              
              if (createPropsError) throw createPropsError;
            }
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate all aas queries (including site-specific ones)
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'aas' });
      toast({ title: 'AAS updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update AAS', 
        description: error.message || 'An unknown error occurred',
        variant: 'destructive' 
      });
    },
  });

  const deleteAAS = useMutation({
    mutationFn: async (id: string) => {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required. Please sign in to delete AAS.');
      }

      const { error } = await supabase
        .from('aas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all aas queries (including site-specific ones)
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'aas' });
      toast({ title: 'AAS deleted successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to delete AAS', 
        description: error.message || 'An unknown error occurred',
        variant: 'destructive' 
      });
    },
  });

  return {
    aasList,
    isLoading,
    createAAS,
    updateAAS,
    deleteAAS,
  };
};
