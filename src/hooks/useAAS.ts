import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AAS, AASSubmodel, AASProperty } from '@/types/industrial';
import { toast } from '@/hooks/use-toast';

export const useAAS = () => {
  const queryClient = useQueryClient();

  const { data: aasList = [], isLoading } = useQuery({
    queryKey: ['aas'],
    queryFn: async () => {
      const { data: aasData, error: aasError } = await supabase
        .from('aas')
        .select('*')
        .order('id_short');
      
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
                  idShort: prop.id_short,
                  valueType: prop.value_type,
                  value: prop.value,
                  unit: prop.unit,
                  description: prop.description,
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
            linkedUNSNodeId: aas.linked_uns_node_id,
            linkedRDSId: aas.linked_rds_id,
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
      queryClient.invalidateQueries({ queryKey: ['aas'] });
      toast({ title: 'AAS created successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to create AAS', variant: 'destructive' });
    },
  });

  const deleteAAS = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('aas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aas'] });
      toast({ title: 'AAS deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to delete AAS', variant: 'destructive' });
    },
  });

  return {
    aasList,
    isLoading,
    createAAS,
    deleteAAS,
  };
};
